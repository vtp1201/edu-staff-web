# Feature Spec — Teacher Question Bank (US-E11.9)

Status: Draft   Lane: normal
Sources: `requirements.md` (TR-119, FR-001..FR-014, NFR-001..008) + `integration.md`
(INT-201..INT-206, `QuestionBankFailure` union) + `use-cases.md` (UC-901..UC-907,
AC-901.1..AC-907.4, 72 ACs) + `docs/product/design-spec.jsonc` `screens.questionBank`
(corrected 2026-07-17: `expectedAnswerField.required:false`, `publish.disabledUntil`
no longer names expectedAnswer) + `design_src/edu/question-bank.jsx` + ADR `0057`
(publish terminology).

This spec consolidates, does not re-derive: all settled facts below are carried
forward verbatim from the prior three packet files and are NOT re-opened.

---

## 1. Scope & Objectives

**Purpose.** Give a teacher a personal, reusable bank of ESSAY/SHORT_ANSWER/
FILL_IN questions — author as DRAFT, publish one-way to PUBLISHED (irreversible,
school-wide visible), and search other teachers' PUBLISHED questions gated behind
a mandatory subjectId-or-tag filter that mirrors the BE's `422
QUESTION_SEARCH_FILTER_REQUIRED` client-side.

**In-scope** (verbatim from `requirements.md` §Scope):
- List own questions (DRAFT+PUBLISHED), no mandatory filter.
- Search cross-teacher PUBLISHED questions with mandatory subjectId-or-tag
  client-side gate (+ server-side defense-in-depth mapping).
- Create DRAFT question (3 types: ESSAY/SHORT_ANSWER/FILL_IN, no MCQ).
- Edit own DRAFT question — `questionType`/`subjectId`/`gradeLevel`/`difficulty`
  immutable (all 4, corrected FR-009); only `body`/`expectedAnswer`/`tags` editable.
- One-way publish DRAFT→PUBLISHED with irreversible confirm.
- Read-only locked view of PUBLISHED questions (own or cross-teacher).
- Tag-chips input (create/edit + search-as-tag).
- Difficulty 3-tier badge (EASY/MEDIUM/HARD → success/warning/error).
- Secondary filters: questionType, difficulty, gradeLevel, (scope=mine) status.

**Out-of-scope** (verbatim):
- `src/features/exam-bank` (MCQ exam papers, different BE service, US-E18.15,
  untouched).
- `LMS_EP.questions` (per-lesson Q&A thread, unrelated BE entity — do not confuse
  or reuse).
- Delete action — no BE endpoint exists.
- Unpublish/revert — publish is one-way at the BE.
- MCQ options-editor UI — no `options[]` field on `QuestionResponse` (cross-repo
  ask #24).
- Principal/admin-facing surface — BE `canBrowseBank` permits MANAGER/ADMIN to
  search, but `design-spec.jsonc` scopes `roles: ["teacher"]` only; see OQ-2.
- `src/features/lesson-plan` (US-E11.8, sibling DR-021 story, separate BE entity).

**Definitions.**
- *Scope* (UI term) = the list screen's `mine`/`search` toggle — NOT to be
  confused with this spec's own "in/out of scope" sections.
- *Mandatory-filter gate* = the client-side rule blocking any
  `GET /questions/search` request until `subjectId != "all"` OR `tag` non-empty.
- *Immutable fields* = `questionType`, `subjectId`, `gradeLevel`, `difficulty` —
  settable only at create, permanently read-only afterward.

---

## 2. Actors & Roles

| Role | Access | Notes |
| --- | --- | --- |
| **Teacher** | Full — create/edit/publish own DRAFT; list own (DRAFT+PUBLISHED); search cross-teacher PUBLISHED (mandatory filter); view any PUBLISHED read-only. | Primary actor for all 7 use cases. |
| Principal (MANAGER wire-role) | None built this story | BE `canBrowseBank` technically permits search, but no route/nav entry point exists (`design-spec.jsonc roles: ["teacher"]`, route family `/teacher/**`). Backlog decision, see OQ-2 — do NOT silently grant. |
| Admin | None built this story | Same as principal — BE-permitted, no client surface. |
| Student | **Hard-forbidden** | BE `canBrowseBank` explicitly denies (VULN-001 gate). No nav item, no route access — route guard rejects before any request (UC-907). |
| Parent | **Hard-forbidden** | Same as student. |

Role-gated visibility: the three routes (`/teacher/question-bank`,
`/create`, `/:id/edit`) render **only** for `teacher`. Client-side guard MUST
precede any network call (NFR-008/BR-907.1) — a bypassed guard still needs the
defensive `forbidden-browse` mapping (AC-901.8/AC-902.9/AC-903.18) so a
regression fails safely, not silently or with a crash.

---

## 3. Functional Requirements

Each FR below: priority, source, SHALL statement, ≥2 AC (Given/When/Then, full
text in `use-cases.md` §4 — cited here by AC-ID), dependencies.

### FR-001 — List screen + scope toggle
**Must** · Source: TR-119 FR-001, UC-901/902
The system SHALL render `/teacher/question-bank` with a scope toggle (`Của tôi`
i.e. mine / `Tìm kiếm` i.e. search) defaulting to `mine`; switching scope changes
the data source (`GET /questions` vs `GET /questions/search`).
- AC-901.1: Given teacher opens `/teacher/question-bank`, When `GET /questions`
  is in flight, Then skeleton rows (count=4) render within ≤100ms.
- AC-902.1: Given the teacher switches scope to search with no filter set, When
  the switch completes, Then `QBFilterRequiredPrompt` renders and no request fires.
Dependencies: FR-002/003 (search's gate), INT-201/INT-202.

### FR-002 — Mandatory search-filter gate (client pre-validation)
**Must** · Source: TR-119 FR-002, UC-902, integration.md §4
The system SHALL block any `GET /questions/search` call client-side (never
invoke the repository/use-case) whenever scope=search AND neither `subjectId`
nor a non-empty `tag` is set, rendering `QBFilterRequiredPrompt` instead — and
SHALL map a defense-in-depth `422 QUESTION_SEARCH_FILTER_REQUIRED` (should the
client gate ever be bypassed) to the SAME state, never a generic error banner.
- AC-902.1 (landing, no filter → prompt, no request).
- AC-902.4 (gate re-imposed when both filters cleared after a satisfied search).
- AC-902.8 (defense-in-depth 422 → same prompt, not an error banner).
Dependencies: FR-003 (satisfaction rule), INT-201.

### FR-003 — Mandatory-filter satisfaction + indicator
**Must** · Source: TR-119 FR-003, UC-902
The system SHALL treat the gate (FR-002) as satisfied when EITHER the
`subjectId` dropdown is non-"all" OR the tag/search text field is non-empty, and
SHALL reflect satisfied/unsatisfied via `mandatoryFilterIndicator` (icon+text —
check/success when satisfied, alertTriangle/warning when not; never color alone).
- AC-902.2 (satisfied via subject → indicator flips, request fires).
- AC-902.3 (satisfied via tag → indicator flips, request fires after 300–400ms debounce).
Dependencies: FR-002, FR-013 (debounce), NFR-001/003.

### FR-004 — Row card content
**Must** · Source: TR-119 FR-004, UC-901/902
The system SHALL render each question as a row card with: type badge (icon+label,
distinct hue per type — ESSAY purple / SHORT_ANSWER primary / FILL_IN teal),
difficulty badge (EASY→success, MEDIUM→warning, HARD→error, icon+label), status
chip (DRAFT=warning, PUBLISHED=success; scope=mine only ever shows DRAFT among
the two — PUBLISHED also possible for own list), subject chip, grade, 140-char
truncated body preview, tag pills, and (scope=search only) author attribution.
- AC-901.2 (own-scope card shape, no author attribution).
- AC-902.6 (search-scope card shape, WITH author attribution, PUBLISHED-only).
Dependencies: FR-001, INT-201/202 response shape (§6).

### FR-005 — Secondary filters (client/server split)
**Must** · Source: TR-119 FR-005, integration.md §5, UC-901/902
The system SHALL support secondary filters — questionType, difficulty (both
scopes), gradeLevel (both scopes), and (scope=mine only) status — combinable
with the mandatory filter but NOT themselves satisfying the gate. Per the
ground-truthed BE contract, these are split:

| Filter | scope=mine | scope=search |
| --- | --- | --- |
| questionType | client-side only (no server param) | client-side only (no server param) |
| difficulty | client-side only | server, but only when the gate is satisfied via `subjectId` (ignored on by-tag path — client-side fallback in tag-mode) |
| gradeLevel | client-side only | same caveat as difficulty |
| status | client-side only (BE returns both DRAFT+PUBLISHED, no status param) | n/a (search is PUBLISHED-only by construction) |

- AC-901.6 (status client-filter, no server param sent).
- AC-902.12 (questionType always client-side, no param exists).
- AC-902.13 (tag-mode: gradeLevel/difficulty do NOT narrow server results — UI
  must not misrepresent this).
- AC-902.14 (subject-mode: gradeLevel/difficulty DO narrow server results).
Dependencies: INT-201/202 query-param support; `fe-state-engineer` decides the
accumulate/load-more strategy across client-filtered pages (see §8 OQ).

### FR-006 — Create builder
**Must** · Source: TR-119 FR-006, UC-903, design-spec `builderScreen`
The system SHALL provide `/teacher/question-bank/create` with: a 3-option
segmented `questionType` selector (ESSAY/SHORT_ANSWER/FILL_IN, icons
scrollText/edit/list — no MCQ), a subject/grade/difficulty field group (grid
`1.4fr 1fr 1fr`, stacks to 1-col on mobile), a `body` textarea (rows 6/ESSAY,
4/SHORT_ANSWER, 3/FILL_IN; min 4/max 5000 chars; type-specific placeholder), an
`expectedAnswer` textarea (rows 4/ESSAY, 2/SHORT_ANSWER, 2/FILL_IN; max 5000
chars; type-specific placeholder), and a tag-chips input (max 10 tags × 50 chars).
- AC-903.1 (3-option selector, no MCQ).
- AC-903.2/903.3/903.4 (per-type row counts + placeholders).
Dependencies: FR-007/008 (validation), INT-203.

### FR-007 — expectedAnswer optional for all 3 types (never a publish gate)
**Must** · Source: TR-119 FR-007 (ground-truthed, integration.md §1 risk #4),
design-spec `expectedAnswerField.required:false`/`publish.disabledUntil`
(corrected 2026-07-17), UC-903/905
The system SHALL treat `expectedAnswer` as OPTIONAL for ESSAY, SHORT_ANSWER, AND
FILL_IN on both create and update (`*string`, `omitempty,max=5000`, no per-type
required rule at the BE) and SHALL NOT block save-as-draft, update, or Publish
on an empty `expectedAnswer` for any questionType.
- AC-903.5/903.6/903.7 (blank expectedAnswer saves successfully, per type).
- AC-905.1 (Publish CTA enabled purely on `body` validity; empty expectedAnswer
  never gates publish).
Dependencies: none — this is a terminal, ground-truthed rule; do not add a
required-expectedAnswer validation anywhere in the builder or publish flow.

### FR-008 — Client-side field validation (parity with BE)
**Must** · Source: TR-119 FR-008, UC-903/904
The system SHALL validate: `body` required, min 4 chars (client UX floor)/max
5000 chars; `subjectId` required (uuid); `gradeLevel` required; `difficulty`
required (EASY/MEDIUM/HARD); `questionType` required, fixed to
ESSAY/SHORT_ANSWER/FILL_IN (MCQ rejected before submit); `tags` optional, max 10
entries × max 50 chars each.
- AC-903.8/903.9/903.10 (body required/min/max boundaries).
- AC-903.11/903.12 (tag count/length boundaries).
Dependencies: FR-006, INT-203/205 error taxonomy (§6).

### FR-009 — Immutable fields on edit (CORRECTED: 4 fields, not 3)
**Must** · Source: TR-119 FR-009 as corrected 2026-07-17 by `ba-lead`/ground-truthed
`integration.md` §1 risk #1 (`UpdateQuestionRequest` Go struct has only
`body`/`expectedAnswer`/`tags` — `difficulty` is NOT in the update DTO, same as
`questionType`/`subjectId`/`gradeLevel`), UC-904
The system SHALL render `questionType`, `subjectId`, `gradeLevel`, AND
`difficulty` (all FOUR) as read-only/disabled on the edit builder
(`/teacher/question-bank/:id/edit`, DRAFT-only), and SHALL send only
`{body, expectedAnswer, tags}` in the `PUT /:id` request body — never the four
locked fields.
- AC-904.1 (all 4 fields disabled, body/expectedAnswer/tags editable).
- AC-904.3 (PUT body contains only the 3 mutable fields; success re-renders
  updated values).
Dependencies: INT-205 request contract (§6); FR-011 (locked view once PUBLISHED).

### FR-010 — One-way Publish
**Must** · Source: TR-119 FR-010, UC-905, ADR `0057` (terminology)
The system SHALL provide a Publish action (`PUT /:id/publish`) on a DRAFT
question the teacher authored, gated behind a confirm dialog explicitly stating
irreversibility, enabled once `body` is valid (per FR-007, `expectedAnswer`
never gates it).
- AC-905.2 (confirm dialog states irreversibility explicitly).
- AC-905.5 (success → status PUBLISHED, publishedAt set, transitions to locked view).
- AC-905.6 (`422 QUESTION_ALREADY_PUBLISHED` → benign refresh to locked view +
  informational toast, NOT a red error banner).
Dependencies: FR-007, FR-011, INT-206.

### FR-011 — PUBLISHED question fully locked/read-only
**Must** · Source: TR-119 FR-011, UC-906
The system SHALL render any PUBLISHED question (own or cross-teacher) as fully
locked — all fields disabled, no Save/Publish CTA, only a back/close action —
since `PUT /:id` is DRAFT-only and no unpublish path exists.
- AC-906.2 (all fields read-only, locked banner, no write CTA).
- AC-906.6 (Edit CTA hidden — not merely disabled — on cross-teacher PUBLISHED
  cards, via client-side `authorId === current memberId`, UX nicety only, not a
  security boundary).
Dependencies: FR-009 (edit-route detects PUBLISHED → redirects here), INT-204.

### FR-012 — No delete action anywhere
**Must** (negative requirement) · Source: TR-119 FR-012
The system SHALL NOT expose a delete action on any question (list, create,
edit) — no BE endpoint exists.
- No AC number assigned (negative requirement, confirmed absent throughout
  `use-cases.md`) — traceability: verified by the absence of any delete
  affordance in every UC's main/alt/exception flow.
Dependencies: none.

### FR-013 — Debounce free-text search/tag input
**Should** · Source: TR-119 FR-013, UC-902
The system SHALL debounce the search/tag input (recommended 300–400ms) in
scope=search before firing `GET /questions/search`, once the gate (FR-002/003)
is satisfied via tag text.
- AC-902.3 (request fires after debounce interval, no further keystrokes).
Dependencies: FR-003.

### FR-014 — No MCQ options-editor (negative requirement)
**Won't** · Source: TR-119 FR-014
The system SHALL NOT design or expose an MCQ options-editor UI — no
`options[]` field exists on `QuestionResponse` (cross-repo ask #24).
Dependencies: none.

---

## 4. Non-Functional Requirements

| ID | Category | Requirement | Measurable target | QA verification |
| --- | --- | --- | --- | --- |
| NFR-001 | a11y (AA) | Every badge (type/difficulty/status) pairs icon+text, never color alone; warning-tone text uses `--edu-warning-foreground`/`--edu-warning-text`, never white-on-yellow. | Contrast ≥4.5:1 body text / ≥3:1 large text+icons. | `/impeccable audit` zero contrast findings + manual check. |
| NFR-002 | a11y (AA) | questionType selector, all form fields, filter dropdowns, scope toggle fully keyboard-operable with visible focus ring; inline errors wired via `id`+`role='alert'`+`aria-describedby`. | 100% interactive elements reachable/operable via Tab/Enter/Space; zero keyboard-trap findings. | Manual keyboard-only pass on create/edit/list/search flows. |
| NFR-003 | a11y (AA) | Scope toggle uses `role='group'` + `aria-label`, `aria-pressed=true` on active option; mandatory-filter indicator conveys satisfied/unsatisfied via icon+text. | Screen-reader announces group label + pressed state; zero violations on this control. | Automated a11y audit + manual screen-reader spot check. |
| NFR-004 | a11y (AA) / motion | All dialog/toast fade-in transitions gated behind `@media (prefers-reduced-motion: reduce)`. | Zero un-gated animation/transition CSS shipped. | Code review + `/impeccable audit`. |
| NFR-005 | Responsive | Single-column ONLY at all breakpoints (no 2-col builder, per DR-021) — list maxWidth 1280 (padding 24/32 desktop, 20/16 mobile); builder maxWidth 760. | Visual QA passes at 320/375/768/1280px, no horizontal scroll/overlap. | Storybook viewport addon + manual resize check. |
| NFR-006 | Performance (perceived) | List/search shows `EduSkeleton` (rows, count=4) while in flight; no blank flash. | Skeleton visible within ≤100ms of navigation/filter-change trigger. | Playwright timing assertion or manual DevTools throttle check. |
| NFR-007 | i18n | All copy uses the existing `questionBank` namespace (94 keys) in `messages/{vi,en}.json`; vi source, en mirror, typed. New keys only where a genuine gap is found (see §8/§10). | Zero hardcoded Vietnamese-diacritic strings in `.tsx`/`.ts` outside messages/mock/test; `tsc --noEmit` catches key mismatches. | `bunx tsc --noEmit` + hardcoded-string grep. |
| NFR-008 | Security | Search is staff-only server-side (`canBrowseBank`); client SHALL NOT render/route to any of the 3 routes for non-teacher roles, and SHALL treat a defensive 403 as access-denied, not a silent empty result. | Route guard rejects non-teacher before any request fires; zero RBAC-bypass in test. | RBAC test (student/parent direct-URL attempt) + code review of route guard placement. |

---

## 5. UI States & Flows

Nine states apply across the screen pair (verbatim `requirements.md` §uiStates):

1. **loading** — skeleton rows (count=4), both scopes and the detail/edit fetch.
2. **requiredFilterGate** (`QBFilterRequiredPrompt`) — scope=search, no filter set. Dashed-border card, icon `search`, distinct from empty states (solid-border `EduEmpty`). NEVER folded into emptyFiltered.
3. **emptyAll** — scope=mine, zero questions ever created. Icon `clipboardList`, CTA → `/teacher/question-bank/create`.
4. **emptyFiltered** — items exist but filters/search yield zero. Icon `search`, CTA to clear filters (see §8/§10 i18n gap — needs a new `clearFilters` key; distinct copy from emptyAll).
5. **error** — generic error banner + retry, network/5xx across all endpoints.
6. **success** — rows rendered (list) or form populated (builder/detail).
7. **form-validation-error** — inline field errors, create/edit.
8. **locked/read-only** — PUBLISHED question view (own or cross-teacher), all fields disabled, no write CTA.
9. **publish-confirm** — irreversible-action dialog, spinner on confirm, does NOT auto-close on error.

Key flows (see `use-cases.md` §3 for full Given/When/Then per step):
- **UC-901** List own → skeleton → success/emptyAll/emptyFiltered/error.
- **UC-902** Search → requiredFilterGate (landing) → gate satisfied (subject or tag) → skeleton → success/emptyFiltered/error; clearing both filters reverts to requiredFilterGate.
- **UC-903** Create → per-type field shape → validate → submit → success (navigate to edit/detail) or inline/banner error.
- **UC-904** Edit DRAFT → 4 fields locked, 3 editable → submit → success or `already-published` race → UC-906.
- **UC-905** Publish → confirm dialog (irreversible copy) → confirm → success → UC-906, or `already-published` benign toast.
- **UC-906** View PUBLISHED → fully locked, no write path.
- **UC-907** Route guard → teacher passes; student/parent/principal/admin rejected before any request.

---

## 6. Data & Integration

Restated concisely from `integration.md` (authoritative — read that file for full
ground-truthing detail). **Status: REAL** (`core` service, `exercisebank`
sub-domain, ground-truthed against Go source this session) — the exception to
`core`'s usual mock-first default; mock here is a **dev-default toggle**
(`NEXT_PUBLIC_USE_MOCK`), not a permanent stand-in.

### 6.1 Endpoint constants (proposed, additive)

```ts
// bootstrap/endpoint/lms.endpoint.ts (additive — do NOT touch existing LMS_EP.questions,
// the unrelated per-lesson Q&A thread)
export const QUESTION_BANK_EP = {
  search: "/core/api/v1/lms/questions/search",
  list: "/core/api/v1/lms/questions",          // GET (own) / POST (create)
  detail: (id: string) => `/core/api/v1/lms/questions/${id}`, // GET / PUT
  publish: (id: string) => `/core/api/v1/lms/questions/${id}/publish`, // PUT
} as const;
```

### 6.2 Endpoint summary (all `core`, all camelCase, all auth-required)

| INT | Method + Path | Role gate | Request | Response | Pagination |
| --- | --- | --- | --- | --- | --- |
| INT-201 | `GET .../questions/search` | TEACHER\|MANAGER\|ADMIN (`canBrowseBank`) | query: `subjectId?`, `tag?`, `gradeLevel?`, `difficulty?`, `cursor?`, `limit?` | `{ items: QuestionResponse[] }` | cursor (`useInfiniteQuery`) |
| INT-202 | `GET .../questions` | TEACHER | query: `cursor?`, `limit?` ONLY | `{ items: QuestionResponse[] }` (own DRAFT+PUBLISHED) | cursor |
| INT-203 | `POST .../questions` | TEACHER | body: `CreateQuestionRequest` (all 7 fields, see §6.3) | single `QuestionResponse` | n/a |
| INT-204 | `GET .../questions/:id` | any authenticated; visibility gated (DRAFT: author-only) | path `id` | single `QuestionResponse` | n/a |
| INT-205 | `PUT .../questions/:id` | TEACHER + authorId match | body: `{body, expectedAnswer, tags}` ONLY | single `QuestionResponse` | n/a |
| INT-206 | `PUT .../questions/:id/publish` | TEACHER + authorId match | none | single `QuestionResponse` (status=PUBLISHED) | n/a |

List endpoints: repository calls with `{ raw: true }`, then `parseEnvelope()` to
read `meta.pagination.{nextCursor,hasMore}` per `.claude/rules/api-integration.md`.

### 6.3 Shared response/request shape

```
QuestionResponse (all 6 endpoints' item, camelCase, post-unwrap):
  id, tenantId, authorId, questionType ("ESSAY"|"SHORT_ANSWER"|"FILL_IN"),
  subjectId, gradeLevel, difficulty ("EASY"|"MEDIUM"|"HARD"), body,
  expectedAnswer (string|null), status ("DRAFT"|"PUBLISHED"), tags (string[]),
  publishedAt (RFC3339|null), createdAt, updatedAt
```
No PII — `subjectId`/`authorId` are opaque identifiers, not names/emails.

```
CreateQuestionRequest: questionType*, subjectId*, gradeLevel*, difficulty*,
  body* (max 5000), expectedAnswer (optional, max 5000), tags (optional, ≤10×≤50)
UpdateQuestionRequest: body* (max 5000), expectedAnswer (optional, max 5000),
  tags (optional, ≤10×≤50) — questionType/subjectId/gradeLevel/difficulty ABSENT
  (immutable post-create, FR-009 corrected).
```

### 6.4 Failure union — `QuestionBankFailure`

```ts
export type QuestionBankFailure =
  | { type: "not-found" }              // 404 QUESTION_NOT_FOUND, 400 QUESTION_INVALID_ID
  | { type: "not-visible" }            // 403 QUESTION_NOT_VISIBLE — single-GET visibility gate only
  | { type: "forbidden-browse" }       // 403 FORBIDDEN_ACTION from search/list-mine/create role gate
  | { type: "forbidden-edit" }         // 403 FORBIDDEN_ACTION from update/publish ownership check
  | { type: "already-published" }      // 422 QUESTION_ALREADY_PUBLISHED
  | { type: "type-not-supported" }     // 422 QUESTION_TYPE_NOT_SUPPORTED
  | { type: "search-filter-required" } // 422 QUESTION_SEARCH_FILTER_REQUIRED
  | { type: "body-required" }          // 400 QUESTION_BODY_REQUIRED
  | { type: "body-too-long" }          // 400 QUESTION_BODY_TOO_LONG
  | { type: "tag-limit-exceeded" }     // 422 QUESTION_TAG_LIMIT_EXCEEDED
  | { type: "tag-too-long" }           // 400 QUESTION_TAG_TOO_LONG
  | { type: "invalid-difficulty" }     // 400 QUESTION_INVALID_DIFFICULTY
  | { type: "subject-not-found" }      // 404 SUBJECT_NOT_FOUND (create only)
  | { type: "invalid-cursor" }         // 400 QUESTION_INVALID_CURSOR
  | { type: "network-error" }
  | { type: "unknown"; message?: string };
```

**`forbidden-browse` vs `forbidden-edit` — mandatory disambiguation rule.** The
wire returns the identical code (`403 FORBIDDEN_ACTION`) for two semantically
distinct BE denials: the role gate (`canBrowseBank`, on search/list-mine/create)
and the ownership check (`IsOwnedBy`, on update/publish). The code alone cannot
disambiguate — **the mapper MUST branch by which call-site/endpoint produced the
error**, not by inspecting the error code:
- 403 from INT-201/INT-202/INT-203 → `forbidden-browse`.
- 403 from INT-205/INT-206 → `forbidden-edit`.

`not-visible` (403 `QUESTION_NOT_VISIBLE`) is a THIRD, genuinely distinct wire
code, only ever returned by INT-204 (single-GET) — never conflate with either
forbidden variant.

### 6.5 Error → UI mapping (condensed; full per-endpoint detail in `integration.md`)

| Failure type | UI treatment |
| --- | --- |
| `not-found` | Full-page not-found |
| `not-visible` | Full-page access-denied, copy: "this draft isn't visible to you" (distinct from forbidden-edit) |
| `forbidden-browse` | Full-page access-denied, copy: "you don't have access to search the bank" (defensive — route guard should make unreachable) |
| `forbidden-edit` | Full-page access-denied, copy: "you're not the author of this question" |
| `already-published` | **Benign** — refresh to locked/PUBLISHED view (UC-906) + informational toast, NEVER a red error banner |
| `type-not-supported` | Inline error on questionType selector (defensive — selector excludes MCQ) |
| `search-filter-required` | Same `QBFilterRequiredPrompt` as the client-side gate (defense-in-depth) |
| `body-required` / `body-too-long` | Inline error on body field |
| `tag-limit-exceeded` / `tag-too-long` | Inline error on tag-chips input |
| `invalid-difficulty` | Inline error on difficulty selector (defensive) |
| `subject-not-found` | Inline error on subject selector ("subject no longer exists/archived"), create only |
| `invalid-cursor` | Generic error banner (malformed client-built query) |
| `network-error` | Generic error banner + retry |
| `unknown` | Generic error banner |

### 6.6 Auth & security

All 6 endpoints sit behind Kong `core-protected` + `edu-edge-auth` (Bearer token,
httpOnly cookie, server-side hybrid refresh, decision `0018`) — no client-side
token handling. Role gating is BE-enforced but MUST ALSO be enforced client-side
per NFR-008 (route guard precedes any request). Ownership checks (`forbidden-edit`)
are server-enforced; the client MAY additionally hide (not just disable) the
Edit/Publish CTA using `authorId === current memberId` as a UX nicety — never a
substitute for the server check.

### 6.7 Mock-first plan (dev-default toggle, NOT a permanent mock)

- Gate via `NEXT_PUBLIC_USE_MOCK` + `bootstrap/lib/mock.ts` swap pattern
  (existing convention — same shape as other `core`/`lms` features, e.g.
  US-E11.5's `NEXT_PUBLIC_USE_MOCK` guard). No new env var.
- Mock payload MUST mirror `QuestionResponse` exactly (all 12 fields, including
  `tenantId`/`authorId` even if unused in UI) so the mapper contract doesn't
  silently diverge from the real DTO once wiring flips to real.
- Mock fixtures: ≥1 DRAFT (own), ≥1 PUBLISHED (own), ≥1 PUBLISHED (other
  author, for search testing), one of each `questionType`, one of each
  `difficulty` — covers every badge-mapping path (FR-004) without a live BE.
- Mock error simulation should cover every one of the 15 `QuestionBankFailure`
  variants at least once, especially `search-filter-required` (defense-in-depth
  path, should be reachable only via simulated bypass) and the
  `forbidden-browse`/`forbidden-edit` split (verify the mapper branches by
  call-site, not code).
- Repository interface (`i-question-bank.repository.ts`, named by
  `fe-component-architect`/engineer — not prescribed here) is the seam: real
  wiring must be a drop-in swap with zero domain/use-case layer changes.

---

## 7. Use Case Summary

| UC ID | Title | FR coverage | AC count |
| --- | --- | --- | --- |
| UC-901 | List own questions | FR-001, FR-004, FR-005 | 8 (AC-901.1–.8) |
| UC-902 | Search cross-teacher + mandatory-filter gate | FR-001, FR-002, FR-003, FR-004, FR-005, FR-013 | 15 (AC-902.1–.15) |
| UC-903 | Create DRAFT question | FR-006, FR-007, FR-008 | 18 (AC-903.1–.18) |
| UC-904 | Edit own DRAFT question | FR-007, FR-009 | 12 (AC-904.1–.12) |
| UC-905 | Publish DRAFT→PUBLISHED (one-way) | FR-007, FR-010 | 9 (AC-905.1–.9) |
| UC-906 | View PUBLISHED read-only | FR-011, FR-012 | 6 (AC-906.1–.6) |
| UC-907 | Route-level role guard | NFR-008 | 4 (AC-907.1–.4) |
| **Total** | | | **72** |

---

## 8. Constraints & Assumptions

**Technical constraints**
- Single-column layout ONLY at every breakpoint (list + builder) — no 2-col
  builder variant, per DR-021 (NFR-005).
- Zero new design tokens — reuses GPA-tier success/warning/error difficulty
  convention and the exam-bank DRAFT/PUBLISHED 2-value status convention.
- Zero new i18n keys expected in general (94-key `questionBank` namespace
  already shipped) — EXCEPT the two genuine gaps identified below (§10).

**Confirmed [ASSUMPTION]s** (carried forward, resolved or accepted as-is):
- Scope toggle (mine/search) state is session-local UI state only — no
  URL/deep-link persistence required for v1.
- `body` min-4-chars is a client-side UX floor only (BE enforces "required" +
  max 5000, no minimum) — kept low to not block valid short FILL_IN bodies.

**[GAP] / [CONFLICT] / [OPEN QUESTION]** (all carried forward, not re-litigated
where already settled; new items from this spec pass flagged distinctly):

- **[RESOLVED, not re-opened]** OQ-1 (design-spec expectedAnswer
  required/publish-gate conflict) — corrected 2026-07-17 by `ba-lead` in
  `design-spec.jsonc` (`expectedAnswerField.required:false`,
  `publish.disabledUntil` no longer names expectedAnswer). FR-007/AC-903.5–.7/
  AC-905.1 already bake this in. No further action.
- **[OPEN QUESTION] OQ-2 — principal/admin future scope.** BE `canBrowseBank`
  permits MANAGER/ADMIN to search; no client entry point is built this story
  (teacher-only, `design-spec.jsonc roles:["teacher"]`). Carried unresolved —
  `ba-lead` to decide whether this is a deliberate permanent boundary or a
  follow-up story. AC-907.3 models the current hard rejection for these roles.
- **[OPEN QUESTION] Subject dropdown data source.** `SUBJECT_CATALOGUE_EP`
  (`bootstrap/endpoint/subject-catalogue.endpoint.ts`) carries a stale
  "mock-first until `core` exists" comment, but `core`'s exercisebank
  sub-domain is now confirmed REAL (same service, same deploy). Unresolved
  whether `/core/api/v1/subjects` is also real — `ba-lead`/BE to confirm before
  `fe` decides whether the subject dropdown is real-wired or mock-first on day
  one. AC-902.15/AC-903 (subject selector + its load-failure state) are written
  generically enough to hold either way.
- **[OPEN QUESTION] `authorId` → display-name resolution.** `QuestionResponse`
  carries only `authorId` (uuid), no name — search-scope cards need author
  attribution (FR-004, AC-902.6). No batch member-lookup-by-id endpoint was
  confirmed in this session's scope. `fe-lead`/`ba-lead` to confirm which `iam`
  member endpoint (or existing cached member directory) resolves this, and
  whether it supports batch lookup (a search results page has N distinct
  `authorId`s per page — a per-card N+1 lookup would be a performance smell).
  Until resolved, `fe-lead` should treat the fallback (e.g. truncated
  `authorId` or a generic "another teacher" label while resolving) as a
  pre-implementation decision, not fabricated here.
- **[OPEN QUESTION] Filter-change-mid-flight request cancellation** (edge-case
  matrix, UC-901 and UC-902). Whether an in-flight request's response is
  discarded when filters change before it resolves is explicitly
  **`fe-state-engineer`'s call** (per `ba-use-case-modeler`'s instruction) —
  e.g. via TanStack Query's built-in request de-duplication/cancellation. Not
  prescribed as a specific AC number; flagged here so it is not silently
  dropped during implementation planning.
- **[GAP — new, this spec pass] i18n: `clearFilters` CTA key missing.**
  `questionBank` namespace has `empty.cta` ("Tạo câu hỏi đầu tiên", emptyAll)
  and `empty.noMatch`/`empty.noMatchBody` (emptyFiltered title/body) but NO
  button-label key for the "Bỏ lọc" (clear filters) CTA that emptyFiltered
  needs (design-spec `states.emptyFiltered.action: "Bỏ lọc"`; AC-901.4/AC-902.7).
  Every other feature namespace in this codebase (e.g. `assignment*`, `class*`)
  has its own per-namespace `clearFilters` key — `questionBank` is missing one.
  **Proposed addition** (both files, same path):
  `messages.questionBank.empty.clearFilters` — vi: `"Xoá bộ lọc"` / en:
  `"Clear filters"`.
- **[GAP — new, this spec pass] i18n: no distinct 403 copy per failure
  sub-variant.** `questionBank.errors` has one generic `forbidden` key
  ("Bạn không có quyền thực hiện thao tác này.") but §6.4/§6.5 require THREE
  visually/textually distinct access-denied messages (`forbidden-browse`,
  `forbidden-edit`, `not-visible` — AC-904.6/AC-904.7 explicitly require
  distinct copy despite shared wire codes). **Proposed additions** (both files,
  same path):
  - `messages.questionBank.errors.forbidden-browse` — vi: `"Bạn không có quyền tìm kiếm trong kho câu hỏi."` / en: `"You don't have permission to search the question bank."`
  - `messages.questionBank.errors.forbidden-edit` — vi: `"Bạn không phải là người tạo câu hỏi này nên không thể chỉnh sửa."` / en: `"You're not the author of this question, so you can't edit it."`
  - `messages.questionBank.errors.not-visible` — vi: `"Câu hỏi nháp này không hiển thị với bạn."` / en: `"This draft question isn't visible to you."`
  The existing generic `errors.forbidden` MAY remain as a fallback for any
  未-mapped forbidden case, or be retired — `fe-lead`'s call, not prescribed here.
- **[NOTE — orphaned key, no action required this story]**
  `questionBank.errors["expected-answer-required"]` exists in both message
  files but is now DEAD/unreachable — FR-007 confirms `expectedAnswer` is never
  required for any questionType or action. Do NOT wire this key to any
  validation path; flagging only so `fe-nextjs-engineer` doesn't accidentally
  "complete" a validation rule that shouldn't exist. Not a gap to fill, an
  artifact to leave unused (or a future cleanup to retire, out of this story's
  scope).
- **[NOTE — no new key needed]** The "already published" informational toast
  (AC-904.8/AC-905.6) can reuse existing `questionBank.toast.published`
  ("Đã xuất bản câu hỏi") + `questionBank.lockedNotice.{title,body}` for the
  locked-view copy the screen transitions to — no new key required.

---

## 9. Traceability Matrix

| Requirement | Source | Use Case(s) | Integration(s) | Priority |
| --- | --- | --- | --- | --- |
| FR-001 | TR-119 FR-001 | UC-901, UC-902 | INT-201, INT-202 | Must |
| FR-002 | TR-119 FR-002; integration.md §4 | UC-902 (AC-902.1/.4/.8) | INT-201 | Must |
| FR-003 | TR-119 FR-003 | UC-902 (AC-902.2/.3) | INT-201 | Must |
| FR-004 | TR-119 FR-004 | UC-901 (AC-901.2), UC-902 (AC-902.6) | INT-201, INT-202 | Must |
| FR-005 | TR-119 FR-005; integration.md §5 | UC-901 (AC-901.6/.7), UC-902 (AC-902.12–.14) | INT-201, INT-202 | Must |
| FR-006 | TR-119 FR-006; design-spec `builderScreen` | UC-903 (AC-903.1–.4) | INT-203 | Must |
| FR-007 | TR-119 FR-007 (ground-truthed); integration.md §1.4 | UC-903 (AC-903.5–.7), UC-904 (AC-904.4), UC-905 (AC-905.1) | INT-203, INT-205, INT-206 | Must |
| FR-008 | TR-119 FR-008 | UC-903 (AC-903.8–.12) | INT-203 | Must |
| FR-009 (corrected) | TR-119 FR-009, corrected per integration.md §1.1 | UC-904 (AC-904.1, AC-904.3) | INT-205 | Must |
| FR-010 | TR-119 FR-010; ADR 0057 | UC-905 (all AC) | INT-206 | Must |
| FR-011 | TR-119 FR-011 | UC-906 (all AC) | INT-204 | Must |
| FR-012 | TR-119 FR-012 (negative) | — (confirmed absent throughout) | — | Must |
| FR-013 | TR-119 FR-013 | UC-902 (AC-902.3) | INT-201 | Should |
| FR-014 | TR-119 FR-014 (negative) | — (confirmed absent) | — | Won't |
| NFR-001..004 (a11y) | TR-119 NFR-001..004 | all UCs (badges, forms, dialogs) | — | Must |
| NFR-005 (responsive) | TR-119 NFR-005; DR-021 | UC-901..906 (screens) | — | Must |
| NFR-006 (perf) | TR-119 NFR-006 | UC-901, UC-902, UC-904, UC-906 (loading states) | — | Must |
| NFR-007 (i18n) | TR-119 NFR-007 | all UCs (copy) | — | Must |
| NFR-008 (security) | TR-119 NFR-008 | UC-907 | INT-201, INT-202 | Must |
| UC-907 (route guard) | use-cases.md UC-907 | UC-907 (AC-907.1–.4) | — (client-side only) | Must |

**Uncovered / flagged explicitly:** none of the 14 FRs or 8 NFRs lack AC or
integration coverage. FR-012/FR-014 are negative requirements with no positive
AC by design (confirmed absent as the "coverage"). The two i18n gaps (§8) are
NOT requirement gaps — they are copy-asset gaps surfaced during this
consolidation pass, listed precisely above for `fe-lead` to add alongside
implementation (not a blocker to starting the build).

---

## 10. Handoff to FE

**What `fe-lead` should build:** a net-new feature folder
`src/features/question-bank` (Clean Architecture layers per `.claude/CLAUDE.md`):

- `domain/entities/` — `question.entity.ts` (mirrors `QuestionResponse` §6.3).
- `domain/failures/` — `question-bank.failure.ts` (the 15-variant union, §6.4,
  including the `forbidden-browse`/`forbidden-edit` split — mapper-level,
  per-call-site branch, not a code-level branch).
- `domain/repositories/` — `i-question-bank.repository.ts` (search, listMine,
  create, getById, update, publish — 6 methods matching INT-201..206).
- `domain/use-cases/` — one per repository method, plus the client-side
  mandatory-filter-gate check as a pure predicate (testable without HTTP).
- `infrastructure/dtos/`, `infrastructure/mappers/`,
  `infrastructure/repositories/` (`server-only`) — real repository against
  `QUESTION_BANK_EP` (§6.1, additive to `lms.endpoint.ts`), plus a
  `NEXT_PUBLIC_USE_MOCK`-gated mock repository (§6.7) as the dev-default seam.
- `presentation/` — `QuestionBankScreen`, `QuestionBankBuilderScreen`, and the
  sub-components already named in `design-spec.jsonc` (`QBQuestionCard`,
  `QBStatusChip`, `QBTypeBadge`, `QBDifficultyBadge`, `QBFilterRequiredPrompt`,
  `QBTagChipsInput`, `QBDropdown`, `QBConfirmDialog`) — reference
  `design_src/edu/question-bank.jsx` for exact layout/spacing, do not redesign.
- Routes: `/teacher/question-bank`, `/teacher/question-bank/create`,
  `/teacher/question-bank/:id/edit` (already proposed in `docs/product/screens.md`).

**Point `fe-lead` at:** this spec, `docs/design-requests/DR-021-lesson-plan-question-bank.md`,
`docs/product/design-spec.jsonc` `screens.questionBank` (corrected version), and
`design_src/edu/question-bank.jsx`.

**Pre-implementation clarifications** (resolve or explicitly accept a
reasonable default before/while building — do not silently guess):
1. Subject dropdown data source — real `SUBJECT_CATALOGUE_EP` vs mock-first (§8).
2. `authorId` → display-name resolution mechanism for search cards (§8).
3. Filter-change-mid-flight request cancellation strategy — `fe-state-engineer`'s call (§8).
4. Add the two i18n gaps (§8) — `questionBank.empty.clearFilters` and the
   `forbidden-browse`/`forbidden-edit`/`not-visible` error copy — to both
   `messages/vi.json` and `messages/en.json` before/while building the
   corresponding UI states.
5. OQ-2 (principal/admin scope) — no action needed for this story; just don't
   accidentally build a wider surface than `roles:["teacher"]` specifies.

**Proof owed (maps to `docs/TEST_MATRIX.md` rows, per `.claude/rules/tdd.md`):**
- **Unit (Vitest):** domain use-cases for create/update/publish DRAFT question,
  list-mine, search-with-mandatory-filter-validation (including the pure
  gate-predicate); mapper tests for all 15 `QuestionBankFailure` variants,
  explicitly asserting the `forbidden-browse`/`forbidden-edit` per-call-site
  branch (not per-code); entity mapping from `QuestionResponse`.
- **Integration:** repository ↔ HTTP boundary against `QUESTION_BANK_EP` (real
  contract, mock-first dev-default per `NEXT_PUBLIC_USE_MOCK`); envelope/cursor
  pagination parsing for INT-201/INT-202.
- **E2E (Storybook + Playwright):** search-without-filter (blocked, gate
  renders) → satisfy gate → results; create (all 3 questionTypes, blank
  expectedAnswer) → save; edit DRAFT (4 fields locked) → save; publish (confirm
  dialog, irreversibility copy, benign already-published race) → locked view;
  route guard rejection for student/parent direct-URL attempts. All 9 UI states
  (§5) and the full AC-901..AC-907 set (72 ACs, `use-cases.md` §4) are the AC
  source of truth — copy them verbatim into the story's AC section per
  `story.md`'s existing note, superseding any placeholder AC-1..AC-10.
- **Platform:** `bun build` green; `bunx tsc --noEmit` clean (typed i18n keys
  catch any missed addition from item 4 above).
