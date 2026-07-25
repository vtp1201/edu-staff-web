# US-E09.5 — Use Cases & Acceptance Criteria (Staff Discipline: violations + conduct notes, tabbed)

Lane: **normal** (per `requirements.md`/`integration.md` handoff), but NFR-008/
NFR-009 carry high-risk-lane-grade security assertions and are modeled with
that same rigor (mirrors US-E20.1's UC-006 "Role-gate enforcement" shape).
Actors: `principal` (BE's `ADMIN` authoring capacity + `MANAGER` approving
capacity, both collapsed onto this single app role, ADR `0062` — **not** the
app's separate route-guard `admin` role), `teacher` (read-only self-view,
zero mutation, own `staffMemberId` only). Routes:
`(app)/principal/staff-discipline`, `(app)/teacher/staff-discipline`.
Source: `requirements.md`, `integration.md`, DR-022, ADR `0062`, ADR `0073`,
ADR `0074`.

## 1. Use Case Scope Summary

10 use cases covering the full tabbed Staff Discipline screen: Violations-tab
load (both empty variants + error + role variant), violation
create/submit/approve/reject (incl. the `selfApproved` audit-transparency
annotation and the two-layer reject-reason validation), Conduct-Notes-tab
load (both empty variants + error + role variant + term scope), conduct-note
set/create-overwrite (incl. the `APPROVED`-lock client-side block),
conduct-note submit/approve/reject (mirrors violations), a dedicated
server-side role-gate-enforcement use case (NFR-008/NFR-009, modeled with
US-E20.1's high-risk rigor even though this story's lane is normal), and the
tab-switcher + responsive-layout use case. Boundary: this screen only covers
`staff-violations` and `staff-conduct-notes` (the `core` service's `conduct`
sub-domain, staff track) — it never touches the existing student-facing
`discipline.jsx` (student violations/conduct-grades) or the separate
`US-E09.6` Student Absences screen. All data is mock-first (force-mocked DI,
roster-UUID gap) behind an `IStaffDisciplineRepository`-shaped interface until
a real roster-resolve endpoint exists.

## 2. Actor Catalogue

| Actor/Role | Type | Capabilities |
| --- | --- | --- |
| `principal` | Primary, human | Create violation (DRAFT), submit own DRAFT, approve/reject SUBMITTED, set/overwrite conduct note (DRAFT/REJECTED/absent only), submit own DRAFT note, approve/reject SUBMITTED note, view full role-scoped lists on both tabs (all staff, filterable), see `selfApproved` annotation |
| `teacher` | Secondary, human, negative-for-mutation | View own violations + own conduct notes (server-scoped to own `staffMemberId`), strictly read-only — zero create/submit/approve/reject/set affordance rendered |
| non-`principal`/non-`teacher` actor (any other role) | Secondary, negative | MUST be denied both routes server-side (existing role-guard redirect) |
| `core` service (mock-first) | System | Backing store for `staff-violations` + `staff-conduct-notes`; simulates `forbidden`/`locked`/transition-guard responses in the mock repository |
| `SD_STAFF_ROSTER` (fixed mock roster) | System, static data | Supplies the staff-member picklist for create/set forms and resolves display name/department for existing records (no live search, FR-009) |

## 3. Use Case Catalogue

### UC-001: Load Violations tab

- **Primary actor:** principal or teacher. **Preconditions:** authenticated,
  active-tenant role is `principal` or `teacher`, Violations tab active
  (default or selected).
- **Main success scenario:**
  1. Actor navigates to `(app)/principal/staff-discipline` or
     `(app)/teacher/staff-discipline` with the Violations tab active.
  2. `EduSkeleton` (variant="rows", count=4) renders while INT-002 is in
     flight.
  3. Response resolves with `items[]`; each row renders avatar + staff
     name/dept (mock-roster resolved), severity badge, category/description,
     `occurredAt`, `SDStateBadge`, and (principal only) submit/approve/reject
     actions gated by state + `authorMemberId`/`approverMemberId`.
- **Alternative flows:**
  - A1 — Principal view, zero violations → empty state + "Ghi nhận vi phạm"
    CTA (FR-011).
  - A2 — Teacher self-view, zero own violations → plain empty message, no
    CTA (FR-011, FR-007).
  - A3 — Principal applies a state/severity filter (FR-012, client-side
    narrowing of the already-fetched list per integration.md open question)
    → list narrows; filter controls not rendered for teacher.
- **Exception flows:**
  - E1 — Network/transport failure or 5xx → error state with retry; retry
    re-issues INT-002.
  - E2 — `VIOLATION_FORBIDDEN` (should not occur post role-gate, but if
    returned) → redirect to the actor's own workspace, not an in-page error
    banner (NFR-008 posture).
- **Business rules:** teacher's list request is server-scoped to their own
  `staffMemberId` regardless of any client-supplied param (NFR-008) — the web
  never relies on client-side filtering of a broader list for self-view.
  Principal sees all staff, filterable.
- **Non-functional constraints:** NFR-006 (skeleton ≤320ms), NFR-001/NFR-002
  (severity/state badges icon+text, warning-foreground contrast), NFR-005
  (no layout break at any breakpoint).

### UC-002: Create violation (principal only)

- **Primary actor:** principal. **Preconditions:** principal role, Violations
  tab active.
- **Main success scenario:**
  1. Principal clicks "Ghi nhận vi phạm" → create-violation dialog/form opens
     with an empty staff-member select (fixed `SD_STAFF_ROSTER` picklist, no
     live search — FR-009), empty category, no severity selected, empty
     `occurredAt`, empty description.
  2. Principal selects a staff member from the static roster list, a
     category, a severity (MINOR/MODERATE/SEVERE), an `occurredAt` date, and
     enters a description.
  3. Principal submits; INT-001 fires; submit button shows pending/disabled
     state.
  4. On success: form/dialog closes, list refetches, new row appears with
     `state = DRAFT`, `authorMemberId` = current principal's memberId.
- **Alternative flows:**
  - A1 — Principal cancels/closes the form before submit → no request sent,
    fields discarded.
  - A2 — Principal re-opens the staff-member select multiple times → the
    same static list re-renders each time; no network call is ever fired for
    this field (confirms FR-009/FR-013 — no search-as-you-type).
- **Exception flows:**
  - E1 — `VIOLATION_INVALID_SEVERITY` → inline field error on the severity
    select, form stays open, no record created.
  - E2 — `VIOLATION_INVALID_INPUT` (missing/invalid description) → inline
    field error on the description textarea, form stays open.
  - E3 — `VIOLATION_INVALID_ID` (bad `staffMemberId`) → toast "không hợp
    lệ", form stays open.
  - E4 — Network/transport failure → form stays open, inline/toast error,
    retry re-submits with the same field values preserved (no data loss).
- **Business rules:** `staffMemberId` is only selectable from the fixed mock
  roster (FR-009/FR-013) — never a live-search endpoint, since neither wire
  response carries `staffName`/`department` for resolution.
- **Non-functional constraints:** NFR-003 (form fully keyboard-operable, ≥44px
  touch targets), NFR-007 (i18n `staffDiscipline` namespace).

### UC-003: Submit violation (DRAFT → SUBMITTED)

- **Primary actor:** principal. **Preconditions:** target row state = DRAFT,
  `authorMemberId` = current principal.
- **Main success scenario:**
  1. Principal clicks "Gửi duyệt" on an own-authored DRAFT row.
  2. Submit button on the row shows pending state; INT-003 fires.
  3. On success: row's `SDStateBadge` updates to SUBMITTED.
- **Alternative flows:**
  - A1 — Principal attempts to submit a row authored by no one visible as
    "own" — the submit action is not rendered at all for records the current
    principal did not author (client affordance), independent of the
    server-side own-record check.
- **Exception flows:**
  - E1 — `VIOLATION_INVALID_TRANSITION`/`VIOLATION_INVALID_STATE` (record
    already transitioned by a concurrent action) → inline "đã ở trạng thái
    khác" message, row stays, list refetches to reconcile.
  - E2 — `VIOLATION_NOT_FOUND`/`VIOLATION_INVALID_ID` → toast "không tìm
    thấy", row removed on refetch.
  - E3 — `VIOLATION_FORBIDDEN` → inline error on the row; this is the
    server-side enforcement backstop (NFR-008), not the primary UX gate.
- **Business rules:** only the authoring principal may submit their own
  DRAFT (server re-checked independent of client — see UC-009).

### UC-004: Approve violation (SUBMITTED → APPROVED, incl. `selfApproved`)

- **Primary actor:** principal. **Preconditions:** target row state =
  SUBMITTED.
- **Main success scenario:**
  1. Principal clicks "Duyệt" on a SUBMITTED row.
  2. Approve button shows pending state; INT-004 (approve) fires.
  3. On success: row's `SDStateBadge` updates to APPROVED,
     `approverMemberId` set. If `approverMemberId === authorMemberId`, the
     `SDSelfApprovedNote` annotation renders alongside the state badge —
     **always visible, never conditionally hidden** (ADR `0073`,
     audit-transparency requirement).
- **Alternative flows:**
  - A1 — Approver is a different principal than the author (non-self case)
    → record approves the same way, no `SDSelfApprovedNote` rendered (field
    is `false`).
- **Exception flows:**
  - E1 — `VIOLATION_INVALID_TRANSITION` (already processed by a concurrent
    action — race) → inline "đã được xử lý" message, row refetches.
  - E2 — `VIOLATION_NOT_FOUND`/`VIOLATION_FORBIDDEN` → same as UC-003 E2/E3.
  - E3 — `VIOLATION_SAME_ACTOR` — **[OPEN QUESTION, carried from
    integration.md]** the shared taxonomy lists this code as rejectable, but
    ADR `0073`/FR-010 describe self-approval as the EXPECTED,
    single-admin-tenant case (rendered via `selfApproved`, never blocked).
    Until edu-api `core` confirms whether/when this code still fires for
    this tenant model, the UI maps any occurrence to a generic inline error
    (same shape as E1) — no dedicated messaging is built for it in this
    story.
- **Business rules:** `selfApproved` is a read-derived field on the response,
  not a separate action — it MUST be rendered whenever true, on both tabs
  (FR-010).

### UC-005: Reject violation (SUBMITTED → REJECTED, two-layer validation)

- **Primary actor:** principal. **Preconditions:** target row state =
  SUBMITTED.
- **Main success scenario:**
  1. Principal clicks "Từ chối" on a SUBMITTED row → `SDRejectPanel` opens
     inline (not a modal), reusing `discipline.leave.rejectDialog.*` copy.
  2. Principal types a rejection reason of at least 10 characters (client-side
     UX guard, `reasonMinLength`) — the confirm button stays disabled below
     this threshold.
  3. Principal clicks confirm; INT-004 (reject) fires with `rejectionReason`;
     confirm button shows pending state.
  4. On success: panel closes, row's `SDStateBadge` updates to REJECTED,
     `rejectionReason` visible on the row/detail, `selfApproved` semantics
     apply identically to UC-004 if approver = author.
- **Alternative flows:**
  - A1 — Principal cancels the reject panel → panel closes, no request
    sent, no change.
- **Exception flows:**
  - E1 — Client-guard bypass path: `VIOLATION_REJECTION_REASON_REQUIRED`
    (server rejects an empty reason — this is a DISTINCT validation layer
    from the 10-char client guard; the server only requires non-empty) →
    inline error on the reject textarea with `aria-invalid` +
    `aria-describedby`, panel stays open.
  - E2 — `VIOLATION_INVALID_TRANSITION` (already processed, race) → inline
    "đã được xử lý", row refetches, panel closes.
  - E3 — `VIOLATION_NOT_FOUND`/`VIOLATION_FORBIDDEN` → same as UC-003.
  - E4 — Network/transport failure → panel stays open, inline/toast error,
    the typed reason text is preserved for retry.
- **Business rules:** two independent validation layers — (1) client 10-char
  UX guard (stricter, non-authoritative, blocks the confirm button before any
  request is sent) and (2) server non-empty guard
  (`VIOLATION_REJECTION_REASON_REQUIRED`, authoritative, fires only if layer
  1 is bypassed, e.g. a forged request). Both must be independently testable.

### UC-006: Load Conduct Notes tab

- **Primary actor:** principal or teacher. **Preconditions:** authenticated,
  Conduct Notes tab active.
- **Main success scenario:**
  1. Actor switches to (or lands on) the Conduct Notes tab.
  2. `EduSkeleton` (variant="rows", count=4) renders while INT-006 is in
     flight.
  3. Response resolves with `items[]`; each row renders avatar + staff
     name/dept (mock-roster resolved), `SDRatingBadge`, note excerpt,
     `SDStateBadge`, and (principal only) set/submit/approve/reject actions.
- **Alternative flows:**
  - A1 — Principal view, zero conduct notes for the selected term → empty
    state + "Đặt ghi chú" CTA (FR-011).
  - A2 — Teacher self-view, zero own conduct notes → plain empty message, no
    CTA.
  - A3 — Principal changes the term selector (`termSelector.visibleFor:
    principal` only, per `design-spec.jsonc`) → list re-queries INT-006 for
    the newly selected term.
- **Exception flows:**
  - E1 — Network/transport failure or 5xx → error state with retry.
  - E2 — `STAFF_CONDUCT_NOTE_TERM_NOT_FOUND` → inline error on the term
    selector, "kỳ học không hợp lệ", list not fetched.
  - E3 — `STAFF_CONDUCT_NOTE_FORBIDDEN` (should not occur post role-gate) →
    redirect to the actor's own workspace.
- **Business rules — term scope (resolves requirements.md/integration.md
  open question):** per `design-spec.jsonc`
  (`staffDiscipline.conductNotesTab.termSelector.visibleFor: "principal
  only"` with the note "self-view is scoped to the staff member's own record
  across the selected term implicitly"), **teacher's self-view renders no
  term selector at all** and is scoped to the currently active/default term
  only — teacher cannot browse past terms in this story. This is a resolved
  design decision (not invented), sourced directly from
  `design-spec.jsonc`, not an open item to re-flag.
- **Non-functional constraints:** NFR-006 (skeleton), NFR-001/NFR-002
  (rating badge icon+text + warning-foreground contrast for
  NEEDS_IMPROVEMENT).

### UC-007: Set (create/overwrite) conduct note, incl. APPROVED lock

- **Primary actor:** principal. **Preconditions:** principal role, Conduct
  Notes tab active, target `(termId, staffMemberId)` record is absent, DRAFT,
  or REJECTED (NOT APPROVED).
- **Main success scenario:**
  1. Principal selects a term + staff member (from the fixed mock roster,
     FR-009) and clicks "Đặt ghi chú" (or opens an existing DRAFT/REJECTED
     record's set form).
  2. Form opens with rating (segmented SATISFACTORY/NEEDS_IMPROVEMENT/
     UNSATISFACTORY) and note (textarea, max 5000 chars, required).
  3. Principal fills the form and submits; INT-005 fires; submit button
     shows pending/disabled state; form does not close until the request
     settles.
  4. On success: record created/overwritten with `state = DRAFT`, form
     closes, list refetches.
- **Alternative flows:**
  - A1 — Principal opens the set form against an EXISTING DRAFT/REJECTED
    record (overwrite path) → form pre-fills with the current rating/note;
    submit overwrites in place.
  - A2 — Principal cancels/closes the form before submit → no request sent,
    no change.
- **Exception flows:**
  - E1 — **Locked (client-side pre-check, primary UX):** principal attempts
    to open the set form on a record whose `state = APPROVED` → the form
    MUST NOT open at all; an inline lock message renders instead
    (`staffDiscipline.errors.locked`), no request is sent.
  - E2 — **Locked (server-side backstop, race/stale-client):** a set request
    reaches INT-005 against a record that has since become APPROVED (stale
    client state) → `STAFF_CONDUCT_NOTE_LOCKED` (409) → the form closes
    without submitting further, the same inline lock message renders, list
    refetches to reflect the current APPROVED state.
  - E3 — `STAFF_CONDUCT_NOTE_TERM_NOT_FOUND` → inline error on the term
    selector, form stays open.
  - E4 — `STAFF_CONDUCT_NOTE_INVALID_RATING` → inline field error on the
    rating select, form stays open.
  - E5 — `STAFF_CONDUCT_NOTE_FORBIDDEN` → inline error, server-side
    enforcement backstop (NFR-008).
  - E6 — Network/transport failure → form stays open, inline/toast error,
    field values preserved for retry.
- **Business rules:** the natural key is `(termId, staffMemberId)` — POST
  overwrites the existing DRAFT/REJECTED record in place; once APPROVED the
  record is permanently immutable via this endpoint (ADR `0074`) — both the
  client pre-check (E1, primary) and the server 409 (E2, backstop) must be
  independently testable, mirroring US-E20.1's high-risk dual-layer pattern.
- **Non-functional constraints:** NFR-003 (form keyboard-operable),
  character-count/max-length feedback on the 5000-char note field.

### UC-008: Submit / approve / reject conduct note

- **Primary actor:** principal. **Preconditions:** target note state = DRAFT
  (submit) or SUBMITTED (approve/reject).
- **Main success scenario:**
  1. Principal clicks "Gửi duyệt" on an own-authored DRAFT note → INT-007
     fires → state becomes SUBMITTED (mirrors UC-003).
  2. Principal clicks "Duyệt" on a SUBMITTED note → INT-008 (approve) fires
     → state becomes APPROVED, `approverMemberId` set; `SDSelfApprovedNote`
     renders (always visible, never hidden) when
     `approverMemberId === authorMemberId` (mirrors UC-004). Once APPROVED,
     the record becomes immutable per UC-007's lock rule.
  3. Principal opens the `SDRejectPanel` on a SUBMITTED note, enters ≥10
     chars (client guard), confirms → INT-008 (reject) fires → state becomes
     REJECTED with `rejectionReason` stored (mirrors UC-005).
- **Alternative flows:**
  - A1 — Approver ≠ author → no `SDSelfApprovedNote` rendered (field false).
  - A2 — Principal cancels the reject panel → no request sent.
- **Exception flows:**
  - E1 — `VIOLATION_INVALID_TRANSITION` (shared transition code, reused per
    DR-022) → inline "đã ở trạng thái khác"/"đã được xử lý" per action, row
    refetches.
  - E2 — `STAFF_CONDUCT_NOTE_NOT_FOUND` → toast, row removed on refetch.
  - E3 — `STAFF_CONDUCT_NOTE_FORBIDDEN` → inline error, server-side
    enforcement backstop.
  - E4 — Reject-reason server guard: `VIOLATION_REJECTION_REASON_REQUIRED`
    (shared code, reused per DR-022) → inline reject-textarea error
    (`aria-invalid` + `aria-describedby`), same two-layer validation as
    UC-005.
  - E5 — Network/transport failure → dialog/panel stays open, inline/toast
    error, retry preserves entered values.
- **Business rules:** identical `ApprovalTransition` shape and
  `selfApproved` visibility rule as the Violations tab (FR-006/FR-010),
  applied to the natural-key-scoped conduct-note resource.

### UC-009: Role-gate enforcement (server-side re-check, non-negotiable)

- **Primary actor:** any authenticated actor whose session role is not
  `principal` for a mutating action, or not `principal`/`teacher` for the
  routes. **Secondary actor:** `core` service / mock repository (the
  server-side authorization boundary).
- **Risk framing:** this story's lane is "normal", but NFR-008/NFR-009 are
  modeled with the same rigor as US-E20.1's high-risk Unlink UC-006 — every
  mutating action here (create, submit, approve, reject, set-note) touches
  another staff member's confidential HR-adjacent record, so server-side
  re-authorization independent of the client route guard is non-negotiable.
- **Main success scenario (denial is the "success" path for this UC):**
  1. A non-`principal`/non-`teacher` actor's session hits either
     `(app)/principal/staff-discipline` or `(app)/teacher/staff-discipline`
     directly (URL, stale bookmark, deep link).
  2. The existing role-guard evaluates the actor's role server-side before
     any tab content, list data, or form markup renders.
  3. Actor is redirected to their own workspace; no violation/conduct-note
     data, no roster-picklist data, is ever sent to the client.
  4. Separately: a `teacher` actor's client somehow directly invokes a
     mutating Server Action (create/submit/approve/reject/set-note),
     bypassing the UI (crafted request, stale session whose role changed,
     direct call). The API/Server Action boundary re-checks the caller's
     role independent of whatever the client UI rendered, and rejects the
     request with `VIOLATION_FORBIDDEN` / `STAFF_CONDUCT_NOTE_FORBIDDEN`.
     No record is created, transitioned, or overwritten.
- **Exception flows:**
  - E1 — A forged/replayed request from a non-`principal` actor reaches
    INT-001/003/004/005/007/008 → server rejects with the appropriate
    `*_FORBIDDEN` code; the mock repository simulates this rejection (fake
    non-`principal`-role mutating call returns `forbidden`), matching the
    existing `discipline` mock's precedent, so this assertion is testable
    pre-real-BE-wiring.
  - E2 — A `teacher` actor's client attempts to fetch another staff
    member's violations/conduct-notes by supplying a different
    `staffMemberId` in a list request → server forces the query back to the
    caller's own `staffMemberId` regardless of the client-supplied param
    (list-scope enforcement, not merely a 403).
- **Business rules:**
  - The route guard is necessary but explicitly NOT sufficient — INT-001
    through INT-008 MUST each independently re-check role (and, for
    submit/approve/reject, record ownership/state) server-side on every
    call, because client-side gating can be bypassed.
  - A client-side `if` that merely hides the "Ghi nhận vi phạm"/"Đặt ghi
    chú"/submit/approve/reject buttons is NOT sufficient and does not
    satisfy NFR-008. The check must be reproducible by calling the
    underlying Server Action/repository method directly with a non-
    `principal` role and observing rejection.
  - Applies identically to the conduct-note `APPROVED` lock (NFR-009,
    UC-007 E2) — the 409 is a genuine BE-enforced business rule, not a
    client nicety.
- **Non-functional constraints:** NFR-008, NFR-009.

### UC-010: Tab switcher + responsive layout

- **Primary actor:** principal or teacher, any viewport.
- **Preconditions:** screen rendered (either tab's success/empty/error state
  already resolved is not required — the tab bar itself is always
  interactive once the shell mounts).
- **Main success scenario:**
  1. Actor clicks (or keyboard-activates) the "Conduct Notes" tab while
     "Violations" is active.
  2. Only the selected tab's list/form/actions become visible; the other
     tab's content is not rendered/is hidden; no navigation away from the
     screen occurs (FR-008).
  3. `role="tablist"`/`role="tab"` with `aria-selected` reflects the active
     tab; each tab meets the ≥44px touch-target minimum (NFR-003).
- **Alternative flows:**
  - A1 — Actor uses Arrow keys / Tab+Enter/Space to switch tabs with no
     mouse → same result as A0 (keyboard-operable, NFR-003).
  - A2 — Screen viewed at 320px/375px/768px/1280px widths → content reflows
     within `contentPadding: "28px 32px (mobile 20px 16px)"` and
     `maxWidth: 1180` per `design-spec.jsonc`; **no distinct
     card-list/stacked layout is specified for this screen** — unlike
     US-E20.1's table (which has an explicit sub-760px card-list callout),
     `design-spec.jsonc`'s `staffDiscipline` entry only defines standard
     mobile content-padding reflow, no alternate component. This is stated
     explicitly per the requirements handoff rather than inventing a card
     variant that the design spec does not call for.
- **Exception flows:**
  - E1 — Underlying tab content is in an error state when the actor
    switches tabs → the newly selected tab shows ITS OWN current state
    (loading/empty/error/success) independently; switching tabs does not
    carry over the other tab's error banner.
- **Business rules:** tab state does not persist data across tabs — each
  tab manages its own query/list independently.
- **Non-functional constraints:** NFR-003 (keyboard + touch target),
  NFR-005 (no overflow/clipping at 320/375/768/1280px), NFR-004 (motion-safe
  panel/toast expand).

## 4. Acceptance Criteria

```
UC-001: Load Violations tab
  AC-001.1 Loading — Given a principal or teacher navigates to the Violations tab, When INT-002 is in flight, Then EduSkeleton (variant="rows", count=4) renders within ~320ms, no blank screen.
  AC-001.2 Success (principal) — Given INT-002 resolves with items, When rendered, Then each row shows avatar + staff name/dept (mock-roster resolved), SDSeverityBadge (icon+text), category/description, occurredAt, SDStateBadge (icon+text), and submit/approve/reject actions gated by state + ownership.
  AC-001.3 Success (teacher self-view) — Given INT-002 resolves scoped to the teacher's own staffMemberId, When rendered, Then the same fields render read-only with zero submit/approve/reject controls present in the DOM (not merely disabled).
  AC-001.4 Empty (principal) — Given zero violations exist, When the tab finishes loading, Then it shows an empty message + "Ghi nhận vi phạm" CTA (staffDiscipline i18n namespace).
  AC-001.5 Empty (teacher self-view) — Given the teacher has zero own violations, When the tab finishes loading, Then a plain empty message renders with NO CTA present.
  AC-001.6 Error — Given INT-002 fails (network/5xx/timeout), When the response returns, Then an error state renders with a retry button that re-issues the same request.
  AC-001.7 Filter (principal only, Should) — Given the principal applies a state or severity filter, When applied, Then the list narrows to matching records client-side; no such filter control renders for teacher.
```

```
UC-002: Create violation (principal only)
  AC-002.1 Open form — Given the principal clicks "Ghi nhận vi phạm", Then a form opens with an empty fixed-roster staff select, empty category, no severity selected, empty occurredAt, empty description.
  AC-002.2 Static roster, no live search — Given the principal opens the staff-member select multiple times, Then the same static SD_STAFF_ROSTER list renders each time and no network request fires for this field (confirms FR-009/FR-013).
  AC-002.3 Happy path — Given all required fields are valid, When the principal submits, Then the form closes, the list refetches, and the new row appears with state = DRAFT and authorMemberId = the principal's memberId.
  AC-002.4 Validation — severity — Given VIOLATION_INVALID_SEVERITY is returned, When submit resolves, Then an inline field error renders on the severity select, form stays open, no record created.
  AC-002.5 Validation — description — Given VIOLATION_INVALID_INPUT is returned, Then an inline field error renders on the description textarea, form stays open.
  AC-002.6 Loading — Given a valid submit is in flight, Then the submit button shows aria-busy + pending/disabled state and the form does not close until the request settles.
  AC-002.7 Network error — Given INT-001 fails (network/5xx), Then the form stays open, an inline/toast error shows, and previously entered field values are preserved for retry.
```

```
UC-003: Submit violation
  AC-003.1 Happy path — Given an own-authored DRAFT row, When the principal clicks "Gửi duyệt", Then the row's submit button shows pending state, INT-003 fires, and on success the SDStateBadge updates to SUBMITTED.
  AC-003.2 Not own record — Given a DRAFT row NOT authored by the current principal, Then no submit action is rendered for that row.
  AC-003.3 Invalid transition (race) — Given VIOLATION_INVALID_TRANSITION is returned, Then an inline "đã ở trạng thái khác" message renders, the row stays, and the list refetches.
  AC-003.4 Not found — Given VIOLATION_NOT_FOUND/VIOLATION_INVALID_ID is returned, Then a toast reads "không tìm thấy" and the row is removed on refetch.
  AC-003.5 Forbidden (server backstop) — Given VIOLATION_FORBIDDEN is returned, Then an inline error renders on the row (this is the server-side enforcement backstop, not the primary client gate — see UC-009).
```

```
UC-004: Approve violation
  AC-004.1 Happy path (non-self) — Given a SUBMITTED row where approverMemberId will differ from authorMemberId, When the principal clicks "Duyệt", Then the button shows pending state, INT-004 fires, and on success the SDStateBadge updates to APPROVED with no SDSelfApprovedNote rendered.
  AC-004.2 selfApproved — always visible — Given the approving principal IS the same as the authoring principal (selfApproved = true on the response), When the approval resolves, Then the SDSelfApprovedNote annotation renders alongside the state badge and is NEVER conditionally hidden, omitted, or suppressed by any client-side condition (ADR 0073 audit-transparency requirement).
  AC-004.3 Invalid transition (race) — Given VIOLATION_INVALID_TRANSITION is returned, Then inline "đã được xử lý" renders, row refetches.
  AC-004.4 Not found / forbidden — Given VIOLATION_NOT_FOUND/VIOLATION_FORBIDDEN is returned, Then the same handling as AC-003.4/AC-003.5 applies.
  AC-004.5 Same-actor code (open, generic handling) — Given VIOLATION_SAME_ACTOR is returned (open question on whether this still fires for this tenant model), Then it is mapped to a generic inline error (same shape as AC-004.3) — no dedicated UI copy is built for this code in this story.
```

```
UC-005: Reject violation
  AC-005.1 Client guard — Given the SDRejectPanel is open with fewer than 10 characters typed, Then the confirm button remains disabled and no request is sent.
  AC-005.2 Happy path — Given a reason of ≥10 characters is entered, When the principal confirms, Then the confirm button shows pending state, INT-004 (reject) fires, and on success the panel closes, SDStateBadge updates to REJECTED, and rejectionReason is visible on the row/detail.
  AC-005.3 Server guard (bypass path) — Given VIOLATION_REJECTION_REASON_REQUIRED is returned (client guard bypassed, e.g. forged request with an empty reason), Then an inline error renders on the reject textarea with aria-invalid + aria-describedby, and the panel stays open — this is a DISTINCT validation layer from AC-005.1, both must pass independently.
  AC-005.4 Invalid transition (race) — Given VIOLATION_INVALID_TRANSITION is returned, Then inline "đã được xử lý" renders, panel closes, row refetches.
  AC-005.5 Cancel — Given the panel is open, When the principal cancels, Then the panel closes, no request is sent, no change occurs.
  AC-005.6 Network error — Given INT-004 (reject) fails (network/5xx), Then the panel stays open with an inline/toast error and the typed reason is preserved for retry.
```

```
UC-006: Load Conduct Notes tab
  AC-006.1 Loading — Given a principal or teacher switches to/lands on the Conduct Notes tab, When INT-006 is in flight, Then EduSkeleton (variant="rows", count=4) renders.
  AC-006.2 Success (principal) — Given INT-006 resolves with items, Then each row shows avatar + staff name/dept, SDRatingBadge (icon+text), note excerpt, SDStateBadge, and set/submit/approve/reject actions gated by state + ownership.
  AC-006.3 Success (teacher self-view) — Given INT-006 resolves scoped to the teacher's own staffMemberId and the currently active term (no term selector rendered for teacher, per design-spec.jsonc termSelector.visibleFor: principal), Then the fields render read-only with zero mutation controls present in the DOM.
  AC-006.4 Empty (principal) — Given zero conduct notes exist for the selected term, Then an empty message + "Đặt ghi chú" CTA renders.
  AC-006.5 Empty (teacher self-view) — Given the teacher has zero own conduct notes for the active term, Then a plain empty message renders with NO CTA.
  AC-006.6 Term change (principal only) — Given the principal changes the term selector, When changed, Then INT-006 re-queries for the newly selected termId and the list updates accordingly; no term selector control exists for teacher (resolved decision, not an open item — see design-spec.jsonc).
  AC-006.7 Error — Given INT-006 fails (network/5xx), Then an error state + retry renders.
  AC-006.8 Term not found — Given STAFF_CONDUCT_NOTE_TERM_NOT_FOUND is returned, Then an inline error renders on the term selector reading "kỳ học không hợp lệ" and the list is not fetched.
```

```
UC-007: Set (create/overwrite) conduct note
  AC-007.1 Open form (new/absent record) — Given a (termId, staffMemberId) pair with no existing record, When the principal clicks "Đặt ghi chú", Then a form opens with no rating selected and an empty note field.
  AC-007.2 Open form (overwrite, DRAFT/REJECTED) — Given an existing DRAFT or REJECTED record, When the principal opens its set form, Then the form pre-fills with the current rating and note.
  AC-007.3 Happy path — Given valid rating + note (≤5000 chars) are provided, When submitted, Then the form does not close until the request settles, INT-005 fires, and on success the record is created/overwritten with state = DRAFT and the form closes.
  AC-007.4 Locked — form does not open (client pre-check, primary) — Given the target record's state is APPROVED, When the principal attempts to open its set form, Then the form MUST NOT open at all; an inline lock message (staffDiscipline.errors.locked) renders in its place, and no request is ever sent.
  AC-007.5 Locked — server backstop (race/stale client) — Given a set request reaches INT-005 against a record that has since become APPROVED (simulated via the mock repository's 409 STAFF_CONDUCT_NOTE_LOCKED), When the response returns, Then the same inline lock message renders, no form remains open, and the list refetches to show the current APPROVED state.
  AC-007.6 Validation — term — Given STAFF_CONDUCT_NOTE_TERM_NOT_FOUND is returned, Then an inline error renders on the term selector, form stays open.
  AC-007.7 Validation — rating — Given STAFF_CONDUCT_NOTE_INVALID_RATING is returned, Then an inline field error renders on the rating select, form stays open.
  AC-007.8 Loading — Given a valid submit is in flight, Then the submit button shows aria-busy + pending/disabled state.
  AC-007.9 Network error — Given INT-005 fails (network/5xx), Then the form stays open with an inline/toast error and field values preserved for retry.
  AC-007.10 Max length — Given the note field reaches 5000 characters, Then further input is blocked/truncated client-side and a character-count indicator reflects the limit (NFR per design-spec maxLength: 5000).
```

```
UC-008: Submit / approve / reject conduct note
  AC-008.1 Submit happy path — Given an own-authored DRAFT note, When the principal clicks "Gửi duyệt", Then INT-007 fires and on success state becomes SUBMITTED (mirrors AC-003.1).
  AC-008.2 Approve happy path (non-self) — Given a SUBMITTED note where approver ≠ author, When approved, Then INT-008 (approve) fires and on success state becomes APPROVED, no SDSelfApprovedNote rendered.
  AC-008.3 selfApproved — always visible — Given the approving principal IS the authoring principal, When approved, Then SDSelfApprovedNote renders and is NEVER hidden (same non-negotiable rule as AC-004.2).
  AC-008.4 Reject client guard — Given fewer than 10 characters are typed in the reject panel, Then confirm stays disabled (mirrors AC-005.1).
  AC-008.5 Reject happy path — Given a ≥10-char reason, When confirmed, Then INT-008 (reject) fires and on success state becomes REJECTED with rejectionReason stored.
  AC-008.6 Reject server guard — Given VIOLATION_REJECTION_REASON_REQUIRED is returned (bypass path), Then inline reject-textarea error (aria-invalid + aria-describedby) renders, panel stays open — distinct layer from AC-008.4.
  AC-008.7 Invalid transition — Given VIOLATION_INVALID_TRANSITION is returned on any of submit/approve/reject, Then the appropriate "đã ở trạng thái khác"/"đã được xử lý" inline message renders and the row refetches.
  AC-008.8 Not found / forbidden — Given STAFF_CONDUCT_NOTE_NOT_FOUND/STAFF_CONDUCT_NOTE_FORBIDDEN is returned, Then toast/inline handling mirrors AC-003.4/AC-003.5.
  AC-008.9 Post-approval immutability — Given a note has just transitioned to APPROVED via this UC, When the principal subsequently attempts to open its set form, Then AC-007.4 (locked, form does not open) applies immediately — no additional wiring/refetch is required to enforce the lock.
```

```
UC-009: Role-gate enforcement (server-side, non-negotiable)
  AC-009.1 Route denial — Given an authenticated actor whose role is neither principal nor teacher, When they navigate to (app)/principal/staff-discipline or (app)/teacher/staff-discipline, Then the existing role-guard redirects them to their own workspace server-side before any tab/list/form data or markup is sent to the client.
  AC-009.2 Teacher mutation denial — Given a teacher actor's client directly invokes any mutating Server Action (create/submit/approve/reject-violation, set/submit/approve/reject-conduct-note) bypassing the UI, When the request is evaluated, Then the server rejects it with VIOLATION_FORBIDDEN / STAFF_CONDUCT_NOTE_FORBIDDEN and no record is created/transitioned/overwritten.
  AC-009.3 Non-principal/non-teacher mutation denial — Given any other role's client directly invokes a mutating Server Action, Then the same rejection as AC-009.2 applies.
  AC-009.4 List-scope enforcement — Given a teacher actor's client supplies a different staffMemberId in a list request (INT-002/INT-006), When evaluated, Then the server forces the query to the caller's own staffMemberId regardless of the client-supplied param — the returned list never includes another staff member's records.
  AC-009.5 No client-only gating (explicit assertion) — Given any of AC-009.1–AC-009.4, Then denial must not depend solely on a client-side conditional hiding a button/menu item — each check must be reproducible by calling the underlying Server Action/repository method directly with a non-authorized role and observing rejection (mock repository simulates this per integration.md §3/§4, testable pre-real-BE-wiring).
  AC-009.6 Conduct-note lock is server-enforced too — Given a bypassed set-note request reaches an APPROVED record, Then STAFF_CONDUCT_NOTE_LOCKED (409) is still returned server-side even if the client-side pre-check (AC-007.4) were somehow bypassed (NFR-009).
```

```
UC-010: Tab switcher + responsive layout
  AC-010.1 Switch via click — Given Violations is active, When the principal/teacher clicks the "Conduct Notes" tab, Then only that tab's content renders, no navigation away from the screen occurs, and Violations' content is not rendered.
  AC-010.2 ARIA + keyboard — Given the tab bar is rendered, Then it exposes role="tablist"/role="tab" with aria-selected reflecting the active tab, is operable via Tab/Arrow keys with no mouse, and each tab meets the ≥44px touch-target minimum (NFR-003).
  AC-010.3 Independent per-tab state — Given one tab is in an error state, When the actor switches to the other tab, Then the newly selected tab renders its OWN current state (loading/empty/error/success) — the error banner does not carry over.
  AC-010.4 Responsive reflow, no distinct card layout — Given the viewport is 320px/375px/768px/1280px wide, Then content reflows within contentPadding "28px 32px (mobile 20px 16px)" and maxWidth 1180 with no horizontal overflow/clipping; there is explicitly NO stacked card-list variant specified for this screen in design-spec.jsonc (unlike US-E20.1's table) — standard reflow only, stated explicitly rather than invented.
  AC-010.5 Motion-safe — Given prefers-reduced-motion: reduce is set, Then the SDRejectPanel expand animation and any toast animation do not play (NFR-004).
```

## 5. Edge Case Matrix

| Feature | Empty | Max-length | Concurrent | Auth-expired | Network-error | Wrong-role |
| --- | --- | --- | --- | --- | --- | --- |
| Load Violations (UC-001) | Two variants (AC-001.4/.5) | Long description/category text wraps within the row, no truncation-with-tooltip specified — `[OPEN QUESTION]` not specced, flag to uiux-lead if it surfaces | Another principal creates/transitions a violation while the tab is open → next refetch reconciles; stale row-action attempts fall through to AC-003.3/AC-004.3 patterns | 401 mid-session → existing hybrid refresh (decision 0018) retries once, then redirect-to-login on failure (cross-screen behavior, not screen-specific) | AC-001.6 | AC-009.1 |
| Create violation (UC-002) | N/A (form always has fields) | Description has no explicit max in FR-002/DR-022 — `[OPEN QUESTION]` treat as unconstrained client-side until core/design specify a cap | Two principals submit near-simultaneously for the same staff member → both succeed as independent DRAFT records (no duplicate-check specified for violations, unlike conduct-note's natural key) | Token expires mid-form-fill → reactive refresh transparently retries; if it fails, redirect to login (best-effort field preservation) | AC-002.7 | AC-009.2/AC-009.3 |
| Submit/Approve/Reject violation (UC-003/004/005) | N/A | Reject reason: client guard ≥10 chars; server only requires non-empty — no upper max specified, `[OPEN QUESTION]` | Two principals act on the same SUBMITTED row concurrently → second action hits AC-003.3/AC-004.3/AC-005.4 (invalid-transition), not a crash | Same cross-cutting hybrid-refresh behavior as above | AC-002.7-equivalent (network) for each action | AC-009.2/AC-009.3, server-side backstop AC-003.5/AC-004.4 |
| Load Conduct Notes (UC-006) | Two variants (AC-006.4/.5) | Note excerpt truncates in the row (full text in set-form/detail) — exact truncation UX `[OPEN QUESTION]`, same class of gap as US-E20.1's name-truncation open item | Another principal sets/transitions a note for the same (termId, staffMemberId) while list is open → next refetch reconciles; a stale open set-form on a now-APPROVED record hits AC-007.5 | Same cross-cutting behavior | AC-006.7 | AC-009.1 |
| Set conduct note (UC-007) | N/A | Note field hard-capped at 5000 chars (AC-007.10) — the one explicitly specced max-length in this story | Two principals set the same (termId, staffMemberId) near-simultaneously → last write wins server-side (natural-key overwrite semantics); if the record became APPROVED between load and submit, AC-007.5 (locked, server backstop) fires instead of a silent overwrite | Same cross-cutting behavior | AC-007.9 | AC-009.2/AC-009.3 |
| Submit/Approve/Reject conduct note (UC-008) | N/A | Same reject-reason min/no-max as violations | Same as UC-003/004/005 pattern, plus AC-008.9 (post-approval immutability takes effect immediately) | Same cross-cutting behavior | Network handling mirrors UC-003/004/005 for each action | AC-009.2/AC-009.3 |
| Role-gate enforcement (UC-009) | N/A | N/A | Two forged requests from a non-authorized role racing a legitimate one → each independently rejected server-side; no partial state change from the rejected calls | N/A (this UC is itself the auth-boundary concern) | N/A | AC-009.1–AC-009.6 (this IS the wrong-role use case) |
| Tab switcher + responsive (UC-010) | AC-010.3 (empty state of either tab renders independently) | N/A (layout concern) | N/A | Cross-cutting auth behavior renders identically regardless of active tab/viewport | AC-010.3 (error state renders per-tab) | Redirect happens before tab/layout even matters (AC-009.1) |

## 6. Open Questions

- `[OPEN QUESTION]` (carried from `integration.md`) **Pagination shape** —
  neither DR-022 nor the ground-truthed Go source confirms `meta.pagination`
  on INT-002/INT-006. AC in this file assume unpaginated single-page
  responses for both list endpoints; confirm before real wiring.
- `[OPEN QUESTION]` (carried from `integration.md`) **`VIOLATION_SAME_ACTOR`
  vs `selfApproved` semantics** — see AC-004.5; mapped to a generic inline
  error until edu-api `core` confirms whether this code still fires for a
  principal-only tenant model or is effectively dead given ADR `0073`.
- `[OPEN QUESTION]` (carried from `integration.md`) **FR-012 filter
  mechanics** — AC-001.7/violations filter and the Conduct Notes term
  filter (AC-006.6) are written assuming client-side narrowing (small
  per-staff record counts) since only `staffMemberId`/`termId` are confirmed
  server query params; confirm with the `core` team whether `state`/
  `severity` become real server-side filters.
- `[OPEN QUESTION]` (carried from `requirements.md`/`integration.md`)
  **Audit-log emission** for approve/reject/set-note actions — not modeled
  as an AC in this file per explicit instruction to flag, not decide;
  routed to `ba-lead` (would require extending the shared `AuditEntityType`
  union, outside this story's unilateral scope).
- `[OPEN QUESTION]` (carried from `integration.md`) **Response echo on
  set-note overwrite** — whether `authorMemberId`/`createdAt` reset to the
  calling principal/now on an overwrite, or the original author/createdAt
  are preserved (only `note`/`rating`/`updatedAt` change). AC-007.2/AC-007.3
  are written to be agnostic to this until confirmed; affects whether "who
  authored this note" display is stable across an overwrite.
- `[OPEN QUESTION]` **Description/note truncation UX** — no explicit
  max-length or truncation/tooltip behavior is specced for the violation
  description field or the conduct-note row excerpt (only the note
  textarea's 5000-char hard cap is specced, AC-007.10). Flag to
  `uiux-lead` if a real long-text edge case surfaces during `/fe` build —
  same class of gap noted in US-E20.1's name-truncation open item.
- Resolved (not open, stated here for traceability): **teacher self-view
  term scope on Conduct Notes** — `design-spec.jsonc`'s
  `staffDiscipline.conductNotesTab.termSelector.visibleFor: "principal
  only"` resolves `requirements.md` openQuestions[1]/`integration.md`'s
  open question: teacher sees no term selector and is scoped to the
  currently active term only (AC-006.3/AC-006.6).
