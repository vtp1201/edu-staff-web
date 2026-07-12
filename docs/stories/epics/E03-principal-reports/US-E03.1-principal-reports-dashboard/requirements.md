# Requirements — US-E03.1 Principal Reports Dashboard

## 1. Requirements Summary

Principal-only, school-wide reports screen at `(app)/principal/reports`. A
term selector (Semester I / Semester II / Full year) filters three co-located
sub-views: a stat-card row, a subject-average bar chart, an attendance-trend
column chart, and a periodic-reports table (name, term, created date, status
`ready`/`generating`, download action). The screen is read-mostly for this
story: report *generation* and *download* are represented in the UI (status
badge, "New report" button, "Export Excel" button) but their backing
operations are not confirmed as real BE capabilities yet (see Scope/Open
Questions) — treat generation/export as UI affordances whose wiring may be
mocked or stubbed pending integration analysis. Constraints: WCAG 2.1 AA
(charts must not be color/bar-only), vi/en i18n, responsive down to 320px,
role-gated to `principal`.

## 2. Technical Requirements (JSON)

```json
{
  "requirementId": "TR-031",
  "title": "Principal Reports Dashboard",
  "status": "Draft",
  "actors": [
    {
      "role": "principal",
      "capabilities": [
        "View school-wide stat summary (students, school average, attendance rate, incidents) for a selected term",
        "View subject-average bar chart and attendance-trend chart for a selected term",
        "View a list of periodic reports with status, and download reports that are ready",
        "Trigger a manual refresh of the dashboard data",
        "Trigger generation of a new report (UI affordance; backing action per FR-008)",
        "Trigger an Excel export of the current dashboard view (UI affordance; backing action per FR-009)"
      ]
    },
    {
      "role": "teacher|student|parent",
      "capabilities": ["No access — route is principal-only; attempt redirects to the user's own workspace"]
    }
  ],
  "functionalRequirements": [
    {
      "id": "FR-001",
      "priority": "Must",
      "description": "The system SHALL restrict the route (app)/principal/reports to users holding the principal role for the active tenant; other roles SHALL be redirected to their own workspace.",
      "trigger": "Any authenticated user navigates to /principal/reports",
      "preconditions": ["User is authenticated", "User has a resolved active role for the current tenant"],
      "postconditions": ["principal → screen renders", "non-principal → redirected, no report data fetched or rendered"],
      "errorConditions": ["Unauthenticated → redirect to /login"]
    },
    {
      "id": "FR-002",
      "priority": "Must",
      "description": "The system SHALL provide a term selector (radiogroup) with exactly three mutually exclusive options — Semester I, Semester II, Full year — defaulting to the current/active semester.",
      "trigger": "Screen load",
      "preconditions": ["Principal role resolved"],
      "postconditions": ["One term is always selected; selection is visually and programmatically indicated (role=radio, aria-checked)"],
      "errorConditions": ["No active-term data available → [ASSUMPTION] default to the most recent term in the response, or Semester II if none resolvable"]
    },
    {
      "id": "FR-003",
      "priority": "Must",
      "description": "The system SHALL re-fetch and re-render the stat cards, subject-average chart, attendance-trend chart, and periodic-reports table whenever the term selection changes, so all three sub-views stay in sync with the selected term.",
      "trigger": "Principal selects a different term option",
      "preconditions": ["Screen already loaded once"],
      "postconditions": ["All three sub-views reflect the newly selected term; loading state shown during re-fetch"],
      "errorConditions": ["Fetch fails → error state (FR-006) scoped to whichever sub-view(s) failed, without discarding the newly selected term"]
    },
    {
      "id": "FR-004",
      "priority": "Must",
      "description": "The system SHALL render four stat cards (total students, school grade average, attendance rate, incidents this term) each with a trend delta labeled 'vs last term', for the selected term.",
      "trigger": "Successful data fetch for the selected term",
      "preconditions": ["Term selected"],
      "postconditions": ["Cards show current value + trend"],
      "errorConditions": ["Trend baseline unavailable (e.g. no prior term) → [ASSUMPTION] omit trend indicator rather than show a misleading 0%"]
    },
    {
      "id": "FR-005",
      "priority": "Must",
      "description": "The system SHALL render a subject-average bar chart (one bar per subject, 0–10 scale) and an attendance-trend column chart (weekly %, last 6 weeks) for the selected term, with every data value also exposed as visible text (not chart-only).",
      "trigger": "Successful data fetch for the selected term",
      "preconditions": ["Term selected"],
      "postconditions": ["Both charts render with per-bar/column numeric labels; low attendance weeks (<96%) are flagged via both color AND the numeric label style, not color alone"],
      "errorConditions": ["No subjects/weeks returned → treat as empty state (FR-007), not a rendering error"]
    },
    {
      "id": "FR-006",
      "priority": "Must",
      "description": "The system SHALL render a periodic-reports table (columns: report name, term, created date, status, download action) for the selected term, with the download action disabled unless status is ready.",
      "trigger": "Successful data fetch for the selected term",
      "preconditions": ["Term selected"],
      "postconditions": ["Table lists reports scoped to the selected term; status communicated via icon+label badge, not color alone; download disabled state communicated via the disabled attribute, not opacity alone"],
      "errorConditions": ["No reports for the selected term → empty state (FR-007)"]
    },
    {
      "id": "FR-007",
      "priority": "Must",
      "description": "The system SHALL show a dedicated empty state for the periodic-reports table when the selected term has zero reports, distinct from the loading and error states.",
      "trigger": "Fetch succeeds with an empty report list for the selected term",
      "preconditions": ["Term selected", "Fetch resolved successfully"],
      "postconditions": ["Empty-state illustration/copy shown in place of the table; stat cards and charts render independently (they may still have data even if the report list is empty)"],
      "errorConditions": []
    },
    {
      "id": "FR-008",
      "priority": "Should",
      "description": "The system SHALL provide a 'New report' action that requests generation of a new report for the selected term; the exact request/response contract depends on the BE integration outcome (see Open Questions) — until confirmed, this SHALL be implemented against a mock/stub per decision 0014.",
      "trigger": "Principal clicks 'New report' / 'Tạo báo cáo'",
      "preconditions": ["Principal role", "A term is selected"],
      "postconditions": ["A new row appears in the periodic-reports table with status generating, later transitioning to ready (see NFR-004 on polling)"],
      "errorConditions": ["Generation request fails → inline/toast error; table unaffected"]
    },
    {
      "id": "FR-009",
      "priority": "Should",
      "description": "The system SHALL provide an 'Export Excel' action; scope (client-side generation from already-rendered dashboard data, vs. a BE-provided file for the currently generated report) is unresolved — flagged as an open question for ba-integration-analyst / ba-use-case-modeler to resolve before AC are written.",
      "trigger": "Principal clicks 'Export Excel' / 'Xuất Excel'",
      "preconditions": ["Dashboard data loaded for the selected term"],
      "postconditions": ["[OPEN] A .xlsx file is produced covering the current term's dashboard view"],
      "errorConditions": ["[OPEN] depends on chosen implementation (client-side generation failure vs. BE download failure)"]
    },
    {
      "id": "FR-010",
      "priority": "Must",
      "description": "The system SHALL provide a manual 'Refresh' action that re-fetches all sub-views for the currently selected term.",
      "trigger": "Principal clicks 'Refresh' / 'Làm mới'",
      "preconditions": ["Screen already loaded"],
      "postconditions": ["Loading state shown, then success/error per actual fetch outcome"],
      "errorConditions": ["Fetch fails → real error state per FR-011 (NOT a scripted/demo failure — see NFR-005)"]
    },
    {
      "id": "FR-011",
      "priority": "Must",
      "description": "The system SHALL show an error state with retry affordance whenever the reports data fetch (initial load or refresh) actually fails, driven strictly by real fetch outcome.",
      "trigger": "Any data fetch for this screen rejects or returns a failure",
      "preconditions": [],
      "postconditions": ["Error component shown with title/description and a retry action that re-issues the same fetch"],
      "errorConditions": ["Retry itself fails → error state persists; no infinite/undisclosed retry loop"]
    }
  ],
  "nonFunctionalRequirements": [
    {
      "id": "NFR-001",
      "category": "Accessibility",
      "requirement": "Charts are not color/value-only; every chart datum has a visible numeric label; charts carry role=img with a descriptive aria-label; status badges use icon+text; term radiogroup and download buttons are fully keyboard operable.",
      "measurableTarget": "WCAG 2.1 AA — contrast ≥4.5:1 body / ≥3:1 UI+large text; no information conveyed by color alone; all interactive elements reachable and operable via keyboard with visible focus ring"
    },
    {
      "id": "NFR-002",
      "category": "Responsive",
      "requirement": "Layout (stat-card grid, two-column chart row, table) must not break at narrow viewports.",
      "measurableTarget": "No horizontal overflow / broken layout at 320px width; verified breakpoints 375 / 768 / 1280px; stat grid uses auto-fit wrap, chart columns stack on narrow widths"
    },
    {
      "id": "NFR-003",
      "category": "Performance",
      "requirement": "Perceived loading feedback must appear promptly on initial load and term-change re-fetch.",
      "measurableTarget": "Skeleton (EduSkeleton, cards variant) visible within 320ms of navigation/term-change if data not yet resolved"
    },
    {
      "id": "NFR-004",
      "category": "Performance",
      "requirement": "If report generation (FR-008) is asynchronous server-side work (status transitions generating → ready outside the request/response cycle), the UI must reflect status changes without a full manual page reload.",
      "measurableTarget": "[OPEN — depends on BE contract] If polling is required: poll interval ≤ 10s while any row is generating, capped/backed-off after a bounded number of attempts; if BE instead pushes completion (e.g. noti/SSE) the UI must subscribe rather than poll — mechanism to be confirmed by ba-integration-analyst"
    },
    {
      "id": "NFR-005",
      "category": "Security",
      "requirement": "Production error-handling UX must be driven solely by genuine fetch/operation failures — never a scripted/demo failure.",
      "measurableTarget": "The reference mockup's `failedOnce` behavior (first refresh in the demo always simulates an error, to exercise the EduError+retry pattern for design review) is a MOCK/DEMO artifact of design_src/edu/reports.jsx and MUST NOT ship as production behavior; production error state triggers 1:1 with an actual failed request, with no artificial first-failure"
    },
    {
      "id": "NFR-006",
      "category": "i18n",
      "requirement": "All UI copy (toolbar labels, stat labels, chart titles, table headers, status labels, empty/error copy) sourced from messages/{vi,en}.json under the reports namespace; subject names, week labels, and report titles are mock/seed data rendered from API payloads, not the message catalogue.",
      "measurableTarget": "Zero hardcoded user-facing strings in .tsx outside messages catalogue; vi source + en mirror present for every key used"
    },
    {
      "id": "NFR-007",
      "category": "Security",
      "requirement": "Server-side role check enforced (not just client-side hide), consistent with roles-permissions.md hard-gate rule for role/tenant access.",
      "measurableTarget": "Direct navigation to /principal/reports by a non-principal role is rejected/redirected server-side, not only hidden in the nav"
    }
  ],
  "uiStates": ["loading", "empty", "error", "success"],
  "dataDependencies": [
    { "source": "core", "entity": "school-wide academic-average aggregation (per subject, per term)", "sensitivity": "Internal" },
    { "source": "core", "entity": "school-wide attendance-trend aggregation (weekly %, per term)", "sensitivity": "Internal" },
    { "source": "core", "entity": "school-wide incident/discipline count (per term)", "sensitivity": "Internal" },
    { "source": "core", "entity": "periodic report records (name, term, createdAt, status)", "sensitivity": "Internal" },
    { "source": "mock", "entity": "all of the above — NOT confirmed as an existing core/lms endpoint; DR-019 explicitly asks ba-integration-analyst to confirm or flag mock-first", "sensitivity": "Internal" }
  ],
  "scope": {
    "inScope": [
      "Term-filtered stat cards, subject-average chart, attendance-trend chart, periodic-reports table",
      "Manual refresh action with real (non-scripted) loading/error/success states",
      "Loading / empty / error / success states for the whole screen",
      "principal-only route gating"
    ],
    "outOfScope": [
      "Editing/correcting underlying academic or attendance records from this screen",
      "Report content/detail view (viewing the generated report's actual content) — only list + download affordance",
      "Scheduling/automating recurring report generation",
      "Any teacher/student/parent-facing reporting"
    ],
    "externalDependencies": [
      "core service aggregation endpoints for subject-average, attendance-trend, incident counts, and report records — NOT CONFIRMED to exist yet",
      "Export/generation backing operation — NOT CONFIRMED (see FR-008/FR-009 open questions)"
    ]
  },
  "assumptions": [
    "[ASSUMPTION] Default term selection on load is the current/active semester as resolved by the BE, or Semester II if unresolvable.",
    "[ASSUMPTION] Trend deltas compare to the immediately preceding term; when no preceding term exists, the trend indicator is omitted rather than shown as 0%.",
    "[ASSUMPTION] 'New report' generation is asynchronous (status starts generating, later becomes ready) rather than synchronous, based on the status column existing in the design; exact mechanism (poll vs. push) is an open question for ba-integration-analyst.",
    "[ASSUMPTION] Excel export scope (client-side vs. BE file) will be resolved during integration analysis, not by this requirements pass."
  ],
  "openQuestions": [
    "Which core (or lms) endpoint(s), if any, back subject-average / attendance-trend / incident-count / report-list aggregation for this screen? If none exist, confirm mock-first (decision 0014) and file a BE follow-up.",
    "Is report generation (status generating→ready) actually asynchronous server-side work, and if so, does the BE expose a poll endpoint or a push channel (noti/SSE, decision 0009)?",
    "Is Export Excel a client-side render-to-.xlsx of already-fetched dashboard data, or does it require a BE-generated file per report? This changes both scope and error-handling requirements for FR-009."
  ]
}
```

## 3. Prioritized Requirements Summary (MoSCoW)

| ID | Requirement | Priority | Rationale |
| --- | --- | --- | --- |
| FR-001 | principal-only route gate | Must | Hard RBAC boundary (roles-permissions.md); security baseline |
| FR-002 | Term selector, 3 options | Must | Core filter driving all sub-views; explicit in DR-019/design-spec |
| FR-003 | Term change re-fetches all 3 sub-views in sync | Must | Screen's whole value proposition is a consistent term-scoped view |
| FR-004 | Stat cards w/ trend | Must | Explicit in design-spec `statGrid` |
| FR-005 | Subject-average + attendance charts, text-exposed values | Must | Explicit in design-spec + a11y hard rule (no color/bar-only) |
| FR-006 | Periodic-reports table | Must | Core deliverable of the screen |
| FR-007 | Empty state for report list | Must | One of the 4 required UI states (tdd.md / design-spec `states`) |
| FR-010 | Manual refresh | Must | Present in mockup toolbar; needed to recover from stale/error state |
| FR-011 | Real error state + retry | Must | One of the 4 required UI states; correctness of production behavior (see NFR-005) |
| FR-008 | New report generation | Should | Present in mockup but BE contract unconfirmed; can ship as mock/stub first |
| FR-009 | Export Excel | Should | Present in mockup but scope unresolved (open question); not blocking core view |
| NFR-001–003, 006, 007 | A11y / responsive / perf / i18n / security baselines | Must | Product-wide hard rules (accessibility.md, i18n.md, tdd.md) |
| NFR-004 | Async status reflection mechanism | Should | Depends on BE confirmation; UX matters once generation is real |
| NFR-005 | No scripted demo failure in production | Must | Explicit correction of a mockup artifact that must not leak into shipped behavior |

## 4. Handoff Notes

**For `ba-integration-analyst`:**
- Primary task: confirm whether any `core` (or `lms`) endpoint already provides (a) subject-average aggregation, (b) attendance-trend aggregation, (c) incident/discipline counts, (d) periodic-report records, all scoped by term and school/tenant. DR-019 itself says this was never mapped in the group-B prompt pack.
- If none exist, formally flag **mock-first** (decision `0014`) for this screen and note it in the service map / integration doc so `/fe` knows to build against a typed mock repository now and swap the implementation later without touching `domain/`.
- Resolve the two BE-shaped open questions above (report-generation async mechanism; Export Excel scope) — these directly change FR-008/FR-009 and NFR-004's testability.
- Data sensitivity: all entities here are school-wide aggregates (no individual student PII exposed directly), classified `Internal`; confirm this holds once the real payload shape is known (e.g. if report list includes any student-identifiable rows this changes to `Confidential`).

**For `ba-use-case-modeler`:**
- Build Given/When/Then AC around the term-selector-drives-all-3-subviews behavior (FR-003) as the central flow — this is the crux of the screen.
- Do NOT write an AC that encodes the mockup's `failedOnce` (first-refresh-always-fails) behavior as if it were product behavior — NFR-005 explicitly flags this as a demo-only artifact of `design_src/edu/reports.jsx`. AC should test "error state renders on a genuinely failed fetch" and "retry re-issues the fetch," not "the first refresh always fails."
- FR-008 (New report) and FR-009 (Export Excel) AC should be written as Should-priority, explicitly conditioned on ba-integration-analyst's resolution of the two open questions; if unresolved by the time AC are due, write AC against the mock/stub behavior and flag the gap for `ba-spec-writer`'s traceability matrix.
- Role-variant AC: only one role (`principal`) has access — the meaningful "role variant" here is the negative case (non-principal attempts navigation → redirected), not a permission-scoped UI variant within the screen itself.

## Dependencies

None blocking within this batch (per DR-019).
