# US-E09.5 — Integration Map (Staff Discipline: violations + conduct notes, tabbed)

Per `.claude/rules/api-integration.md` (service map decision `0017`) + DR-022 +
ADR `0062` (role remap) + ADR `0073` (`selfApproved`) + ADR `0074`
(conduct-note lock). Actors: `principal` (author+submit+approve+reject on both
tabs — BE's `ADMIN` authoring capacity AND `MANAGER` approving capacity BOTH
collapse onto this single app role, ADR `0062`), `teacher` (read-only
self-view, zero mutation). Routes: `(app)/principal/staff-discipline`,
`(app)/teacher/staff-discipline` (requirements.md supersedes DR-022's original
`/admin/staff-discipline` — do not use the `admin` route-guard role here).
Lane: **normal** (per requirements.md handoff), but NFR-008/NFR-009 carry
high-risk-lane-grade security assertions (see §3).

## 1. Integration Overview

- **Endpoints consumed by this screen: 10** (5 `staff-violations` + 5
  `staff-conduct-notes`), all `core` service, `conduct` sub-domain.
- **Services touched:** `core` only. No `iam`/`lms`/`noti`/`social` calls.
- **Real vs mock-first — UNUSUAL split, state precisely:** all 10 endpoints
  are **REAL and SHIPPED** on the BE side — ground-truthed directly against
  `edu-api/services/core/internal/conduct/adapter/http/{routes.go,
  dto/staff_violation.go,dto/staff_conduct_note.go}` (not prose, not a guess;
  same rigor as US-E18.14). This is the **opposite** mock-first reason from
  most `core` stories in this repo, where `core` itself doesn't exist yet.
  Here `core`'s conduct sub-domain DOES exist and these exact routes are
  live. The web client is still classified **MOCK-FIRST** for this story
  purely because of a **client-side, cross-repo blocker**: every endpoint
  keys on a real `staffMemberId` UUID that the web has no roster-search
  endpoint to resolve to a display name (asks #9/#15/#22,
  `docs/stories/epics/E18-be-wiring/US-E18.14-discipline-conduct-wiring/
  story.md` + `EPIC-OVERVIEW.md`), and no response on either sub-resource
  carries `staffName`/`department` to resolve client-side either. Precedent
  for this exact "real contract, roster-blocked" classification:
  US-E18.8/staff-leave, and the existing `discipline` feature's
  student-violations/student-conduct-grades tracks (same `DISCIPLINE_EP`
  file, force-mocked DI regardless of `NEXT_PUBLIC_USE_MOCK`).
- **Risk notes:** (a) `STAFF_CONDUCT_NOTE_LOCKED` (409) is a genuine
  server-enforced immutability rule (ADR `0074`) — the mock repository must
  reproduce this exactly so the AC for FR-005/NFR-009 (form must not even
  open on an APPROVED note) is testable pre-wiring. (b) `selfApproved` (ADR
  `0073`) must never be hidden client-side — this is an audit-transparency
  requirement, not a display nicety; a mock record with `selfApproved: true`
  is required in fixtures to make the AC testable. (c) Every mutating
  endpoint needs the same server-side role-reassertion rigor as a high-risk
  screen even though this story's lane is "normal" (see §3 — NFR-008/009).
- **When this becomes wireable:** not a `core` ship date (already shipped) —
  gated on the roster-UUID gap closing (a real member-search/roster-resolve
  endpoint becoming available to the web), same trigger as `staff-leave` and
  `discipline`.

## 2. Endpoint Catalogue

```
INT-001  Create staff violation (author, DRAFT)
Service: core    Method+Path: POST /core/api/v1/conduct/staff-violations
Status: REAL (ground-truthed: edu-api core/internal/conduct/adapter/http/routes.go,
  dto/staff_violation.go) — web wiring MOCK-FIRST (roster-UUID gap, see §1)
Protected: yes   Role required: principal (BE ADMIN authoring capacity)
Request (outbound, camelCase):
  staffMemberId — target staff member's UUID, from the fixed mock-roster
    picklist (FR-009 — never a live search) | Confidential
  category — violation category, free text/enum per BE | Internal
  description — required free text | Confidential
  severity — "MINOR" | "MODERATE" | "SEVERE" | Internal
  occurredAt — ISO-8601 datetime | Internal
Response payload (inbound, after envelope unwrap):
  recordId — string | Internal
  staffMemberId — Confidential
  category / description — Confidential
  severity — Internal
  occurredAt — Internal
  state — "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | Internal
  authorMemberId — Confidential (= current principal's memberId on create)
  approverMemberId? — Confidential
  selfApproved — bool | Internal (audit-transparency, ADR 0073)
  rejectionReason? — Confidential
  createdAt / updatedAt — Internal
Pagination: none
Errors → UI behavior:
  - VIOLATION_INVALID_SEVERITY → failure `invalid-severity` → inline field
    error on the severity select | not retryable
  - VIOLATION_INVALID_INPUT → failure `missing-description` (existing
    discipline mapping precedent — description is the required free-text
    field) → inline field error on description | not retryable
  - VIOLATION_INVALID_ID → failure `not-found` → toast "không hợp lệ", form
    stays open | not retryable
  - NETWORK_ERROR / transport → failure `network-error` → dialog stays open,
    inline/toast error, retry submit | retryable
Empty / loading expectation: submit button pending/disabled while in flight;
  dialog does not close until success (mirrors INT-002 of US-E20.1).

INT-002  List staff violations
Service: core    Method+Path: GET /core/api/v1/conduct/staff-violations?staffMemberId=
Status: REAL (ground-truthed) — web wiring MOCK-FIRST
Protected: yes   Role required: principal (all staff, filterable, FR-012) or
  teacher (server-scoped to own staffMemberId only, FR-007)
Request (outbound, camelCase):
  staffMemberId — optional filter (principal: any staff; teacher: server
    forces own id regardless of client param, NFR-008) | Confidential
  (client-side-only filters per FR-012: state, severity — narrow the
   already-fetched list; not confirmed as server query params, see §5)
Response payload (inbound): items[] — same shape as INT-001 response, one
  entry per record | Confidential
Pagination: **[OPEN QUESTION]** no `meta.pagination` shape confirmed in
  DR-022/ground-truth for this list route — treat as unpaginated single-page
  response for this story's mock; flag before real wiring.
Errors → UI behavior:
  - VIOLATION_FORBIDDEN → failure `forbidden` → redirect to actor's own
    workspace (server-side enforcement, not just hidden UI), per NFR-008 |
    not retryable
  - NETWORK_ERROR → failure `network-error` → error banner + retry (skeleton
    replaced by error state) | retryable
  - empty items[] → principal: empty state + "Ghi nhận vi phạm" CTA (FR-011);
    teacher: plain no-CTA empty message (FR-011, FR-007)
Empty / loading expectation: EduSkeleton variant="rows" count=4 (NFR-006)
  visible ≤320ms until data resolves or error.

INT-003  Submit staff violation (DRAFT → SUBMITTED)
Service: core    Method+Path: POST /core/api/v1/conduct/staff-violations/{id}/submit
Status: REAL (ground-truthed) — web wiring MOCK-FIRST
Protected: yes   Role required: principal, own-authored record only
  (authorMemberId = current actor)
Request (outbound): path param recordId only; no body
Response payload (inbound): updated record, state = "SUBMITTED"
Pagination: none
Errors → UI behavior:
  - VIOLATION_INVALID_TRANSITION / VIOLATION_INVALID_STATE → failure
    `invalid-transition` → inline "đã ở trạng thái khác" message, row stays,
    list refetches | not retryable
  - VIOLATION_NOT_FOUND / VIOLATION_INVALID_ID → failure `not-found` → toast
    "không tìm thấy", row removed on refetch | not retryable
  - VIOLATION_FORBIDDEN → failure `forbidden` → inline error, action button
    disabled, server-side enforcement is the real gate (NFR-008) | not
    retryable
Empty / loading expectation: submit button shows pending state on the row.

INT-004  Approve or reject staff violation (SUBMITTED → APPROVED | REJECTED)
Service: core    Method+Path:
  POST /core/api/v1/conduct/staff-violations/{id}/approve
  POST /core/api/v1/conduct/staff-violations/{id}/reject
Status: REAL (ground-truthed) — web wiring MOCK-FIRST
Protected: yes   Role required: principal (BE MANAGER approving capacity,
  ADR 0062 — collapses onto principal; may equal the author, ADR 0073)
Request (outbound, camelCase, reject only):
  rejectionReason — free text; server requires only non-empty
    (VIOLATION_REJECTION_REASON_REQUIRED on empty) — client adds its own
    10-char UX guard on top, a stricter but non-authoritative layer
    (FR-004) | Confidential
Response payload (inbound): updated record —
  state = "APPROVED" | "REJECTED", approverMemberId set,
  selfApproved = true when approverMemberId === authorMemberId (must be
  visibly rendered, never hidden, FR-010), rejectionReason set on reject
Pagination: none
Errors → UI behavior:
  - VIOLATION_REJECTION_REASON_REQUIRED → failure `missing-reject-reason` →
    inline error on the reject textarea (aria-invalid + aria-describedby,
    NFR-003), reject panel stays open | not retryable
  - VIOLATION_INVALID_TRANSITION → failure `invalid-transition` → "đã được
    xử lý" inline message (record already processed by someone else,
    race), row refetches | not retryable
  - VIOLATION_SAME_ACTOR → failure `same-actor` → **[OPEN QUESTION]**
    ground-truth lists this code in the shared taxonomy but requirements.md/
    DR-022 both describe selfApproved as the EXPECTED single-admin-tenant
    behavior, not a rejected case — confirm with `ba-use-case-modeler`/edu-api
    core team whether `VIOLATION_SAME_ACTOR` still fires in some narrower
    scenario (e.g. a distinct real-world guard beyond the ADR 0073 fallback)
    or is dead code for this tenant model; map to a generic inline error
    until confirmed
  - VIOLATION_NOT_FOUND / VIOLATION_FORBIDDEN → failure `not-found` /
    `forbidden` → same as INT-003 | not retryable
Empty / loading expectation: approve/reject buttons pending state; reject
  panel submit disabled until client 10-char guard passes.

INT-005  Set (create/overwrite) staff conduct note
Service: core    Method+Path: POST /core/api/v1/conduct/staff-conduct-notes
Status: REAL (ground-truthed: dto/staff_conduct_note.go) — web wiring
  MOCK-FIRST (roster-UUID gap)
Protected: yes   Role required: principal (BE ADMIN only)
Request (outbound, camelCase):
  staffMemberId — from fixed mock-roster picklist | Confidential
  termId — target term | Internal
  academicYearId — validation-only (server resolves the term), NOT stored,
    NOT echoed back on the response | Internal
  rating — "SATISFACTORY" | "NEEDS_IMPROVEMENT" | "UNSATISFACTORY" | Internal
  note — free text, max 5000 chars, required | Confidential
Response payload (inbound):
  termId — Internal
  staffMemberId — Confidential
  rating — Internal
  note — Confidential
  state — "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | Internal
  authorMemberId — Confidential
  approverMemberId? — Confidential
  selfApproved — bool | Internal
  rejectionReason? — Confidential
  createdAt / updatedAt — Internal
Pagination: none
Errors → UI behavior:
  - STAFF_CONDUCT_NOTE_LOCKED (409) → failure `locked` → set form MUST NOT
    even open when the target record is APPROVED — this is a CLIENT-SIDE
    pre-check (FR-005/NFR-009); if reached anyway (stale client state /
    race), inline "Ghi chú đã được duyệt, không thể chỉnh sửa" message,
    form closes without submitting | not retryable
  - STAFF_CONDUCT_NOTE_TERM_NOT_FOUND (422/404) → failure `not-found` (term
    variant) → inline error on the term selector, "kỳ học không hợp lệ" |
    not retryable
  - STAFF_CONDUCT_NOTE_INVALID_RATING (422) → failure `invalid-rating` →
    inline field error on the rating select | not retryable
  - STAFF_CONDUCT_NOTE_FORBIDDEN → failure `forbidden` → same as INT-001 |
    not retryable
  - NETWORK_ERROR → failure `network-error` → dialog stays open, retry |
    retryable
Empty / loading expectation: submit button pending/disabled; form does not
  close until success. FR-005 precondition ("state absent, DRAFT, or
  REJECTED") is enforced client-side by disabling/hiding the set action on
  APPROVED rows — the 409 is the server-side backstop, not the primary UX.

INT-006  List staff conduct notes
Service: core    Method+Path: GET /core/api/v1/conduct/staff-conduct-notes?staffMemberId=&termId=
Status: REAL (ground-truthed) — web wiring MOCK-FIRST
Protected: yes   Role required: principal (all staff + all terms, filterable
  FR-012) or teacher (own staffMemberId only, term scope per §5 open question)
Request (outbound, camelCase):
  staffMemberId — Confidential (teacher: server-forced to own id, NFR-008)
  termId — Internal (**[OPEN QUESTION]** — is termId required on every list
    call, or optional-omit-for-"all terms"? Requirements.md openQuestions[1]
    flags whether teacher's self-view is scoped to only the currently active
    term or can browse past terms; design-spec.jsonc marks the term selector
    `visibleFor: principal` only — confirm with ba-use-case-modeler/uiux
    before this list's default `termId` behavior is finalized)
Response payload (inbound): items[] — same shape as INT-005 response |
  Confidential
Pagination: **[OPEN QUESTION]** same as INT-002 — no confirmed pagination
  shape; treat as unpaginated for this story's mock.
Errors → UI behavior:
  - STAFF_CONDUCT_NOTE_FORBIDDEN → failure `forbidden` → redirect / inline
    error per NFR-008 | not retryable
  - STAFF_CONDUCT_NOTE_TERM_NOT_FOUND → failure `not-found` (term variant) →
    inline error on term selector, list not fetched | not retryable
  - NETWORK_ERROR → failure `network-error` → error banner + retry |
    retryable
  - empty items[] → principal: empty state + "Đặt ghi chú" CTA (FR-011);
    teacher: plain no-CTA empty message
Empty / loading expectation: EduSkeleton variant="rows" count=4 (NFR-006).

INT-007  Submit staff conduct note (DRAFT → SUBMITTED)
Service: core    Method+Path:
  POST /core/api/v1/conduct/staff-conduct-notes/{staffMemberId}/submit?termId=
Status: REAL (ground-truthed) — web wiring MOCK-FIRST
Protected: yes   Role required: principal, own-authored record only
Request (outbound): path param staffMemberId, query param termId; no body
Response payload (inbound): updated record, state = "SUBMITTED"
Pagination: none
Errors → UI behavior:
  - VIOLATION_INVALID_TRANSITION (shared transition code, reused per DR-022)
    → failure `invalid-transition` → same as INT-003 | not retryable
  - STAFF_CONDUCT_NOTE_NOT_FOUND → failure `not-found` → toast, row removed
    on refetch | not retryable
  - STAFF_CONDUCT_NOTE_FORBIDDEN → failure `forbidden` → inline error,
    server-side enforcement is the real gate | not retryable
Empty / loading expectation: submit button pending state on the row.

INT-008  Approve or reject staff conduct note (SUBMITTED → APPROVED | REJECTED)
Service: core    Method+Path:
  POST /core/api/v1/conduct/staff-conduct-notes/{staffMemberId}/approve?termId=
  POST /core/api/v1/conduct/staff-conduct-notes/{staffMemberId}/reject?termId=
Status: REAL (ground-truthed) — web wiring MOCK-FIRST
Protected: yes   Role required: principal (approver capacity; may equal
  author, selfApproved)
Request (outbound, camelCase, reject only):
  rejectionReason — server requires non-empty (shared code,
    VIOLATION_REJECTION_REASON_REQUIRED reused per DR-022); client 10-char
    UX guard on top | Confidential
Response payload (inbound): updated record — state = "APPROVED" |
  "REJECTED", approverMemberId set, selfApproved flag, rejectionReason on
  reject. Once state = "APPROVED" this record becomes immutable via INT-005
  (STAFF_CONDUCT_NOTE_LOCKED) — no further set allowed (ADR 0074).
Pagination: none
Errors → UI behavior:
  - VIOLATION_REJECTION_REASON_REQUIRED → failure `missing-reject-reason` →
    inline reject-textarea error (aria-invalid + aria-describedby) | not
    retryable
  - VIOLATION_INVALID_TRANSITION → failure `invalid-transition` → "đã được
    xử lý", row refetches | not retryable
  - STAFF_CONDUCT_NOTE_NOT_FOUND / STAFF_CONDUCT_NOTE_FORBIDDEN → failure
    `not-found` / `forbidden` | not retryable
Empty / loading expectation: approve/reject buttons pending state; reject
  panel submit disabled until client guard passes.

INT-009  [Grouping note] Reject-reason validation is a shared cross-cutting
  concern across INT-004 and INT-008 — see spec §"reject dialog" for the
  single shared component contract (client 10-char guard vs server
  non-empty guard are two distinct validation layers, both must be covered
  by AC per requirements.md handoff notes).

INT-010  [Grouping note] `selfApproved` (ADR 0073) is a read-derived field on
  every INT-002/INT-004/INT-006/INT-008 response — not a separate endpoint,
  but called out on its own line because it is an AC-worthy, always-visible
  annotation (FR-010), not an optional display nicety.
```

## 3. Auth & Security

- Every endpoint requires `Authorization: Bearer` (httpOnly cookie,
  server-side hybrid refresh, decision `0018`) — no client-side token
  handling on this screen.
- Route guard: `(app)/principal/staff-discipline` and
  `(app)/teacher/staff-discipline` (requirements.md, ADR `0062` — NOT the
  app's separate `admin` route-guard role, which is reserved for
  school-setup/roster/etc. and unrelated to this feature).
- **NFR-008 (AC-worthy security assertion, same rigor as US-E20.1's Unlink
  high-risk pattern even though this story's lane is normal):** every
  mutating action — INT-001 create, INT-003/INT-007 submit, INT-004/INT-008
  approve/reject, INT-005 set — MUST be re-authorized server-side by role,
  independent of the client route guard. A non-`principal` actor's mutating
  request must be rejected with `VIOLATION_FORBIDDEN` /
  `STAFF_CONDUCT_NOTE_FORBIDDEN` even if the client UI were bypassed. The
  mock repository must simulate this rejection (a fake `teacher`-role
  mutating call returns `forbidden`) so the assertion is testable pre-BE,
  matching the existing `discipline` mock's precedent.
- **NFR-009:** a conduct note in `APPROVED` state is immutable via INT-005 —
  no client affordance may reopen its edit form; a bypassed request still
  receives `STAFF_CONDUCT_NOTE_LOCKED` (409) server-side. This is a genuine
  BE-enforced business rule (ADR `0074`), not just a client nicety — the
  mock must reproduce the 409 on a fixture record whose state is already
  `APPROVED`.
- **List scope enforcement:** `teacher`'s list requests (INT-002, INT-006)
  must be server-scoped to their own `staffMemberId` — the web never relies
  on client-side filtering of a broader list for the self-view (same
  posture as US-E20.1's search-scope note).
- PII / sensitivity: `staffMemberId` (Confidential — UUID references a real
  staff member), `description`/`note`/`rejectionReason` (Confidential —
  free-text HR-adjacent content), `authorMemberId`/`approverMemberId`
  (Confidential — identifies internal actors). `category`, `severity`,
  `rating`, `state`, timestamps are Internal (non-identifying metadata).
  No field on either response is Public.
- `selfApproved` must be rendered, never suppressed, for audit transparency
  (ADR `0073`) — flagging this here as well as in the catalogue because it
  is a security/audit-adjacent UI requirement, not merely a display
  preference.

## 4. Mock-first plan

Both sub-resources need mocks; follow the existing `discipline` feature's
force-mocked-DI precedent (`src/features/discipline/infrastructure/
repositories/discipline.repository.ts` + `mocks/discipline.mock.repository.ts`,
`src/bootstrap/di/discipline.di.ts` — force-mock regardless of
`NEXT_PUBLIC_USE_MOCK` since the roster-UUID gap makes the real repository
permanently unreachable) and `staff-leave`'s mock-roster resolution approach
(`src/features/staff-leave/infrastructure/repositories/mocks/
staff-leave.mock.repository.ts`).

Design either one `IStaffDisciplineRepository` covering both sub-resources'
10 endpoints, or two repos behind one facade — follow whichever shape
`fe-component-architect`/`fe-nextjs-engineer` find matches the existing
`i-discipline.repository.ts` convention (that file already covers 3
sub-resources — violations/conduct-grades/leave — in ONE interface, which is
the closer precedent than splitting).

Suggested stable entity shapes (domain, not DTO):

```ts
interface StaffViolationEntity {
  recordId: string;
  staffMemberId: string;
  staffName: string; // mock-roster resolved — NOT on the real wire
  department: string; // mock-roster resolved — NOT on the real wire
  category: string;
  description: string;
  severity: "MINOR" | "MODERATE" | "SEVERE";
  occurredAt: string; // ISO datetime
  state: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
  authorMemberId: string;
  approverMemberId?: string;
  selfApproved: boolean;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

interface StaffConductNoteEntity {
  termId: string;
  staffMemberId: string;
  staffName: string; // mock-roster resolved
  department: string; // mock-roster resolved
  rating: "SATISFACTORY" | "NEEDS_IMPROVEMENT" | "UNSATISFACTORY";
  note: string;
  state: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
  authorMemberId: string;
  approverMemberId?: string;
  selfApproved: boolean;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}
```

Fixed mock roster (`SD_STAFF_ROSTER`, per requirements.md dataDependencies):
a small static array of `{ staffMemberId, staffName, department }` used both
to populate the create/set form's picklist (FR-009 — never live search) and
to resolve display fields when rendering existing mocked records.

Fixtures needed (mirrors requirements.md's testable-lock/testable-selfApproved
instruction):

- Violations: mix of states across DRAFT/SUBMITTED/APPROVED/REJECTED,
  ≥2 severities, **≥1 record with `selfApproved: true`** (principal acting as
  both author and approver), ≥1 `REJECTED` with a populated
  `rejectionReason`.
- Conduct notes: ≥1 record per rating tier, **≥1 record already `APPROVED`**
  (to make `STAFF_CONDUCT_NOTE_LOCKED` reproducible when a set is attempted
  against it), ≥1 `selfApproved: true` example, ≥2 terms represented (to
  exercise the term filter/selector once open question §5's term-scope
  question is resolved).
- Mock behaviors: create (DRAFT), submit (state transition + `same-actor`/
  `invalid-transition` guards), approve/reject (state transition + reject-
  reason non-empty guard + `selfApproved` derivation when
  approverMemberId === authorMemberId), set-note (create/overwrite +
  `locked` 409 guard when target is `APPROVED`), list (role-scoped: teacher
  sees only own `staffMemberId`; principal sees all + FR-012 filters),
  simulated `forbidden` response for a non-principal mutating call (NFR-008
  assertion).
- Guard with `NEXT_PUBLIC_USE_MOCK` in the DI factory, but per the
  `discipline`/`staff-leave` precedent this repository should likely
  **force-mock regardless** of that flag, since the roster-UUID gap makes
  the real repository permanently unreachable today (confirm this choice
  with `fe-lead` when wiring the DI factory — same call made for
  `discipline.di.ts`).

## 5. Open Questions

- `[OPEN QUESTION]` **Pagination shape** — neither DR-022 nor the
  ground-truthed Go source (as summarized here) confirms `meta.pagination`
  on the two list routes (INT-002, INT-006). Recommend treating both as
  unpaginated single-page fetches for this story's mock/AC; confirm the
  real shape (cursor vs full-list) before real wiring.
- `[OPEN QUESTION]` **`VIOLATION_SAME_ACTOR` vs `selfApproved` semantics**
  (INT-004) — the shared error taxonomy includes `VIOLATION_SAME_ACTOR` as a
  rejectable condition, but ADR `0073`/FR-010 describe self-approval as the
  EXPECTED, allowed single-admin-tenant case (rendered via `selfApproved`,
  never blocked). Need `ba-use-case-modeler`/edu-api core team confirmation
  on when (if ever) `VIOLATION_SAME_ACTOR` still fires for this tenant model
  versus being effectively dead for principal-only tenants — affects whether
  the UI needs an error-state branch for it at all.
- `[OPEN QUESTION]` **Teacher self-view term scope on Conduct Notes**
  (carried from requirements.md openQuestions[1]) — is `termId` required on
  every INT-006 list call for the teacher self-view (i.e. only the currently
  active term, no browsing history), or can teacher browse past terms too?
  `design-spec.jsonc` marks the term selector `visibleFor: principal` only,
  suggesting teacher's self-view might be locked to the active term with no
  selector — confirm before finalizing INT-006's request contract and AC.
- `[OPEN QUESTION]` **FR-012 filter mechanics** — are `state`/`severity`
  (violations) and `term`/`staffMember` (conduct notes) filters implemented
  as server query params on INT-002/INT-006, or as client-side narrowing of
  an already-fetched full list? DR-022/ground-truth confirm only
  `staffMemberId` (and `termId` for notes) as documented query params; no
  `state`/`severity` query param is confirmed. Recommend client-side
  narrowing for `state`/`severity` (small per-staff record counts) unless
  the core team confirms server-side filter support.
- `[OPEN QUESTION]` **Audit-log emission** (carried from requirements.md,
  routed to `ba-lead`, not decided here) — should approve/reject/set-note
  actions emit into the existing generic `audit-log` feature
  (`src/features/audit-log/domain/entities/audit-event.entity.ts`,
  `AuditEntityType` union), mirroring the pattern flagged for US-E20.1's
  Unlink? Would require extending `AuditEntityType` with new variants
  (`"staff-violation"` / `"staff-conduct-note"`) — a shared domain type
  change outside this story's unilateral scope. Flagging only, per
  requirements.md's explicit instruction not to decide it here.
- `[OPEN QUESTION]` **Response echo on set-note overwrite** — when INT-005
  is called against an existing DRAFT/REJECTED record (overwrite, not first
  create), does the response reset `authorMemberId`/`createdAt` to the
  calling principal/now, or preserve the original author/createdAt and only
  update `note`/`rating`/`updatedAt`? Ground-truth doesn't specify; affects
  whether "who authored this note" display is stable across an overwrite.
