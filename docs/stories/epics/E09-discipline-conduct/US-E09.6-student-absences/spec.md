# Feature Spec — Student Absences (US-E09.6)

Status: Draft   Lane: normal
Sources: `requirements.md` (TR-096, FR-001..013, NFR-001..009) ·
`integration.md` (INT-001..004) · `use-cases.md` (UC-001..008, AC-001.x..
AC-008.x, Edge Case Matrix) · `docs/design-requests/DR-022-staff-conduct-absences.md`
(Screen B) · `docs/decisions/0062-staff-discipline-absences-route-actor-fix.md`
(route/actor correction) · `docs/product/design-spec.jsonc` →
`screens.studentAbsences` (line ~10403) · `design_src/edu/student-absences.jsx`
(`StudentAbsencesScreen`)

## 1. Scope & Objectives

**Purpose:** Let a homeroom teacher (GVCN) record and edit per-date
excused/unexcused absences for students in their own class, and let a
principal review schoolwide/class-filtered absence records and irreversibly
flag a recorded absence for follow-up.

**In-scope:**
- Teacher record (create) of an absence for their own homeroom class.
- Teacher edit of `reason`/`excused` on an existing absence in their own
  class (PATCH semantics; `date`/`classId`/`studentMemberId` immutable).
- Teacher list view scoped to own class, filterable by date range.
- Principal schoolwide/class-filtered list view (read + flag only, no
  record/edit).
- Principal one-way flag action (`RECORDED` → `FLAGGED_UNEXCUSED`) with an
  irreversible confirm dialog.
- Duplicate-date and future-date validation, client- and server-side.
- Two independent, non-conflated excused/unexcused + flagged badges.
- Mock-roster-scoped student select for the teacher's record form
  (`SA_STUDENT_ROSTER`).
- Loading/empty/error/validation UI states.
- Routes `(app)/teacher/absences` and `(app)/principal/absences` per ADR
  `0062`.
- Summary stats row (total / unexcused / flagged), Should-priority.

**Out-of-scope:**
- Live roster search/autocomplete-by-name for student selection (blocked on
  the roster-UUID resolution gap, cross-repo asks #9/#15/#22).
- Any unflag/reversal/re-open capability for `FLAGGED_UNEXCUSED` records
  (no such contract exists in the BE domain).
- The `(app)/admin/absences` route alias from DR-022's original draft —
  dropped per ADR `0062`.
- The shared `ApprovalTransition` (DRAFT/SUBMITTED/APPROVED/REJECTED) shape
  used by the sibling `staff-discipline` (US-E09.5) — this is a distinct,
  simpler 2-state domain.
- The existing period-based teacher attendance feature
  (`(app)/teacher/attendance`) — a separate, unrelated domain.
- Bulk/CSV import of absences.
- Any involvement of this app's separate `admin` route-guard role.

**Definitions:**
- **Absence record** — a `(classId, studentMemberId, date)` natural-key
  record: `reason?`, `excused` (boolean), `state`
  (`RECORDED`|`FLAGGED_UNEXCUSED`), `recordedByMemberId`,
  `flaggedByMemberId?`, `createdAt`, `updatedAt`.
- **Excused/unexcused** — a teacher-editable boolean signal, independent of
  `state`. Present on every row, always.
- **Flagged** — a principal-set, one-way, terminal state transition
  (`RECORDED → FLAGGED_UNEXCUSED`). Present only when `state ===
  FLAGGED_UNEXCUSED`. There is no reverse transition anywhere in the domain.
- **Natural key** — `classId + studentMemberId + date`. Immutable once a
  record is created; never sent as editable body fields on PATCH.

## 2. Actors & Roles

| Actor | Visibility / capability |
| --- | --- |
| `teacher` (GVCN, homeroom) | Record (create) an absence for a student in their OWN homeroom class only, for a date that is today or in the past. Edit `reason`/`excused` on an existing absence they can see (own class scope) — `date`/`classId`/`studentMemberId` immutable. View a list scoped to their own class, filterable by date range. Select the student from a fixed mock roster scoped to their own class (no live search). Zero flag capability. |
| `principal` — **this app's `principal` system role = BE's `ADMIN`+`MANAGER` conduct-domain actor combined, per ADR `0062`. This is NOT the app's separate, narrower `admin` route-guard role** (which serves admin-core config screens like school-setup/roster/parent-links and is enforced by `(app)/admin/layout.tsx`'s strict `role === "admin"` guard, decision `0022`/`0024`) | View schoolwide absence records, filterable by class (dropdown). Flag a `RECORDED` absence as `FLAGGED_UNEXCUSED` (one-way, terminal, confirm-gated). Zero record/edit capability — no record CTA or edit control is ever rendered for this role. |
| `admin` (this app's route-guard role) | No involvement in this feature at all — no route, no capability, no mention in any AC. |
| `student` / `parent` | No visibility — routes are role-gated to `teacher`/`principal` only; denied server-side, never receive list/mutation data. |

Role-gated visibility: `(app)/teacher/absences` = teacher-only rendering
(record/edit CTAs + own-class list); `(app)/principal/absences` =
principal-only rendering (flag action + schoolwide/class-filtered list, zero
record/edit affordance). One component (`StudentAbsencesScreen`),
role-conditional, matching the proven `discipline.jsx` one-component-per-role
precedent — not two forked files.

## 3. Functional Requirements

### FR-001 — Teacher records a new absence (Must, TR-096/UC-003)
The system SHALL allow a teacher to record a new absence for a student in
their own homeroom class, capturing `classId`, `studentMemberId`, `date`,
`excused` (boolean), and an optional `reason` (max 5000 chars). On success
the record is created with `state=RECORDED`.
- AC: Given the teacher selects a valid student (own-class mock roster), a
  date ≤ today, and sets excused, When they submit, Then INT-001 fires, the
  submit button shows a pending/disabled (`aria-busy`) state, and on success
  the new record (`state=RECORDED`) appears in the list without a full page
  reload and the form closes (AC-003.2).
- AC: Given the teacher opens the record form, Then it renders with an
  empty student select scoped to the mock roster, a date input with
  `max=today` defaulting to today, an excused segmented toggle, and an empty
  reason textarea (max 5000 chars) (AC-003.1).
- Dependencies: INT-001.

### FR-002 — Future-date rejection, client + server (Must, TR-096/UC-003)
The system SHALL reject recording an absence for a future date. The client
SHALL constrain the date picker to today-or-earlier (`max` attribute) and
SHALL re-validate on submit, surfacing the identical rejection whether caught
client-side or server-side (`ABSENCE_INVALID_DATE`).
- AC: Given the teacher attempts to set a date after today (bypassing the
  `max=today` attribute via manual entry), When they attempt to submit, Then
  an inline, non-color-only error renders on the date field BEFORE any
  request is sent, and the field retains focus (AC-003.3).
- AC: Given a future date somehow reaches the server (client guard
  bypassed), When `ABSENCE_INVALID_DATE` (422) returns, Then the identical
  inline date-field error renders, the form stays open, and no record is
  created (AC-003.4).
- Dependencies: INT-001.

### FR-003 — Duplicate-date rejection, client + server (Must, TR-096/UC-003)
The system SHALL reject creating a second absence record for the same
`classId+studentMemberId+date` (the natural key). The client SHALL
pre-check against already-loaded records before submit, in addition to the
server's authoritative check.
- AC: Given the teacher selects a `classId+studentMemberId+date` already
  present in the currently loaded list, When they attempt to submit, Then an
  inline banner ("Đã có bản ghi cho ngày này") renders immediately and no
  request is sent (AC-003.5).
- AC: Given a duplicate combination reaches the server anyway (race — stale
  client list, concurrent tab), When `ABSENCE_DUPLICATE_DATE` (409) returns,
  Then the identical inline banner renders, the form stays open, and no
  record is created (AC-003.6).
- Dependencies: INT-001.

### FR-004 — Teacher edits reason/excused only, immutable identity (Must, TR-096/UC-004)
The system SHALL allow a teacher to edit ONLY `reason` and `excused` on an
existing absence in their own class, via PATCH semantics (fields
independently optional). `date`, `classId`, `studentMemberId` SHALL be
immutable and rendered as static (non-editable) text.
- AC: Given an existing record in the teacher's own class, When the teacher
  changes reason and/or excused and submits, Then INT-003 PATCH fires with
  ONLY the changed field(s), and on success the row reflects the updated
  values with `updatedAt` refreshed (AC-004.1).
- AC: Given the edit form is open, Then `date`, `classId` (as class name),
  and `studentMemberId` (as student name) render as STATIC TEXT, never as
  an input/select of any kind, even disabled — this AC fails if any of the
  three natural-key fields is editable in any form (AC-004.3).
- AC: Given the teacher changes only `excused` (leaving `reason` untouched),
  Then the request body includes only `excused` — `reason` is omitted, not
  re-sent as an unchanged echo (AC-004.2).
- Dependencies: INT-003.

### FR-005 — Principal one-way flag, confirm-gated (Must, TR-096/UC-005)
The system SHALL allow a principal to irreversibly flag a `RECORDED`
absence as `FLAGGED_UNEXCUSED`, gated behind an explicit confirm dialog
stating the action cannot be undone. The flag action SHALL be
visible/enabled only on rows with `state=RECORDED`.
- AC: Given a list of mixed-state rows, Then "Gắn cờ" is rendered ONLY on
  rows where `state===RECORDED` — never on `FLAGGED_UNEXCUSED` rows
  (AC-005.1).
- AC: Given the principal clicks "Gắn cờ" and confirms, When INT-004
  resolves 2xx, Then the dialog closes, the row's state updates to
  `FLAGGED_UNEXCUSED`, the flagged indicator renders, and the "Gắn cờ"
  action is no longer offered for that row (AC-005.4).
- AC: Given the confirm dialog is open, When INT-004 is in flight, Then the
  confirm button shows pending/disabled AND the row's state/badges remain
  unchanged until the server responds 2xx — no optimistic client-only flip
  ever occurs (AC-005.3).
- Dependencies: INT-004.

### FR-006 — No unflag affordance, ever (Must, TR-096/UC-005/UC-007)
The system SHALL never offer an "unflag" affordance anywhere in the UI.
`FLAGGED_UNEXCUSED` is terminal — no reverse transition exists in the
domain contract.
- AC: Given ANY row in ANY state, in EITHER role's view, at ANY time, Then
  no control, button, menu item, or affordance exists anywhere to reverse a
  `FLAGGED_UNEXCUSED` state back to `RECORDED` — genuine absence of a
  feature, not a permission-hidden one (AC-005.10).
- AC: `IStudentAbsenceRepository` SHOULD NOT even expose an
  `unflag`-shaped method signature (integration.md §4).
- Dependencies: none (negative/architectural requirement).

### FR-007 — Two independent, non-conflated badges (Must, TR-096/UC-007)
The system SHALL render two independent signals per row: (a) an
excused/unexcused badge reflecting the boolean `excused` (teacher-editable),
and (b) a flagged indicator shown ONLY when `state=FLAGGED_UNEXCUSED`
(principal-set). These SHALL never be merged into a single badge/pill.
- AC: Given any row, Then the excused/unexcused badge (`SAExcusedBadge`,
  icon + text, `i18nKey studentAbsences.{excused,unexcused}`) is always
  rendered, regardless of state (AC-007.1).
- AC: Given `state===FLAGGED_UNEXCUSED`, Then the flagged indicator
  (`SAFlaggedIndicator`, icon 'flag' + text, `i18nKey
  studentAbsences.flagged`) additionally renders; for `RECORDED` rows it
  does NOT render at all (genuinely absent, not an empty placeholder)
  (AC-007.2).
- AC: Given the fixture set includes `RECORDED`+`excused:true`,
  `RECORDED`+`excused:false`, and `FLAGGED_UNEXCUSED` (either excused
  value), Then all combinations render correctly, including
  `excused:true` AND flagged simultaneously — proving the signals are
  orthogonal (AC-007.4).
- Dependencies: INT-002 (rendering, no dedicated call of its own).

### FR-008 — Teacher server-side class-scope enforcement (Must, TR-096/UC-006)
The system SHALL scope a teacher's list/record/edit view strictly to their
own homeroom class (GVCN), enforced server-side on every mutating call,
independent of any client-side route/role gate.
- AC: Given a request reaches INT-001/INT-003 with a `classId` not matching
  the authenticated teacher's own GVCN homeroom assignment (simulated via
  the mock repository), Then the API layer rejects with `ABSENCE_FORBIDDEN`
  (403) and no record is created/mutated — testable by directly invoking
  the repository/use-case, not only by confirming UI hides the affordance
  (AC-006.2, AC-006.4).
- AC: Given `ABSENCE_FORBIDDEN` (403) fires, Then it is surfaced as an
  inline dialog/form error, never a silent failure or optimistic success
  (AC-006.3).
- Dependencies: INT-001, INT-003. See §"High-Risk-Grade Security
  Enforcement" below.

### FR-009 — Principal read/flag-only scope enforcement (Must, TR-096/UC-002/UC-006)
The system SHALL scope a principal's list view to schoolwide records with an
optional class filter, and SHALL restrict the principal's only mutating
capability to the flag action (FR-005) — the principal SHALL NOT record or
edit absences.
- AC: Given the principal's rendered view, Then no record-creation CTA and
  no edit control exists anywhere on the screen, for any row, at any time —
  not merely disabled (AC-006.5).
- AC: Given a request reaches INT-004 whose session role is not
  `principal`-tier (simulated via mock repository), Then the API layer
  rejects with `ABSENCE_FORBIDDEN` (403) — independent of and in addition
  to the client route/role gate; testable by directly invoking the
  repository/use-case with a forged/altered role (AC-006.1, AC-006.4).
- Dependencies: INT-002, INT-004. See §"High-Risk-Grade Security
  Enforcement" below.

### FR-010 — Mock-roster student select, no live search (Must, TR-096/UC-003)
The system SHALL resolve the student selection in the teacher's record form
against a fixed mock roster (`SA_STUDENT_ROSTER`) scoped to the teacher's
own class, NOT a live search-as-you-type call, because no
`studentName`/`className` exists on the wire response and no roster-search
endpoint is available (roster-UUID gap shared with
staff-discipline/staff-leave/discipline, cross-repo asks #9/#15/#22).
- AC: Given the teacher opens the student select, When candidates are
  shown, Then only the fixed mock roster scoped to their own class appears
  — no live search-as-you-type call fires (AC-003.9).
- Dependencies: mock fixture only, no live INT.

### FR-011 — Summary stats row (Should, TR-096/UC-001/UC-002)
The system SHOULD display a summary stats row (total absences / unexcused
count / flagged count) scoped to the current role's view (own class for
teacher, schoolwide or class-filtered for principal).
- AC: Given the list successfully loads, Then a 3-up `StatCard` grid
  (total/unexcused/flagged) derives client-side from the loaded/filtered
  set, no separate endpoint (AC-001.5).
- Dependencies: INT-002 (client-derived, not a separate call).

### FR-012 — No live roster search (Won't, explicit non-goal)
The system SHALL NOT implement live roster search/autocomplete-by-name for
student selection in this story. Explicit boundary, no AC beyond FR-010's
negative assertion (AC-003.9).

### FR-013 — No unflag/reversal (Won't, explicit non-goal)
The system SHALL NOT implement any unflag, re-open, or reversal capability
for a `FLAGGED_UNEXCUSED` record. Covered by FR-006/AC-005.10.

## 4. Non-Functional Requirements

| NFR | Requirement | Measurable target | QA verification |
| --- | --- | --- | --- |
| NFR-001 (a11y) | Excused/unexcused badge AND flagged indicator never rely on color alone; visually distinct from each other | icon + localized text on both badge types; text ≥4.5:1, icon ≥3:1; manual color-blind spot check | axe/impeccable audit + manual greyscale check (AC-007.5) |
| NFR-002 (a11y) | Unexcused (warning) badge text uses warning-foreground token | `text-edu-warning-foreground`/`--edu-warning-foreground`, contrast ≥4.5:1 | design-review gate token check (AC-007.6) |
| NFR-003 (a11y) | Date input, excused segmented toggle, flag button, confirm dialog fully keyboard-operable, visible focus rings, ≥44×44px touch targets; flag confirm dialog traps focus, `role=dialog`+`aria-modal` | keyboard-only walkthrough completes record/edit/flag flows; touch targets ≥44px; focus ring per `--ring` | Storybook keyboard/focus-trap interaction test (AC-003.10, AC-005.2) |
| NFR-004 (a11y/motion) | Toast/dialog entrance animation gated behind `prefers-reduced-motion: reduce` | motion-safe guard present; reduced-motion users see no animated transition | manual reduced-motion toggle check |
| NFR-005 (responsive) | Screen renders without layout breakage across 320/375/768/1280px, including record form, list/table, flag confirm dialog | no horizontal overflow/clipped controls at any of the 4 breakpoints | Storybook viewport stories at all 4 widths (UC-008, AC-008.1–.4) |
| NFR-006 (i18n) | All copy uses `studentAbsences` namespace, added to both `vi.json` (source) and `en.json` (mirror) in the same edit | zero hardcoded VN/EN strings; `tsc --noEmit` catches typo'd key | `bunx tsc --noEmit`; hardcoded-string grep per `.claude/rules/i18n.md` |
| NFR-007 (performance) | Absences list shows a skeleton loading state (rows, count=4), distinct from empty | skeleton visible ≤320ms perceived delay before content/empty/error resolves | Storybook loading-state story + manual timing spot-check (AC-001.1, AC-002.1) |
| NFR-008 (security) | Every mutating action (record, edit, flag) re-authorized server-side by role AND, for teacher actions, by homeroom-class ownership — never trusting the client route/role gate alone | `ABSENCE_FORBIDDEN` (403) returned and surfaced in UI for any out-of-scope attempt | RBAC unit test invoking use-case/repository directly with forged role/classId (AC-006.1–.4) — see §"High-Risk-Grade Security Enforcement" |
| NFR-009 (security) | `date` validated as bare `YYYY-MM-DD` calendar date (not datetime), client + server, future dates rejected | `ABSENCE_INVALID_DATE` (422) for any future date; client date picker `max=today` | unit test on date validation + AC-003.3/.4 |

## 5. UI States & Flows

Per-async-surface state matrix (loading/empty/error/success required
everywhere data is fetched or mutated):

| Surface | Loading | Empty | Error | Success |
| --- | --- | --- | --- | --- |
| Teacher list (INT-002) | 4-row skeleton (AC-001.1) | "Chưa ghi nhận nghỉ học kỳ này" WITH "Ghi nhận nghỉ học" CTA (AC-001.3) | error+retry, same filter re-issued (AC-001.4); `ABSENCE_FORBIDDEN` backstop → generic error, not silent redirect (AC-001.6) | rows: student/date/excused-badge/flagged-indicator(if any)/reason (AC-001.2) |
| Principal list (INT-002) | 4-row skeleton (AC-002.1) | Same copy, STATIC, NO CTA — distinct from teacher variant (AC-002.4) | error+retry, same filter re-issued (AC-002.5) | same row shape PLUS "Gắn cờ" on `RECORDED` rows only, zero record/edit affordance (AC-002.2) |
| Record dialog (INT-001) | submit button pending/disabled, `aria-busy` (AC-003.2) | n/a (dialog always has fields) | future-date inline field error (AC-003.3/.4); duplicate-date inline banner (AC-003.5/.6); `ABSENCE_INVALID_INPUT` per-field (reason, AC-003.7); network → dialog stays open, fields preserved (AC-003.8); `ABSENCE_FORBIDDEN` → see UC-006 | new record appears without full reload, dialog closes (AC-003.2) |
| Edit dialog (INT-003) | submit button pending state (AC-004.1) | n/a | `ABSENCE_INVALID_INPUT` per-field (AC-004.4); `ABSENCE_NOT_FOUND` → toast + refetch (AC-004.5); network → dialog stays open, retry (AC-004.6); `ABSENCE_FORBIDDEN` → see UC-006 | row reflects updated values, `updatedAt` refreshed (AC-004.1) |
| Flag confirm dialog (INT-004) | confirm button pending/disabled; row stays `RECORDED` until 2xx — no optimistic flip (AC-005.3) | n/a | `ABSENCE_FORBIDDEN` → dialog reopens w/ error, no transition (AC-005.6); `ABSENCE_NOT_FOUND` → toast + refetch (AC-005.7); `ABSENCE_INVALID_STATE` (re-flag backstop) → generic inline error (AC-005.8); network → dialog stays open/reopens, retry (AC-005.9) | dialog closes, row → `FLAGGED_UNEXCUSED`, flagged indicator renders, "Gắn cờ" no longer offered (AC-005.4) |
| Mobile <320–1280px (UC-008) | same skeletons, reflowed | same 2 role-scoped empty variants, reflowed (AC-008.4) | same error+retry, reflowed (AC-008.4) | standard reflow, `contentPadding` 20px 16px mobile (AC-008.1–.3) — no bespoke stacked-card breakpoint (unlike US-E20.1) |

Key flows: list-load → optional date-range/class filter → (teacher: record
OR edit) OR (principal: flag) → list reflects change. Flag is the only flow
requiring server-round-trip-before-UI-update (no optimism), matching
US-E20.1's high-risk Unlink rigor even though this story's lane is normal.

## 6. Data & Integration

Per `integration.md` §2 (source of truth; summarized here for handoff
completeness). All 4 endpoints are **REAL and SHIPPED** on the BE
(ground-truthed against `edu-api/services/core/internal/conduct/adapter/http/
{routes.go, dto/student_absence.go, valueobject/absence_state.go}`), but the
web client is **mock-first** (decision `0014`) because every real endpoint
keys on a real `studentMemberId`/`classId` UUID the web has no
roster-resolution path for, and no `studentName`/`className` field exists on
the wire — a real/mock toggle would produce a broken "real" mode, so
`student-absence.di.ts` SHOULD force-mock regardless of
`NEXT_PUBLIC_USE_MOCK`, matching the `discipline` feature's precedent.

| INT | Service | Method+Path | Request (camelCase) | Response | Error→UI | Pagination | Auth/role |
| --- | --- | --- | --- | --- | --- | --- | --- |
| INT-001 | core (mock-first, real BE shipped) | POST `/api/v1/conduct/student-absences` | `classId`, `studentMemberId`, `date` (bare YYYY-MM-DD, ≤today), `excused` (bool), `reason?` (≤5000 chars) | created record: `classId, studentMemberId, date, reason?, excused, state:"RECORDED", recordedByMemberId, createdAt, updatedAt` | `ABSENCE_FORBIDDEN`(403)→inline dialog error, no create; `ABSENCE_DUPLICATE_DATE`(409)→inline banner; `ABSENCE_INVALID_DATE`(422)→inline date-field error; `ABSENCE_INVALID_INPUT`(422)→per-field (`error.fields[]`); network/5xx→toast/inline, retry | none | teacher (own GVCN class only, server re-checked) |
| INT-002 | core (mock-first, real BE shipped) | GET `/api/v1/conduct/student-absences?classId=&from=&to=` | `classId` (required for teacher/own; optional filter for principal), `from`, `to` (bare YYYY-MM-DD) | array of records, same shape as INT-001 response + `state:"RECORDED"|"FLAGGED_UNEXCUSED"`, `flaggedByMemberId?` | `ABSENCE_FORBIDDEN`(403)→backstop generic error (should not occur); network/5xx→error+retry; empty→empty state (role-variant copy) | `[OPEN QUESTION]` unconfirmed — treat as bounded array (one class/date-range), not cursor-paginated, until confirmed | teacher (own class, server-scoped) OR principal (schoolwide/class-filtered, read-only) |
| INT-003 | core (mock-first, real BE shipped) | PATCH `/api/v1/conduct/student-absences/:date?classId=&studentMemberId=` | (path) `date`; (query) `classId`, `studentMemberId` (natural key, never body-editable); (body, independently optional) `reason?`, `excused?` | updated record, same shape as INT-001, `updatedAt` refreshed | `ABSENCE_FORBIDDEN`(403)→inline dialog error, no mutation; `ABSENCE_NOT_FOUND`(404)→toast, refetch; `ABSENCE_INVALID_INPUT`(422)→per-field; `ABSENCE_INVALID_STATE`(400, backstop)→generic inline error; network/5xx→dialog stays open, retry | none | teacher (own GVCN class only, server re-checked) |
| INT-004 | core (mock-first, real BE shipped) | POST `/api/v1/conduct/student-absences/:date/flag?classId=&studentMemberId=` | (path) `date`; (query) `classId`, `studentMemberId`; no body | updated record: `state:"FLAGGED_UNEXCUSED"`, `flaggedByMemberId` set, `updatedAt` refreshed, all else unchanged | `ABSENCE_FORBIDDEN`(403)→confirm dialog reopens w/ error, no transition; `ABSENCE_NOT_FOUND`(404)→toast, refetch; `ABSENCE_INVALID_STATE`(400, re-flag backstop)→generic inline error; `ABSENCE_INVALID_ID`(400, backstop)→generic error; network/5xx→dialog stays open/reopens, retry | none | principal (BE ADMIN+MANAGER conduct actor, flag-only, server re-checked) |

Entity (mock, matches ground-truthed wire contract exactly, plus a
client-only display-name overlay never sent to/received from the server):

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

Typed failure union (`student-absence.failure.ts`, genuinely new, zero reuse
from `DisciplineFailure`):

```ts
type StudentAbsenceFailure =
  | { type: "forbidden" }       // ABSENCE_FORBIDDEN (403)
  | { type: "not-found" }       // ABSENCE_NOT_FOUND (404)
  | { type: "duplicate-date" }  // ABSENCE_DUPLICATE_DATE (409)
  | { type: "invalid-date" }    // ABSENCE_INVALID_DATE (422) — future date;
                                 //   distinct i18n key from discipline's
                                 //   invalid-date (opposite direction)
  | { type: "invalid-state" }   // ABSENCE_INVALID_STATE (400, backstop)
  | { type: "invalid-id" }      // ABSENCE_INVALID_ID (400, backstop)
  | { type: "invalid-input" }   // ABSENCE_INVALID_INPUT (422, backstop)
  | { type: "network-error" };
```

`type` values double as i18n keys under `studentAbsences.errors.*` — these
keys already exist in both `vi.json`/`en.json` (added by `uiux-ux-writer`
per DR-022; do not regenerate a parallel set):
`studentAbsences.errors.{forbidden,not-found,duplicate-date,
invalid-date-future,invalid-state,invalid-id,invalid-input}` (note the wire
`invalid-date` failure type maps to the i18n key
`invalid-date-future`, matching the existing `design-spec.jsonc`
`i18nNew` list — do not rename the i18n key to plain `invalid-date`, which
would risk confusion with `discipline.errors.invalid-date`'s opposite
direction).

Mock fixtures required (per integration.md §4):
- `SA_STUDENT_ROSTER` — fixed roster fixture, one mock teacher's own
  homeroom class, `studentMemberId → fullName/className`.
- Seeded records covering `RECORDED`+`excused:true`,
  `RECORDED`+`excused:false`, `FLAGGED_UNEXCUSED` (at least one each) — full
  fixture coverage for FR-007's orthogonal-combination AC.
- Duplicate-date, future-date, forbidden-class, and re-flag rejection
  simulations (mock clock injectable, no real `Date.now()` dependency per
  `.claude/rules/tdd.md`).
- No `unflag`-shaped method anywhere in `IStudentAbsenceRepository`.

## 7. Use Case Summary

| UC ID | Title | FR coverage | AC count |
| --- | --- | --- | --- |
| UC-001 | Teacher views own-class absences list | FR-008, FR-011 | 6 (AC-001.1–.6) |
| UC-002 | Principal views schoolwide/class-filtered absences list | FR-009, FR-011 | 5 (AC-002.1–.5) |
| UC-003 | Teacher records (creates) a new absence | FR-001, FR-002, FR-003, FR-010 | 10 (AC-003.1–.10) |
| UC-004 | Teacher edits an existing absence (reason/excused only) | FR-004 | 6 (AC-004.1–.6) |
| UC-005 | Principal flags a RECORDED absence (one-way, terminal) | FR-005, FR-006 | 10 (AC-005.1–.10) |
| UC-006 | Server-side scope/role re-check (security, both halves) | FR-008, FR-009 | 5 (AC-006.1–.5) |
| UC-007 | Two independent badges + no-unflag rendering rule | FR-006, FR-007 | 6 (AC-007.1–.6) |
| UC-008 | Responsive/mobile rendering | NFR-005 | 4 (AC-008.1–.4) |

## 8. Constraints & Assumptions

**Technical constraints:**
- The `core` conduct sub-domain endpoints are real and shipped (ground-truthed
  against Go source), but unreachable end-to-end today because of the
  roster-UUID display-field gap — this story is mock-first (decision `0014`)
  for that reason, not because `core` doesn't exist (different classification
  from e.g. US-E20.1).
- `student-absence.di.ts` SHOULD force-mock regardless of
  `NEXT_PUBLIC_USE_MOCK`, matching `discipline.di.ts`'s established
  precedent, since a real/mock toggle would silently produce a broken "real"
  mode.

**Confirmed [ASSUMPTION]s (carried from requirements.md):**
- "Own homeroom class only" for teacher scope is enforced by the BE via the
  authenticated teacher's GVCN class assignment, resolved server-side — the
  web layer does not independently determine class ownership.
- `SA_STUDENT_ROSTER` is a static, per-class fixture maintained in the
  feature's mock data layer, not fetched from a real endpoint, consistent
  with the `discipline.jsx`/`staff-leave.jsx` precedent.
- `principal` in this story refers strictly to this app's `principal` role
  (BE's ADMIN/MANAGER conduct-domain actor combined), per ADR `0062` — never
  this app's separate, narrower `admin` route-guard role.
- Default date-range for `GET ?from=&to=` on first load (current academic
  term vs. a recent rolling window) is a UI/UX decision for `uiux`/`fe-lead`,
  not fixed by this contract.

**[GAP]:**
- Long reason/note truncation behavior in the row/list display (as opposed
  to the 5000-char-capped edit/record textarea) is unspecified in DR-022 or
  `design-spec.jsonc` — treat as wrap-not-clip pending a `uiux-lead` decision
  if this becomes a real issue during `/fe` build.

**[CONFLICT]:** none identified between requirements/integration/use-cases/
design-spec inputs for this story.

**[OPEN QUESTION]s (carried forward, NOT resolved here):**
1. INT-002 (list) pagination shape is unconfirmed from the available Go
   source excerpt — this spec models list loading as a plain, non-paginated
   `useQuery` array fetch (bounded, one class over a date range); if
   `core`'s `ERROR_CODES.md`/`openapi.yaml` later confirms cursor
   pagination, AC-001.2/AC-002.2 would need a `meta.pagination`-aware
   loading-more state added. Flag to `fe-lead`/`core` team before assuming
   `useInfiniteQuery` is unnecessary.
2. Exact default date range for the list's `from`/`to` on first load
   (current academic term vs. a rolling window, e.g. last 30 days) is left
   as a `uiux`/`fe` decision, not fixed by any AC.
3. Whether `core`'s `ERROR_CODES.md` (once available in a full local
   checkout) confirms the exact HTTP status codes assumed throughout this
   spec (403/404/409/422/400) — derived from DR-022's Go-source
   ground-truthing pass; low risk given consistency with the sibling
   `discipline`/`staff-discipline` conventions, but worth a confirmation
   pass when `core` next ships an update.
4. No ADR is required per requirements.md's explicit handoff note (no new
   auth/RBAC rule beyond ADR `0062`, no new token, no new data-contract
   decision) — carrying that conclusion forward; nothing in this
   consolidation pass surfaced a reason to revisit it.

## 9. Traceability Matrix

| Requirement | Source | Use Case(s) | Integration(s) | Priority |
| --- | --- | --- | --- | --- |
| FR-001 Teacher records absence | TR-096 FR-001 | UC-003 | INT-001 | Must |
| FR-002 Future-date rejected (client+server) | TR-096 FR-002 | UC-003 | INT-001 | Must |
| FR-003 Duplicate-date rejected (client+server) | TR-096 FR-003 | UC-003 | INT-001 | Must |
| FR-004 Teacher edits reason/excused only, immutable identity | TR-096 FR-004 | UC-004 | INT-003 | Must |
| FR-005 Principal one-way flag, confirm-gated | TR-096 FR-005 | UC-005 | INT-004 | Must |
| FR-006 No unflag affordance ever | TR-096 FR-006 | UC-005, UC-007 | n/a (negative/architectural) | Must |
| FR-007 Two independent, non-conflated badges | TR-096 FR-007 | UC-007 | INT-002 (rendering) | Must |
| FR-008 Teacher server-side class-scope enforcement | TR-096 FR-008 | UC-001, UC-006 | INT-001, INT-003 | Must |
| FR-009 Principal read/flag-only scope enforcement | TR-096 FR-009 | UC-002, UC-006 | INT-002, INT-004 | Must |
| FR-010 Mock-roster student select, no live search | TR-096 FR-010 | UC-003 | n/a (mock fixture) | Must |
| FR-011 Summary stats row | TR-096 FR-011 | UC-001, UC-002 | INT-002 (client-derived) | Should |
| FR-012 No live roster search (non-goal) | TR-096 FR-012 | UC-003 (negative) | n/a (exclusion) | Won't |
| FR-013 No unflag/reversal (non-goal) | TR-096 FR-013 | UC-005, UC-007 (negative) | n/a (exclusion) | Won't |
| NFR-001 Badges never color-only | TR-096 NFR-001 | UC-007 | INT-002 | Must |
| NFR-002 Warning-foreground contrast token | TR-096 NFR-002 | UC-007 | INT-002 | Must |
| NFR-003 Keyboard/focus/touch-target | TR-096 NFR-003 | UC-003, UC-004, UC-005 | INT-001, INT-003, INT-004 | Must |
| NFR-004 Motion-safe animation | TR-096 NFR-004 | UC-005 | INT-004 | Must |
| NFR-005 Responsive (320/375/768/1280) | TR-096 NFR-005 | UC-008 | INT-002 | Must |
| NFR-006 i18n `studentAbsences` namespace | TR-096 NFR-006 | all | all | Must |
| NFR-007 Skeleton loading, distinct from empty | TR-096 NFR-007 | UC-001, UC-002 | INT-002 | Must |
| NFR-008 Server-side role/scope re-check security | TR-096 NFR-008 | UC-006 | INT-001, INT-003, INT-004 | Must |
| NFR-009 Bare-date validation, future rejected both sides | TR-096 NFR-009 | UC-003 | INT-001 | Must |

No FR/NFR is UNCOVERED — every row above resolves to ≥1 use case and ≥2 AC
(FR-006/FR-012/FR-013 are negative/architectural requirements whose "AC" is
the explicit absence of an affordance, itself asserted at AC-005.10/AC-006.5/
AC-003.9, satisfying the ≥2-AC bar in combination with their paired UC's
main-flow AC).

## High-Risk-Grade Security Enforcement (non-negotiable, FR-008/FR-009/UC-006)

This story's lane is **normal**, not high-risk — but the server-side
role/scope re-check on this screen's mutations is treated with the SAME
rigor as US-E20.1's high-risk Unlink enforcement, because a client-side
bypass here would let a teacher mutate another homeroom's records, or a
non-principal actor terminate an absence's state irreversibly. The
following is a hard gate, not a nice-to-have, and MUST be true before this
story can be marked `implemented`:

1. **Teacher class-ownership re-check (INT-001 record, INT-003 edit).**
   Every record/edit call MUST be re-checked server-side (mock repository,
   pre-`core`-integration) for `classId` ownership against the
   authenticated teacher's own GVCN homeroom assignment — independent of
   any client-side class-filter/route UI. A GVCN of class A forging a
   request with class B's `classId` MUST receive `ABSENCE_FORBIDDEN` (403);
   no record is created or mutated. This must be testable by directly
   invoking the repository/use-case with a forged `classId` — a test suite
   that only proves the "Ghi nhận nghỉ học" CTA/edit control is absent for
   an out-of-scope class does NOT satisfy this requirement (AC-006.2,
   AC-006.4).
2. **Principal flag-only role re-check (INT-004 flag).** Every flag call
   MUST be re-checked server-side for `principal`-tier role — independent
   of the client route gate that already routed the actor to
   `/principal/absences`. A non-principal actor (forged/altered session
   role) MUST receive `ABSENCE_FORBIDDEN` (403); no state transition
   occurs. Testable by directly invoking the repository/use-case, not only
   by confirming "Gắn cờ" is absent from a non-principal's rendered UI
   (AC-006.1, AC-006.4).
3. **No optimistic client-only state flip on flag.** The row's `state`
   (and both badges) MUST remain unchanged (`RECORDED`, no flagged
   indicator) until INT-004 responds 2xx — a client that flips the badge
   before the server confirms produces a false sense of a terminal action
   having succeeded (AC-005.3).
4. **Rejections surfaced, never silent.** Both re-checks' rejections MUST
   render as an inline dialog/form error (record/edit) or a reopened confirm
   dialog with error (flag) — never a silent failure, never an optimistic
   success shown before the rejection is known (AC-006.3).
5. **Pre-`core` testability.** Since the real `core` endpoints are
   roster-blocked today, the mock repository IS the enforcement boundary for
   now: it MUST simulate both rejections (forbidden-class, non-principal
   flag) so these ACs are testable pre-BE-integration (integration.md §4).

`fe-tech-lead-reviewer` MUST verify points 1–3 above with a concrete unit/
integration test that exercises a forged classId/role directly against the
repository or use-case layer — UI-only role-hiding tests are insufficient
proof for this story, exactly as required for US-E20.1's high-risk Unlink.

## 10. Handoff to FE

`fe-lead` should build:
- `src/features/student-absences/` (domain: `StudentAbsence` entity,
  `IStudentAbsenceRepository` — record/list/edit/flag, no `unflag` method;
  `StudentAbsenceFailure` union; use-cases for record/list/edit/flag;
  infrastructure: mock repository per §6/integration.md §4 fixtures
  [`SA_STUDENT_ROSTER`, seeded RECORDED/FLAGGED_UNEXCUSED records,
  duplicate/future-date/forbidden-class/re-flag simulations], DTOs, mapper,
  endpoint constants; presentation: `StudentAbsencesScreen` (single,
  role-conditional component) + `SAExcusedBadge` + `SAFlaggedIndicator` +
  `SAFlagConfirmDialog` + `SADateField` + record/edit dialogs +
  skeleton/empty(×2 variant)/error states + summary stats row).
- Routes `(app)/teacher/absences/page.tsx` + `(app)/principal/absences/
  page.tsx` + `actions.ts` per each, reusing role-scoped Server Action
  authorization (no shared admin-layout guard involved — these are teacher/
  principal route groups per ADR `0062`).
- `student-absence.di.ts` — force-mock regardless of `NEXT_PUBLIC_USE_MOCK`,
  matching `discipline.di.ts`'s precedent (real endpoints are roster-blocked
  end-to-end today).
- Reference design: `design_src/edu/student-absences.jsx`
  (`StudentAbsencesScreen`) and its `docs/product/design-spec.jsonc` entry
  `screens.studentAbsences` (line ~10403) — tokens, badge color mapping
  (excused/unexcused/flagged), layout/padding, and component names are
  normative per decision `0011`. i18n keys already exist in `vi.json`/
  `en.json` under `studentAbsences.*` (added by `uiux-ux-writer` per DR-022)
  — reuse verbatim, do not regenerate.

**Suggested lane:** normal, per requirements.md/integration.md/use-cases.md —
but pipeline MUST still include the security-focused review pass on
INT-001/INT-003 (class-ownership) and INT-004 (principal-only flag) before
the design-review gate, per §"High-Risk-Grade Security Enforcement" above.

**Proof owed (→ TEST_MATRIX rows):**
- Unit: record/edit/list/flag use-cases (ok + all documented failure
  branches per §9); date validation (bare YYYY-MM-DD, future rejection);
  duplicate-key pre-check logic.
- Integration: mock repository including the simulated forbidden-class
  (record/edit) and non-principal-flag rejections as their own explicit
  tests — this is the load-bearing security proof, not optional coverage.
- E2E: Storybook stories per Validation table in `story.md` — all 4 UI
  states × both role variants (teacher/principal) × record/edit/flag
  dialogs + two-badges rendering matrix + mobile viewport set
  (320/375/768/1280).
- Platform: `tsc --noEmit` clean, `bun run build` succeeds with both new
  routes present.
- Release: design-review gate (tokens/a11y/states) AND a dedicated
  confirmation that the server-side class-ownership + principal-only-flag
  re-check tests exist and pass — release-blocking, distinct from the
  general design-review gate.
