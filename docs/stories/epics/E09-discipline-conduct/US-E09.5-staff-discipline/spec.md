# Feature Spec — Staff Discipline (violations + conduct notes, tabbed) (US-E09.5)

Status: Draft   Lane: normal
Sources: `requirements.md` (TR-091, FR-001..013, NFR-001..009) ·
`integration.md` (INT-001..010) · `use-cases.md` (UC-001..010, AC-001.x..
AC-010.x, Edge Case Matrix) · `docs/product/design-spec.jsonc` →
`screens.staffDiscipline` (line ~10217) · `design_src/edu/staff-discipline.jsx`
(`StaffDisciplineScreen`) · `docs/decisions/0062-staff-discipline-absences-
route-actor-fix.md` (route correction) · `docs/decisions/0073` (`selfApproved`
single-admin-tenant fallback, referenced) · `docs/decisions/0074` (conduct-note
lock, referenced) · `src/bootstrap/i18n/messages/{vi,en}.json`
(`staffDiscipline` + `discipline` namespaces, already authored)

## 1. Scope & Objectives

**Purpose:** Give the `principal` a single tabbed screen to author, submit,
approve/reject staff-conduct records — violations (Tab 1) and per-term conduct
notes (Tab 2) — for staff under their school, and give `teacher` a strictly
read-only view of their own record on both tabs.

**In-scope:**
- Two-tab screen (Violations / Conduct Notes) at the corrected routes
  `(app)/principal/staff-discipline` and `(app)/teacher/staff-discipline`
  (ADR `0062` — supersedes DR-022's original `/admin/staff-discipline`).
- Full `ApprovalTransition` lifecycle (DRAFT → SUBMITTED → APPROVED |
  REJECTED) for `staff-violations`: create, submit, approve, reject.
- Full set(create/overwrite)/submit/approve/reject lifecycle for
  `staff-conduct-notes`, keyed by natural key `(termId, staffMemberId)`,
  including the permanent `APPROVED`-lock rule (ADR `0074`).
- `teacher` read-only self-view on both tabs (own `staffMemberId` only, zero
  mutation affordance).
- `selfApproved` audit-transparency annotation (ADR `0073`), always visible,
  never conditionally hidden.
- Fixed mock-roster-scoped staff select on create/set forms (no live search).
- Filtering: state/staff/severity (Violations), term/staff (Conduct Notes) —
  principal view only, client-side narrowing.

**Out-of-scope:**
- Live roster search/autocomplete-by-name against a real endpoint (FR-013,
  explicit exclusion).
- Any change to `(app)/admin/layout.tsx`'s strict `admin` route guard.
- Student-facing discipline features (existing `discipline.jsx`, untouched).
- Student Absences (separate story, US-E09.6, different screen).
- Audit-log emission for approve/reject/set-note actions (flagged, not
  decided — see §8).

**Definitions:**
- **`ApprovalTransition`** — the shared 4-state lifecycle
  (`DRAFT → SUBMITTED → APPROVED | REJECTED`) used by both sub-resources,
  identical shape to `academic-records.jsx` unseal requests and
  `staff-leave.jsx` pending/approved/rejected.
- **`selfApproved`** — a read-derived boolean on the response, true when
  `approverMemberId === authorMemberId`; the expected common case for this
  single-`principal`-tenant model (ADR `0073`), not an edge case — MUST always
  render, never be suppressed.
- **Locked (conduct note)** — once a `(termId, staffMemberId)` record reaches
  `APPROVED`, it is permanently immutable via the set endpoint (ADR `0074`);
  no client affordance may reopen its edit form (409
  `STAFF_CONDUCT_NOTE_LOCKED` if bypassed).
- **`principal`** — this app's BGH-tier actor. Per ADR `0062`, `principal`
  collapses BOTH the BE conduct sub-domain's `ADMIN` authoring capacity AND
  its `MANAGER` approving capacity onto this single app role. **This is NOT
  the app's separate route-guard `admin` role** (reserved for admin-core
  config screens — school-setup, roster, parent-links, invitations, per
  decision `0022`). `(app)/admin/layout.tsx`'s guard is untouched by this
  story.

## 2. Actors & Roles

| Actor | Visibility / capability |
| --- | --- |
| `principal` | Full: author (create DRAFT) violation via mock-roster form; submit own DRAFT; approve/reject SUBMITTED (reject requires reason); set/overwrite conduct note (target state absent/DRAFT/REJECTED only — blocked on APPROVED); submit own DRAFT note; approve/reject SUBMITTED note; view full role-scoped list on both tabs (all staff, filterable); see `selfApproved` annotation whenever acting as both author and approver. This is the BE `ADMIN` (author) + `MANAGER` (approve) capacity combined onto this app's `principal` role (ADR `0062`) — **not** the app's separate `admin` route-guard role. |
| `teacher` | Read-only self-view only: own violations + own conduct notes (server-scoped to own `staffMemberId`), no term selector on Conduct Notes (scoped to the currently active term, per `design-spec.jsonc`). Zero create/submit/approve/reject/set affordance rendered — not merely disabled, absent from the DOM. |
| Any other role (e.g. `admin`, `student`, `parent`) | None on either route — existing role-guard redirects to the actor's own workspace before any tab/list/form data or markup is sent to the client (FR-001/UC-009). |
| `core` service (mock-first) | System actor. Backing store for both sub-resources; the mock repository simulates `forbidden`/`locked`/transition-guard/`selfApproved`-derivation responses so NFR-008/NFR-009 are testable pre-real-wiring. |
| `SD_STAFF_ROSTER` (fixed mock roster) | System, static data. Supplies the staff-member picklist for create/set forms and resolves display name/department for existing records — no live search (FR-009/FR-013). |

Role-gated visibility is enforced by the existing per-route-group RSC guard at
`(app)/principal/**` and `(app)/teacher/**` (reused, not reimplemented) —
**and independently re-checked server-side on every mutating action**, per
§"High-risk-grade security enforcement" below.

## 3. Functional Requirements

### FR-001 — Two-tab role-conditional screen at corrected routes (Must, TR-091/UC-001/UC-006/UC-010)
The system SHALL render a two-tab screen (Violations, Conduct Notes) at route
`(app)/principal/staff-discipline` for `principal` and
`(app)/teacher/staff-discipline` for `teacher`, both served by one
role-conditional component (`StaffDisciplineScreen`).
- AC: Given an authenticated `principal`/`teacher` navigates to their route,
  Then the tab shell renders with role-appropriate capabilities visible
  (AC-001.2/AC-001.3).
- AC: Given any other role hits either route, Then the existing role-guard
  redirects server-side before any tab/list/form data ships (AC-009.1).
- Dependencies: INT-002, INT-006.

### FR-002 — Create staff violation (Must, TR-091/UC-002)
The system SHALL allow `principal` to create a `staff-violation` record in
`DRAFT` state via a form (`staffMemberId` from a fixed mock-roster select,
`category`, `description` [required], `severity`
[`MINOR`|`MODERATE`|`SEVERE`], `occurredAt`).
- AC: Given all required fields are valid, When submitted, Then the form
  closes, list refetches, new row appears with `state = DRAFT`,
  `authorMemberId` = the principal's memberId (AC-002.3).
- AC: Given the staff-member select is opened multiple times, Then the same
  static `SD_STAFF_ROSTER` list re-renders and no network request ever fires
  for this field (AC-002.2, confirms FR-009/FR-013).
- Dependencies: INT-001, INT-009 (mock roster).

### FR-003 — Submit own DRAFT violation (Must, TR-091/UC-003)
The system SHALL allow `principal` to submit their own DRAFT violation record,
transitioning it to `SUBMITTED`.
- AC: Given an own-authored DRAFT row, When "Gửi duyệt" is clicked, Then
  `SDStateBadge` updates to SUBMITTED on success (AC-003.1).
- AC: Given a DRAFT row NOT authored by the current principal, Then no submit
  action is rendered for that row (AC-003.2).
- Dependencies: INT-003.

### FR-004 — Approve/reject violation (Must, TR-091/UC-004/UC-005)
The system SHALL allow `principal` to approve or reject a SUBMITTED violation
record; reject requires a non-empty `rejectionReason` (client-side UX guard:
minimum 10 characters before enabling submit; server requires only
non-empty).
- AC: Given approver ≠ author, When approved, Then state becomes APPROVED
  with no `SDSelfApprovedNote` rendered (AC-004.1).
- AC: Given approver === author (`selfApproved = true`), When approved, Then
  `SDSelfApprovedNote` renders alongside the state badge and is NEVER
  conditionally hidden (AC-004.2, ADR `0073`).
- AC: Given fewer than 10 characters are typed in the reject panel, Then
  confirm stays disabled (AC-005.1); given `VIOLATION_REJECTION_REASON_REQUIRED`
  is returned (client-guard bypass), Then an inline reject-textarea error
  renders with `aria-invalid`+`aria-describedby` (AC-005.3) — a distinct
  validation layer from the client guard.
- Dependencies: INT-004.

### FR-005 — Set (create/overwrite) conduct note, incl. lock (Must, TR-091/UC-007)
The system SHALL allow `principal` to set (create or overwrite) a
conduct-note record keyed by the natural key `(termId, staffMemberId)` with
fields `rating` (`SATISFACTORY`|`NEEDS_IMPROVEMENT`|`UNSATISFACTORY`) and
`note` (free text, max 5000 chars, required).
- AC: Given a target record's state is absent/DRAFT/REJECTED, When submitted
  with valid fields, Then the record is created/overwritten with
  `state = DRAFT` (AC-007.3).
- AC: Given the target record's state is `APPROVED`, When the principal
  attempts to open its set form, Then the form MUST NOT open at all — an
  inline lock message (`staffDiscipline.errors.locked`) renders instead, no
  request is sent (AC-007.4, NFR-009).
- AC: Given a set request reaches the server against a record that has since
  become APPROVED (race/stale client), Then `STAFF_CONDUCT_NOTE_LOCKED` (409)
  is still returned and the same inline lock message renders (AC-007.5,
  server-side backstop).
- Dependencies: INT-005, INT-009 (mock roster).

### FR-006 — Submit/approve/reject conduct note (Must, TR-091/UC-008)
The system SHALL allow `principal` to submit their own DRAFT conduct note
(DRAFT → SUBMITTED) and to approve or reject a SUBMITTED conduct note (reject
requires a reason), mirroring FR-003/FR-004 for this sub-resource.
- AC: Given an own-authored DRAFT note, When submitted, Then INT-007 fires
  and state becomes SUBMITTED (AC-008.1).
- AC: Given approver === author on approve, Then `SDSelfApprovedNote` renders
  and is never hidden (AC-008.3); given a note has just transitioned to
  APPROVED, Then FR-005's lock (AC-007.4) applies immediately with no
  additional wiring/refetch required (AC-008.9).
- Dependencies: INT-007, INT-008.

### FR-007 — Teacher read-only self-view (Must, TR-091/UC-001/UC-006)
The system SHALL render the `teacher`'s own-record view on both tabs as
strictly read-only: no create/set form, no submit/approve/reject affordance,
list/detail scoped to the teacher's own `staffMemberId` only.
- AC: Given `teacher` navigates to their route, Then own violation/conduct-
  note records display with state/severity/rating badges and ZERO mutating
  controls are present in the DOM — not merely disabled (AC-001.3/AC-006.3).
- AC: Given the teacher has no own record yet, Then a plain empty message
  renders with NO CTA (AC-001.5/AC-006.5).
- Dependencies: INT-002, INT-006.

### FR-008 — Tab switcher (Must, TR-091/UC-010)
The system SHALL provide a tab switcher (Violations / Conduct Notes) that
filters the visible list/form/actions to the selected sub-resource without
navigating away from the screen.
- AC: Given "Conduct Notes" is clicked while "Violations" is active, Then
  only the selected tab's content renders, no navigation occurs (AC-010.1).
- AC: Given the tab bar is rendered, Then it exposes `role="tablist"`/
  `role="tab"` with `aria-selected`, operable via Tab/Arrow keys, ≥44px touch
  target per tab (AC-010.2).
- AC: Given one tab is in an error state, When the actor switches tabs, Then
  the newly selected tab renders its OWN current state independently
  (AC-010.3) — no carry-over error banner.
- Dependencies: none (client-side tab state).

### FR-009 — Mock-roster-scoped staff select (Must, TR-091/UC-002/UC-007)
The system SHALL source the create-violation and set-conduct-note forms'
staff-member field from a fixed, static mock roster list (`SD_STAFF_ROSTER`),
not a live search-as-you-type endpoint, since neither wire response carries
`staffName`/`department` for resolution.
- AC: Given the form is opened repeatedly, Then the same static list renders
  each time and no network request ever fires for this field (AC-002.2).
- Dependencies: none (mock, client-side data).

### FR-010 — `selfApproved` visible annotation (Must, TR-091/UC-004/UC-005/UC-008, ADR `0073`)
The system SHALL display a visible `selfApproved` annotation (not hidden) on
any record where `approverMemberId` equals `authorMemberId`, on both tabs,
for audit transparency.
- AC: AC-004.2, AC-008.3 — `SDSelfApprovedNote` renders and is NEVER
  conditionally hidden, omitted, or suppressed by any client-side condition.
- Dependencies: INT-004, INT-008 (read-derived field on the response, not a
  separate call — see INT-010 grouping note in `integration.md`).

### FR-011 — Empty states, role-differentiated (Should, TR-091/UC-001/UC-006)
The system SHALL show an empty state with a create-record CTA ("Ghi nhận vi
phạm" / "Đặt ghi chú") for `principal`, and a plain no-CTA empty message for
`teacher`'s self-view, when a list/record has zero entries.
- AC: AC-001.4 (principal, CTA), AC-001.5 (teacher, no CTA); AC-006.4/AC-006.5
  same pattern for Conduct Notes.
- Dependencies: INT-002, INT-006.

### FR-012 — List filtering (Should, TR-091/UC-001/UC-006)
The system SHALL allow filtering the Violations list by state, staff member,
and severity, and the Conduct Notes list by term and staff member (principal
view only).
- AC: AC-001.7 (state/severity filter, principal only, client-side narrowing
  per `integration.md`'s open question); AC-006.6 (term selector re-queries
  INT-006 for the newly selected `termId`; no term selector rendered for
  teacher).
- Dependencies: INT-002, INT-006.

### FR-013 — Explicit exclusion: live roster search (Won't, TR-091)
The system SHALL NOT implement live roster search/autocomplete-by-name
against a real endpoint in this story.
- No AC (explicit exclusion). Confirmed by AC-002.2's negative assertion (no
  network call fires for the staff-member field).
- Dependencies: n/a.

## 4. Non-Functional Requirements

| NFR | Requirement | Measurable target | QA verification |
| --- | --- | --- | --- |
| NFR-001 (a11y) | State/severity/rating badges never convey meaning by color alone | Every `SDStateBadge`/`SDSeverityBadge`/`SDRatingBadge` instance renders icon + text label | `/impeccable audit` + manual greyscale check |
| NFR-002 (a11y) | Warning-toned badges (SUBMITTED, MINOR, NEEDS_IMPROVEMENT) use warning-foreground text token | Contrast ≥4.5:1 text, ≥3:1 icon, WCAG 2.1 AA | axe/impeccable contrast check |
| NFR-003 (a11y) | Tab bar + all interactive controls fully keyboard-operable, visible focus ring | `role=tablist`/`tab` + `aria-selected`; reject textarea `aria-invalid`+`aria-describedby` when invalid; touch targets ≥44×44px | Storybook keyboard interaction test |
| NFR-004 (a11y/motion) | Toast/panel expand animation gated behind `prefers-reduced-motion: reduce` | No motion plays with OS reduced-motion enabled | Manual reduced-motion toggle + Storybook story |
| NFR-005 (responsive) | No layout break at standard breakpoints | No horizontal overflow/clipping at 320/375/768/1280px widths | Storybook viewport stories at all 4 widths |
| NFR-006 (perf) | Skeleton loading state while list/record is fetching | `EduSkeleton` (variant='rows', count=4) visible ≤320ms after navigation until data resolves or error | Storybook loading-state story + manual timing spot-check |
| NFR-007 (i18n) | All UI copy from `staffDiscipline` namespace + verbatim reuse of `discipline.errors.*`/`discipline.leave.rejectDialog.*` (see §9 for actual-state note) | Zero hardcoded VN-diacritic strings outside `messages/*.json`; `tsc --noEmit` passes with typed `t()` keys | `bunx tsc --noEmit`; hardcoded-string grep |
| NFR-008 (security) | Every mutating action re-authorized server-side by role, independent of client route guard | Non-`principal` mutating request rejected with `VIOLATION_FORBIDDEN`/`STAFF_CONDUCT_NOTE_FORBIDDEN` even if client UI bypassed; teacher's list requests server-scoped to own `staffMemberId` | RBAC unit test invoking Server Action/repository directly with non-`principal` role (AC-009.2/.3/.4/.5) |
| NFR-009 (security) | APPROVED conduct note immutable via set endpoint | Client blocks opening the set form on APPROVED with inline lock message; bypassed request still receives `STAFF_CONDUCT_NOTE_LOCKED` (409) server-side | Mock repository test asserting 409 on an APPROVED fixture record (AC-007.5, AC-009.6) |

## 5. UI States & Flows

Per-async-surface state matrix (loading/empty/error/success required
everywhere data is fetched or mutated):

| Surface | Loading | Empty | Error | Success |
| --- | --- | --- | --- | --- |
| Violations list (INT-002) | `EduSkeleton` rows×4 (AC-001.1) | 2 variants: principal+CTA (AC-001.4) / teacher no-CTA (AC-001.5) | error+retry (AC-001.6); `VIOLATION_FORBIDDEN` → redirect not error (E2) | rows render full field set (AC-001.2/.3) |
| Create-violation dialog (INT-001) | submit pending/disabled, `aria-busy`, dialog stays open until settled (AC-002.6) | n/a (form always has fields) | severity/description inline field errors (AC-002.4/.5); invalid-id toast (E3); network → dialog stays open, fields preserved (AC-002.7) | form closes, list refetches, new DRAFT row (AC-002.3) |
| Submit-violation row action (INT-003) | row button pending state | n/a | invalid-transition inline (AC-003.3); not-found toast + row removed (AC-003.4); forbidden inline (AC-003.5, server backstop) | `SDStateBadge` → SUBMITTED (AC-003.1) |
| Approve/reject violation (INT-004) | button pending state; reject confirm disabled until ≥10 chars (AC-005.1) | n/a | reject-reason-required inline textarea error (AC-005.3); invalid-transition inline (AC-004.3/AC-005.4); not-found/forbidden (AC-004.4); network → panel/dialog stays open (AC-005.6) | APPROVED + `selfApproved` note if applicable (AC-004.1/.2); REJECTED + reason visible (AC-005.2) |
| Conduct Notes list (INT-006) | `EduSkeleton` rows×4 (AC-006.1) | 2 variants (AC-006.4/.5) | error+retry (AC-006.7); term-not-found inline on term selector (AC-006.8) | rows render full field set (AC-006.2/.3); term change re-queries (AC-006.6) |
| Set-conduct-note dialog (INT-005) | submit pending/disabled, dialog stays open until settled (AC-007.8) | n/a (new: empty form AC-007.1; overwrite: pre-filled AC-007.2) | LOCKED — form never opens (AC-007.4, client pre-check); LOCKED — server backstop after form closes (AC-007.5); term/rating validation inline (AC-007.6/.7); network → field values preserved (AC-007.9); 5000-char cap enforced (AC-007.10) | record created/overwritten `state=DRAFT`, form closes (AC-007.3) |
| Submit/approve/reject conduct note (INT-007/INT-008) | mirrors INT-003/INT-004 | n/a | mirrors INT-003/INT-004 (AC-008.7/.8); reject-reason-required (AC-008.6) | mirrors INT-003/INT-004; post-approval immutability takes effect immediately (AC-008.9) |
| Role-gate (route) | n/a | n/a | non-`principal`/non-`teacher` → server-side redirect before any markup ships (AC-009.1) | correct role → full page renders |
| Tab switcher (client) | n/a | n/a | per-tab independent error state, no carry-over (AC-010.3) | tab switches with no navigation (AC-010.1); keyboard+ARIA operable (AC-010.2) |

Key flows: tab-load → (principal: create/set OR submit OR approve/reject) OR
(teacher: read-only view) → list reflects change. No optimistic UI is
required for this normal-lane story, but the set-conduct-note form and both
reject panels MUST NOT close until the request settles (matches the
high-risk-grade posture asked for on mutating actions, see §"High-risk-grade
security enforcement").

## 6. Data & Integration

Per INT-XXX in `integration.md` §2 (source of truth; summarized here for
handoff completeness). **All 10 endpoints are REAL and SHIPPED** on the BE
side (ground-truthed against `edu-api/services/core/internal/conduct/
adapter/http/{routes.go,dto/staff_violation.go,dto/staff_conduct_note.go}`,
same rigor as US-E18.14) — the web client is classified **MOCK-FIRST**
purely because of the client-side roster-UUID gap (no roster-search endpoint
resolves `staffMemberId` → display name/department; neither response carries
`staffName`/`department` on the wire).

| INT | Service | Method+Path | Request (camelCase) | Response | Error→UI | Pagination | Auth/role |
| --- | --- | --- | --- | --- | --- | --- | --- |
| INT-001 | core (mock-first) | POST `/core/api/v1/conduct/staff-violations` | `staffMemberId` (mock-roster), `category`, `description`, `severity`, `occurredAt` | created record, `state=DRAFT`, `authorMemberId` | `VIOLATION_INVALID_SEVERITY`→severity field; `VIOLATION_INVALID_INPUT`→`missing-description`; `VIOLATION_INVALID_ID`→`not-found` toast; network→retry | none | `principal` |
| INT-002 | core (mock-first) | GET `/core/api/v1/conduct/staff-violations?staffMemberId=` | optional `staffMemberId` filter (teacher: server-forced to own id) | `items[]` (same shape as INT-001) | `VIOLATION_FORBIDDEN`→redirect; network→error+retry; empty→FR-011 variants | **[OPEN QUESTION]** unpaginated for this story's mock — see §8 | `principal` (all, filterable) / `teacher` (own only, server-scoped) |
| INT-003 | core (mock-first) | POST `/core/api/v1/conduct/staff-violations/{id}/submit` | path `recordId` only | updated record, `state=SUBMITTED` | `VIOLATION_INVALID_TRANSITION`/`INVALID_STATE`→"đã ở trạng thái khác"; `NOT_FOUND`/`INVALID_ID`→toast+row removed; `FORBIDDEN`→inline (server backstop) | none | `principal`, own-authored only |
| INT-004 | core (mock-first) | POST `.../{id}/approve` \| `.../{id}/reject` | reject: `rejectionReason` (server non-empty; client 10-char UX guard on top) | updated record, `state=APPROVED\|REJECTED`, `approverMemberId`, `selfApproved`, `rejectionReason?` | `REJECTION_REASON_REQUIRED`→reject textarea inline; `INVALID_TRANSITION`→"đã được xử lý"; `SAME_ACTOR`→**[OPEN QUESTION]** generic inline (see §8); `NOT_FOUND`/`FORBIDDEN`→same as INT-003 | none | `principal` (approving capacity; may equal author) |
| INT-005 | core (mock-first) | POST `/core/api/v1/conduct/staff-conduct-notes` | `staffMemberId` (mock-roster), `termId`, `academicYearId` (validation-only, not stored), `rating`, `note` (≤5000) | record, `state=DRAFT\|SUBMITTED\|APPROVED\|REJECTED`, `authorMemberId`, `selfApproved` | `STAFF_CONDUCT_NOTE_LOCKED` (409)→client pre-check blocks form open, server backstop on race; `TERM_NOT_FOUND`→term selector inline; `INVALID_RATING`→rating field inline; `FORBIDDEN`→same as INT-001; network→retry | none | `principal` only |
| INT-006 | core (mock-first) | GET `/core/api/v1/conduct/staff-conduct-notes?staffMemberId=&termId=` | `staffMemberId`, `termId` (**[OPEN QUESTION]** teacher self-view scope — resolved, see §8) | `items[]` (same shape as INT-005) | `FORBIDDEN`→redirect/inline; `TERM_NOT_FOUND`→term selector inline, list not fetched; network→error+retry; empty→FR-011 variants | **[OPEN QUESTION]** unpaginated for this story's mock — see §8 | `principal` (all + all terms, filterable) / `teacher` (own only, active term only) |
| INT-007 | core (mock-first) | POST `.../{staffMemberId}/submit?termId=` | path `staffMemberId`, query `termId` | updated record, `state=SUBMITTED` | `VIOLATION_INVALID_TRANSITION` (shared code)→same as INT-003; `STAFF_CONDUCT_NOTE_NOT_FOUND`→toast+row removed; `FORBIDDEN`→inline (server backstop) | none | `principal`, own-authored only |
| INT-008 | core (mock-first) | POST `.../{staffMemberId}/approve?termId=` \| `.../reject?termId=` | reject: `rejectionReason` (shared code) | updated record, `state=APPROVED\|REJECTED`, `approverMemberId`, `selfApproved`; once APPROVED, immutable via INT-005 | `REJECTION_REASON_REQUIRED`→reject textarea inline; `INVALID_TRANSITION`→"đã được xử lý"; `NOT_FOUND`/`FORBIDDEN`→same as INT-007 | none | `principal` (approving capacity; may equal author) |
| INT-009 | — (grouping note) | n/a | reject-reason validation is a shared cross-cutting concern across INT-004/INT-008 — one shared `SDRejectPanel` component contract; client 10-char guard vs server non-empty guard are two distinct, independently testable layers | — | — | — | — |
| INT-010 | — (grouping note) | n/a | `selfApproved` (ADR `0073`) is a read-derived field on every INT-002/INT-004/INT-006/INT-008 response, not a separate endpoint — an AC-worthy always-visible annotation (FR-010), not a display nicety | — | — | — | — |

Entity (mock, domain not DTO — mirrors `integration.md` §4):

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

Fixed mock roster (`SD_STAFF_ROSTER`): a small static array of
`{ staffMemberId, staffName, department }` used both to populate the
create/set form's picklist (FR-009 — never live search) and to resolve
display fields when rendering existing mocked records.

Mock-first plan (mirrors `discipline`/`staff-leave` precedent, per
`integration.md` §4): follow the existing `discipline` feature's
force-mocked-DI pattern (`src/features/discipline/infrastructure/
repositories/discipline.repository.ts` +
`mocks/discipline.mock.repository.ts`, `src/bootstrap/di/discipline.di.ts` —
force-mock regardless of `NEXT_PUBLIC_USE_MOCK` since the roster-UUID gap
makes the real repository permanently unreachable today) and `staff-leave`'s
mock-roster resolution approach. Whether one `IStaffDisciplineRepository`
covers both sub-resources' 10 endpoints, or two repos behind one facade, is an
`fe-component-architect`/`fe-nextjs-engineer` implementation decision — the
existing `i-discipline.repository.ts` (covers 3 sub-resources in ONE
interface) is the closer precedent than splitting.

Required fixtures (testable-lock/testable-selfApproved instruction from
`integration.md`): violations — mix of states across all 4, ≥2 severities,
≥1 `selfApproved: true`, ≥1 `REJECTED` with populated `rejectionReason`;
conduct notes — ≥1 per rating tier, ≥1 already `APPROVED` (to reproduce
`STAFF_CONDUCT_NOTE_LOCKED`), ≥1 `selfApproved: true`, ≥2 terms represented; a
simulated `forbidden` response for a non-`principal` mutating call (NFR-008
assertion, testable via direct repository/Server Action invocation).

## 7. Use Case Summary

| UC ID | Title | FR coverage | AC count |
| --- | --- | --- | --- |
| UC-001 | Load Violations tab | FR-001, FR-007, FR-011, FR-012 | 7 (AC-001.1–.7) |
| UC-002 | Create violation (principal only) | FR-002, FR-009, FR-013 | 7 (AC-002.1–.7) |
| UC-003 | Submit violation | FR-003 | 5 (AC-003.1–.5) |
| UC-004 | Approve violation | FR-004, FR-010 | 5 (AC-004.1–.5) |
| UC-005 | Reject violation | FR-004 | 6 (AC-005.1–.6) |
| UC-006 | Load Conduct Notes tab | FR-001, FR-007, FR-011, FR-012 | 8 (AC-006.1–.8) |
| UC-007 | Set (create/overwrite) conduct note, incl. lock | FR-005, FR-009 | 10 (AC-007.1–.10) |
| UC-008 | Submit / approve / reject conduct note | FR-006, FR-010 | 9 (AC-008.1–.9) |
| UC-009 | Role-gate enforcement (server-side, non-negotiable) | NFR-008, NFR-009 | 6 (AC-009.1–.6) |
| UC-010 | Tab switcher + responsive layout | FR-008 | 5 (AC-010.1–.5) |

## 8. Constraints & Assumptions

**Technical constraints:**
- `core`'s `conduct` sub-domain endpoints for `staff-violations`/
  `staff-conduct-notes` are already shipped (ground-truthed, US-E18.14
  precedent) — but the web client stays mock-first because of the roster-UUID
  gap (no roster-search endpoint), same trigger as `staff-leave`/`discipline`.
- Neither response carries `staffName`/`department` — display fields are
  resolved entirely against the fixed mock roster, client-side.

**Confirmed [ASSUMPTION]s (carried from `requirements.md`):**
- The mock roster list used for both the create-form select and for rendering
  existing records' staff identity is presumed sufficient for this story's
  scope; production roster resolution is a follow-up tracked by the existing
  roster-UUID gap (asks #9/#15/#22).
- `principal` is the single BGH-tier actor for this feature per ADR `0062` —
  there is no scenario in this story where a distinct second approver exists;
  `selfApproved` is expected to be the common case, not an edge case.

**Resolved (not open, stated for traceability):** teacher self-view term
scope on Conduct Notes — `design-spec.jsonc`'s
`staffDiscipline.conductNotesTab.termSelector.visibleFor: "principal only"`
resolves `requirements.md`/`integration.md`'s open question: teacher sees no
term selector and is scoped to the currently active term only (AC-006.3/
AC-006.6).

**[CONFLICT: i18n reuse plan vs. actual `messages/{vi,en}.json` state]**
`design-spec.jsonc`'s `i18nReuse.verbatim` list and `requirements.md`/
NFR-007 instruct reusing `discipline.leave.rejectDialog.*` verbatim for the
reject panel. The actual, already-authored `staffDiscipline` namespace in
`src/bootstrap/i18n/messages/{vi,en}.json` instead defines its OWN
`staffDiscipline.rejectDialog.{cancel,confirm,description,reasonMinLength,
reasonPlaceholder,title}` (near-duplicate content, missing the `reason` key
`discipline.leave.rejectDialog` has). `discipline.errors.*` reuse for the 9
shared `VIOLATION_*`/transition codes (`same-actor`, `forbidden`, `not-found`,
`already-processed`, `invalid-transition`, `invalid-severity`,
`invalid-state`, `invalid-input`, `network-error`, `missing-reject-reason`)
IS present and correctly NOT duplicated under `staffDiscipline`. **Resolution
for `/fe`:** use the keys that already exist — `staffDiscipline.rejectDialog.*`
for the reject panel's own copy (do not re-derive from `discipline.leave.
rejectDialog`, since that would mean adding a cross-namespace reference this
component doesn't currently need); reuse `discipline.errors.*` verbatim for
the 9 shared codes as already wired. Do not add a second, redundant
`discipline.leave.rejectDialog` reference. This is a documentation drift
between the design-spec's stated plan and the copy that was actually
authored — not a functional gap; both namespaces already exist and are
usable as-is.

**[OPEN QUESTION]s (carried forward, NOT resolved here):**
1. **Pagination shape** — neither DR-022 nor the ground-truthed Go source
   confirms `meta.pagination` on INT-002/INT-006. Treat as unpaginated
   single-page responses for this story's mock/AC; confirm before real
   wiring.
2. **`VIOLATION_SAME_ACTOR` vs `selfApproved` semantics** (INT-004) — the
   shared taxonomy lists this code as rejectable, but ADR `0073`/FR-010
   describe self-approval as the EXPECTED single-admin-tenant case (rendered
   via `selfApproved`, never blocked). Mapped to a generic inline error
   (AC-004.5) until edu-api `core` confirms whether/when it still fires for
   this tenant model.
3. **FR-012 filter mechanics** — `state`/`severity` (violations) and
   `term`/`staffMember` (conduct notes) filters: only `staffMemberId`/
   `termId` are confirmed server query params; AC assume client-side
   narrowing for `state`/`severity` (small per-staff record counts) unless
   `core` confirms server-side filter support.
4. **Audit-log emission** for approve/reject/set-note actions — flagged, not
   decided here (routed to `ba-lead`; would require extending the shared
   `AuditEntityType` union with `"staff-violation"`/`"staff-conduct-note"`
   variants, outside this story's unilateral scope — same pattern flagged for
   US-E20.1's Unlink).
5. **Response echo on set-note overwrite** — whether `authorMemberId`/
   `createdAt` reset to the calling principal/now on an overwrite, or the
   original author/createdAt are preserved. AC-007.2/AC-007.3 are written to
   be agnostic to this until confirmed.
6. **Description/note truncation UX** — no explicit max-length or
   truncation/tooltip behavior specced for the violation description field
   or the conduct-note row excerpt (only the note textarea's 5000-char hard
   cap is specced, AC-007.10). Flag to `uiux-lead` if a real long-text case
   surfaces during build — same class of gap as US-E20.1's name-truncation
   open item.

## 9. Traceability Matrix

| Requirement | Source | Use Case(s) | Integration(s) | Priority |
| --- | --- | --- | --- | --- |
| FR-001 Two-tab role-conditional screen at corrected routes | TR-091 FR-001 | UC-001, UC-006, UC-010 | INT-002, INT-006 | Must |
| FR-002 Create violation (DRAFT) | TR-091 FR-002 | UC-002 | INT-001 | Must |
| FR-003 Submit own DRAFT violation | TR-091 FR-003 | UC-003 | INT-003 | Must |
| FR-004 Approve/reject violation | TR-091 FR-004 | UC-004, UC-005 | INT-004 | Must |
| FR-005 Set (create/overwrite) conduct note, incl. lock | TR-091 FR-005 | UC-007 | INT-005 | Must |
| FR-006 Submit/approve/reject conduct note | TR-091 FR-006 | UC-008 | INT-007, INT-008 | Must |
| FR-007 Teacher read-only self-view | TR-091 FR-007 | UC-001, UC-006 | INT-002, INT-006 | Must |
| FR-008 Tab switcher | TR-091 FR-008 | UC-010 | n/a (client-side) | Must |
| FR-009 Mock-roster-scoped staff select | TR-091 FR-009 | UC-002, UC-007 | n/a (mock data) | Must |
| FR-010 `selfApproved` visible annotation | TR-091 FR-010 | UC-004, UC-005, UC-008 | INT-004, INT-008 (INT-010 grouping note) | Must |
| FR-011 Empty states, role-differentiated | TR-091 FR-011 | UC-001, UC-006 | INT-002, INT-006 | Should |
| FR-012 List filtering | TR-091 FR-012 | UC-001, UC-006 | INT-002, INT-006 | Should |
| FR-013 Explicit exclusion: live roster search | TR-091 FR-013 | UC-002 (negative assertion AC-002.2) | n/a (exclusion) | Won't |
| NFR-001 Badges icon+text, never color-only | TR-091 NFR-001 | UC-001, UC-006 | INT-002, INT-006 | Must |
| NFR-002 Warning-foreground contrast | TR-091 NFR-002 | UC-001, UC-006 | INT-002, INT-006 | Must |
| NFR-003 Keyboard + focus + touch target | TR-091 NFR-003 | UC-002, UC-005, UC-007, UC-010 | INT-001, INT-004, INT-005 | Must |
| NFR-004 Motion-safe animations | TR-091 NFR-004 | UC-010 | n/a (client-side) | Must |
| NFR-005 Responsive, no overflow at 4 breakpoints | TR-091 NFR-005 | UC-010 | n/a (client-side) | Must |
| NFR-006 Skeleton perf (≤320ms) | TR-091 NFR-006 | UC-001, UC-006 | INT-002, INT-006 | Must |
| NFR-007 i18n namespace + verbatim reuse (see §8 [CONFLICT]) | TR-091 NFR-007 | all | all | Must |
| NFR-008 Server-side role re-check on every mutation | TR-091 NFR-008 | UC-009 | INT-001, INT-003, INT-004, INT-005, INT-007, INT-008 | Must (HIGH-RISK-grade) |
| NFR-009 Conduct-note APPROVED immutability | TR-091 NFR-009 | UC-007, UC-009 | INT-005 | Must (HIGH-RISK-grade) |

No FR/NFR is UNCOVERED — every row above has ≥1 UC/AC. FR-013 and FR-008/
FR-009 map to negative/client-only assertions rather than a server
integration, which is expected for an explicit exclusion and pure client-side
requirements respectively.

## High-Risk-Grade Security Enforcement (non-negotiable, NFR-008/NFR-009, FR-004/FR-005/UC-009)

This section exists because, although this story's **lane is normal**,
NFR-008/NFR-009 carry the same rigor as a high-risk lane's Unlink pattern
(mirrors US-E20.1's UC-006 shape): every mutating action on this screen
touches another staff member's confidential, HR-adjacent conduct record. The
following is a hard gate, not a nice-to-have, and MUST be true before this
story can be marked `implemented`:

1. **Server-side re-authorization is mandatory and independent of the client
   route gate.** The routes (`(app)/principal/staff-discipline`,
   `(app)/teacher/staff-discipline`) already deny the wrong role via the
   existing RSC guard — that guard is necessary but **explicitly
   insufficient**. Every call to INT-001 (create), INT-003/INT-007 (submit),
   INT-004/INT-008 (approve/reject), INT-005 (set) MUST independently
   re-check, at the API/Server-Action boundary: the caller's authenticated
   session role is `principal` (and, for submit/approve/reject, ownership/
   state as applicable). This must hold even against a forged/replayed
   request, a stale session whose role changed after the page loaded, or a
   direct call that never rendered the UI at all.
2. **A client-side `if` hiding a button is NOT sufficient.** Denial must be
   reproducible by calling the underlying Server Action/repository method
   directly with a non-`principal` role and observing rejection with
   `VIOLATION_FORBIDDEN`/`STAFF_CONDUCT_NOTE_FORBIDDEN` — a test suite that
   only proves the button is hidden does NOT satisfy NFR-008 (AC-009.5).
3. **List-scope enforcement is server-side, not client-filtered.** `teacher`'s
   list requests (INT-002, INT-006) must be server-scoped to their own
   `staffMemberId` regardless of any client-supplied param — the web never
   relies on client-side filtering of a broader list for the self-view
   (AC-009.4).
4. **The conduct-note `APPROVED` lock is a genuine BE-enforced business rule
   (ADR `0074`), not a client nicety.** The client pre-check (form does not
   open on an APPROVED record) is the primary UX, but a bypassed/stale
   request against INT-005 MUST still receive `STAFF_CONDUCT_NOTE_LOCKED`
   (409) server-side (AC-009.6).
5. **`selfApproved` must be rendered, never suppressed**, whenever
   `approverMemberId === authorMemberId` (ADR `0073`) — this is an
   audit-transparency requirement, not a display preference; hiding it on any
   client condition is itself a defect against this section's intent.
6. **The assertion must be testable pre-real-BE-wiring.** Since the web
   client stays mock-first (roster-UUID gap), the mock repository IS the
   enforcement boundary for now — it MUST simulate rejecting a non-
   `principal` mutating call and simulate the 409 lock on an APPROVED
   fixture, matching the existing `discipline` mock's precedent.

`fe-tech-lead-reviewer` and any dedicated security review MUST verify points
1–4 above with a concrete test (unit or integration) that exercises a
forged/non-`principal` role directly against the repository or Server Action
layer — UI-only role-hiding tests are insufficient proof for this story,
identically to US-E20.1's Unlink gate.

## 10. Handoff to FE

`fe-lead` should build:
- `src/features/staff-discipline/` (domain: `StaffViolationEntity`,
  `StaffConductNoteEntity`, one `IStaffDisciplineRepository` covering both
  sub-resources' 10 endpoints — or two repos behind one facade, an
  `fe-component-architect` call — use-cases for
  create/submit/approve/reject-violation and set/submit/approve/reject-
  conduct-note plus both list queries; infrastructure: force-mocked DI +
  mock repository per §6 fixtures, DTOs, mappers, endpoint constants;
  presentation: `StaffDisciplineScreen` + `SDViolationsTab` +
  `SDConductNotesTab` + `SDStateBadge`/`SDSeverityBadge`/`SDRatingBadge` +
  `SDRejectPanel` + `SDSelfApprovedNote`).
- Routes `(app)/principal/staff-discipline/page.tsx` and
  `(app)/teacher/staff-discipline/page.tsx` + `actions.ts`, reusing the
  existing per-role-group RSC guards (no new route-level guard needed),
  following the one-component-multi-role-route pattern already proven by
  `discipline.jsx` serving both `/teacher/discipline` and
  `/principal/discipline`.
- Reference design: `design_src/edu/staff-discipline.jsx`
  (`StaffDisciplineScreen`) and its `docs/product/design-spec.jsonc` entry
  `screens.staffDiscipline` (line ~10217) — tokens, badge color mapping
  (state/severity/rating), tab-bar shape, and `layout.contentPadding`/
  `maxWidth` are normative per decision `0011`.
- i18n: `staffDiscipline` namespace (already authored in `messages/{vi,en}.
  json`) + verbatim reuse of `discipline.errors.*` (9 shared codes) — see §8
  [CONFLICT] for the `rejectDialog` resolution (use
  `staffDiscipline.rejectDialog.*` as-authored, not a cross-reference to
  `discipline.leave.rejectDialog`).

**Suggested lane:** normal — but the pipeline MUST still include the
high-risk-grade security review pass on NFR-008/NFR-009 (§"High-Risk-Grade
Security Enforcement") before the design-review gate, matching US-E20.1's
posture for its Unlink flow even though this story is not formally
high-risk-laned.

**Proof owed (→ TEST_MATRIX rows):**
- Unit: create/submit/approve/reject-violation and set/submit/approve/
  reject-conduct-note use-cases (ok + every documented failure branch per
  §9); `selfApproved` derivation; lock-on-APPROVED guard.
- Integration: mock repository including the simulated forbidden-role
  rejection (AC-009.2/.3) and the simulated 409 lock on an APPROVED fixture
  (AC-009.6) as their own explicit tests — these are the load-bearing
  security-grade proofs, not optional coverage; list-scope enforcement test
  (AC-009.4).
- E2E: Storybook stories per §5's Validation table — all 4 UI states × both
  tabs × both dialogs (create-violation, set-conduct-note) × reject panel ×
  role-gate-denied (principal/teacher/other) × responsive viewport set
  (320/375/768/1280).
- Platform: `tsc --noEmit` clean, `bun run build` succeeds with both new
  routes present.
- Release: design-review gate (tokens/a11y/states) AND a dedicated
  confirmation that the security-grade server-side re-authorization tests
  (NFR-008/NFR-009) exist and pass — release-blocking, distinct from the
  general design-review gate.
