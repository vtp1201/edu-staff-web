# Requirements — US-E09.5 Staff Discipline (violations + conduct notes, tabbed)

## 1. Requirements Summary

The system SHALL provide a tabbed "Staff Discipline" screen exposing two BE
sub-resources of the `core` service's `conduct` domain — `staff-violations`
and `staff-conduct-notes` — sharing one `ApprovalTransition` state machine
(DRAFT → SUBMITTED → APPROVED | REJECTED). `principal` is the sole
authoring+approving actor (BE's `ADMIN` authoring capacity and `MANAGER`
approving capacity both collapse onto this app's `principal` role, per ADR
`0062` — **not** this app's separate route-guard `admin` role); `principal`
creates/submits records on Tab 1 and sets/submits notes on Tab 2, and also
approves/rejects both. `teacher` is the staff member under evaluation and
gets a strictly read-only self-view of their own record on both tabs. Key
constraints: routes are `(app)/principal/staff-discipline` and
`(app)/teacher/staff-discipline` (ADR `0062` — the DR's original
`/admin/staff-discipline` is superseded); no `staffName`/`department` exists
on either wire response (roster-UUID gap) so the staff-select on the create
form MUST be a fixed mock-roster picklist, never live search; conduct notes
are permanently locked from re-edit once `APPROVED` (409
`STAFF_CONDUCT_NOTE_LOCKED`); every mutating action needs server-side
role re-verification independent of the client route guard.

## 2. Technical Requirements (JSON)

```json
{
  "requirementId": "TR-091",
  "title": "Staff Discipline — violations + conduct notes (tabbed, ApprovalTransition)",
  "status": "Draft",
  "actors": [
    {
      "role": "principal",
      "capabilities": [
        "author (create DRAFT) a staff violation via mock-roster-scoped create form",
        "submit an own-authored DRAFT violation (DRAFT → SUBMITTED)",
        "approve or reject a SUBMITTED violation (SUBMITTED → APPROVED | REJECTED, reject requires a reason)",
        "set/overwrite a conduct note for a given (termId, staffMemberId) while it is DRAFT or REJECTED",
        "submit an own-authored DRAFT conduct note (DRAFT → SUBMITTED)",
        "approve or reject a SUBMITTED conduct note (reject requires a reason)",
        "view the full role-scoped list on both tabs (all staff, filterable)",
        "see a visible selfApproved annotation when acting as both author and approver (single-admin-tenant fallback, ADR 0073)"
      ]
    },
    {
      "role": "teacher",
      "capabilities": [
        "view own violations record, read-only, no author/submit/approve/reject affordance",
        "view own conduct notes record (scoped by term), read-only, no set/submit/approve/reject affordance"
      ]
    }
  ],
  "functionalRequirements": [
    {
      "id": "FR-001",
      "priority": "Must",
      "description": "The system SHALL render a two-tab screen (Violations, Conduct Notes) at route (app)/principal/staff-discipline for principal and (app)/teacher/staff-discipline for teacher, both served by one role-conditional component.",
      "trigger": "Authenticated user with role principal or teacher navigates to the respective route.",
      "preconditions": ["User is authenticated", "User's active-tenant role is principal or teacher"],
      "postconditions": ["Correct tab shell renders with role-appropriate capabilities visible"],
      "errorConditions": ["Role other than principal/teacher on either route SHALL be redirected to that role's own workspace (existing role-guard behavior), not rendered"]
    },
    {
      "id": "FR-002",
      "priority": "Must",
      "description": "The system SHALL allow principal to create a staff-violation record in DRAFT state via a form (staffMemberId from a fixed mock roster select, category, description [required], severity [MINOR|MODERATE|SEVERE], occurredAt).",
      "trigger": "Principal submits the create-violation form.",
      "preconditions": ["Principal role", "Violations tab active", "Required fields filled"],
      "postconditions": ["New record appears in the list with state DRAFT, authorMemberId = principal's memberId"],
      "errorConditions": ["VIOLATION_INVALID_SEVERITY", "VIOLATION_INVALID_INPUT", "VIOLATION_INVALID_ID", "network/transport failure shows retry"]
    },
    {
      "id": "FR-003",
      "priority": "Must",
      "description": "The system SHALL allow principal to submit their own DRAFT violation record, transitioning it to SUBMITTED.",
      "trigger": "Principal clicks submit on an own-authored DRAFT row.",
      "preconditions": ["Record state = DRAFT", "authorMemberId = current principal"],
      "postconditions": ["Record state = SUBMITTED"],
      "errorConditions": ["VIOLATION_INVALID_TRANSITION", "VIOLATION_NOT_FOUND", "VIOLATION_FORBIDDEN"]
    },
    {
      "id": "FR-004",
      "priority": "Must",
      "description": "The system SHALL allow principal to approve or reject a SUBMITTED violation record; reject requires a non-empty rejectionReason (client-side UX guard: minimum 10 characters before enabling submit; server requires only non-empty).",
      "trigger": "Principal clicks approve, or opens the inline reject panel and confirms with a reason.",
      "preconditions": ["Record state = SUBMITTED"],
      "postconditions": ["Record state = APPROVED (approve) or REJECTED with rejectionReason stored (reject)", "If approverMemberId === authorMemberId, selfApproved = true and is displayed, never hidden"],
      "errorConditions": ["VIOLATION_REJECTION_REASON_REQUIRED (empty reason)", "VIOLATION_INVALID_TRANSITION (already processed)", "VIOLATION_SAME_ACTOR", "VIOLATION_NOT_FOUND", "VIOLATION_FORBIDDEN"]
    },
    {
      "id": "FR-005",
      "priority": "Must",
      "description": "The system SHALL allow principal to set (create or overwrite) a conduct-note record keyed by the natural key (termId, staffMemberId) with fields rating (SATISFACTORY|NEEDS_IMPROVEMENT|UNSATISFACTORY) and note (free text, max 5000 chars, required).",
      "trigger": "Principal submits the set-conduct-note form for a selected term and staff member.",
      "preconditions": ["Principal role", "Conduct Notes tab active", "Target record state is absent, DRAFT, or REJECTED (not APPROVED)"],
      "postconditions": ["Record created/overwritten with state DRAFT"],
      "errorConditions": ["STAFF_CONDUCT_NOTE_LOCKED (target is APPROVED — set is blocked, form does not open)", "STAFF_CONDUCT_NOTE_TERM_NOT_FOUND", "STAFF_CONDUCT_NOTE_INVALID_RATING", "STAFF_CONDUCT_NOTE_FORBIDDEN"]
    },
    {
      "id": "FR-006",
      "priority": "Must",
      "description": "The system SHALL allow principal to submit their own DRAFT conduct note (DRAFT → SUBMITTED) and to approve or reject a SUBMITTED conduct note (reject requires a reason), mirroring FR-003/FR-004 for this sub-resource.",
      "trigger": "Principal clicks submit / approve / opens reject panel and confirms.",
      "preconditions": ["Record state = DRAFT (submit) or SUBMITTED (approve/reject)"],
      "postconditions": ["State transitions accordingly; selfApproved shown when applicable"],
      "errorConditions": ["VIOLATION_INVALID_TRANSITION (shared transition code)", "missing-reject-reason (shared code)", "STAFF_CONDUCT_NOTE_NOT_FOUND", "STAFF_CONDUCT_NOTE_FORBIDDEN"]
    },
    {
      "id": "FR-007",
      "priority": "Must",
      "description": "The system SHALL render the teacher's own-record view on both tabs as strictly read-only: no create/set form, no submit/approve/reject affordance, list/detail scoped to the teacher's own staffMemberId only.",
      "trigger": "Teacher navigates to (app)/teacher/staff-discipline.",
      "preconditions": ["Teacher role"],
      "postconditions": ["Own violation and conduct-note records display with current state/severity/rating badges; zero mutating controls rendered"],
      "errorConditions": ["No own record yet → empty state, no CTA (per FR-011)"]
    },
    {
      "id": "FR-008",
      "priority": "Must",
      "description": "The system SHALL provide a tab switcher (Violations / Conduct Notes) that filters the visible list/form/actions to the selected sub-resource without navigating away from the screen.",
      "trigger": "User clicks a tab.",
      "preconditions": ["Screen rendered"],
      "postconditions": ["Only the selected tab's content is visible; tab state is keyboard-operable"],
      "errorConditions": []
    },
    {
      "id": "FR-009",
      "priority": "Must",
      "description": "The system SHALL source the create-violation form's staff-member field from a fixed, static mock roster list (not a live search-as-you-type endpoint), since neither wire response carries staffName/department for resolution.",
      "trigger": "Principal opens the create-violation or set-conduct-note form.",
      "preconditions": ["Roster-UUID resolution gap (no live roster search endpoint available)"],
      "postconditions": ["Staff member selectable only from the fixed mock list; selected value maps to a staffMemberId UUID"],
      "errorConditions": []
    },
    {
      "id": "FR-010",
      "priority": "Must",
      "description": "The system SHALL display a visible selfApproved annotation (not hidden) on any record where approverMemberId equals authorMemberId, on both tabs, for audit transparency (ADR 0073 single-admin-tenant fallback).",
      "trigger": "Record with selfApproved = true is rendered.",
      "preconditions": ["selfApproved field is true on the fetched record"],
      "postconditions": ["Annotation visibly present alongside the state badge"],
      "errorConditions": []
    },
    {
      "id": "FR-011",
      "priority": "Should",
      "description": "The system SHALL show an empty state with a create-record CTA (\"Ghi nhận vi phạm\" / \"Đặt ghi chú\") for principal, and a plain no-CTA empty message for teacher's self-view, when a list/record has zero entries.",
      "trigger": "List/record query resolves with zero results.",
      "preconditions": ["Successful fetch, empty result set"],
      "postconditions": ["Role-appropriate empty state renders"],
      "errorConditions": []
    },
    {
      "id": "FR-012",
      "priority": "Should",
      "description": "The system SHALL allow filtering the Violations list by state, staff member, and severity, and the Conduct Notes list by term and staff member (principal view only).",
      "trigger": "Principal applies a filter control.",
      "preconditions": ["Principal role, list populated"],
      "postconditions": ["List narrows to matching records"],
      "errorConditions": []
    },
    {
      "id": "FR-013",
      "priority": "Won't",
      "description": "The system SHALL NOT implement live roster search/autocomplete-by-name against a real endpoint in this story.",
      "trigger": "n/a — explicit exclusion",
      "preconditions": [],
      "postconditions": [],
      "errorConditions": []
    }
  ],
  "nonFunctionalRequirements": [
    {
      "id": "NFR-001",
      "category": "Accessibility",
      "requirement": "State/severity/rating badges SHALL never convey meaning by color alone — always paired with an icon and text label.",
      "measurableTarget": "Every SDStateBadge/SDSeverityBadge/SDRatingBadge instance renders icon + text label; verified by /impeccable audit + manual check"
    },
    {
      "id": "NFR-002",
      "category": "Accessibility",
      "requirement": "Warning-toned badges (SUBMITTED state, MINOR severity, NEEDS_IMPROVEMENT rating) SHALL use the warning-foreground text token, never white-on-yellow.",
      "measurableTarget": "Contrast ratio ≥ 4.5:1 for text, ≥ 3:1 for icon, per WCAG 2.1 AA"
    },
    {
      "id": "NFR-003",
      "category": "Accessibility",
      "requirement": "The tab bar and all interactive controls (submit/approve/reject buttons, reject textarea, form fields) SHALL be fully keyboard-operable with a visible focus ring.",
      "measurableTarget": "role=tablist/tab with aria-selected; reject textarea has aria-invalid + aria-describedby when invalid; touch targets ≥ 44×44px"
    },
    {
      "id": "NFR-004",
      "category": "Accessibility",
      "requirement": "Any toast/panel expand animation SHALL be gated behind prefers-reduced-motion: reduce.",
      "measurableTarget": "No motion plays when the OS reduced-motion setting is enabled"
    },
    {
      "id": "NFR-005",
      "category": "Responsive",
      "requirement": "The tabbed screen SHALL not break layout at any of the standard breakpoints.",
      "measurableTarget": "No horizontal overflow/clipping at 320px, 375px, 768px, 1280px widths"
    },
    {
      "id": "NFR-006",
      "category": "Performance",
      "requirement": "The screen SHALL show a skeleton loading state while the list/record is fetching.",
      "measurableTarget": "EduSkeleton (variant='rows', count=4) visible ≤ 320ms after navigation until data resolves or error"
    },
    {
      "id": "NFR-007",
      "category": "i18n",
      "requirement": "All UI copy SHALL be sourced from the staffDiscipline i18n namespace (new keys) plus verbatim reuse of discipline.errors.* and discipline.leave.rejectDialog.* (shared codes) — vi source + en mirror, no hardcoded strings.",
      "measurableTarget": "Zero hardcoded Vietnamese-diacritic strings outside messages/*.json; tsc --noEmit passes with typed t() keys"
    },
    {
      "id": "NFR-008",
      "category": "Security",
      "requirement": "Every mutating action (create, submit, approve, reject, set-note) SHALL be re-authorized server-side by role, independent of the client route guard — principal-only for author/approve/reject/set, teacher gets zero mutation capability regardless of client state.",
      "measurableTarget": "Server-side check rejects any mutating request from a non-principal actor with VIOLATION_FORBIDDEN / STAFF_CONDUCT_NOTE_FORBIDDEN even if client UI were bypassed"
    },
    {
      "id": "NFR-009",
      "category": "Security",
      "requirement": "A conduct note in APPROVED state SHALL be immutable via the set endpoint — no client affordance may attempt to reopen its edit form.",
      "measurableTarget": "Attempting to open the set form on an APPROVED note is blocked client-side with an inline lock message; any bypassed request still receives STAFF_CONDUCT_NOTE_LOCKED (409) server-side"
    }
  ],
  "uiStates": ["loading", "empty", "error", "success", "validation"],
  "dataDependencies": [
    { "source": "core", "entity": "staff-violations (conduct sub-domain)", "sensitivity": "Confidential" },
    { "source": "core", "entity": "staff-conduct-notes (conduct sub-domain)", "sensitivity": "Confidential" },
    { "source": "mock", "entity": "SD_STAFF_ROSTER (fixed staff picklist for display-field resolution — staffName/department not on the wire)", "sensitivity": "Internal" }
  ],
  "scope": {
    "inScope": [
      "Tabbed Staff Discipline screen at (app)/principal/staff-discipline and (app)/teacher/staff-discipline",
      "Full author/submit/approve/reject lifecycle for staff-violations (principal)",
      "Full set/submit/approve/reject lifecycle for staff-conduct-notes (principal), including the APPROVED lock",
      "Read-only self-view for teacher on both tabs",
      "selfApproved audit annotation",
      "Mock-roster-scoped staff select on create/set forms",
      "Filtering (state/staff/severity for violations; term/staff for conduct notes)"
    ],
    "outOfScope": [
      "Live roster search/autocomplete-by-name against a real endpoint",
      "Any change to (app)/admin/layout.tsx's strict admin route guard",
      "Student-facing discipline features (existing discipline.jsx, untouched)",
      "Student Absences (separate story, US-E09.6, different screen entirely)"
    ],
    "externalDependencies": [
      "edu-api core service, conduct sub-domain: staff-violations and staff-conduct-notes endpoints (already shipped, ground-truthed US-E18.14)"
    ]
  },
  "assumptions": [
    "[ASSUMPTION] Since staffMemberId cannot be resolved to a display name/department server-side yet, the mock roster list used for both the create-form select and for rendering existing records' staff identity is presumed sufficient for this story's scope; production roster resolution is a follow-up tracked by the existing roster-UUID gap (asks #9/#15/#22).",
    "[ASSUMPTION] 'principal' is the single BGH-tier actor for this feature per ADR 0062 — there is no scenario in this story where a distinct second approver exists; selfApproved is expected to be the common case, not an edge case."
  ],
  "openQuestions": [
    "Should this story emit an audit-log record for approve/reject/set-note actions, or is that deferred to a separate audit-logging initiative? (Flagging, not deciding — DR-022 did not scope this.)",
    "Is a term selector required for teacher's self-view on Conduct Notes (to browse past terms) or is self-view scoped only to the currently active term? design-spec.jsonc marks termSelector visibleFor principal only — confirm self-view's term scope with ba-use-case-modeler/uiux before AC are written."
  ]
}
```

## 3. Prioritized Requirements Summary (MoSCoW)

| ID | Requirement | Priority | Rationale |
| --- | --- | --- | --- |
| FR-001 | Two-tab role-conditional screen at corrected routes | Must | Core screen shell; route correctness is load-bearing (ADR 0062 — wrong route makes the feature unreachable) |
| FR-002 | Create violation (DRAFT) | Must | Primary authoring path for Tab 1 |
| FR-003 | Submit violation (DRAFT→SUBMITTED) | Must | Required lifecycle step, shared state machine |
| FR-004 | Approve/reject violation | Must | Completes the lifecycle; reject-reason validation is a named BE error code |
| FR-005 | Set conduct note (create/overwrite, respecting lock) | Must | Primary authoring path for Tab 2; lock is a named BE error code (409) |
| FR-006 | Submit/approve/reject conduct note | Must | Mirrors FR-003/004 for the second sub-resource |
| FR-007 | Teacher read-only self-view | Must | Named actor capability in DR-022/design-spec; security-relevant (must render zero mutation controls) |
| FR-008 | Tab switcher | Must | Structural requirement of the "one screen, two tabs" IA decision |
| FR-009 | Mock-roster-scoped staff select | Must | Explicit DR-022 scoping constraint — prevents FE/BE over-scope to a nonexistent live-search endpoint |
| FR-010 | selfApproved visible annotation | Must | Audit-transparency requirement explicitly called out in DR-022/ADR 0073 |
| FR-011 | Empty states (role-differentiated) | Should | UX completeness, not launch-blocking correctness |
| FR-012 | List filtering | Should | Usability enhancement once list volume grows; not required for core lifecycle correctness |
| FR-013 | Explicit exclusion: live roster search | Won't | Explicitly out of scope per DR-022 mock-first note |

## 4. Handoff Notes

**For `ba-integration-analyst`:**
- Map exact endpoints per DR-022 §BE contract: `POST /api/v1/conduct/staff-violations`, `GET ?staffMemberId=`, `POST /:id/submit`, `POST /:id/approve`, `POST /:id/reject`; and `POST /api/v1/conduct/staff-conduct-notes`, `GET ?staffMemberId=&termId=`, `POST /:staffMemberId/submit?termId=`, `.../approve?termId=`, `.../reject?termId=`. Service = `core` (conduct sub-domain).
- Error taxonomy is fully enumerated in DR-022 and `design-spec.jsonc` `screens.staffDiscipline.beContract` — reuse `discipline.errors.*` verbatim for the 8 shared `VIOLATION_*` codes (do not create parallel i18n copy); 5 genuinely new codes for conduct notes (`STAFF_CONDUCT_NOTE_FORBIDDEN/NOT_FOUND/TERM_NOT_FOUND/LOCKED/INVALID_RATING`).
- Confirm mock-first repository pattern mirrors `src/features/discipline/infrastructure/repositories/discipline.repository.ts` (existing precedent for the same `VIOLATION_*` code family) and `staff-leave`'s mock-roster resolution approach.
- No pagination/cursor details were specified in DR-022 for either list endpoint — flag to confirm whether `meta.pagination` applies before designing the repository contract.

**For `ba-use-case-modeler`:**
- Build Given/When/Then AC for all four UI states (loading/empty/error/success) plus validation, per FR above, with explicit role variants (principal full-capability path vs teacher read-only path) for both tabs.
- Resolve openQuestion #2 (teacher self-view term scope on Conduct Notes) before finalizing AC — check with `uiux-lead`/re-read `design_src/edu/staff-discipline.jsx` self-view logic (~line 280+) if ambiguous.
- selfApproved AC should cover both the "approver acts on own-authored record" trigger and the always-visible-annotation postcondition (never conditionally hidden).
- Reject-panel AC should distinguish the client-side 10-char UX guard (design-spec.jsonc) from the server's actual non-empty requirement (`VIOLATION_REJECTION_REASON_REQUIRED` / conduct-note equivalent) — both need coverage, they are different validation layers.

**Open items flagged, not decided:** audit-log emission (openQuestions[0]) — routing this to `ba-lead` for confirmation of scope before `ba-spec-writer` finalizes, per instruction not to decide it here.
