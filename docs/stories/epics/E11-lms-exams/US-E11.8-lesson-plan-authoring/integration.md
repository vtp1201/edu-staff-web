# US-E11.8 — Teacher Lesson Plan Authoring — Integration Map

Ground-truthed against `../edu-api/services/core/internal/lms/lessonplan/adapter/http/{routes.go,dto/request.go,dto/response.go}`,
`.../core/domain/error/lesson_plan.go`, `.../core/domain/valueobject/ids.go`, and
`../edu-api/services/core/docs/ERROR_CODES.md` (§"LMS — Lesson plan / kho giáo án
(US-052)", lines 332-346) this session (2026-07-17). Also spot-checked
`../edu-api/gateway/kong/kong.yml` (`core-protected` route, lines 138-148):
`/core/api/v1` is stripped by Kong and forwarded to `core:8081/api/v1`, which
matches `routes.go`'s `app.Group("/api/v1/lms/lesson-plans", ...)` mount exactly.
**Confirmed reachable — not a gap.** This mirrors the already-wired
`EXAM_BANK_EP`/`SUBJECT_CATALOGUE_EP` path convention (`/core/api/v1/...`), NOT
the still-unbuilt `LMS_EP` convention (`/lms/api/v1/...` — different, unrelated
service prefix; do not confuse the two when wiring `LESSON_PLAN_EP`).

## 1. Integration Overview

- **6 endpoints**, all in the **`core` service**, `lessonplan` sub-domain.
- **Status: REAL** (ground-truthed Go handler + routes + error taxonomy read
  directly this session, not `openapi.yaml` — flag below if `openapi.yaml`
  drifts from this, same caution as ADR 0056 for exam-bank).
- **Recommended dev posture: `NEXT_PUBLIC_USE_MOCK` env-gated repository swap**
  (mock repo for local dev / Storybook / Playwright without a live core
  instance; real repo wired from day one) — this is the E18-wiring-playbook
  pattern (`moderation.di.ts`, `feed.di.ts`), **not** decision-0014
  permanent-mock (that's reserved for services that don't exist at all; core's
  lessonplan sub-domain exists and is reachable).
- **Risk notes:**
  1. `GET ""` (list mine) and `GET /subject/:subjectId` (browse) do **not**
     accept `subjectId`/`gradeLevel`/`status`/free-text-search as server-side
     query params — see §4 Pagination/Filtering for the exact supported query
     surface. `requirements.md` FR-006/FR-007 describe these as UI-level
     filters; this map resolves the ambiguity the requirements handoff note
     flagged (§4 below) — **client-side filter over the fetched page**, not a
     BE query capability, for everything except `subject/:subjectId`'s `tag`
     param.
  2. `subjectId` reference-data source (dropdown options) is **not** re-solved
     by this contract — see §5 Open Questions; `SUBJECT_CATALOGUE_EP` (already
     wired, mock-first per its own header comment) is the closest existing
     analog but has not been confirmed as the actual data source for this
     screen's subject picker.
  3. No delete, no unpublish — confirmed absent at the routes.go level (6
     routes total, matches FR-011/FR-012 `Won't`).

## 2. Endpoint Catalogue

```
INT-118-01  Create Lesson Plan (DRAFT)
Service: core    Method+Path: POST /core/api/v1/lms/lesson-plans
Status: REAL (routes.go:26, dto/request.go CreateLessonPlanRequest)
Protected: yes   Role required: TEACHER (enforced server-side; ownership = caller becomes teacherId)
Request (outbound, camelCase):
  subjectId       — uuid, required                       | Internal
  gradeLevel      — string, required, max 20              | Internal
  title           — string, required, max 200              | Internal
  objectives      — string, optional, max 5000             | Internal
  contentOutline  — string, optional, max 20000             | Internal
  activities      — string, optional, max 20000             | Internal
  assessmentMethod— string, optional, max 5000              | Internal
  tags            — string[], optional, max 10 items, each max 50 chars | Internal
Response payload (inbound, after envelope unwrap): LessonPlanResponse (see §3 shape)
Pagination: none (single-resource create)
Errors → UI behavior:
  - LESSON_PLAN_TITLE_REQUIRED (400) → inline field error on title, save blocked | not retryable
  - LESSON_PLAN_TITLE_TOO_LONG (400) → inline field error on title | not retryable
  - LESSON_PLAN_TAG_TOO_LONG (400) → inline field error on the offending tag chip | not retryable
  - LESSON_PLAN_TAG_LIMIT_EXCEEDED (422) → inline helper under tag input, 11th tag blocked | not retryable
  - LESSON_PLAN_INVALID_SUBJECT_ID (400) → inline field error on subject picker | not retryable
  - SUBJECT_NOT_FOUND (404) → inline field error on subject picker ("subject no longer exists, pick another") | not retryable
  - FORBIDDEN_ACTION (403) → generic error banner (caller not TEACHER) | not retryable
  - network/5xx → generic error banner, form state preserved, retry available | retryable
Empty / loading expectation: form starts blank/prefilled from create-modal inputs; submit shows inline spinner on the Create CTA, no skeleton (no data fetch on this action).

INT-118-02  List My Lesson Plans
Service: core    Method+Path: GET /core/api/v1/lms/lesson-plans
Status: REAL (routes.go:27, lesson_plan_handler.go ListMine)
Protected: yes   Role required: TEACHER (server scopes results to caller's own teacherId)
Request (outbound, camelCase — QUERY PARAMS ONLY, confirmed against handler):
  cursor — string, optional (opaque pagination cursor)     | Internal
  limit  — number, optional (page size)                     | Internal
  NOTE: no subjectId/gradeLevel/status/search query params exist server-side — see §4.
Response payload (inbound): { items: LessonPlanResponse[] } — both DRAFT and PUBLISHED plans owned by caller
Pagination: cursor (meta.pagination.nextCursor / hasMore) — see §4
Errors → UI behavior:
  - LESSON_PLAN_INVALID_CURSOR (400) → drop the stale cursor, refetch first page, no user-visible error (defensive) | not retryable
  - FORBIDDEN_ACTION (403) → generic error banner (should not occur for own-list; treat as unknown-in-practice) | not retryable
  - network/5xx → EduError banner + retry | retryable
Empty / loading expectation: skeleton card grid on first load; "no plans yet" empty state with "create new plan" CTA when items=[] and no client-side filters active; distinct "no results for these filters" empty state (with "clear filters" action) when items=[] but filters ARE active (client-side, see §4).

INT-118-03  Browse Published Lesson Plans by Subject
Service: core    Method+Path: GET /core/api/v1/lms/lesson-plans/subject/:subjectId
Status: REAL (routes.go:28, lesson_plan_handler.go ListBySubject)
Protected: yes   Role required: TEACHER (any teacher/manager/admin in tenant; visibility = PUBLISHED-only, cross-teacher by design)
Request (outbound, camelCase):
  subjectId — uuid, required, PATH param                    | Internal
  tag       — string, optional, QUERY param (server-side tag filter — confirmed, the ONE real server-side filter beyond cursor/limit) | Internal
  cursor    — string, optional                                | Internal
  limit     — number, optional                                | Internal
  NOTE: no gradeLevel query param exists server-side — see §4.
Response payload (inbound): { items: LessonPlanResponse[] } — PUBLISHED plans only, any owner, scoped to subjectId
Pagination: cursor (meta.pagination.nextCursor / hasMore)
Errors → UI behavior:
  - LESSON_PLAN_INVALID_SUBJECT_ID (400) → treat as programming error (subjectId comes from a validated picker); generic error banner if reached | not retryable
  - LESSON_PLAN_INVALID_CURSOR (400) → drop stale cursor, refetch first page | not retryable
  - network/5xx → EduError banner + retry | retryable
Empty / loading expectation: DISTINCT prompt state "choose a subject to browse" when no subjectId selected yet (client-side gate, no fetch fires) — not a generic empty state; skeleton grid once a subject is chosen and fetch is in flight; "no published plans for this subject" empty state (no create CTA in this scope, per FR-007) when items=[].

INT-118-04  Get One Lesson Plan
Service: core    Method+Path: GET /core/api/v1/lms/lesson-plans/:id
Status: REAL (routes.go:29, lesson_plan_handler.go Get)
Protected: yes   Role required: TEACHER (any tenant member; server enforces the owner/PUBLISHED visibility matrix — see FR-008)
Request (outbound, camelCase):
  id — uuid, required, PATH param                             | Internal
Response payload (inbound): single LessonPlanResponse (see §3 shape)
Pagination: none
Errors → UI behavior:
  - LESSON_PLAN_NOT_FOUND (404) → distinct "not found" error state, redirect to list | not retryable
  - LESSON_PLAN_NOT_VISIBLE (403) → distinct "access denied" error state (NOT styled as generic not-found — per FR-008 requirement), redirect to list | not retryable
  - LESSON_PLAN_INVALID_ID (400) → malformed id in URL; treat as not-found style redirect (defensive, should not occur from in-app navigation) | not retryable
  - network/5xx → EduError banner + retry, stay on route | retryable
Empty / loading expectation: skeleton builder/detail layout while fetching; no empty state (single-resource fetch — 404 IS the "doesn't exist" signal, not an empty list).

INT-118-05  Update Lesson Plan (DRAFT only)
Service: core    Method+Path: PUT /core/api/v1/lms/lesson-plans/:id
Status: REAL (routes.go:30, dto/request.go UpdateLessonPlanRequest)
Protected: yes   Role required: TEACHER, owner only (server enforces both)
Request (outbound, camelCase — NOTE: subjectId is NOT in this body, immutable post-create):
  gradeLevel      — string, required, max 20                 | Internal
  title           — string, required, max 200                 | Internal
  objectives      — string, optional, max 5000                | Internal
  contentOutline  — string, optional, max 20000                | Internal
  activities      — string, optional, max 20000                | Internal
  assessmentMethod— string, optional, max 5000                 | Internal
  tags            — string[], optional, max 10 items, each max 50 chars | Internal
Response payload (inbound): updated LessonPlanResponse (updatedAt refreshed)
Pagination: none
Errors → UI behavior:
  - LESSON_PLAN_TITLE_REQUIRED (400) → inline field error on title, save blocked | not retryable
  - LESSON_PLAN_TITLE_TOO_LONG (400) → inline field error on title | not retryable
  - LESSON_PLAN_TAG_TOO_LONG (400) → inline field error on offending tag chip | not retryable
  - LESSON_PLAN_TAG_LIMIT_EXCEEDED (422) → inline helper under tag input | not retryable
  - LESSON_PLAN_ALREADY_PUBLISHED (422) → error banner ("this plan was published elsewhere"), form auto-locks to read-only, refetch to sync | not retryable
  - LESSON_PLAN_NOT_FOUND (404) → error banner, redirect to list | not retryable
  - LESSON_PLAN_NOT_VISIBLE (403) / FORBIDDEN_ACTION (403) → error banner (not owner), redirect to list | not retryable
  - network/5xx → error banner, form state preserved, retry available | retryable
Empty / loading expectation: no skeleton (in-place save on an already-loaded builder); inline "saving..." indicator on Save Draft CTA; "unsaved changes" dot clears on success (FR-010).

INT-118-06  Publish Lesson Plan (one-way DRAFT→PUBLISHED)
Service: core    Method+Path: PUT /core/api/v1/lms/lesson-plans/:id/publish
Status: REAL (routes.go:31, lesson_plan_handler.go Publish)
Protected: yes   Role required: TEACHER, owner only
Request (outbound): no body — id is the only input (path param)
Response payload (inbound): LessonPlanResponse with status="PUBLISHED", publishedAt set (RFC3339)
Pagination: none
Errors → UI behavior:
  - LESSON_PLAN_ALREADY_PUBLISHED (422) → confirm dialog closes, error banner ("already published"), UI refreshes to locked view | not retryable
  - LESSON_PLAN_TITLE_REQUIRED / LESSON_PLAN_TITLE_TOO_LONG (400) → dialog closes, inline field error(s), plan remains DRAFT (BE re-validates title even though client-side FR-003 gate should have caught it) | not retryable
  - LESSON_PLAN_TAG_LIMIT_EXCEEDED / LESSON_PLAN_TAG_TOO_LONG (422/400) → dialog closes, inline tag error, plan remains DRAFT | not retryable
  - LESSON_PLAN_NOT_FOUND (404) → error banner, redirect to list | not retryable
  - LESSON_PLAN_NOT_VISIBLE (403) / FORBIDDEN_ACTION (403) → error banner (not owner), redirect to list | not retryable
  - network/5xx → error banner, retry-publish CTA available, plan remains DRAFT | retryable
Empty / loading expectation: confirm dialog shows inline spinner on its confirm button while in flight; no skeleton (builder already loaded).
```

## 3. Response shape reference (all 6 endpoints share this entity)

`LessonPlanResponse` (post-unwrap, camelCase, ground-truthed
`dto/response.go`):

| Field | Type | Notes |
| --- | --- | --- |
| `planId` | string (uuid) | |
| `teacherId` | string (uuid) | owner |
| `subjectId` | string (uuid) | immutable post-create |
| `gradeLevel` | string | free string, max 20 |
| `title` | string | |
| `objectives` | string | one of the 4 document sections; plain text |
| `contentOutline` | string | plain text |
| `activities` | string | plain text |
| `assessmentMethod` | string | plain text |
| `status` | `"DRAFT" \| "PUBLISHED"` | no other values exist — 2-state, not a richer enum |
| `tags` | string[] | `[]` not `null` (server normalizes) |
| `publishedAt` | string (RFC3339) | **omitted** (key absent, `omitempty`) for DRAFT — UI must treat missing key as "not published", not as an error/empty-string case |
| `createdAt` | string (RFC3339) | always present |
| `updatedAt` | string (RFC3339) | always present |

List endpoints (`INT-118-02`, `INT-118-03`) wrap this in `{ items: LessonPlanResponse[] }`.

## 4. Pagination & filtering (resolves requirements.md's handoff question)

- Both list endpoints are **cursor-paginated** per `.claude/rules/api-integration.md`:
  call with `{ raw: true }`, then `parseEnvelope()` to read
  `meta.pagination.nextCursor` / `meta.pagination.hasMore` (same pattern as
  `exam-bank.repository.ts`'s `raw: true` sibling-of-`params` placement — do
  not nest it inside `params`, that was a prior regression class, US-E18.2/19).
  Wire via TanStack Query `useInfiniteQuery`.
- **Confirmed server-side query support** (ground-truthed handler code, not
  assumed):
  - `GET ""` (list mine): `cursor`, `limit` ONLY.
  - `GET /subject/:subjectId`: `tag` (single tag string), `cursor`, `limit`.
- **NOT supported server-side** (resolve requirements.md's open handoff note
  explicitly): `subjectId`/`gradeLevel`/`status`/free-text `search` filters on
  "list mine", and `gradeLevel` filter on "browse by subject". These MUST be
  implemented as **client-side filters over the fetched page(s)** — i.e. the
  status/subject/grade/search dropdowns in the design-spec filter row narrow
  what's already been paginated in, they do not become new query params sent
  to the BE. This has a UX consequence worth flagging to `ba-use-case-modeler`:
  a filter can appear to return few/no results even though more matching items
  exist on a later cursor page — the AC should describe this as "filters apply
  to the currently loaded page(s); load more to see additional matches" rather
  than implying a true server-side search.
  - Exception: the "Toàn trường" browse scope's `tag` filter (if the design
    exposes one) COULD be server-side via the `tag` query param — but the
    design-spec's grade dropdown in that scope is client-side only.

## 5. Auth & Security

- All 6 routes are mounted under Kong's `edu-edge-auth`-protected `/core/api/v1`
  prefix (confirmed `kong.yml` `core-protected` route) — every call requires a
  valid Bearer session; use the existing `createServerHttpClient()` (server
  action / DI factory) for authenticated calls, `createHttpClient(token)` only
  if a client-side call is ever needed (not expected for this feature — all
  calls originate from Server Actions per Clean-Architecture layering).
- Role gate: **TEACHER** only, per `story.md`/`requirements.md` and confirmed
  by the BE's `ActorRoles`/ownership checks in every use-case input. No
  principal/admin read path exists on the wire today (see Open Questions).
- Ownership enforcement is **server-side authoritative** — `Update`/`Publish`
  check `teacherId == caller` server-side; the UI's disabled-state gating
  (FR-002/FR-005) is defense-in-depth only, never the source of truth
  (NFR-005).
- PII/sensitivity: `teacherId` (uuid, internal identifier, not raw PII but
  identifies the authoring staff member) appears on every response, including
  cross-teacher browse (`INT-118-03`) — the UI resolves it to a display name
  via whatever existing staff-directory/member lookup the design's "owner name
  shown on each card" (FR-007) already depends on; this map does not introduce
  a new name-resolution endpoint (out of scope — flag to `ba-use-case-modeler`
  if no existing lookup covers `teacherId → displayName` for this screen).
- No token handling in the UI — httpOnly cookie server-side per
  `.claude/rules/api-integration.md`; no new auth mechanism.

## 6. Mock-first plan

Recommend `NEXT_PUBLIC_USE_MOCK` env-gated repository swap in the feature's
`bootstrap/di/lesson-plan.di.ts` (mirrors `moderation.di.ts`/`feed.di.ts`
pattern, NOT decision-0014 permanent mock — the contract is real and stable):

```
async function makeRepo(): Promise<ILessonPlanRepository> {
  if (USE_MOCK) return new MockLessonPlanRepository();
  return new LessonPlanRepository(await createServerHttpClient());
}
```

Mock repo payload shape needed (in-memory, seeded on module load):

- A small seeded array of `LessonPlanResponse`-shaped objects, mixing DRAFT
  (owned by the seeded "current teacher" mock identity) and PUBLISHED (mix of
  own + other-teacher) plans across 2-3 seeded subjects, so both `list mine`
  and `browse by subject` scopes have non-empty data to demo empty/non-empty
  states.
- Mock `create`/`update`/`publish` mutate the in-memory array and return the
  updated shape, matching the real handler's response shape exactly (same
  field names/types) so swapping `USE_MOCK` off requires zero UI change.
- Mock must simulate `publishedAt` omission for DRAFT (don't set the key, or
  set to `undefined` and ensure the mapper treats `undefined` the same as a
  genuinely-absent JSON key).
- Mock cursor pagination: a trivial in-memory cursor (e.g. index-based,
  base64-encoded) sufficient to exercise `useInfiniteQuery`'s `hasMore`/`nextCursor`
  UI wiring without needing real BE cursor semantics.
- Seed at least one plan with 10 tags (to demo the tag-limit-reached UI state)
  and one with a title at exactly 200 chars (boundary case).

`LESSON_PLAN_EP` endpoint group (additive, new file `bootstrap/endpoint/lesson-plan.endpoint.ts`
per story.md's "Shared contract/file" note — do NOT add to `lms.endpoint.ts`,
whose header comment explicitly says "mock-first, `lms` service not shipped" —
that's a different, still-unbuilt service; lesson-plan is `core`):

```
export const LESSON_PLAN_EP = {
  list: "/core/api/v1/lms/lesson-plans",
  create: "/core/api/v1/lms/lesson-plans",
  detail: (id: string) => `/core/api/v1/lms/lesson-plans/${id}`,
  update: (id: string) => `/core/api/v1/lms/lesson-plans/${id}`,
  publish: (id: string) => `/core/api/v1/lms/lesson-plans/${id}/publish`,
  bySubject: (subjectId: string) => `/core/api/v1/lms/lesson-plans/subject/${subjectId}`,
} as const;
```

## 7. Failure-union design

Proposed `LessonPlanFailure` union (mirrors `ExamBankFailure`'s established
shape/comment style — `errorCodeOf`/`statusOf` branch on `code`, never
message, per `.claude/rules/api-integration.md`):

```
export type LessonPlanFailure =
  | { type: "not-found" }              // LESSON_PLAN_NOT_FOUND
  | { type: "not-visible" }            // LESSON_PLAN_NOT_VISIBLE
  | { type: "already-published" }      // LESSON_PLAN_ALREADY_PUBLISHED
  | { type: "tag-limit-exceeded" }     // LESSON_PLAN_TAG_LIMIT_EXCEEDED
  | { type: "title-required" }         // LESSON_PLAN_TITLE_REQUIRED
  | { type: "title-too-long" }         // LESSON_PLAN_TITLE_TOO_LONG
  | { type: "tag-too-long" }           // LESSON_PLAN_TAG_TOO_LONG
  | { type: "subject-not-found" }      // SUBJECT_NOT_FOUND
  | { type: "invalid-id" }             // LESSON_PLAN_INVALID_ID / _TENANT_ID / _SUBJECT_ID / _MEMBER_ID
  | { type: "invalid-cursor" }         // LESSON_PLAN_INVALID_CURSOR
  | { type: "forbidden" }              // FORBIDDEN_ACTION
  | { type: "network-error" }
  | { type: "unknown"; message?: string };
```

Mapper (`map-lesson-plan-error.ts`, same shape as `map-exam-bank-error.ts`):

```
switch (code) {
  case "LESSON_PLAN_NOT_FOUND": return "not-found";
  case "LESSON_PLAN_NOT_VISIBLE": return "not-visible";
  case "LESSON_PLAN_ALREADY_PUBLISHED": return "already-published";
  case "LESSON_PLAN_TAG_LIMIT_EXCEEDED": return "tag-limit-exceeded";
  case "LESSON_PLAN_TITLE_REQUIRED": return "title-required";
  case "LESSON_PLAN_TITLE_TOO_LONG": return "title-too-long";
  case "LESSON_PLAN_TAG_TOO_LONG": return "tag-too-long";
  case "SUBJECT_NOT_FOUND": return "subject-not-found";
  case "LESSON_PLAN_INVALID_ID":
  case "LESSON_PLAN_INVALID_TENANT_ID":
  case "LESSON_PLAN_INVALID_SUBJECT_ID":
  case "LESSON_PLAN_INVALID_MEMBER_ID": return "invalid-id";
  case "LESSON_PLAN_INVALID_CURSOR": return "invalid-cursor";
  case "FORBIDDEN_ACTION": return "forbidden";
}
// generic status fallback: 403 -> "forbidden", 404 -> "not-found",
// retryable -> "network-error", else "unknown"
```

Note: BE's `apperror.New` messages are i18n *keys* in snake_case
(`lesson_plan_not_found`, etc. — see `error/lesson_plan.go`); per decision
0008/ADR pattern already established for `core`, the wire `code` the web
client reads via `errorCodeOf` is the UPPER_SNAKE form (`codeFromKey` at the
HTTP boundary, same as exam-bank's `EXAM_PAPER_NOT_FOUND` from
`exam_paper_not_found`) — confirm this transform is consistent for lessonplan
too when `fe-nextjs-engineer` wires the real repository (flagged, not
independently re-verified at the HTTP-boundary transform layer this session —
only the domain error constructors were read).

## 8. Open Questions

- `[OPEN QUESTION]` Subject reference-data source for the create-form/browse
  subject picker: is it `SUBJECT_CATALOGUE_EP.subjects` (already wired,
  currently mock-first per its own file header) or a different existing
  subject-list dependency already consumed by exam-bank/lesson-bank? Requirements.md
  assumes reuse but does not name the exact endpoint; confirm before
  `ba-use-case-modeler` writes the subject-picker AC, to avoid inventing a
  second subject-list integration.
- `[OPEN QUESTION]` `teacherId → display name` resolution for the "Toàn trường"
  browse cards (FR-007's "owner name shown on each card") — no endpoint in
  this contract returns a name, only a uuid. Needs an existing
  member/staff-directory lookup; not resolved by this map.
- `[OPEN QUESTION]` (carried from requirements.md, unresolved by this contract
  read) — principal/admin read access to PUBLISHED plans: the ground-truthed
  contract's `ActorRoles` check plus `LESSON_PLAN_NOT_VISIBLE`'s definition
  ("not the owner, not a manager/admin, and either DRAFT or subject outside
  visible set" — per the Go doc comment on `ErrLessonPlanNotVisible`) suggests
  manager/admin visibility MAY already be modeled server-side beyond
  teacher-to-teacher, but this was not exercised/confirmed against an actual
  manager-role request in this session (only the error-constructor doc comment
  was read, not the visibility use-case's role-branching logic in depth). If
  `ba-use-case-modeler`/`ba-lead` need a definitive answer, read
  `core/application/usecase/get_lesson_plan.go`'s visibility logic directly
  before locking role gating in `spec.md` — this could change whether
  principal/admin should get a read-only route in scope, which would be a
  scope change, not a BE gap, if the server already supports it.
- `[OPEN QUESTION]` HTTP-boundary error-code casing transform
  (snake_case domain key → UPPER_SNAKE wire code) was not independently
  re-verified for lessonplan specifically (only confirmed by analogy to
  exam-bank's established `codeFromKey` pattern) — `fe-nextjs-engineer` should
  do one real integration-test round-trip against a running core instance (or
  ask `/be`) before finalizing the failure mapper, per the same caution ADR
  0056 raised for exam-bank's write-path drift.
