# US-E11.9 — Teacher Question Bank — Integration Map

Ground-truthed against `../edu-api/services/core/internal/lms/exercisebank/**`
(`routes.go`, `question_handler.go`, `dto/{create_question_request,update_question_request,question_response}.go`,
`core/application/usecase/search_questions.go`, `core/domain/entity/question.go`,
`core/domain/error/question_errors.go`) and `services/core/docs/ERROR_CODES.md`
§"LMS — Exercise Bank (US-053)" this session (2026-07-17). Kong:
`gateway/kong/kong.yml` `core-protected` route — `/core/api/v1/*` (strip_path)
→ `core:8081/api/v1/*`, `edu-edge-auth` plugin attached (protected).

## 1. Integration Overview

- **6 endpoints**, all one service: **`core`** (`exercisebank` sub-domain).
- **Status: REAL** — the `core` service's exercisebank routes are shipped and
  ground-truthed (not a placeholder contract). This is the **exception** to the
  usual "`core` = mock-first" rule from `.claude/rules/api-integration.md` —
  scope this feature's mock strictly as a **dev-default toggle**
  (`NEXT_PUBLIC_USE_MOCK`), not a permanent stand-in like other `core` features.
- All 6 require an authenticated, verified caller (Kong `edu-edge-auth`); the
  BE additionally role-gates per-action in the use-case layer (not at Kong):
  writes require TEACHER wire-role, search requires TEACHER/MANAGER/ADMIN
  (`canBrowseBank`), single-GET is visibility-gated (DRAFT: author-only).
- **Risk / contract-gap flags** (surfaced below in detail, summarized here):
  1. **FR-009 in `requirements.md` is WRONG about `difficulty`.** `UpdateQuestionRequest`
     (Go struct, ground-truthed) has only `body`, `expectedAnswer`, `tags` —
     `difficulty` is **NOT** present, meaning it is immutable-on-update exactly
     like `questionType`/`subjectId`/`gradeLevel`, not editable as FR-009 states.
     **This is a requirements defect, flagging to `ba-lead` for FR-009 correction**
     before `ba-use-case-modeler`/`ba-spec-writer` build AC on top of it — the edit
     builder must render **four** fields read-only/disabled (questionType,
     subjectId, gradeLevel, difficulty), not three.
  2. **`FORBIDDEN_ACTION` (403 `forbidden_action`) is ONE code reused for TWO
     semantically distinct denials**: (a) the search staff-only role gate
     (`canBrowseBank` in `search_questions.go`, also reused for create/list-mine
     TEACHER-role gate) and (b) write-ownership violations (update/publish by a
     non-author, `Question.Publish`/`Question.Update` in `question.go`). The wire
     gives the client **no code-level way** to tell these apart — see §3 for the
     required presentation-layer (not failure-type-level) disambiguation.
  3. `QUESTION_NOT_VISIBLE` (403 `question_not_visible`) is a **separate, distinct**
     code from `FORBIDDEN_ACTION` — it is the single-GET (`GET /:id`) visibility
     gate only (DRAFT viewed by non-author/non-manager/non-admin), never used by
     search or write endpoints.
  4. `expectedAnswer` is confirmed **optional for all three questionTypes** on
     both `CreateQuestionRequest`/`UpdateQuestionRequest` (`*string`,
     `omitempty,max=5000`, no per-type conditional rule anywhere in the Go
     source) — confirms `ba-lead`'s 2026-07-17 `design-spec.jsonc` correction
     (`expectedAnswerField.required: false`) is correct; FR-007 in
     `requirements.md` is correct as written.
  5. Server-side query-param support is **narrower** than FR-005 assumed —
     see §"Secondary filter" table below; `questionType` and (for scope=mine)
     `status` have **zero server support** anywhere and must be 100%
     client-side post-filtering.

## 2. Endpoint Catalogue

Proposed endpoint-constants group — **additive**, new file section, does NOT
touch existing `LMS_EP.questions` (unrelated per-lesson Q&A thread):

```ts
// bootstrap/endpoint/lms.endpoint.ts (additive)
export const QUESTION_BANK_EP = {
  search: "/core/api/v1/lms/questions/search", // + query string built by repo
  list: "/core/api/v1/lms/questions",          // GET (own) / POST (create)
  detail: (id: string) => `/core/api/v1/lms/questions/${id}`, // GET / PUT
  publish: (id: string) => `/core/api/v1/lms/questions/${id}/publish`, // PUT
} as const;
```

---

### INT-201  Search published questions (cross-teacher)

```
Service: core (exercisebank)          Method+Path: GET /core/api/v1/lms/questions/search
Status: REAL (routes.go:29, search_questions.go, question_handler.go SearchQuestions)
Protected: yes   Role required: TEACHER | MANAGER | ADMIN wire-role (canBrowseBank) — PARENT/STUDENT hard-forbidden server-side (VULN-001 gate)
```
Request (outbound, camelCase query params):
- `subjectId` — uuid, **primary partition filter**; mandatory-filter gate satisfied if present | not sensitive
- `tag` — free-text tag string; **alternate** mandatory-filter satisfier (used when `subjectId` absent) | not sensitive
- `gradeLevel` — optional refinement, **only takes effect server-side when `subjectId` is also set** (search_questions.go routes gradeLevel/difficulty as clustering predicates on the by-subject partition only; the by-tag path ignores them) | not sensitive
- `difficulty` — optional refinement, same by-subject-only caveat as gradeLevel | not sensitive
- `cursor` — opaque pagination cursor | not sensitive
- `limit` — page size (server clamps, see `clampLimit`) | not sensitive
- **No `questionType` query param exists** — see §"Secondary filters" below, must be client-side

Response payload (inbound, post-unwrap): `{ items: QuestionResponse[] }` (see shared DTO in §"Shared response shape"), `meta.pagination.{nextCursor,hasMore}`.

Pagination: cursor (`nextCursor`/`hasMore`) via `useInfiniteQuery`.

Errors → UI behavior:
- `422 QUESTION_SEARCH_FILTER_REQUIRED` → maps to `QuestionBankFailure` variant `search-filter-required` → render **`QBFilterRequiredPrompt`** (same state as the client-side pre-gate, FR-002) — defense-in-depth only; the client-side gate (§4) should make this unreachable in normal use, but the mapping must exist. | not retryable (fix input, not retry)
- `403 FORBIDDEN_ACTION` (role gate — `canBrowseBank` denies caller) → `forbidden-browse` (distinct sub-variant, see §3) → full-page **access-denied** state, NOT an empty result; per NFR-008 this should be unreachable in practice because the route itself is guarded client-side for non-teacher roles, so treat as a defensive fallback | not retryable
- `400 QUESTION_INVALID_SUBJECT_ID` / `QUESTION_INVALID_DIFFICULTY` / `QUESTION_INVALID_CURSOR` → generic error banner (malformed client-built query — should not occur if client validates dropdown values against known enums) | not retryable
- network/5xx → generic error banner + retry | retryable

Empty / loading expectation: skeleton rows (count=4) while in flight (NFR-006); `emptyFiltered` state (distinct from `requiredFilterGate`) when the filter IS satisfied but zero results return — CTA to clear/adjust filters, per `uiStates` in requirements.md.

---

### INT-202  List own questions (mine)

```
Service: core (exercisebank)          Method+Path: GET /core/api/v1/lms/questions
Status: REAL (routes.go:31, list_my_questions.go, question_handler.go ListMyQuestions)
Protected: yes   Role required: TEACHER wire-role (list_my_questions.go role gate)
```
Request (outbound, camelCase query params): `cursor`, `limit` — **that's ALL**. No `status`/`questionType`/`difficulty`/`gradeLevel` query params exist server-side for this endpoint (ground-truthed `ListMyQuestions` handler — only reads `c.Query("cursor")`/`c.Query("limit")`). Every FR-005 secondary filter for scope=mine (questionType, difficulty, gradeLevel, status) is **100% client-side post-filter** on the fetched page.

Response payload (inbound, post-unwrap): `{ items: QuestionResponse[] }`, includes both DRAFT and PUBLISHED owned by caller. `meta.pagination.{nextCursor,hasMore}`.

Pagination: cursor (`nextCursor`/`hasMore`) via `useInfiniteQuery`. **Caveat for client-side filtering**: because filters apply after fetch, a filtered view may show fewer results per page than the raw page size, and "load more" must keep fetching+filtering across pages rather than assuming the filtered count matches `limit` — flag this UX nuance to `ba-use-case-modeler`/component design (may want a higher `limit` or accumulate-until-N-filtered-results strategy).

Errors → UI behavior:
- `403 FORBIDDEN_ACTION` (non-TEACHER caller) → `forbidden-browse` → access-denied (should be unreachable given route guard, NFR-008-style) | not retryable
- network/5xx → generic error banner + retry | retryable

Empty / loading expectation: skeleton (count=4); `emptyAll` (no questions yet, CTA "Create question") when the raw own-list truly has zero items; `emptyFiltered` when own-list has items but the client-side filter yields zero — CTA to clear filters (distinct copy from `emptyAll`).

---

### INT-203  Create DRAFT question

```
Service: core (exercisebank)          Method+Path: POST /core/api/v1/lms/questions
Status: REAL (routes.go:30, create_question.go, question_handler.go CreateQuestion)
Protected: yes   Role required: TEACHER wire-role
```
Request (outbound, camelCase body — `CreateQuestionRequest`):
- `questionType` — required, one of `ESSAY`\|`SHORT_ANSWER`\|`FILL_IN` (MCQ rejected) | not sensitive
- `subjectId` — required, uuid | not sensitive
- `gradeLevel` — required, max 10 chars | not sensitive
- `difficulty` — required, one of `EASY`\|`MEDIUM`\|`HARD` | not sensitive
- `body` — required, max 5000 chars (client UX floor: min 4 chars per FR-008) | not sensitive
- `expectedAnswer` — **optional** (nullable string), max 5000 chars if present | not sensitive
- `tags` — optional array, max 10 entries, each max 50 chars | not sensitive

Response payload (inbound, post-unwrap): single `QuestionResponse` (see §"Shared response shape"), `status: "DRAFT"`, `publishedAt: null`.

Pagination: none (single-resource create).

Errors → UI behavior:
- `400 QUESTION_BODY_REQUIRED` → inline field error on `body` | not retryable
- `400 QUESTION_BODY_TOO_LONG` → inline field error on `body` | not retryable
- `422 QUESTION_TYPE_NOT_SUPPORTED` → inline field error on `questionType` selector (should be unreachable — client-side selector excludes MCQ per FR-006/FR-008, defense-in-depth mapping only) | not retryable
- `422 QUESTION_TAG_LIMIT_EXCEEDED` → inline field error on tag-chips input ("max 10 tags") | not retryable
- `400 QUESTION_TAG_TOO_LONG` → inline field error on tag-chips input (identify which tag if the API doesn't say — client-side max-50-char enforcement per tag should make this unreachable) | not retryable
- `400 QUESTION_INVALID_SUBJECT_ID` / `QUESTION_INVALID_DIFFICULTY` → inline field error on subject/difficulty selector (should be unreachable — client dropdowns constrain to valid enums) | not retryable
- `404 SUBJECT_NOT_FOUND` → inline field error on subject selector — "subject no longer exists/archived"; also a signal the subject dropdown source may be stale, consider refetch | not retryable
- `403 FORBIDDEN_ACTION` (non-TEACHER) → access-denied (should be unreachable, route-guarded) | not retryable
- network/5xx → generic error banner, form state preserved for retry | retryable

Empty / loading expectation: submit-button disabled + spinner while in flight (NFR); on success, navigate to the created question's edit/detail view or back to list with a success toast.

---

### INT-204  Read one question

```
Service: core (exercisebank)          Method+Path: GET /core/api/v1/lms/questions/:id
Status: REAL (routes.go:32, get_question.go, question_handler.go GetQuestion)
Protected: yes   Role required: any authenticated caller; visibility enforced server-side (DRAFT: author-only; PUBLISHED: TEACHER/MANAGER/ADMIN — matches question_errors.go ErrQuestionNotVisible doc comment)
```
Request (outbound): `id` — path param, uuid.

Response payload (inbound, post-unwrap): single `QuestionResponse`.

Pagination: none.

Errors → UI behavior:
- `404 QUESTION_NOT_FOUND` → full-page not-found state | not retryable
- `403 QUESTION_NOT_VISIBLE` → full-page access-denied state, **distinct** message from `FORBIDDEN_ACTION` ("this draft belongs to another teacher" vs generic "you can't do this") — see §3 for why these must map to different failure-union variants despite both being 403 | not retryable
- `400 QUESTION_INVALID_ID` → not-found state (malformed id treated same as not-found from a UX standpoint) | not retryable
- network/5xx → generic error banner + retry | retryable

Empty / loading expectation: skeleton detail card while in flight; used for both edit-route prefetch and the read-only locked view (FR-011).

---

### INT-205  Update DRAFT question

```
Service: core (exercisebank)          Method+Path: PUT /core/api/v1/lms/questions/:id
Status: REAL (routes.go:33, update_question.go, question.go Update(), question_handler.go UpdateQuestion)
Protected: yes   Role required: TEACHER, must be the question's authorId (ownership, not just role)
```
Request (outbound, camelCase body — `UpdateQuestionRequest`, ground-truthed):
- `body` — required, max 5000 chars | not sensitive
- `expectedAnswer` — optional, max 5000 chars | not sensitive
- `tags` — optional array, max 10 × max 50 chars | not sensitive
- **`questionType`/`subjectId`/`gradeLevel`/`difficulty` are ABSENT from this
  request body** — all four are immutable post-create (contradicts FR-009's
  claim that difficulty is editable; see §1 risk note #1). Do not send them;
  the BE struct has no field to bind them into even if sent.

Response payload (inbound, post-unwrap): single `QuestionResponse`, updated fields reflected, `updatedAt` refreshed.

Pagination: none.

Errors → UI behavior:
- `404 QUESTION_NOT_FOUND` → full-page not-found | not retryable
- `403 FORBIDDEN_ACTION` (caller is not the question's author) → **`forbidden-edit`** sub-variant, distinct presentation-layer message from the search role-gate's `forbidden-browse` (see §3) → access-denied state, "you are not the author of this question" | not retryable
- `422 QUESTION_ALREADY_PUBLISHED` (question is no longer DRAFT — race: published elsewhere/another tab) → refresh to locked/read-only PUBLISHED view (FR-011) + toast "already published, no longer editable" | not retryable
- `400 QUESTION_BODY_REQUIRED` / `QUESTION_BODY_TOO_LONG` → inline field error on `body` | not retryable
- `422 QUESTION_TAG_LIMIT_EXCEEDED` / `400 QUESTION_TAG_TOO_LONG` → inline field error on tags | not retryable
- `400 QUESTION_INVALID_ID` → not-found state | not retryable
- network/5xx → generic error banner, form state preserved | retryable

Empty / loading expectation: same as create — spinner + disabled submit while in flight.

---

### INT-206  Publish DRAFT → PUBLISHED (one-way)

```
Service: core (exercisebank)          Method+Path: PUT /core/api/v1/lms/questions/:id/publish
Status: REAL (routes.go:34, publish_question.go, question.go Publish(), question_handler.go PublishQuestion)
Protected: yes   Role required: TEACHER, must be the question's authorId
```
Request (outbound): `id` — path param, uuid; **no request body**.

Response payload (inbound, post-unwrap): single `QuestionResponse`, `status: "PUBLISHED"`, `publishedAt` now set (RFC3339 string).

Pagination: none.

Errors → UI behavior:
- `404 QUESTION_NOT_FOUND` → full-page not-found | not retryable
- `403 FORBIDDEN_ACTION` (not author) → `forbidden-edit` (same sub-variant as INT-205's ownership case — both stem from `Question.Publish`/`Update`'s identical `IsOwnedBy` check) → access-denied | not retryable
- `422 QUESTION_ALREADY_PUBLISHED` → **not really an error from a UX standpoint** — refresh to locked/PUBLISHED view + informational toast "already published" (FR-010's explicit error condition) — do NOT show a red error banner, this is a benign race/duplicate-click outcome | not retryable
- `400 QUESTION_INVALID_ID` → not-found state | not retryable
- network/5xx → generic error banner + retry (the confirm dialog should stay open/re-offer retry, not silently close) | retryable

Empty / loading expectation: confirm-dialog CTA shows spinner while in flight; dialog does not auto-close on error.

---

## Shared response shape (all 6 endpoints' item type)

```
QuestionResponse (camelCase, post-unwrap):
  id            — uuid
  tenantId      — uuid | not client-displayed, but present on wire
  authorId      — uuid; scope=search cards need a display-name resolution (see §"Open Questions" — no name on this DTO)
  questionType  — "ESSAY" | "SHORT_ANSWER" | "FILL_IN"  (no discriminant beyond this string; no options[] field — MCQ/options out of scope, FR-014)
  subjectId     — uuid (resolve display name via existing subject-catalogue lookup, see §"Open Questions")
  gradeLevel    — string, e.g. "Lớp 10"/free text, max 10 chars
  difficulty    — "EASY" | "MEDIUM" | "HARD"
  body          — string, question text
  expectedAnswer— string | null — ALWAYS optional, never required for save or publish (any questionType)
  status        — "DRAFT" | "PUBLISHED"
  tags          — string[] (never null on wire — BE defaults empty array)
  publishedAt   — RFC3339 string | null (null while DRAFT)
  createdAt     — RFC3339 string
  updatedAt     — RFC3339 string
```

No PII on this DTO (subjectId/authorId are internal identifiers, not names/emails).

## 3. Failure-Union Design — `QuestionBankFailure`

```ts
export type QuestionBankFailure =
  | { type: "not-found" }                 // 404 QUESTION_NOT_FOUND, 400 QUESTION_INVALID_ID (treated same UX-wise)
  | { type: "not-visible" }               // 403 QUESTION_NOT_VISIBLE — single-GET visibility gate (DRAFT, not author, not manager/admin)
  | { type: "forbidden-browse" }          // 403 FORBIDDEN_ACTION from search/list-mine role gate (canBrowseBank / TEACHER-only)
  | { type: "forbidden-edit" }            // 403 FORBIDDEN_ACTION from update/publish ownership check (not the author)
  | { type: "already-published" }         // 422 QUESTION_ALREADY_PUBLISHED
  | { type: "type-not-supported" }        // 422 QUESTION_TYPE_NOT_SUPPORTED
  | { type: "search-filter-required" }    // 422 QUESTION_SEARCH_FILTER_REQUIRED
  | { type: "body-required" }             // 400 QUESTION_BODY_REQUIRED
  | { type: "body-too-long" }             // 400 QUESTION_BODY_TOO_LONG
  | { type: "tag-limit-exceeded" }        // 422 QUESTION_TAG_LIMIT_EXCEEDED
  | { type: "tag-too-long" }              // 400 QUESTION_TAG_TOO_LONG
  | { type: "invalid-difficulty" }        // 400 QUESTION_INVALID_DIFFICULTY
  | { type: "subject-not-found" }         // 404 SUBJECT_NOT_FOUND (create only)
  | { type: "invalid-cursor" }            // 400 QUESTION_INVALID_CURSOR
  | { type: "network-error" }
  | { type: "unknown"; message?: string };
```

**Why `forbidden-browse` and `forbidden-edit` are split even though the wire
code is identical (`FORBIDDEN_ACTION`, both 403):** ground-truthing
`search_questions.go`, `list_my_questions.go`, `create_question.go` (role gate)
vs `question.go` `Publish()`/`Update()` (ownership gate via `IsOwnedBy`) shows
the BE conflates "wrong role" and "not the owner" under one error constructor
(`domainerror.ErrForbidden()`, comment literally says "generic action-forbidden
error (wrong role / not owner)"). The **code alone cannot disambiguate** these
at the repository/mapper layer — the repository/use-case MUST branch by
**which endpoint/action produced the error**, not by inspecting the error code,
to pick `forbidden-browse` vs `forbidden-edit`. Concretely: a 403
`FORBIDDEN_ACTION` from `INT-201`/`INT-202`/`INT-203` (search/list/create)
→ map to `forbidden-browse`; the same code from `INT-205`/`INT-206`
(update/publish) → map to `forbidden-edit`. This is a **mapper-level, per-call-site
branch** (still zero implementation choice made here — flagging the *rule*, not
writing the mapper). Presentation then renders genuinely different copy/UX:
`forbidden-browse` = "you don't have access to search the bank" (shouldn't
normally be reachable — route already role-gates non-teachers per NFR-008);
`forbidden-edit` = "you're not the author of this question" (reachable in
practice, e.g. stale UI showing another teacher's question link).

`not-visible` (403 `QUESTION_NOT_VISIBLE`) stays a THIRD, separate variant —
it is a genuinely distinct wire code from `FORBIDDEN_ACTION`, only ever
returned by single-GET, and should render "this draft isn't visible to you"
(closer to `not-found` in tone than `forbidden-edit`, since the caller may not
even know the question exists).

## 4. Mandatory search-filter gate (client pre-validation + defense-in-depth)

- **Primary gate (client-side, before any request fires):** the search
  repository/use-case call is **never invoked** while scope=search and both
  `subjectId` is unset/`"all"` AND the tag/free-text field is empty — render
  `QBFilterRequiredPrompt` directly from client-side derived state (per FR-002/
  FR-003). This is the expected, common path — most users will hit this on
  first landing in search scope.
- **Defense-in-depth (server-side, still must be handled):** if the client
  gate is ever bypassed (stale component state, direct URL/query manipulation,
  a future regression), the repository/use-case must still map
  `422 QUESTION_SEARCH_FILTER_REQUIRED` → `{ type: "search-filter-required" }`
  → the SAME `QBFilterRequiredPrompt` UI, not a generic error banner (FR-002's
  explicit error condition). Do not treat this as unreachable dead code to skip
  — write it, just don't rely on the round-trip as the primary UX.
- Secondary filters (`gradeLevel`, `difficulty`) only refine the by-subject
  server partition (per `search_questions.go`); when the mandatory filter is
  satisfied via `tag` instead of `subjectId`, `gradeLevel`/`difficulty` sent
  as query params are silently ignored server-side (by-tag partition path
  does not read them) — if genuinely needed in tag-mode, they'd have to be
  client-side post-filters too. Flag this nuance to `ba-use-case-modeler` for
  the Given/When/Then covering combined tag+gradeLevel filters.

## 5. Secondary filters (FR-005) — server-side vs client-side split

| Filter | scope=mine (`GET /questions`) | scope=search (`GET /questions/search`) |
| --- | --- | --- |
| `subjectId` | not supported (client post-filter) | **server** (primary partition key) |
| `tag` | not supported (client post-filter) | **server** (alternate partition key) |
| `gradeLevel` | not supported (client post-filter) | **server, but only when `subjectId` set** (ignored on by-tag path — client post-filter as fallback in tag-mode) |
| `difficulty` | not supported (client post-filter) | **server, same caveat as gradeLevel** |
| `questionType` | not supported (client post-filter) | **not supported at all — no query param exists** (client post-filter always) |
| `status` (mine only) | not supported (client post-filter — BE returns both DRAFT+PUBLISHED, no status query param) | n/a (search is PUBLISHED-only server-side by construction) |

Recommendation to `ba-use-case-modeler`/`fe-state-engineer`: fetch a reasonably
sized page (`limit` on the higher end, not implementation-prescribed here) and
apply client-side filters over the accumulated/current page; `useInfiniteQuery`
"load more" must continue fetching underlying pages when a post-filter reduces
visible count below what a user expects from one "page" — this is a UX/perf
trade-off worth a design/eng call, not resolved here.

## 6. Pagination

All three list-shaped endpoints (search, list-mine — create/update/publish/get
are single-resource) use the standard envelope cursor pattern: repository calls
with `{ raw: true }`, then `parseEnvelope()` to read `meta.pagination.{nextCursor,hasMore}`
per `.claude/rules/api-integration.md`. Client consumes via `useInfiniteQuery`.

## 7. Auth & Security

- All 6 endpoints sit behind Kong's `core-protected` route (`edu-edge-auth`
  plugin) — Bearer token in httpOnly cookie, server-side hybrid refresh
  (decision `0018`); no client-side token handling.
- **Role gating is BE-enforced but must ALSO be enforced client-side** per
  NFR-008: the `/teacher/question-bank` route (list+search) and
  `/teacher/question-bank/create`/`:id/edit` routes must reject non-teacher
  roles (student/parent: no UI at all; principal/admin: out of scope per
  requirements.md OQ-1/OQ-2, no entry point built) **before any request fires**
  — do not rely solely on the BE 403 as the only gate, since that would flash
  a request/loading state before the denial for a role that should never see
  the screen at all.
- No PII on the wire contract (subjectId/authorId are opaque identifiers).
  `authorId` display-name resolution for search-scope cards is a SEPARATE,
  already-existing lookup (see Open Questions) — not a new PII surface
  introduced by this story.
- Ownership checks (`forbidden-edit`) are enforced server-side (`IsOwnedBy`)
  — the client should still gate the Edit/Publish CTA visibility using the
  already-fetched `authorId === current caller memberId` comparison as a UX
  nicety (hide instead of showing a CTA that will always 403), but this is
  NOT a substitute for the server check.

## 8. Mock-first plan

Even though this is a REAL, ground-truthed contract, `.claude/rules/api-integration.md`'s
decision `0014` dev-default pattern still applies for local/dev-without-BE
convenience — **temporary toggle, not a permanent mock**:

- Gate via `NEXT_PUBLIC_USE_MOCK` env var + `bootstrap/lib/mock.ts` swap
  pattern (existing convention), NOT a hardcoded mock repository with no real
  counterpart.
- Mock payload shape must mirror `QuestionResponse` exactly (all 13 fields
  above, including `tenantId`/`authorId` even if unused in UI, so the mapper
  contract doesn't silently diverge from the real DTO).
- Mock fixtures should include: at least one DRAFT (own), one PUBLISHED (own),
  one PUBLISHED (other author, for search-scope testing), one of each
  `questionType`, and cases at each `difficulty` tier — to exercise every
  badge-mapping path in FR-004 without a live BE.
- Mock error simulation should include a toggle/fixture path to trigger each
  of the 15 failure variants in §3 at least once, especially
  `search-filter-required` (defense-in-depth path) and the split
  `forbidden-browse`/`forbidden-edit` (to verify the mapper's per-call-site
  branch, not just per-code).
- **When real wiring lands**, this mock MUST be removable without changing the
  domain/use-case layer — repository interface (`i-question-bank.repository.ts`,
  named by `fe-component-architect`/engineer, not prescribed here) is the seam.

## 9. Open Questions

- `[OPEN QUESTION]` **Subject dropdown data source**: `requirements.md` assumes
  "existing subject list already consumed elsewhere" but ground-truthing this
  session found `SUBJECT_CATALOGUE_EP` (`bootstrap/endpoint/subject-catalogue.endpoint.ts`)
  is itself documented as **mock-first** ("core service — subject catalogue
  endpoints (mock-first until `core` exists, decision 0014/0017)") — that
  comment appears stale now that `core`'s exercisebank sub-domain is
  confirmed real; **flagging to `ba-lead`**: is `/core/api/v1/subjects` also
  now real (same service, same deploy), or genuinely still unshipped? If real,
  the question-bank's subjectId dropdown should consume `SUBJECT_CATALOGUE_EP.subjects`
  directly (no new endpoint) and that file's stale mock-first comment needs
  correcting too — a small scope creep beyond this story but worth a flag since
  it blocks knowing whether the dropdown is real-wired or mock-first on day one.
- `[OPEN QUESTION]` **`authorId` → display-name resolution** for search-scope
  cards (FR-004's "author attribution"): `QuestionResponse` carries only
  `authorId` (uuid), no name. `requirements.md`'s assumption says this "resolves
  via an existing member/profile lookup already used elsewhere" — I could not
  confirm a batch member-lookup-by-id endpoint in this session's scope (out of
  `exercisebank`'s files). Flagging to `ba-lead`/`fe-lead`: confirm which `iam`
  member endpoint (or existing cached member directory) is intended, and
  whether it supports batch lookup (a search results page will have N distinct
  authorIds per page — an N+1 per-card lookup would be a performance smell).
- `[OPEN QUESTION]` **FR-009 defect** (§1 risk #1): `difficulty` is immutable
  on update per the ground-truthed `UpdateQuestionRequest` struct, contradicting
  `requirements.md` FR-009's "difficulty/body/expectedAnswer/tags editable."
  Flagging to `ba-lead` to correct FR-009 (four immutable fields, not three)
  before `ba-use-case-modeler` writes AC and before `fe` builds the edit form.
- `[OPEN QUESTION]` Confirm with `ba-lead`/BE whether `SUBJECT_NOT_FOUND` (404,
  create-only) should also be a possible response on `PUT /:id` (update) —
  ground-truthed `UpdateQuestionRequest` has no `subjectId` field at all
  (immutable), so this error should be **unreachable on update** by
  construction; noting this only so the failure-union mapping for INT-205
  doesn't need a `subject-not-found` case (intentionally omitted above).
- `[OPEN QUESTION]` (carried from `requirements.md` OQ-2, not this analyst's
  call to resolve) whether principal/admin ever get a question-bank entry
  point — `canBrowseBank` permits MANAGER/ADMIN server-side today, but no
  client route/nav exists for them in this story's scope.
