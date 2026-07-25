# Requirements — US-E09.6 Student Absences

Lane: **normal**. Upstream: `docs/design-requests/DR-022-staff-conduct-absences.md`
(Screen B), `docs/product/design-spec.jsonc` → `screens.studentAbsences`, ADR
`docs/decisions/0062-staff-discipline-absences-route-actor-fix.md` (route
correction — authoritative over DR-022's original `/admin/absences` alias).

## 1. Requirements Summary

The system SHALL let a homeroom teacher (GVCN) record and edit per-date
excused/unexcused absences for students in their OWN class, and let a
principal view schoolwide/class-filtered absence records and irreversibly
flag a recorded absence for follow-up. This is a **2-state, one-way domain**
(`RECORDED` → `FLAGGED_UNEXCUSED`) — NOT the shared DRAFT/SUBMITTED/APPROVED/
REJECTED approval workflow used by the sibling `staff-discipline`
(US-E09.5) feature. One component (`StudentAbsencesScreen`), role-conditional,
served at two routes per ADR 0062. Actors: `teacher`, `principal` (this
app's 5-role RBAC model, decision `0022`) — the app's separate `admin`
route-guard role has NO involvement in this feature.

## 2. Technical Requirements (JSON)

```json
{
  "requirementId": "TR-096",
  "title": "Student Absences — per-date excused/unexcused flagging (teacher record/edit, principal flag)",
  "status": "Draft",
  "actors": [
    {
      "role": "teacher",
      "capabilities": [
        "Record (create) an absence for a student in their OWN homeroom class only, for a date that is today or in the past",
        "Edit reason and/or excused flag on an existing absence they can see (own class scope) — date/classId/studentMemberId are immutable once created",
        "View a list of absences for their own homeroom class, filterable by date range",
        "Select the student for a new record ONLY from a fixed mock roster scoped to their own class (no live search-as-you-type)"
      ]
    },
    {
      "role": "principal",
      "capabilities": [
        "View schoolwide absence records, filterable by class",
        "Flag a RECORDED absence as FLAGGED_UNEXCUSED (one-way, terminal, confirm-gated) — no capability to record, edit, or unflag"
      ]
    }
  ],
  "functionalRequirements": [
    {
      "id": "FR-001",
      "priority": "Must",
      "description": "The system SHALL allow a teacher to record a new absence for a student in their own homeroom class, capturing classId, studentMemberId, date, excused (boolean), and an optional reason (max 5000 chars). On success the record is created with state=RECORDED.",
      "trigger": "Teacher submits the 'Ghi nhận nghỉ học' record form",
      "preconditions": ["Actor role is teacher", "The class is the teacher's own homeroom class (GVCN)", "The selected student belongs to that class in the mock roster"],
      "postconditions": ["A new absence record exists with state=RECORDED, recordedByMemberId=current teacher", "The list view reflects the new record without a full page reload"],
      "errorConditions": ["ABSENCE_FORBIDDEN (403) — class is not the teacher's own homeroom", "ABSENCE_DUPLICATE_DATE (409) — a record already exists for this classId+studentMemberId+date", "ABSENCE_INVALID_DATE (422) — date is in the future", "ABSENCE_INVALID_INPUT (422) — malformed payload (e.g. reason exceeds 5000 chars)"]
    },
    {
      "id": "FR-002",
      "priority": "Must",
      "description": "The system SHALL reject recording an absence for a future date. The client SHALL constrain the date picker to today-or-earlier (HTML max attribute) and SHALL re-validate on submit, surfacing the identical rejection whether caught client-side or returned by the server as ABSENCE_INVALID_DATE.",
      "trigger": "Teacher selects/submits a date later than today",
      "preconditions": ["Record or edit form is open"],
      "postconditions": ["Form is not submitted; an inline, non-color-only error is shown"],
      "errorConditions": ["ABSENCE_INVALID_DATE (422) if the client guard is bypassed and the server is reached"]
    },
    {
      "id": "FR-003",
      "priority": "Must",
      "description": "The system SHALL reject creating a second absence record for the same classId+studentMemberId+date combination (the natural key). The client SHALL perform a duplicate check against already-loaded records before submit, in addition to the server's authoritative check.",
      "trigger": "Teacher attempts to record an absence for a student/date that already has a record in that class",
      "preconditions": ["An absence record already exists for the same classId+studentMemberId+date"],
      "postconditions": ["No new record is created; existing record is unchanged"],
      "errorConditions": ["ABSENCE_DUPLICATE_DATE (409)"]
    },
    {
      "id": "FR-004",
      "priority": "Must",
      "description": "The system SHALL allow a teacher to edit ONLY the reason and excused fields of an existing absence record in their own class, via PATCH semantics (fields are independently optional on the request). The date, classId, and studentMemberId fields SHALL be immutable and rendered as static (non-editable) text in the edit view.",
      "trigger": "Teacher opens edit on an existing absence row and submits changed reason/excused",
      "preconditions": ["Actor role is teacher", "Record belongs to the teacher's own homeroom class"],
      "postconditions": ["reason and/or excused are updated; date/classId/studentMemberId unchanged; updatedAt refreshed"],
      "errorConditions": ["ABSENCE_FORBIDDEN (403) — not the teacher's own class", "ABSENCE_NOT_FOUND (404) — natural key classId+studentMemberId+date does not resolve", "ABSENCE_INVALID_INPUT (422)", "ABSENCE_INVALID_STATE (400) — backstop"]
    },
    {
      "id": "FR-005",
      "priority": "Must",
      "description": "The system SHALL allow a principal to irreversibly flag a RECORDED absence as FLAGGED_UNEXCUSED, gated behind an explicit confirm dialog stating the action cannot be undone. The flag action SHALL be visible/enabled only on rows with state=RECORDED.",
      "trigger": "Principal clicks 'Gắn cờ' (flag) on a RECORDED row and confirms in the dialog",
      "preconditions": ["Actor role is principal", "Target row state is RECORDED (not already FLAGGED_UNEXCUSED)"],
      "postconditions": ["Record state transitions RECORDED → FLAGGED_UNEXCUSED (terminal)", "flaggedByMemberId is set to the current principal", "The flag action/button is no longer offered for this row"],
      "errorConditions": ["ABSENCE_FORBIDDEN (403) — actor is not principal-tier", "ABSENCE_NOT_FOUND (404)", "ABSENCE_INVALID_STATE (400) — record already FLAGGED_UNEXCUSED (backstop; UI SHOULD prevent reaching this by hiding the action on already-flagged rows)", "ABSENCE_INVALID_ID (400) — backstop"]
    },
    {
      "id": "FR-006",
      "priority": "Must",
      "description": "The system SHALL never offer an 'unflag' affordance anywhere in the UI. FLAGGED_UNEXCUSED is a terminal state with no reverse transition in the domain contract.",
      "trigger": "N/A — a negative/permanent requirement",
      "preconditions": [],
      "postconditions": ["No unflag control exists in any role's view, at any time"],
      "errorConditions": []
    },
    {
      "id": "FR-007",
      "priority": "Must",
      "description": "The system SHALL render two independent, non-conflated signals per absence row: (a) an excused/unexcused badge reflecting the boolean excused field (teacher-editable), and (b) a flagged indicator shown ONLY when state=FLAGGED_UNEXCUSED (principal-set). These SHALL never be merged into a single badge/pill.",
      "trigger": "Any absence row is rendered in either role's list view",
      "preconditions": ["Absence record is loaded"],
      "postconditions": ["Excused/unexcused pill always present; flagged indicator present only when applicable, visually and semantically distinct from the excused pill"],
      "errorConditions": []
    },
    {
      "id": "FR-008",
      "priority": "Must",
      "description": "The system SHALL scope a teacher's list/record/edit view strictly to their own homeroom class (GVCN), enforced server-side on every mutating call, independent of any client-side route/role gate.",
      "trigger": "Teacher loads the absences screen or submits record/edit",
      "preconditions": ["Actor role is teacher"],
      "postconditions": ["Only records for the teacher's own class are visible/mutable"],
      "errorConditions": ["ABSENCE_FORBIDDEN (403) if a request targets a class outside the teacher's homeroom scope"]
    },
    {
      "id": "FR-009",
      "priority": "Must",
      "description": "The system SHALL scope a principal's list view to schoolwide records with an optional class filter (dropdown), and SHALL restrict the principal's only mutating capability to the flag action (FR-005) — the principal SHALL NOT be able to record or edit absences.",
      "trigger": "Principal loads the absences screen, optionally applies a class filter",
      "preconditions": ["Actor role is principal"],
      "postconditions": ["List reflects schoolwide or class-filtered records per the selected filter; no record/edit affordance is rendered for principal"],
      "errorConditions": ["ABSENCE_FORBIDDEN (403) if a record/edit call somehow reaches the server for a principal actor — backstop, since the UI never offers the affordance"]
    },
    {
      "id": "FR-010",
      "priority": "Must",
      "description": "The system SHALL resolve the student selection in the teacher's record form against a fixed mock roster scoped to the teacher's own class (e.g. SA_STUDENT_ROSTER), NOT a live search-as-you-type call against a real endpoint, because no studentName/className exists on the wire response and no roster-search endpoint is available (roster-UUID gap shared with staff-discipline/staff-leave/discipline, cross-repo asks #9/#15/#22).",
      "trigger": "Teacher opens the record form's student select",
      "preconditions": ["Record form is open"],
      "postconditions": ["Dropdown/select lists only the fixed mock roster for the teacher's class"],
      "errorConditions": []
    },
    {
      "id": "FR-011",
      "priority": "Should",
      "description": "The system SHOULD display a summary stats row (total absences / unexcused count / flagged count) scoped to the current role's view (own class for teacher, schoolwide or class-filtered for principal).",
      "trigger": "Absences list successfully loads",
      "preconditions": ["List data has loaded"],
      "postconditions": ["Stats reflect the currently loaded/filtered data set"],
      "errorConditions": []
    },
    {
      "id": "FR-012",
      "priority": "Won't",
      "description": "The system SHALL NOT implement live roster search/autocomplete-by-name for student selection in this story.",
      "trigger": "N/A",
      "preconditions": [],
      "postconditions": [],
      "errorConditions": []
    },
    {
      "id": "FR-013",
      "priority": "Won't",
      "description": "The system SHALL NOT implement any unflag, re-open, or reversal capability for a FLAGGED_UNEXCUSED record in this story.",
      "trigger": "N/A",
      "preconditions": [],
      "postconditions": [],
      "errorConditions": []
    }
  ],
  "nonFunctionalRequirements": [
    {
      "id": "NFR-001",
      "category": "Accessibility",
      "requirement": "The excused/unexcused badge and the flagged indicator SHALL never rely on color alone (icon + text label each) and SHALL be visually distinct from one another so they cannot be misread as one signal.",
      "measurableTarget": "Icon + localized text label present on both badge types; contrast per AA (≥4.5:1 text, ≥3:1 icon); manual color-blind spot check (no color-only meaning)"
    },
    {
      "id": "NFR-002",
      "category": "Accessibility",
      "requirement": "The unexcused (warning) badge text SHALL use the warning-foreground token, never raw warning as a text-on-light-background color.",
      "measurableTarget": "text-edu-warning-foreground / --edu-warning-foreground used, contrast ≥4.5:1 (per .claude/rules/design-system.md warning note)"
    },
    {
      "id": "NFR-003",
      "category": "Accessibility",
      "requirement": "All interactive controls (date input, excused segmented toggle, flag button, confirm dialog) SHALL be fully keyboard-operable with visible focus rings and ≥44×44px touch targets; the flag confirm dialog SHALL trap focus and expose role=dialog + aria-modal.",
      "measurableTarget": "Keyboard-only walkthrough completes record/edit/flag flows; touch targets ≥44px; focus ring per --ring token"
    },
    {
      "id": "NFR-004",
      "category": "Accessibility",
      "requirement": "Toast/dialog entrance animation SHALL be gated behind prefers-reduced-motion: reduce.",
      "measurableTarget": "motion-safe guard present; reduced-motion users see no animated transition"
    },
    {
      "id": "NFR-005",
      "category": "Responsive",
      "requirement": "The screen SHALL render without layout breakage across 320px, 375px, 768px, and 1280px viewports, including the record form, list/table, and flag confirm dialog.",
      "measurableTarget": "No horizontal overflow or clipped controls at any of the 4 breakpoints"
    },
    {
      "id": "NFR-006",
      "category": "i18n",
      "requirement": "All user-facing copy SHALL use the new studentAbsences i18n namespace (or explicitly reused external keys where noted in scope), added to both vi.json (source) and en.json (mirror) in the same edit.",
      "measurableTarget": "Zero hardcoded Vietnamese/English strings in components; tsc catches any typo'd key at compile time"
    },
    {
      "id": "NFR-007",
      "category": "Performance",
      "requirement": "The absences list SHALL show a skeleton loading state while data is fetching, distinct from the empty state.",
      "measurableTarget": "Skeleton (rows variant, count=4) visible ≤320ms perceived delay before content or empty/error state resolves"
    },
    {
      "id": "NFR-008",
      "category": "Security",
      "requirement": "Every mutating action (record, edit, flag) SHALL be re-authorized server-side by role AND, for teacher actions, by homeroom-class ownership — never trusting the client-side route/role gate alone.",
      "measurableTarget": "ABSENCE_FORBIDDEN (403) returned and surfaced in UI for any out-of-scope attempt (wrong class for teacher; any record/edit attempt by principal)"
    },
    {
      "id": "NFR-009",
      "category": "Security",
      "requirement": "The date field SHALL be validated as a bare YYYY-MM-DD calendar date (not a datetime) both client- and server-side, with future dates rejected.",
      "measurableTarget": "ABSENCE_INVALID_DATE (422) returned for any future date; client date picker max attribute = today"
    }
  ],
  "uiStates": ["loading", "empty", "error", "success", "validation (duplicate-date, future-date)"],
  "dataDependencies": [
    {
      "source": "core",
      "entity": "StudentAbsenceResponse (classId, studentMemberId, date, reason?, excused, state, recordedByMemberId, flaggedByMemberId?, createdAt, updatedAt)",
      "sensitivity": "Confidential"
    },
    {
      "source": "mock",
      "entity": "SA_STUDENT_ROSTER (fixed mock roster resolving studentMemberId to a display name for the teacher's own class — no live BE roster-search endpoint exists yet)",
      "sensitivity": "Internal"
    }
  ],
  "scope": {
    "inScope": [
      "Teacher record (create) of an absence for their own homeroom class",
      "Teacher edit of reason/excused on an existing absence in their own class (PATCH semantics; date/class/student immutable)",
      "Teacher list view scoped to own class, filterable by date range",
      "Principal schoolwide/class-filtered list view (read + flag only, no record/edit)",
      "Principal one-way flag action (RECORDED → FLAGGED_UNEXCUSED) with irreversible confirm dialog",
      "Duplicate-date and future-date validation, client-side and server-side",
      "Two independent, non-conflated excused/unexcused + flagged badges",
      "Mock-roster-scoped student select for the teacher's record form",
      "Loading/empty/error/validation UI states",
      "Routes (app)/teacher/absences and (app)/principal/absences per ADR 0062"
    ],
    "outOfScope": [
      "Live roster search/autocomplete-by-name for student selection (blocked on roster-UUID resolution gap, cross-repo asks #9/#15/#22)",
      "Any unflag/reversal/re-open capability for FLAGGED_UNEXCUSED records (none exists in the BE contract)",
      "The (app)/admin/absences route alias from the original DR-022 draft — dropped per ADR 0062",
      "The approval workflow (DRAFT/SUBMITTED/APPROVED/REJECTED) shape used by the sibling staff-discipline (US-E09.5) feature — student-absences is a distinct, simpler 2-state domain",
      "The existing period-based teacher attendance feature ((app)/teacher/attendance) — a separate, unrelated domain from this per-date absence-flagging feature",
      "Bulk/CSV import of absences",
      "Any admin-role (this app's separate admin route-guard role) involvement"
    ],
    "externalDependencies": [
      "edu-api core service, conduct sub-domain: POST /api/v1/conduct/student-absences, GET ?classId=&from=&to=, PATCH /:date?classId=&studentMemberId=, POST /:date/flag?classId=&studentMemberId=",
      "Mock-first per decision 0014 until the roster-UUID display-field gap resolves"
    ]
  },
  "assumptions": [
    "[ASSUMPTION] 'own homeroom class only' for teacher scope is enforced by the BE via the authenticated teacher's GVCN class assignment, resolved server-side — the web layer does not independently determine class ownership.",
    "[ASSUMPTION] The mock roster (SA_STUDENT_ROSTER or equivalent) is a static, per-class fixture maintained in the feature's mock data layer, not fetched from a real endpoint, consistent with the discipline.jsx/staff-leave.jsx precedent.",
    "[ASSUMPTION] 'principal' in this story refers strictly to this app's principal role (BE's ADMIN/MANAGER conduct-domain actor), per ADR 0062 — never this app's separate, narrower admin route-guard role.",
    "[ASSUMPTION] Date range filtering (GET ?from=&to=) defaults to the current academic term or a recent rolling window; exact default range is a UI/UX decision for uiux, not fixed here."
  ],
  "openQuestions": []
}
```

## 3. Prioritized Requirements Summary (MoSCoW)

| ID | Requirement | Priority | Rationale |
| --- | --- | --- | --- |
| FR-001 | Teacher records absence (own class) | Must | Core create flow; without it nothing else functions |
| FR-002 | Future-date rejected | Must | Explicit BE contract constraint (ABSENCE_INVALID_DATE) |
| FR-003 | Duplicate-date rejected | Must | Natural-key integrity (ABSENCE_DUPLICATE_DATE) |
| FR-004 | Teacher edits reason/excused only, immutable identity | Must | PATCH contract + immutable natural key are non-negotiable |
| FR-005 | Principal one-way flag, confirm-gated | Must | Core principal capability; irreversibility must be surfaced clearly |
| FR-006 | No unflag affordance ever | Must | Domain has no reverse transition — a correctness constraint, not a UX choice |
| FR-007 | Two independent, non-conflated badges | Must | Explicitly called out in DR-022/design-spec as a common conflation risk |
| FR-008 | Teacher server-side class-scope enforcement | Must | Security — client gate alone is insufficient |
| FR-009 | Principal read/flag-only scope enforcement | Must | Security — principal must never record/edit |
| FR-010 | Mock-roster student select (no live search) | Must | Hard BE gap (no display fields on wire); scoping constraint from DR-022 |
| FR-011 | Summary stats row | Should | Improves scanability; not required for core correctness |
| FR-012 | No live roster search (explicit non-goal) | Won't | Blocked on unresolved roster-UUID gap across the whole app |
| FR-013 | No unflag/reversal (explicit non-goal) | Won't | No BE support; would contradict domain design |

## 4. Handoff Notes

**For `ba-integration-analyst`:** Map the four `core` conduct-sub-domain
endpoints (`POST /conduct/student-absences`, `GET ?classId=&from=&to=`,
`PATCH /:date?classId=&studentMemberId=`, `POST /:date/flag?...`) with the
full `ABSENCE_*` error taxonomy (FR-001 through FR-005 error conditions
above) — all seven codes are genuinely new, zero reuse from
`discipline.errors.*`/`staffDiscipline.errors.*`. Confirm mock-first
strategy (decision `0014`) for `SA_STUDENT_ROSTER` client-side resolution
since `studentName`/`className` do not exist on the wire (same gap class as
`staff-discipline`/`staff-leave`). Flag explicitly: `ABSENCE_INVALID_DATE`
rejects FUTURE dates — opposite direction from the existing
`discipline.errors.invalid-date` key (which guards leave-request dates ≥
today) — do not let the two get merged in an endpoint/error map.

**For `ba-use-case-modeler`:** Model two primary use cases — (1) Teacher
records/edits an absence (own class scope, immutable identity fields after
create), (2) Principal flags a RECORDED absence (one-way, terminal). Given/
When/Then AC should explicitly cover: future-date rejection, duplicate-date
rejection, the two-independent-badges rendering rule (FR-007), the
mock-roster-only student select, and the absence of any unflag control
anywhere (a negative AC worth stating explicitly per FR-006/FR-013). Include
all four UI states (loading/empty/error/success) plus the two named
validation states (duplicate-date, future-date) for both role variants.
Route AC should reference `(app)/teacher/absences` and
`(app)/principal/absences` per ADR 0062 — do not reintroduce the dropped
`/admin/absences` alias.

**Flag for ADR:** None required — this story introduces no new auth/RBAC
rule beyond what ADR 0062 already settled (route ↔ role mapping), no new
design-system token, and no new data-contract decision beyond the
already-ground-truthed BE contract in DR-022.
