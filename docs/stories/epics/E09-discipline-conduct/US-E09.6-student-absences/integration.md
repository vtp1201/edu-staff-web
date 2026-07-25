# US-E09.6 — Integration Map (Student Absences)

Per `.claude/rules/api-integration.md` (service map decision `0017`) + DR-022
§"BE contract" (section 3) + ADR `0062` (route/actor correction). Actor:
`teacher` (record/edit, own homeroom class) and `principal` (schoolwide/
class-filtered read + one-way flag), routes `(app)/teacher/absences` and
`(app)/principal/absences`. Lane: **normal** (per requirements.md).

## 1. Integration Overview

- **Endpoints consumed by this screen: 4**, all `core` (conduct sub-domain).
- **Services touched:** `core` only. No `iam`/`noti`/`lms`/`social` calls.
- **Real vs mock-first — unusual case, state precisely:** all 4 endpoints are
  **REAL and SHIPPED** on the BE side — ground-truthed directly against
  `edu-api/services/core/internal/conduct/adapter/http/{routes.go,
  dto/student_absence.go, valueobject/absence_state.go}` (Go source, not a
  planned/draft contract). This is the SAME classification precedent as the
  sibling `US-E09.5` (staff-discipline/staff-violations) and the existing
  `discipline`/`staff-leave` features in this repo: **real-contract,
  roster-blocked**, not the more common "core doesn't exist yet" mock-first
  reason used elsewhere (e.g. US-E20.1 parent-student-links, where `core` has
  no shipped conduct-adjacent contract at all). The web client is mock-first
  **only** because:
  1. Every real endpoint keys on a real `studentMemberId`/`classId` UUID the
     web has no roster-resolution path for today (cross-repo gap, asks
     #9/#15/#22 from `US-E18.14-discipline-conduct-wiring`).
  2. No `studentName`/`className` field exists anywhere on the wire response
     — a UI that must show a human-readable list cannot do so from the real
     payload alone.
  - Per the `discipline` feature's own precedent (`discipline.di.ts` **force-mocks
    regardless of `NEXT_PUBLIC_USE_MOCK`**), this story's DI factory SHOULD do
    the same — the real repository is unreachable end-to-end today
    (unresolvable roster identity), so a build-time flag toggle would produce
    a broken "real" mode. Recommend `student-absence.di.ts` follow that exact
    pattern (see `.claude/agent-memory/ba-integration-analyst/discipline-e09-baseline.md`).
- **Risk notes:**
  - INT-004 (Flag) is the highest-consequence mutation — one-way, terminal,
    no reverse transition anywhere in the domain contract (FR-006/FR-013).
    The mock must simulate the server rejecting a re-flag attempt
    (`ABSENCE_INVALID_STATE`) even though the UI hides the action on already
    -flagged rows (defense in depth, NFR-008).
  - INT-001 (Record) and INT-003 (Edit) both need server-side class-ownership
    re-checks simulated in the mock (`ABSENCE_FORBIDDEN`) — a teacher forging
    a request for a class that is not their own homeroom must be rejected,
    not merely hidden client-side (FR-008/NFR-008).
  - `ABSENCE_INVALID_DATE` rejects **future** dates — this is the OPPOSITE
    direction from the existing `discipline.errors.invalid-date` key (which
    guards leave-request dates that must be **today or later**). These two
    i18n/failure keys MUST NOT be merged or reused across the two features —
    a genuinely new `studentAbsences.errors.invalid-date` key (or equivalent)
    is required even though the English label looks similar to discipline's.
  - All seven `ABSENCE_*` error codes are **genuinely new** — zero code reuse
    with `discipline.errors.*`/`staffDiscipline.errors.*` (confirmed by
    grepping `DisciplineFailure` in `src/features/discipline/domain/failures/
    discipline.failure.ts` — no `ABSENCE_*`-shaped type exists there).

## 2. Endpoint Catalogue

```
INT-001  Record (create) a student absence
Service: core    Method+Path: POST /api/v1/conduct/student-absences
Status: REAL (ground-truthed against edu-api Go source: conduct/adapter/http/routes.go,
  dto/student_absence.go) — MOCK-FIRST for web consumption (roster-UUID gap, see §1)
Protected: yes   Role required: teacher (GVCN, own homeroom class only —
  server-enforced independent of client route gate, NFR-008)
Request (outbound, camelCase):
  classId — homeroom class id (must equal teacher's own GVCN class server-side) | Internal
  studentMemberId — student's member UUID, selected from mock roster only (FR-010) | Confidential (PII, minor)
  date — bare "YYYY-MM-DD" calendar date, NOT a datetime; must be today or past | Internal
  excused — boolean | Confidential
  reason — optional string, max 5000 chars | Confidential
Response payload (inbound, after envelope unwrap): the created record —
  classId, studentMemberId, date, reason?, excused, state ("RECORDED"),
  recordedByMemberId, createdAt, updatedAt | Confidential
Pagination: none
Errors → UI behavior:
  - ABSENCE_FORBIDDEN (403) → class is not the teacher's own homeroom →
    inline dialog error, dialog stays open, no record created (FR-001, NFR-008)
  - ABSENCE_DUPLICATE_DATE (409) → record already exists for classId+studentMemberId+date
    → inline dialog error "Đã có bản ghi cho ngày này", dialog stays open (FR-003)
  - ABSENCE_INVALID_DATE (422) → date is in the future → inline field error on
    the date input, NOT reusing discipline.errors.invalid-date (FR-002; see §1 risk note)
  - ABSENCE_INVALID_INPUT (422) → malformed payload (e.g. reason > 5000 chars)
    → per-field inline error (error.fields[])
  - NETWORK_ERROR / 5xx / timeout → toast/inline error, retry submit, dialog stays open
Empty / loading expectation: submit button pending/disabled while in flight;
  dialog does not close until success; client SHOULD also pre-validate
  duplicate-date and future-date locally before submit (FR-002/FR-003) using
  already-loaded list data, in addition to the server's authoritative check.

INT-002  List student absences
Service: core    Method+Path: GET /api/v1/conduct/student-absences?classId=&from=&to=
Status: REAL (ground-truthed) — MOCK-FIRST for web consumption (roster-UUID gap)
Protected: yes   Role required: teacher (own class only, server-scoped) OR
  principal (schoolwide or class-filtered, read-only)
Request (outbound, camelCase):
  classId — required for teacher (own class, server-enforced); optional filter
    for principal ("all" omits the param for schoolwide view) | Internal
  from — range start, "YYYY-MM-DD" | Internal
  to — range end, "YYYY-MM-DD" | Internal
  (default range is a UI/UX decision, not fixed by this contract — see
  requirements.md assumption on current-term/rolling-window default)
Response payload (inbound, after envelope unwrap): array of absence records —
  classId, studentMemberId, date, reason?, excused, state
  ("RECORDED"|"FLAGGED_UNEXCUSED"), recordedByMemberId, flaggedByMemberId?,
  createdAt, updatedAt | Confidential (PII, minor, via studentMemberId)
  ⚠ NOTE: no studentName/className field exists on this payload — the web
  layer MUST resolve display name/class via the mock roster fixture
  (SA_STUDENT_ROSTER), not from this response (FR-010).
Pagination: [OPEN QUESTION] — not confirmed cursor vs full-array in the
  ground-truthed Go source excerpt available to this analysis; treat as a
  bounded array scoped to classId+date-range (typically small — one
  homeroom class over a date window) rather than a cursor-paginated feed
  until confirmed. Flag to core team / fe-lead before assuming
  useInfiniteQuery is needed.
Errors → UI behavior:
  - ABSENCE_FORBIDDEN (403) → teacher requesting outside own class scope →
    redirect/deny server-side (should not be reachable via UI, backstop) (NFR-008)
  - NETWORK_ERROR / 5xx / timeout → generic error state with retry button
  - empty array → empty state ("Chưa có bản ghi nghỉ học nào trong khoảng thời gian này")
    distinct from the loading skeleton (NFR-007)
Empty / loading expectation: skeleton (rows variant, count=4, NFR-007) while
  fetching; distinct empty vs error vs success states (uiStates in
  requirements.md). Summary stats row (FR-011, Should) derived client-side
  from the loaded list — total / unexcused count / flagged count, scoped to
  the currently loaded/filtered data set, no separate endpoint.

INT-003  Edit a student absence (reason and/or excused only)
Service: core    Method+Path: PATCH /api/v1/conduct/student-absences/:date?classId=&studentMemberId=
Status: REAL (ground-truthed) — MOCK-FIRST for web consumption (roster-UUID gap)
Protected: yes   Role required: teacher (GVCN, own homeroom class only, server-enforced)
Request (outbound, camelCase):
  (path) date — bare "YYYY-MM-DD", part of the immutable natural key, never itself edited | Internal
  (query) classId — part of the immutable natural key | Internal
  (query) studentMemberId — part of the immutable natural key | Confidential
  (body, PATCH semantics — independently optional) reason — optional, max 5000 chars | Confidential
  (body) excused — optional boolean | Confidential
  ⚠ date/classId/studentMemberId are NEVER sent in the body as editable
  fields — they are the natural key (path/query only) and are rendered
  static/non-editable in the edit UI (FR-004).
Response payload (inbound, after envelope unwrap): the updated record, same
  shape as INT-001's response, with updatedAt refreshed | Confidential
Pagination: none
Errors → UI behavior:
  - ABSENCE_FORBIDDEN (403) → not the teacher's own class → inline dialog
    error, no mutation applied (FR-004, NFR-008)
  - ABSENCE_NOT_FOUND (404) → natural key (classId+studentMemberId+date) does
    not resolve → toast "bản ghi không tồn tại", row/list refetches
  - ABSENCE_INVALID_INPUT (422) → malformed payload (reason too long) →
    per-field inline error
  - ABSENCE_INVALID_STATE (400, backstop) → unexpected state conflict →
    generic inline error, no mutation applied
  - NETWORK_ERROR / 5xx → dialog stays open, inline/toast error, retry submit
Empty / loading expectation: submit button pending/disabled while in flight;
  dialog does not close until success; date/classId/studentMemberId rendered
  as static text (not inputs) in the edit form.

INT-004  Flag a recorded absence as FLAGGED_UNEXCUSED (one-way, terminal)
Service: core    Method+Path: POST /api/v1/conduct/student-absences/:date/flag?classId=&studentMemberId=
Status: REAL (ground-truthed) — MOCK-FIRST for web consumption (roster-UUID gap)
Protected: yes   Role required: principal (BE's ADMIN+MANAGER conduct-domain
  actor; this app's principal role, NOT the separate admin route-guard role
  per ADR 0062) — zero record/edit capability, flag-only
Request (outbound, camelCase):
  (path) date — bare "YYYY-MM-DD" | Internal
  (query) classId | Internal
  (query) studentMemberId | Confidential
  (no body)
Response payload (inbound, after envelope unwrap): the updated record —
  state now "FLAGGED_UNEXCUSED", flaggedByMemberId set to current principal,
  updatedAt refreshed; all other fields unchanged from the RECORDED record | Confidential
Pagination: none
Errors → UI behavior:
  - ABSENCE_FORBIDDEN (403) → actor is not principal-tier → confirm dialog
    reopens with error, no transition applied (FR-005, NFR-008 — server-side
    re-check independent of client route gate is a real security AC here)
  - ABSENCE_NOT_FOUND (404) → natural key does not resolve (race — already
    deleted/moved) → toast, list refetches
  - ABSENCE_INVALID_STATE (400, backstop) → record already FLAGGED_UNEXCUSED
    (re-flag attempt) → generic inline error; UI SHOULD already prevent
    reaching this by hiding the flag action on already-flagged rows (FR-005)
  - ABSENCE_INVALID_ID (400, backstop) → malformed id/query params → generic error
  - NETWORK_ERROR / 5xx → confirm dialog stays open (or reopens) with error,
    state not transitioned
Empty / loading expectation: confirm dialog (role=dialog, aria-modal,
  focus-trapped, NFR-003) is the ONLY path to trigger this call — irreversible
  action explicitly stated in the dialog copy; no optimistic client-only state
  flip before server confirms (same rigor pattern as US-E20.1's high-risk
  Unlink, even though this story's lane is "normal" not "high-risk"). Confirm
  button shows pending state while in flight.
```

## 3. Auth & Security

- Every endpoint above requires `Authorization: Bearer` (httpOnly cookie,
  server-side hybrid refresh, decision `0018`) — no client-side token
  handling in this screen, same as every other feature in this repo.
- **Teacher class-scope enforcement (FR-008, NFR-008) is a real security AC,
  not optional:** INT-001 (record) and INT-003 (edit) MUST be re-checked
  server-side for `classId` ownership. A GVCN of class A forging a request
  with class B's `classId` (bypassing the client route/role gate) must
  receive `ABSENCE_FORBIDDEN` (403) from the server — the mock repository
  must simulate this rejection so the AC is testable pre-BE-integration
  (same expectation the sibling `US-E20.1` established for its high-risk
  Unlink endpoint, applied here at normal-lane rigor).
- **Principal flag-only enforcement (FR-009, NFR-008):** INT-004 must be
  re-checked server-side for `principal`-tier role independent of the client
  route gate — a non-principal actor forging the flag call must receive
  `ABSENCE_FORBIDDEN` (403). The principal has zero capability to reach
  INT-001/INT-003 at all (no client affordance offered); server-side rejection
  of those two if somehow reached is a pure backstop (FR-009 errorConditions).
- PII fields: `studentMemberId` is Confidential (minor's data) on every
  endpoint; `reason` free text is Confidential (may contain sensitive
  context about the absence). No `studentName`/`className` travels on the
  wire at all — those are resolved entirely from the client-side mock roster
  fixture, never sent to or received from the server.
- No new auth/RBAC rule beyond what ADR `0062` already settled (route ↔ role
  mapping: `(app)/teacher/absences` = teacher, `(app)/principal/absences` =
  principal). No admin-role (this app's separate, narrower admin route-guard
  role) involvement anywhere in this feature.

## 4. Mock-first plan

Design `IStudentAbsenceRepository` covering all 4 endpoints (record, list,
edit, flag). DI factory (`student-absence.di.ts`) SHOULD force-mock
regardless of `NEXT_PUBLIC_USE_MOCK`, matching the `discipline` feature's
established precedent — the real endpoints are unreachable end-to-end today
because of the roster-UUID gap, so a real/mock toggle would silently produce
a broken "real" mode.

Suggested entity shape (matches the ground-truthed wire contract exactly,
plus a client-only display-name overlay resolved from the mock roster —
never sent to/received from the server):

```ts
interface StudentAbsence {
  classId: string;
  studentMemberId: string;
  date: string; // bare "YYYY-MM-DD", not a datetime
  reason?: string;
  excused: boolean;
  state: "RECORDED" | "FLAGGED_UNEXCUSED";
  recordedByMemberId: string;
  flaggedByMemberId?: string;
  createdAt: string;
  updatedAt: string;
}

// Client-side only — never on the wire (roster-UUID gap, FR-010)
interface StudentRosterEntry {
  studentMemberId: string;
  fullName: string;
  className: string;
}
```

Mock fixtures needed:
- `SA_STUDENT_ROSTER` — fixed roster fixture scoped to a mock teacher's own
  homeroom class only (a handful of `studentMemberId` → `fullName`/`className`
  entries), used exclusively to populate the record form's student select
  (FR-010) and to resolve display names when rendering list rows. NOT a
  live-search endpoint (FR-012, explicit non-goal).
- Seeded absence records covering: `RECORDED` + `excused: true`, `RECORDED` +
  `excused: false`, and `FLAGGED_UNEXCUSED` (at least one of each) — so the
  two-independent-badges rendering rule (FR-007) has fixture coverage for
  every combination.
- Duplicate-date-rejection simulation: attempting to record for an
  classId+studentMemberId+date already seeded → reject with
  `ABSENCE_DUPLICATE_DATE` (409) (FR-003).
- Future-date-rejection simulation: attempting to record/edit with a date
  after "today" (mock clock, injectable per `.claude/rules/tdd.md` — do not
  depend on real `Date.now()` in tests) → reject with `ABSENCE_INVALID_DATE`
  (422) (FR-002).
- Forbidden-class simulation: recording/editing with a `classId` not matching
  the mock teacher's own homeroom class → reject with `ABSENCE_FORBIDDEN`
  (403) (FR-008/NFR-008 AC).
- Re-flag simulation: flagging a record whose seeded state is already
  `FLAGGED_UNEXCUSED` → reject with `ABSENCE_INVALID_STATE` (400) (FR-005 backstop AC).
- No unflag mock behavior of any kind should exist in the repository
  interface or mock implementation — `IStudentAbsenceRepository` should not
  even expose an `unflag`-shaped method signature (FR-006/FR-013).

Typed failure union (new file, `student-absence.failure.ts`) — genuinely new
keys, zero reuse from `DisciplineFailure`:

```ts
type StudentAbsenceFailure =
  | { type: "forbidden" }        // ABSENCE_FORBIDDEN (403)
  | { type: "not-found" }        // ABSENCE_NOT_FOUND (404)
  | { type: "duplicate-date" }   // ABSENCE_DUPLICATE_DATE (409)
  | { type: "invalid-date" }     // ABSENCE_INVALID_DATE (422) — future date;
                                  //   distinct i18n key from discipline's
                                  //   invalid-date (which guards the opposite
                                  //   direction — see §1 risk note)
  | { type: "invalid-state" }     // ABSENCE_INVALID_STATE (400, backstop)
  | { type: "invalid-id" }        // ABSENCE_INVALID_ID (400, backstop)
  | { type: "invalid-input" }     // ABSENCE_INVALID_INPUT (422, backstop)
  | { type: "network-error" };
```

`type` values double as i18n keys under a new `studentAbsences.errors.*`
namespace (per `.claude/rules/i18n.md` convention already used by
`discipline.errors.*`) — added to both `vi.json` and `en.json` in the same edit.

## 5. Open Questions

- `[OPEN QUESTION]` INT-002 (list) pagination shape is not confirmed from the
  Go source excerpt available to this analysis — treat as a bounded array
  (one class over a date range) rather than cursor-paginated until the core
  team or a fuller `routes.go`/`openapi.yaml` read confirms whether
  `meta.pagination` is present. If it is cursor-paginated, `useInfiniteQuery`
  applies per the standard convention in `.claude/rules/api-integration.md`;
  if not, a plain `useQuery` array fetch is sufficient.
- `[OPEN QUESTION]` Exact default date range for INT-002's `from`/`to` when
  the screen first loads is explicitly left as a uiux/fe decision (per
  requirements.md assumption) — current academic term vs a recent rolling
  window (e.g. last 30 days). Not fixed by this contract; flag to `uiux`/
  `fe-lead` if not already decided by the design-spec.
- `[OPEN QUESTION]` Whether `core`'s `ERROR_CODES.md` (once readable in a
  full local `edu-api` checkout) confirms the exact HTTP status codes stated
  here (403/404/409/422/400) — this analysis derived them from DR-022's
  ground-truthing pass against Go source; a direct `ERROR_CODES.md` read
  would be a stronger source but was not available in this pass. Low risk
  (statuses are consistent with the sibling `discipline`/`staff-discipline`
  features' established `core` conduct-domain conventions), but worth a
  confirmation pass when `core` next ships an update.
- `[OPEN QUESTION]` No ADR needed per requirements.md's explicit handoff note
  ("no new auth/RBAC rule beyond ADR 0062, no new token, no new data-contract
  decision") — carrying that forward; nothing surfaced during this mapping
  pass that would change that conclusion.
