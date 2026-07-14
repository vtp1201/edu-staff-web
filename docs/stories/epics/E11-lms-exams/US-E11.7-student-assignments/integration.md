# US-E11.7 — Student Assignments — Integration Map

Service map per `.claude/rules/api-integration.md` (decision `0017`): assignment
data belongs to **`lms`**. Unlike `iam` (live) and unlike `social`
(US-E19.1 — partially real per DR-012), **`lms` has NO service at all yet** —
no `openapi.yaml`, no `INTEGRATION.md`, no deployed endpoint. Per decision
`0014` this entire integration is **MOCK-FIRST**, with zero exceptions. There
is no per-endpoint "REAL" status to report here (unlike US-E19.1's feed map)
— everything below models the **interim logical contract** that the mock
repository (`MockLmsRepository`, extended for assignments, same file/pattern
as `src/features/lms/infrastructure/repositories/mocks/lms.mock.repository.ts`)
implements today, behind `ILmsRepository`, so that when `lms` ships a real
assignment endpoint only the repository implementation swaps — no use-case or
presentation change.

## 1. Integration Overview

- **Endpoints (logical, mock-first) modeled:** 3 — list assignments (filterable
  by tab), submit assignment, save draft.
- **Service touched:** `lms` only. No `iam`/`core`/`noti`/`social` calls in
  this screen (auth/session is inherited from the existing student route
  guard, not re-fetched here).
- **Real vs mock-first:** 100% mock-first. No real `lms` endpoint exists to
  cite; `services/lms/docs/openapi.yaml` does not exist in edu-api as of
  2026-07-14.
- **Risk notes:**
  - Because there is no real contract to validate against, field names below
    are **derived directly from `requirements.md` `dataDependencies`** (the
    `assignment` entity) and from `design_src/edu/assignments.jsx` /
    `design-spec.jsonc` `lms.assignments`. Whoever wires the real `lms`
    repository later MUST reconcile this shape against the actual OpenAPI spec
    once published — flagged as `[OPEN QUESTION]` in §5.
  - The mock file-picker/attachment is **client-side only** — no multipart
    upload endpoint is modeled (per NFR-006 / decision `0014`); `fileName`
    metadata is stored, not file bytes.
  - "Lưu nháp" (save draft, FR-007b) is modeled as **fully client-local**
    persistence (see INT-117-03) — no endpoint call at all, not even mocked
    HTTP — see justification there.

## 2. Endpoint Catalogue

```
INT-117-01  List Student Assignments
Service: lms    Method+Path: GET /api/v1/lms/students/{studentId}/assignments (logical — NOT YET DEFINED in a real openapi.yaml; modeled 1:1 on ILmsRepository.listAssignments(studentId, statusFilter?) mock method)
Status: MOCK-FIRST (lms service does not exist; decision 0014) — no REAL alternative to cite
Protected: yes (inherits existing student-role route guard, no new auth requirement)   Role required: student (own assignments only, per requirements.md ASSUMPTION — no cross-class visibility)
Request (outbound, camelCase): studentId — implicit from session, not a client-supplied param | Internal
  statusFilter — optional, one of "all"|"pending"|"submitted"|"graded", mirrors the active FR-001 tab (client-side filter today; modeled as a server-side filter param for the future real endpoint so list size doesn't grow unbounded) | none
Response payload (inbound, after envelope unwrap — logical shape): assignments[] — list of:
  id — unique assignment id | Internal
  title — assignment title | Internal
  description — assignment description (read-only in submit sheet) | Internal
  subject — subject name | Internal
  className — class name (e.g. "10A1") | Internal
  teacherName — assigning teacher's display name | Internal (PII-lite)
  courseColor — course-color token/tone for the icon box (design-spec `lms.assignments.card`) | none
  dueDate — ISO deadline timestamp | none
  status — "pending"|"submitted"|"graded" (server-authoritative; overdue is a CLIENT-derived visual state per FR-003, not a separate server status) | none
  submittedAt — ISO timestamp, present once status !== "pending" | Internal
  gradedAt — ISO timestamp, present once status === "graded" | Internal
  score — number, present once graded | Internal
  maxScore — number, present once graded | none
  teacherComment — string, present once graded (may be empty string → FR-008 "Giáo viên chưa để lại nhận xét.") | Internal
  gradedFileName — optional string, present when the teacher attached a graded file (mock-download only, per open question in requirements.md) | Internal
Pagination: **NOT required for MVP** — `[ASSUMPTION]` DR-020/design-spec has no pagination/cursor mention for the assignment list (unlike the social feed in US-E19.1); assignment lists are bounded by a student's active class(es)/term and expected small. If a real `lms` endpoint later returns `meta.pagination`, the list screen should adopt `useInfiniteQuery` at that point — not required now, and the mock returns the full list in one response.
Errors → UI behavior:
  - "network-error" (transient/unreachable, retryable) → AssignmentFailure "network-error" → EduError with "Thử lại" retry (FR-009)
  - "unknown" (any other unmapped failure) → AssignmentFailure "unknown" → EduError with retry, generic copy
  - (not-found/forbidden do not apply to the LIST call itself — they apply to a specific assignment lookup, e.g. if a stale sheet is reopened after data changes; see INT-117-02/03)
Empty / loading expectation: per FR-009 — EduSkeleton (4 rows) while pending; EduEmpty with 4 distinct per-tab copies (`assignments.empty.allTab/pendingTab/submittedTab/gradedTab`) when the filtered list is empty; EduError + retry on failure; exactly one state visible at a time. (Full state detail owned by requirements.md FR-009 — not redefined here.)

INT-117-02  Submit Assignment
Service: lms    Method+Path: POST /api/v1/lms/assignments/{assignmentId}/submissions (logical — NOT YET DEFINED; modeled on ILmsRepository.submitAssignment(assignmentId, answerText?, fileName?) mock method, mirrors the `markLessonComplete`-style "action returns updated entity" pattern already used in `lms.mock.repository.ts`)
Status: MOCK-FIRST (lms service does not exist; decision 0014)
Protected: yes   Role required: student (own assignment only; assignment must currently be status="pending")
Request (outbound, camelCase): assignmentId — path param | Internal
  answerText — optional free-text answer (FR-005 "Nội dung bài làm") | Internal
  fileName — optional mock attachment filename/metadata ONLY — no file bytes, no real multipart upload (decision 0014, NFR-006) | Internal
  overdueConfirmed — boolean, true when the user passed the FR-006 overdue-confirmation dialog (lets a future real endpoint distinguish an explicitly-confirmed late submission from a client bug submitting late without confirmation) | none
Response payload (inbound, logical): the updated assignment object (same shape as an INT-117-01 list entry) with status="submitted", submittedAt=now | Internal
Pagination: none (single-item action)
Errors → UI behavior:
  - "file-too-large" (mock client-side validation against the 20MB limit, FR-005) → inline role="alert" validation message inside the submit sheet, submit blocked, sheet stays open — this is validated client-side before any (mock) call is made, so it never round-trips
  - "already-submitted" (assignment transitioned to submitted/graded by a concurrent action — e.g. reopened stale sheet) → AssignmentFailure "already-submitted" → inline sheet error, submit blocked, sheet should refresh/close to the current server state rather than allow a duplicate submit
  - "not-found" (assignment removed/reassigned concurrently) → AssignmentFailure "not-found" → inline sheet error, sheet closes back to an auto-refreshed list
  - "forbidden" (assignment does not belong to this student — defense in depth, should not occur if the list itself is student-scoped) → AssignmentFailure "forbidden" → inline sheet error, no retry
  - "network-error" (simulated submit failure per FR-007 errorConditions, retryable) → sheet stays open, inline error, submitted state NOT applied, user can retry the same "Nộp bài" click
  - "unknown" → inline sheet error, generic copy, retry available
Empty / loading expectation: FR-009 submitting sub-state — primary CTA replaced by spinner + "Đang nộp bài…", disabled, motion-safe-gated; on success the sheet closes, the card flips to submitted, and an auto-dismissing toast (role="status", "Nộp bài thành công.") is shown (FR-007). No skeleton (single-item action, not a list fetch).

INT-117-03  Save Draft (Should — FR-007b)
Service: lms (nominal only — see decision below)    Method+Path: N/A — no endpoint call
Status: MOCK-FIRST, but modeled as **100% client-local persistence**, not even a mocked HTTP round-trip
Protected: n/a (no network call)   Role required: n/a
Decision + justification: requirements.md explicitly assumes "'Lưu nháp' persists only locally/mock-first for this story — no draft-sync-across-devices requirement stated in DR-020" (`[ASSUMPTION]`), and FR-007b's postcondition is "draft content persisted locally (mock-first); assignment status unchanged." Given (a) no cross-device sync requirement, (b) `Should` priority (not blocking primary flow), and (c) the file attachment is mock-metadata-only anyway (no bytes to persist server-side), the cheapest-and-correct contract is **local storage only** (e.g. component state / `localStorage` keyed by assignmentId, or a query-cache entry) rather than inventing a mock endpoint that would need to be reconciled later against a real `lms` draft endpoint that may not even exist in the eventual BE design. If a future story requires cross-device draft sync, that would be a NEW endpoint + a new integration entry, not a change to this one.
Request (outbound, camelCase): n/a — no network request. Local write: { assignmentId, answerText?, fileName? }
Response payload (inbound): n/a — local read on next sheet open returns the same shape
Pagination: none
Errors → UI behavior: n/a (cannot fail over network); a local storage write failure (e.g. quota) is out of scope for this story — not modeled as an AssignmentFailure variant
Empty / loading expectation: instant local write/read, no skeleton, no submitting sub-state; toast "Đã lưu nháp." (role="status") on save (FR-007b)
```

## 3. Auth & Security

- All three integrations sit behind the **existing** student-role route guard
  for `(app)/student/**` (per requirements.md NFR-006) — this story introduces
  **no new authorization boundary, no new token/session logic**. The standard
  Bearer-token-via-httpOnly-cookie hybrid flow (decision `0018`,
  `bootstrap/lib/http.server.ts`) already covers whatever session context a
  future real `lms` call would need; nothing extra to wire here.
- No special headers beyond the project standard (`Authorization: Bearer
  <accessToken>` when a real call exists, `Accept-Language: vi|en` for
  server-driven error message locale — moot today since the mock never talks
  to a real BE that localizes messages; UI-side `assignments.errors.*` i18n
  keys handle localization instead).
- PII fields: `teacherName` (display name only, PII-lite, same tier as
  `authorName` in US-E19.1's feed map) — Internal, not Confidential. No
  email/phone/other identity data in the assignment payload.
- The mock file-picker performs **no real upload** — no file content ever
  leaves the client in this story (NFR-006) — reinforces that INT-117-02's
  `fileName` field is metadata-only, never file bytes.
- Because there is no real `lms` endpoint, there is no tenant-isolation
  concern to model beyond "student sees only their own class(es)' assignments"
  (already an `[ASSUMPTION]` in requirements.md, enforced server-side once a
  real endpoint exists — the mock enforces it by only ever returning the
  session student's seeded assignment set).

## 4. Mock-first plan

All of INT-117-01/02/03 need a mock. Extend the existing LMS mock stack rather
than introducing a parallel one:

- **Repository interface**: add to `ILmsRepository`
  (`src/features/lms/domain/repositories/i-lms.repository.ts`), following the
  existing method style (`listCourses`, `markLessonComplete`, etc. — errors
  thrown as `Error("<code>")`, mapped to a failure union by the use-case
  layer):
  ```ts
  listAssignments(studentId: string, statusFilter?: AssignmentStatusFilter): Promise<AssignmentEntity[]>
  submitAssignment(assignmentId: string, input: { answerText?: string; fileName?: string; overdueConfirmed: boolean }): Promise<AssignmentEntity>
  ```
  (`saveDraft` is intentionally NOT added to the repository interface per the
  INT-117-03 decision above — it is a presentation-local concern, e.g. a hook
  wrapping `localStorage`/query-cache, not a repository method. If reviewers
  disagree during implementation, flag back to `ba-integration-analyst` rather
  than silently promoting it to a repository method.)

- **Fixtures**: extend
  `src/features/lms/infrastructure/repositories/mocks/lms.fixtures.ts` with an
  `ASSIGNMENTS_DTO` seed array covering at least one assignment per status
  (pending non-overdue, pending overdue, submitted, graded-with-comment,
  graded-empty-comment, graded-with-file) so all FR-002/003/008 visual
  branches have fixture coverage — mirrors how `COURSES_DTO`/`COURSE_LESSONS_DTO`
  seed the existing course/lesson screens.

- **Mock repository**: extend `MockLmsRepository`
  (`src/features/lms/infrastructure/repositories/mocks/lms.mock.repository.ts`)
  with a module-level mutable `assignments` array in the existing `MockStore`
  shape (same pattern as `summaries`/`lessons` — mutations must survive across
  Server Action calls since each action gets a fresh DI-built repo instance),
  plus `resetLmsMockStore()` extended to reseed it for deterministic tests.

- **AssignmentFailure union** (new file,
  `src/features/lms/domain/failures/assignment.failure.ts`, following the
  existing `LmsFailure`-style pattern): `"network-error" | "not-found" |
  "forbidden" | "already-submitted" | "file-too-large" | "unknown"` — this
  union's members map 1:1 to the already-staged `assignments.errors.*` i18n
  keys in `messages/{vi,en}.json` (lines 723-730 in `vi.json`: `network-error`,
  `not-found`, `forbidden`, `already-submitted`, `file-too-large`, `unknown`)
  — no new i18n keys needed, confirming requirements.md's own openQuestions
  note that the namespace is already fully staged.

## 5. Open Questions

- `[OPEN QUESTION]` No `lms` `openapi.yaml`/`INTEGRATION.md` exists at all in
  edu-api (unlike `iam`, and unlike `social`'s partial-real status in
  US-E19.1). Every field name in INT-117-01/02 above is inferred from
  `requirements.md` `dataDependencies` + `design-spec.jsonc` `lms.assignments`
  + `design_src/edu/assignments.jsx` — none of it is confirmed against a
  published BE contract. Whoever wires the real `lms` assignment repository
  (a future story) MUST reconcile this shape against the actual OpenAPI spec
  once `lms` ships, and flag any field-name/shape drift as a decision, not a
  silent DTO rename.
- `[OPEN QUESTION]` Whether the real `lms` endpoint (once it exists) will
  return assignment lists with `meta.pagination` — this map assumes no
  pagination is needed for MVP (`[ASSUMPTION]`, small bounded list per
  student). If BE lands cursor-paginated list responses instead, the
  presentation layer will need to switch from a single `useQuery` to
  `useInfiniteQuery` — a repository-swap-only change if the interface is kept
  list-shaped (`Promise<AssignmentEntity[]>` vs. a paginated result type would
  need an interface signature change too).
- `[OPEN QUESTION]` (carried from requirements.md) Whether the mock "Tải tệp
  GV đã chấm" (download graded file) link should be disabled/no-op or show a
  toast clarifying it's mock-only — `ba-use-case-modeler` owns the AC wording;
  this integration map only notes that `gradedFileName` is metadata-only, no
  real file endpoint is modeled (consistent with the no-real-upload decision
  for submission attachments).
- `[OPEN QUESTION]` Whether `statusFilter` should be sent to a future real
  endpoint as a query param (server-side filtering, as modeled above) or
  whether the real `lms` endpoint will simply return the full list and expect
  client-side filtering (as the mock does today, since client-side filtering
  is trivial for a small list). Flagging so the future real-repository author
  doesn't have to guess which FR-001 tab-switch behavior (refetch vs.
  client-filter) the BE was designed around.
