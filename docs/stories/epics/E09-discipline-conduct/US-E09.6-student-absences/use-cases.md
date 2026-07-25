# US-E09.6 — Use Cases & Acceptance Criteria (Student Absences)

Lane: **normal**. Actors: `teacher` (GVCN/homeroom, own class — record + edit),
`principal` (this app's principal role = BE's ADMIN/MANAGER conduct-domain
actor per ADR `0062` — NOT the app's separate `admin` route-guard role;
schoolwide/class-filtered read + one-way flag only). Routes:
`(app)/teacher/absences`, `(app)/principal/absences`. One component
(`StudentAbsencesScreen`), role-conditional. Source: `requirements.md`,
`integration.md`, DR-022, ADR `0062`, `docs/product/design-spec.jsonc` →
`screens.studentAbsences`.

This is a **2-state, one-way domain** (`RECORDED` → `FLAGGED_UNEXCUSED`) — NOT
an approval workflow. No submit/approve/reject shape appears anywhere below
(that belongs to the sibling US-E09.5).

## 1. Use Case Scope Summary

8 use cases covering: teacher list view (own class), principal list view
(schoolwide/class-filtered), record (create) an absence, edit an absence
(reason/excused only, immutable identity), flag an absence (principal,
one-way, terminal, no unflag ever), the mandatory server-side scope/role
re-check (security use case, both halves), and the responsive/mobile
behavior. Boundary: this screen never implements an approval workflow, never
offers unflag/reopen, never does live roster search, and has zero
`admin`-route-guard-role involvement. All data is mock-first behind
`IStudentAbsenceRepository` (force-mocked regardless of
`NEXT_PUBLIC_USE_MOCK`, per the `discipline` feature precedent) because the
real, shipped `core` endpoints are unreachable end-to-end today (roster-UUID
gap).

## 2. Actor Catalogue

| Actor/Role | Type | Capabilities |
| --- | --- | --- |
| `teacher` (GVCN) | Primary, human | Record absence (own class only), edit reason/excused (own class only), view own-class list filterable by date range, select student from fixed mock roster |
| `principal` | Primary, human | View schoolwide/class-filtered list (read-only), flag a RECORDED absence as FLAGGED_UNEXCUSED (one-way, terminal) — zero record/edit capability |
| non-`teacher`/non-`principal` actor (student, parent, `admin` route-guard role) | Secondary, negative | MUST be denied both routes/actions server-side |
| `core` service (mock-first) | System | Backing data store for absence records (force-mocked; real endpoints ground-truthed but roster-blocked) |
| `SA_STUDENT_ROSTER` (mock fixture) | System | Client-side-only resolution of `studentMemberId` → display name/class, never on the wire |

## 3. Use Case Catalogue

### UC-001: Teacher views own-class absences list

- **Primary actor:** teacher. **Preconditions:** authenticated as `teacher`,
  GVCN of exactly one homeroom class (server-resolved).
- **Main success scenario:**
  1. Teacher navigates to `/teacher/absences`.
  2. Skeleton (rows variant, count=4) renders while INT-002 is in flight,
     scoped server-side to the teacher's own `classId`.
  3. Response resolves with an array of records; list renders rows with
     student (resolved via `SA_STUDENT_ROSTER`), date, excused badge, flagged
     indicator (if applicable), reason.
  4. Summary stats row (FR-011) derives client-side from the loaded set:
     total / unexcused / flagged, scoped to the teacher's own class.
- **Alternative flows:**
  - A1 — Teacher narrows the date range filter → list re-renders scoped to
    the new `from`/`to`, stats recompute from the newly loaded set.
- **Exception flows:**
  - E1 — Zero records for the current date range → empty state
    ("Chưa ghi nhận nghỉ học kỳ này") **with** a "Ghi nhận nghỉ học" CTA
    (teacher variant).
  - E2 — Network/5xx/timeout → error state with retry button; retry
    re-issues INT-002 with the same filter.
  - E3 — `ABSENCE_FORBIDDEN` (403) returned (should not occur — teacher only
    ever requests their own `classId`, this is a backstop) → treated as a
    generic error state, not a silent redirect (there is no cross-class
    request the UI itself ever issues for a teacher).
- **Business rules:** `classId` scoping is resolved server-side from the
  teacher's GVCN assignment — the web layer never independently determines
  class ownership (per requirements.md assumption). Record/edit affordances
  (row action buttons, "Ghi nhận nghỉ học" CTA) are rendered for teacher only.
- **Non-functional constraints:** NFR-007 (skeleton distinct from empty),
  NFR-005 (responsive), NFR-006 (i18n `studentAbsences.*`).

### UC-002: Principal views schoolwide/class-filtered absences list

- **Primary actor:** principal. **Preconditions:** authenticated as
  `principal`.
- **Main success scenario:**
  1. Principal navigates to `/principal/absences`.
  2. Skeleton (rows variant, count=4) renders while INT-002 is in flight
     (no `classId` param → schoolwide).
  3. Response resolves; list renders the same row shape as UC-001, PLUS a
     "Gắn cờ" (flag) action visible only on `state === RECORDED` rows — no
     record/edit affordance is rendered anywhere in this view.
  4. Summary stats row (FR-011) derives client-side, scoped schoolwide or to
     the applied class filter.
- **Alternative flows:**
  - A1 — Principal selects a class from the filter dropdown → INT-002
    re-fires with `classId` set; list/stats scope to that class only.
  - A2 — Principal clears the class filter → list/stats revert to schoolwide.
- **Exception flows:**
  - E1 — Zero records (schoolwide or for the selected class filter) → empty
    state ("Chưa ghi nhận nghỉ học kỳ này") with **static copy and NO CTA**
    (principal never records) — distinct from UC-001's E1 CTA variant.
  - E2 — Network/5xx/timeout → error state with retry button; retry
    re-issues INT-002 with the same filter.
- **Business rules:** Principal's mutating capability is restricted to the
  flag action only (FR-009) — no record/edit UI is ever rendered for this
  role, not merely disabled.
- **Non-functional constraints:** NFR-007, NFR-005, NFR-006.

### UC-003: Teacher records (creates) a new absence

- **Primary actor:** teacher. **Preconditions:** teacher is on `/teacher/absences`.
- **Main success scenario:**
  1. Teacher clicks "Ghi nhận nghỉ học" → record form/dialog opens with an
     empty student select (mock roster, own class only, FR-010), a date
     input defaulting to today with `max=today`, an excused segmented toggle
     (default state per design), and an optional reason textarea
     (max 5000 chars).
  2. Teacher selects a student, a date (today or earlier), sets excused, and
     optionally enters a reason.
  3. Teacher submits; INT-001 `POST /api/v1/conduct/student-absences` fires;
     submit button shows pending/disabled (aria-busy) state.
  4. On success: the new record (`state: RECORDED`) appears in the list
     without a full page reload; form/dialog closes.
- **Alternative flows:**
  - A1 — Teacher cancels/closes the form before submit → no request sent,
    fields discarded.
- **Exception flows:**
  - E1 — Future date rejected client-side (date-picker `max=today` bypassed
    via manual entry, or the segmented control otherwise reaches an invalid
    state) → inline, non-color-only field error on the date input BEFORE any
    request fires; form not submitted.
  - E2 — Future date reaches the server anyway (client guard bypassed) →
    `ABSENCE_INVALID_DATE` (422) → identical inline field error rendered
    from the server response, form stays open, no record created — same
    user-visible message whether caught client-side (E1) or server-side.
  - E3 — Duplicate date rejected client-side — teacher attempts to record for
    a classId+studentMemberId+date already present in the currently loaded
    list → inline banner shown immediately ("Đã có bản ghi cho ngày này"),
    no request fires.
  - E4 — Duplicate date reaches the server anyway (race — e.g. two tabs, or
    the client-side list was stale) → `ABSENCE_DUPLICATE_DATE` (409) →
    identical inline banner rendered from the server response, form stays
    open, no record created.
  - E5 — `ABSENCE_INVALID_INPUT` (422, e.g. reason > 5000 chars) → per-field
    inline error on the reason textarea.
  - E6 — Network/5xx/timeout → inline/toast error, form stays open, teacher
    may retry submit with the same field values (no data loss).
  - E7 — `ABSENCE_FORBIDDEN` (403) — see UC-006 (server-side class-ownership
    re-check).
- **Business rules:** `date`/`classId`/`studentMemberId` form the natural
  key; student select is populated exclusively from the fixed mock roster
  scoped to the teacher's own class (FR-010) — no live search-as-you-type.
- **Non-functional constraints:** NFR-003 (keyboard-operable, ≥44px touch
  target), NFR-009 (bare date, future rejected both sides).

### UC-004: Teacher edits an existing absence (reason/excused only)

- **Primary actor:** teacher. **Preconditions:** an absence record exists in
  the teacher's own class list.
- **Main success scenario:**
  1. Teacher opens edit on an existing row.
  2. Edit form renders `date`, `classId`-derived class name, and
     student — all as **static, non-editable text**, alongside editable
     `excused` (segmented toggle) and `reason` (textarea) fields.
  3. Teacher changes reason and/or excused and submits; INT-003 `PATCH
     /:date?classId=&studentMemberId=` fires with only the changed field(s)
     (PATCH semantics — independently optional); submit button shows
     pending/disabled state.
  4. On success: the row reflects the updated reason/excused values, form
     closes, `updatedAt` refreshed.
- **Alternative flows:**
  - A1 — Teacher edits only `excused`, leaving `reason` untouched (or vice
    versa) → request body includes only the changed field; the other is
    omitted, not sent as `null`/unchanged-echo.
- **Exception flows:**
  - E1 — `ABSENCE_INVALID_INPUT` (422, reason too long) → per-field inline
    error on the reason textarea, no mutation applied.
  - E2 — `ABSENCE_NOT_FOUND` (404, natural key no longer resolves — e.g.
    concurrent deletion, unlikely given no delete exists but backstop
    regardless) → toast "bản ghi không tồn tại", list refetches.
  - E3 — `ABSENCE_INVALID_STATE` (400, backstop) → generic inline error, no
    mutation applied.
  - E4 — Network/5xx/timeout → dialog stays open, inline/toast error, retry
    resubmits with the same field values.
  - E5 — `ABSENCE_FORBIDDEN` (403) — see UC-006.
- **Business rules:** `date`, `classId`, `studentMemberId` are IMMUTABLE once
  created and are never rendered as inputs in the edit form — this is an
  explicit, testable assertion (see AC-004.5), not merely "disabled" fields.
- **Non-functional constraints:** NFR-003.

### UC-005: Principal flags a RECORDED absence (one-way, terminal)

- **Primary actor:** principal. **Secondary actor:** `core` service
  (server-side authorization + state boundary).
- **Preconditions:** a row with `state === RECORDED` exists in the
  principal's (filtered or schoolwide) list.
- **Main success scenario:**
  1. Principal clicks "Gắn cờ" on a `RECORDED` row (this action is not
     offered at all on already-`FLAGGED_UNEXCUSED` rows).
  2. Confirm dialog (`SAFlagConfirmDialog`, `role="dialog"`, `aria-modal`,
     focus-trapped) opens, stating explicitly that flagging is irreversible
     (mirrors the `lesson-plan.jsx` one-way-publish confirm pattern).
  3. Principal clicks confirm; confirm button shows pending state; INT-004
     `POST /:date/flag?classId=&studentMemberId=` fires — this is the ONLY
     path that can trigger the transition; **no optimistic client-only state
     flip occurs before the server responds**.
  4. On 2xx: dialog closes, the row's `state` updates to
     `FLAGGED_UNEXCUSED`, the flagged indicator renders, and the "Gắn cờ"
     action is no longer offered for this row.
- **Alternative flows:**
  - A1 — Principal clicks Cancel or presses Escape → dialog closes, no
    request sent, no state change, focus returns to the triggering row's
    flag-action trigger.
- **Exception flows:**
  - E1 — `ABSENCE_FORBIDDEN` (403) — see UC-006 (server-side role re-check).
  - E2 — `ABSENCE_NOT_FOUND` (404, race — record no longer resolves) →
    toast, list refetches.
  - E3 — `ABSENCE_INVALID_STATE` (400, backstop — record already
    `FLAGGED_UNEXCUSED`, a re-flag attempt) → generic inline error in the
    (re-opened) dialog; state not changed. The UI SHOULD already prevent
    reaching this by hiding "Gắn cờ" on already-flagged rows — this is
    defense in depth, not the primary guard.
  - E4 — `ABSENCE_INVALID_ID` (400, backstop) → generic inline error.
  - E5 — Network/5xx/timeout → confirm dialog stays open (or reopens) with
    an error; state not transitioned; principal may retry the same confirm
    action.
- **Business rules:** `FLAGGED_UNEXCUSED` is terminal — there is no reverse
  transition anywhere in the domain contract (FR-006/FR-013). No unflag
  control exists in ANY role's view, at any time (see UC-005's negative AC
  and UC-007).
- **Non-functional constraints:** NFR-003 (dialog focus trap, ≥44px touch
  target, keyboard-operable), NFR-004 (motion-safe dialog entrance).

### UC-006: Server-side scope/role re-check (security — both halves)

- **Primary actor:** `core` service (the authorization boundary itself is
  the actor under test in this UC, per the US-E20.1 UC-006 pattern).
  **Secondary actors:** a teacher attempting to record/edit outside their own
  class; any non-`principal` actor attempting to flag.
- **Preconditions:** a request reaches the API layer for one of INT-001
  (record), INT-003 (edit), or INT-004 (flag).
- **Main success scenario (rejection IS the correct/"success" behavior for
  this UC — mirrors US-E20.1's high-risk-lane UC-006 rigor, applied here at
  normal-lane rigor per NFR-008):**
  1. **(a) Principal-flag-only enforcement:** a request reaches INT-004 whose
     authenticated session role is not `principal`-tier (simulated via the
     mock repository per integration.md §4, since `core`'s real deployment
     is roster-blocked today). The server independently re-checks the role
     — **independent of the client route gate already passed to reach this
     screen** — and rejects with `ABSENCE_FORBIDDEN` (403); no state
     transition occurs. This must be testable by directly invoking the
     repository/use-case with a forged/altered role, not only by confirming
     that the "Gắn cờ" button is absent from a non-principal's rendered UI.
  2. **(b) Teacher-classId-ownership enforcement:** a request reaches
     INT-001 or INT-003 whose `classId` does not match the authenticated
     teacher's own GVCN homeroom assignment (simulated via the mock
     repository — e.g. a GVCN of class A forging a request with class B's
     `classId`). The server independently re-checks class ownership —
     **independent of any client-side class-filter/route UI** — and rejects
     with `ABSENCE_FORBIDDEN` (403); no record is created or mutated.
- **Exception flows:**
  - E1 — The forbidden response is surfaced in the UI as an inline
    dialog/form error (record/edit) or a reopened confirm dialog with error
    (flag) — never a silent failure, never an optimistic success.
- **Business rules:** The client-side route/role gate (which routes teachers
  to `/teacher/absences` and principals to `/principal/absences`) is
  necessary but explicitly NOT sufficient — every mutating call
  (record/edit/flag) is independently re-authorized server-side by role
  AND, for teacher actions, by class ownership (NFR-008). The mock
  repository simulates both rejections so these ACs are testable
  pre-`core`-integration.
- **Non-functional constraints:** NFR-008 (security, explicit re-check).

### UC-007: Two independent badges + no-unflag-affordance rendering (cross-cutting)

- **Primary actor:** either role, viewing any row in either list.
- **Preconditions:** at least one absence record is loaded.
- **Main success scenario:**
  1. Every row renders an excused/unexcused badge (`SAExcusedBadge`)
     reflecting the boolean `excused` field — always present, regardless of
     `state`.
  2. A row ALSO renders a flagged indicator (`SAFlaggedIndicator`) ONLY when
     `state === FLAGGED_UNEXCUSED` — visually and semantically distinct from
     the excused badge (different icon, different color token, never merged
     into one pill).
  3. Fixture coverage (per integration.md §4) exercises all combinations:
     `RECORDED`+`excused:true` (excused badge, no flagged indicator),
     `RECORDED`+`excused:false` (unexcused badge, no flagged indicator), and
     `FLAGGED_UNEXCUSED` (either excused value + flagged indicator) — i.e. a
     row can be `excused:true` AND flagged, or `excused:false` AND
     unflagged, etc.; the two signals are orthogonal and neither role's view
     ever collapses them into one element.
- **Exception flows:** none (pure rendering rule, no async call of its own —
  inherits the loading/empty/error states of UC-001/UC-002).
- **Business rules:** FR-007 (two independent, non-conflated signals);
  FR-006/FR-013 — no unflag control/affordance exists ANYWHERE in the UI for
  a `FLAGGED_UNEXCUSED` row, for either role, at any time. This is a
  genuinely absent affordance (no button, no menu item, no hidden-by-role
  control that merely isn't rendered for the current actor) — not a
  permission gate that could be satisfied by a different role.
- **Non-functional constraints:** NFR-001 (icon + text, never color-only),
  NFR-002 (warning-foreground token on the unexcused badge text).

### UC-008: Responsive/mobile rendering

- **Primary actor:** teacher or principal, on a narrow viewport.
- **Preconditions:** either list has loaded (any state — loading, empty,
  error, success).
- **Main success scenario:**
  1. Actor views `/teacher/absences` or `/principal/absences` at 320px,
     375px, 768px, or 1280px viewport widths.
  2. The screen (record form, list/table, and flag confirm dialog) renders
     without horizontal overflow or clipped controls at any of the four
     breakpoints; `contentPadding` reduces to `20px 16px` on mobile per
     `design-spec.jsonc` (desktop `28px 32px`).
- **Alternative flows:** none beyond the four checked widths.
- **Exception flows:**
  - E1 — Loading/empty/error states at narrow viewports render the same
    copy/CTA as desktop, reflowed without clipping or overlap.
- **Business rules:** `docs/product/design-spec.jsonc` →
  `screens.studentAbsences.layout` specifies only a padding reduction and a
  `maxWidth: 1160` container — it does **NOT** call out a distinct
  stacked-card breakpoint/layout (unlike US-E20.1's admin parent-links
  screen, which explicitly mandates a card-list under 760px). Stating this
  explicitly rather than inventing one: this story's responsive requirement
  is standard reflow across the four breakpoints (NFR-005), not a
  bespoke mobile layout variant.
- **Non-functional constraints:** NFR-005.

## 4. Acceptance Criteria

```
UC-001: Teacher views own-class absences list
  AC-001.1 Loading — Given the teacher navigates to /teacher/absences, When the page mounts and INT-002 is in flight, Then a 4-row skeleton (EduSkeleton variant="rows") renders, distinct from the empty state.
  AC-001.2 Success — Given INT-002 resolves with records for the teacher's own classId, When the response arrives, Then the list renders each row's student (resolved via SA_STUDENT_ROSTER), date, excused badge, flagged indicator (if applicable), and reason, in the `studentAbsences` i18n namespace; the record/edit CTAs are visible.
  AC-001.3 Empty — Given zero records exist for the current date range, When the list finishes loading, Then it shows "Chưa ghi nhận nghỉ học kỳ này" WITH a "Ghi nhận nghỉ học" CTA (teacher variant).
  AC-001.4 Error — Given INT-002 fails (network/5xx/timeout), When the response returns, Then an error state renders with a retry button that re-issues the same request with the same date-range filter.
  AC-001.5 Date-range filter — Given the teacher changes the date-range filter, When the refetch resolves, Then the list and the FR-011 summary stats row (total/unexcused/flagged) recompute from the newly loaded, own-class-scoped set only.
  AC-001.6 Scope backstop — Given INT-002 unexpectedly returns ABSENCE_FORBIDDEN (403) for the teacher's own-class request, Then a generic error state renders (not a silent redirect) — this should not occur in normal operation since the teacher's client never requests another class's data.
```

```
UC-002: Principal views schoolwide/class-filtered absences list
  AC-002.1 Loading — Given the principal navigates to /principal/absences, When the page mounts and INT-002 is in flight (no classId param), Then a 4-row skeleton renders.
  AC-002.2 Success (schoolwide) — Given INT-002 resolves with schoolwide records, When the response arrives, Then the list renders the same row fields as AC-001.2, PLUS a "Gắn cờ" action visible ONLY on state===RECORDED rows, and NO record/edit affordance is rendered anywhere on the screen.
  AC-002.3 Class filter — Given the principal selects a class from the filter dropdown, When INT-002 re-fires with classId set, Then the list and stats scope to that class only; clearing the filter reverts to schoolwide.
  AC-002.4 Empty (principal variant) — Given zero records exist (schoolwide or for the selected class filter), When the list finishes loading, Then it shows "Chưa ghi nhận nghỉ học kỳ này" with STATIC copy and NO CTA — explicitly distinct from AC-001.3's teacher-CTA variant.
  AC-002.5 Error — Given INT-002 fails, When the response returns, Then an error state renders with a retry button that re-issues the same request with the same filter.
```

```
UC-003: Teacher records a new absence
  AC-003.1 Open form — Given the teacher is on /teacher/absences, When they click "Ghi nhận nghỉ học", Then the record form opens with an empty student select (mock roster, own class only), a date input with max=today (HTML attribute) defaulting to today, an excused segmented toggle, and an empty reason textarea (max 5000 chars).
  AC-003.2 Happy path — Given the teacher selects a valid student, a date ≤ today, and sets excused, When they submit, Then INT-001 fires, the form shows a pending/disabled submit button (aria-busy) while in flight, and on success the new record (state=RECORDED) appears in the list without a full page reload and the form closes.
  AC-003.3 Future-date rejected client-side — Given the teacher attempts to set a date after today (bypassing the max=today attribute via manual entry), When they attempt to submit, Then an inline, non-color-only error renders on the date field BEFORE any request is sent, and the field retains focus.
  AC-003.4 Future-date rejected server-side — Given a future date somehow reaches the server (client guard bypassed), When ABSENCE_INVALID_DATE (422) returns, Then the identical inline date-field error from AC-003.3 renders, the form stays open, and no record is created.
  AC-003.5 Duplicate-date rejected client-side — Given the teacher selects a classId+studentMemberId+date combination already present in the currently loaded list, When they attempt to submit, Then an inline banner ("Đã có bản ghi cho ngày này") renders immediately and no request is sent.
  AC-003.6 Duplicate-date rejected server-side (race) — Given a duplicate combination reaches the server anyway (e.g. stale client list, concurrent tab), When ABSENCE_DUPLICATE_DATE (409) returns, Then the identical inline banner from AC-003.5 renders, the form stays open, and no record is created.
  AC-003.7 Field validation — Given the reason exceeds 5000 chars (ABSENCE_INVALID_INPUT, 422), When submit is attempted, Then a per-field inline error renders on the reason textarea, form stays open.
  AC-003.8 Network error — Given INT-001 fails (network/5xx/timeout), When the response returns, Then the form stays open, an inline/toast error is shown, and the previously entered field values are preserved for retry.
  AC-003.9 Mock-roster-only select — Given the teacher opens the student select, When candidates are shown, Then only the fixed mock roster (SA_STUDENT_ROSTER) scoped to the teacher's own class appears — no live search-as-you-type call fires.
  AC-003.10 Keyboard operability — Given the teacher uses only a keyboard, When they open the form, fill the date/excused-toggle/select/textarea, and submit, Then the entire record flow completes with no mouse, all controls ≥44×44px, visible focus rings throughout.
```

```
UC-004: Teacher edits an existing absence
  AC-004.1 Happy path — Given an existing record in the teacher's own class, When the teacher opens edit and changes reason and/or excused, Then INT-003 PATCH fires with only the changed field(s), the submit button shows a pending state while in flight, and on success the row reflects the updated values with updatedAt refreshed.
  AC-004.2 Partial PATCH — Given the teacher changes only excused (leaving reason untouched), Then the request body includes only excused — reason is omitted, not re-sent as an unchanged echo.
  AC-004.3 Immutable fields not editable (explicit assertion) — Given the edit form is open, Then date, classId (rendered as class name), and studentMemberId (rendered as student name) render as STATIC TEXT, not as input/select elements of any kind — this AC fails if any of the three natural-key fields is rendered as an editable control, even a disabled one.
  AC-004.4 Field validation — Given the edited reason exceeds 5000 chars (ABSENCE_INVALID_INPUT, 422), When submit is attempted, Then a per-field inline error renders on the reason textarea, no mutation applied.
  AC-004.5 Not-found race — Given ABSENCE_NOT_FOUND (404, natural key no longer resolves), When this is received, Then a toast indicates the record no longer exists and the list refetches.
  AC-004.6 Network error — Given INT-003 fails (network/5xx/timeout), When the response returns, Then the form stays open, an inline/toast error is shown, and the teacher may retry submit with the same field values.
```

```
UC-005: Principal flags a RECORDED absence (one-way, terminal)
  AC-005.1 Flag action visibility — Given a list of mixed-state rows, Then "Gắn cờ" is rendered ONLY on rows where state===RECORDED — never on FLAGGED_UNEXCUSED rows.
  AC-005.2 Confirm dialog — Given the principal clicks "Gắn cờ" on a RECORDED row, When the confirm dialog (SAFlagConfirmDialog) opens, Then it renders role="dialog", aria-modal="true", traps focus, and its copy explicitly states the action is irreversible (mirrors the lesson-plan.jsx one-way-publish confirm pattern) — `studentAbsences.flagConfirm.{title,description,cancel,confirm}`.
  AC-005.3 No optimistic update — Given the principal clicks confirm, When INT-004 is in flight, Then the confirm button shows a pending/disabled state AND the row's state/badges remain unchanged (still RECORDED, no flagged indicator) until the server responds with 2xx — the state must never flip client-side before the server confirms.
  AC-005.4 Happy path — Given INT-004 resolves 2xx, Then the dialog closes, the row's state updates to FLAGGED_UNEXCUSED, the flagged indicator renders, and the "Gắn cờ" action is no longer offered for that row.
  AC-005.5 Cancel — Given the confirm dialog is open, When the principal clicks Cancel or presses Escape, Then the dialog closes, no request is sent, no state change occurs, and focus returns to the triggering row's flag-action trigger.
  AC-005.6 403 handling — Given ABSENCE_FORBIDDEN (403) returns (see UC-006 for the security assertion), Then the confirm dialog reopens/stays open with an inline error, the row's state is NOT changed, and no success toast is shown.
  AC-005.7 404 race — Given ABSENCE_NOT_FOUND (404, record no longer resolves), Then a toast indicates this and the list refetches; not surfaced as a hard error.
  AC-005.8 Already-flagged backstop — Given ABSENCE_INVALID_STATE (400, a re-flag attempt somehow reaches the server), Then a generic inline error renders in the reopened dialog and the state is not changed — this defends in depth against AC-005.1's primary UI guard.
  AC-005.9 Network error — Given INT-004 fails (network/5xx/timeout), Then the confirm dialog stays open (or reopens) with an error, state not transitioned, and the principal can retry the same confirm action.
  AC-005.10 No-unflag negative assertion — Given ANY row in ANY state, in EITHER role's view, at ANY time, Then no control, button, menu item, or affordance exists anywhere in the UI to reverse a FLAGGED_UNEXCUSED state back to RECORDED — this is a genuine absence of a feature, not a permission-hidden one, and holds for both teacher and principal views.
```

```
UC-006: Server-side scope/role re-check (security)
  AC-006.1 Principal-only flag enforcement (explicit assertion) — Given a request reaches the INT-004 flag endpoint with a role that is not principal-tier (simulated via the mock repository per integration.md §4), When the request is evaluated, Then the API layer itself rejects it with ABSENCE_FORBIDDEN (403) — independent of and in addition to the client-side route/role gate already passed to reach this screen; this must be testable by directly invoking the repository/use-case with a forged/altered role, not only by confirming the "Gắn cờ" button is absent from a non-principal's rendered UI.
  AC-006.2 Teacher class-ownership enforcement (explicit assertion) — Given a request reaches INT-001 (record) or INT-003 (edit) with a classId that does not match the authenticated teacher's own GVCN homeroom assignment (simulated via the mock repository, e.g. a forged classId for a different class), When the request is evaluated, Then the API layer rejects it with ABSENCE_FORBIDDEN (403) and no record is created or mutated — independent of any client-side class-filter/route UI.
  AC-006.3 UI surfacing — Given either AC-006.1 or AC-006.2 fires, Then the rejection is surfaced as an inline dialog/form error (record/edit) or a reopened confirm dialog with error (flag) — never a silent failure and never an optimistic success shown before the rejection is known.
  AC-006.4 No client-only gating — Given the above, Then denial must not depend solely on a client-side conditional that hides a button/CTA — the check must be reproducible by calling the underlying Server Action/repository method directly with an out-of-scope role or classId and observing rejection.
  AC-006.5 Principal has zero record/edit affordance — Given the principal's rendered view, Then no record-creation CTA and no edit control exists anywhere on the screen, for any row, at any time (not merely disabled) — server-side rejection of a forged record/edit call from a principal (per FR-009 backstop) is defense in depth, not the primary guard.
```

```
UC-007: Two independent badges + no-unflag rendering rule
  AC-007.1 Excused badge always present — Given any row in either role's list, Then the excused/unexcused badge (SAExcusedBadge, icon + text label, i18nKey studentAbsences.{excused,unexcused}) is always rendered, regardless of state.
  AC-007.2 Flagged indicator conditional — Given a row's state===FLAGGED_UNEXCUSED, Then the flagged indicator (SAFlaggedIndicator, icon 'flag' + text label, i18nKey studentAbsences.flagged) additionally renders; for state===RECORDED rows it does NOT render at all (not an empty placeholder, genuinely absent).
  AC-007.3 Visually distinct, never merged — Given both the excused badge and the flagged indicator render on the same row, Then they are two visually and semantically distinct elements (different icon, different color token/pill) — never merged into a single badge/pill.
  AC-007.4 Orthogonal combination coverage — Given the fixture set includes RECORDED+excused:true, RECORDED+excused:false, and FLAGGED_UNEXCUSED (either excused value), Then the UI correctly renders all combinations, including excused:true AND flagged simultaneously on one row, proving the two signals are independent.
  AC-007.5 Non-color-only — Given a color-blind spot check, Then neither badge type conveys its meaning by color alone — both pair an icon and a text label (NFR-001).
  AC-007.6 Warning-foreground contrast — Given the unexcused badge, Then its text uses `text-edu-warning-foreground` (or `--edu-warning-foreground`), never raw warning as a text-on-light-background color, meeting ≥4.5:1 contrast (NFR-002).
```

```
UC-008: Responsive/mobile rendering
  AC-008.1 No clipping at 320px — Given the viewport is 320px wide, Then the record form, list, and flag confirm dialog render with no horizontal overflow or clipped controls.
  AC-008.2 Verified at additional breakpoints — Given the viewport is 375px, 768px, or 1280px, Then the same no-overflow/no-clipping guarantee holds at each (NFR-005).
  AC-008.3 Mobile padding — Given the viewport is at a mobile width, Then contentPadding reduces to 20px 16px (vs. desktop 28px 32px) per design-spec.jsonc.
  AC-008.4 Loading/empty/error reflow — Given any of the loading/empty/error states from UC-001/UC-002 render at a narrow viewport, Then the same copy/CTA reflows without clipping or overlap — no separate mobile-specific layout variant is introduced (this story has no card-list breakpoint requirement, unlike US-E20.1's admin parent-links screen).
```

## 5. Edge Case Matrix

| Feature | Empty | Max-length | Concurrent | Auth-expired | Network-error | Wrong-role |
| --- | --- | --- | --- | --- | --- | --- |
| Teacher list (UC-001) | AC-001.3 (CTA variant) | Reason text wraps/truncates in row display (read view, no explicit truncation UX specced — treat as wrap, not clip) | Another session records/edits into the same class while list is open → next filter/refetch reconciles; no crash on a row whose data changed | Existing hybrid refresh (decision 0018) retries once, then redirect-to-login on failure (cross-cutting, not screen-specific) | AC-001.4 | N/A (route already role-gated by teacher/principal split) |
| Principal list (UC-002) | AC-002.4 (no-CTA variant) | Same as above | Principal flags a row from another session while this principal's list is open → next refetch shows updated state; stale local row (if any) reconciles on refetch | same as above | AC-002.5 | N/A (route already role-gated) |
| Record (UC-003) | N/A (form always has fields) | Reason textarea hard-capped at 5000 chars client-side (matches server ABSENCE_INVALID_INPUT boundary) — AC-003.7 | Two tabs/requests submit the same classId+studentMemberId+date near-simultaneously → second request hits ABSENCE_DUPLICATE_DATE server-side (AC-003.6) even if the client-side pre-check (AC-003.5) didn't catch it due to stale local data | Token expires mid-fill → reactive refresh (decision 0018) transparent on submit; if refresh fails, redirect to login, in-progress field values lost only if unavoidable | AC-003.8 | AC-006.2 (forged classId) |
| Edit (UC-004) | N/A | Reason textarea same 5000-char cap — AC-004.4 | Record is edited by the same teacher in a second tab concurrently → last PATCH wins server-side; AC-004.5 (404) covers the case where the natural key no longer resolves (e.g. hypothetical future deletion path) | same pattern as above | AC-004.6 | AC-006.2 (forged classId) |
| Flag (UC-005) | N/A | N/A | Two principal sessions flag the same row concurrently → second request hits ABSENCE_INVALID_STATE (400, AC-005.8), not a crash; first request's success is unaffected | Token expires between opening the confirm dialog and clicking confirm → reactive refresh attempts once; if it still fails, treated as a network/error case (AC-005.9-equivalent), dialog stays open | AC-005.9 | AC-005.6/AC-006.1 (explicit, server-side) |
| Two badges (UC-007) | N/A (pure rendering rule) | N/A | N/A | N/A | Inherits list's error state (AC-001.4/AC-002.5) — badges simply don't render until data loads | N/A |
| Responsive (UC-008) | Reflows per AC-008.4 | Long reason text wraps within available width at all breakpoints, no horizontal overflow | N/A (layout concern) | Same cross-cutting auth behavior as above, rendered at any breakpoint | AC-008.4 | Same as list UCs — redirect (if any) happens before layout matters |

## 6. Open Questions

- `[OPEN QUESTION]` (carried from integration.md) INT-002 (list) pagination
  shape is unconfirmed from the available Go source excerpt — this file
  models list loading as a plain, non-paginated `useQuery` array fetch
  (bounded, one class over a date range); if `core`'s `ERROR_CODES.md`/
  `openapi.yaml` later confirms cursor pagination, AC-001.2/AC-002.2 would
  need a `meta.pagination`-aware loading-more state added. Flag to
  `fe-lead`/`core` team before assuming `useInfiniteQuery` is unnecessary.
- `[OPEN QUESTION]` (carried) Exact default date range for the list's
  `from`/`to` on first load (current academic term vs. a rolling window,
  e.g. last 30 days) is left as a uiux/fe decision, not fixed by any AC
  above — AC-001.1/AC-002.1 describe the loading/success mechanics
  independent of which default range is chosen.
- `[OPEN QUESTION]` Whether a long reason/note has any server-side or
  design-specified truncation behavior in the row/list display (as opposed
  to the free-text edit/record form, which has an explicit 5000-char cap) —
  not specified in DR-022 or `design-spec.jsonc`; the edge-case matrix above
  assumes wrap-not-clip pending a `uiux-lead` decision if this becomes a
  real issue during `/fe` build.
- `[OPEN QUESTION]` (carried from integration.md) Whether `core`'s
  `ERROR_CODES.md` (once available in a full local checkout) confirms the
  exact HTTP status codes assumed throughout this file (403/404/409/422/400)
  — derived from DR-022's Go-source ground-truthing pass; low risk given
  consistency with the sibling `discipline`/`staff-discipline` conventions,
  but worth a confirmation pass when `core` next ships an update.
- `[OPEN QUESTION]` (carried) No ADR is required per requirements.md's
  explicit handoff note (no new auth/RBAC rule beyond ADR 0062, no new
  token, no new data-contract decision) — carrying that conclusion forward;
  nothing in this use-case pass surfaced a reason to revisit it.
