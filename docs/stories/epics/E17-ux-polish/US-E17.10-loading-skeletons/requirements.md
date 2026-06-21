# US-E17.10 — Loading Skeletons Coverage

**Story ID:** US-E17.10
**Epic:** E17 — UX Polish: Confirmations, Navigation, Loading & Feedback
**Design Request:** DR-011 (UX-05)
**Priority:** P2

---

## 1. Requirements Summary

The system must add loading skeleton states to discipline dashboard, teacher dashboard, and student dashboard (StatCardSkeleton shape) and to discipline-conduct table body (TableRowSkeleton shape). Grade-entry, exam-bank, grade-approval, and grade-book already have feature-local skeletons and are not in scope. Skeletons are feature-local files (not promoted to shared) unless two features share an identical shape. The shadcn Skeleton primitive is the base; shimmer animation must be gated by `motion-safe:`. Roles seeing data on the affected screens are actors.

---

## 2. Technical Requirements

```json
{
  "requirementId": "TR-E17.10",
  "title": "Loading Skeletons — StatCardSkeleton and TableRowSkeleton for Missing Screens",
  "status": "Draft",
  "actors": [
    {
      "role": "teacher",
      "capabilities": [
        "See skeleton loading state on teacher dashboard stat-card grid while data is fetching",
        "See skeleton loading state on discipline-conduct table while violations load"
      ]
    },
    {
      "role": "principal",
      "capabilities": [
        "See skeleton loading state on principal/teacher dashboard stat-card grid",
        "See skeleton loading state on discipline screen stat-card grid"
      ]
    },
    {
      "role": "student",
      "capabilities": [
        "See skeleton loading state on student dashboard stat-card grid"
      ]
    },
    {
      "role": "admin",
      "capabilities": [
        "See skeleton loading state on discipline screen while violations load"
      ]
    }
  ],
  "functionalRequirements": [
    {
      "id": "FR-001",
      "priority": "Must",
      "description": "The system SHALL render a StatCardSkeleton in place of each StatCard on the discipline dashboard stat-card grid while data is in loading state. The skeleton shape SHALL match: icon box 52×52px (bg-muted, radius 12px), value block h-7 w-16 (bg-muted), label block h-3 w-20 (bg-muted), card padding 20px, card radius 12px.",
      "trigger": "Discipline dashboard data fetch is in-flight (async loading state)",
      "preconditions": ["User navigates to discipline dashboard", "Data fetch has been initiated but not resolved"],
      "postconditions": ["Skeleton layout occupies the same space as the real StatCard grid; no layout shift when data arrives"],
      "errorConditions": ["If loading state persists beyond a timeout, an error state (not skeleton) should be shown — this is a parent responsibility; skeleton does not self-time-out"]
    },
    {
      "id": "FR-002",
      "priority": "Must",
      "description": "The system SHALL render a StatCardSkeleton in place of each StatCard on the teacher dashboard stat-card grid while data is in loading state, using the same shape spec as FR-001.",
      "trigger": "Teacher dashboard data fetch is in-flight",
      "preconditions": ["User is on teacher dashboard", "Data fetch has not resolved"],
      "postconditions": ["Skeleton visible; real stat cards replace it when data arrives without layout shift"],
      "errorConditions": []
    },
    {
      "id": "FR-003",
      "priority": "Must",
      "description": "The system SHALL render a StatCardSkeleton in place of each StatCard on the student dashboard stat-card grid while data is in loading state, using the same shape spec as FR-001.",
      "trigger": "Student dashboard data fetch is in-flight",
      "preconditions": ["User is on student dashboard"],
      "postconditions": ["Skeleton replaces stat cards during loading"],
      "errorConditions": []
    },
    {
      "id": "FR-004",
      "priority": "Must",
      "description": "The system SHALL render TableRowSkeleton rows in place of the discipline-conduct table body while violation data is in loading state. Each skeleton row SHALL have: min-h-[44px], border-b border-border, and Skeleton cell blocks of varying widths (e.g. w-24, w-16, w-32) with bg-muted per cell.",
      "trigger": "Discipline-conduct table data fetch is in-flight",
      "preconditions": ["User is on discipline screen or student conduct screen viewing the violations table"],
      "postconditions": ["Skeleton rows fill the table body; real rows replace them without layout shift on data arrival"],
      "errorConditions": []
    },
    {
      "id": "FR-005",
      "priority": "Must",
      "description": "The system SHALL wrap all skeleton loading containers with role='status' and aria-busy='true'. A visually hidden sr-only span SHALL contain the text resolved from t('Common.skeleton.loading') to inform screen reader users that content is loading.",
      "trigger": "Skeleton container renders",
      "preconditions": [],
      "postconditions": ["Screen reader announces loading state", "When real content replaces skeleton, aria-busy is removed by the parent unmounting the skeleton"],
      "errorConditions": []
    },
    {
      "id": "FR-006",
      "priority": "Must",
      "description": "The system SHALL gate the skeleton pulse animation behind motion-safe: Tailwind variant. The shimmer animation (animate-pulse) SHALL only run when the user has not requested reduced motion (prefers-reduced-motion: no-preference).",
      "trigger": "Skeleton renders on any screen",
      "preconditions": [],
      "postconditions": ["On a system with prefers-reduced-motion: reduce, skeleton elements are visible (bg-muted) but do not animate"],
      "errorConditions": []
    },
    {
      "id": "FR-007",
      "priority": "Should",
      "description": "The system SHALL keep skeleton files feature-local (inside the feature's presentation folder) unless two features share an identical shape, in which case promote to components/shared/. As of this story, StatCardSkeleton shape is shared by discipline, teacher, and student dashboards — if shape is truly identical across all three, the FE team SHALL create a shared StatCardSkeleton; if shape differs per screen, three feature-local files are acceptable.",
      "trigger": "FE implementation decision",
      "preconditions": ["FE team compares skeleton shapes across three dashboard screens"],
      "postconditions": ["Either a shared StatCardSkeleton in components/shared/ or three feature-local files — no duplication of different-shaped components under the same name"],
      "errorConditions": []
    },
    {
      "id": "FR-008",
      "priority": "Must",
      "description": "The system SHALL ensure skeletons are visible within 320ms of the async data fetch trigger so that users perceive immediate feedback rather than a blank area.",
      "trigger": "Async data fetch begins",
      "preconditions": ["Loading state is set synchronously before the async call resolves"],
      "postconditions": ["Skeleton is rendered within the same render cycle as the loading state being set true"],
      "errorConditions": []
    }
  ],
  "nonFunctionalRequirements": [
    {
      "id": "NFR-001",
      "category": "Accessibility",
      "requirement": "Skeleton wrapper must have role='status' and aria-busy='true'. An sr-only text element must announce loading via t('Common.skeleton.loading'). When content loads, the skeleton is unmounted (not hidden) so role='status' is removed cleanly.",
      "measurableTarget": "WCAG 4.1.3 — status messages announced without receiving focus; verified by fe-accessibility-auditor."
    },
    {
      "id": "NFR-002",
      "category": "Performance",
      "requirement": "Skeleton must be visible within 320ms of the async trigger. The loading state must be set synchronously before the fetch Promise is created (not in a .then() callback).",
      "measurableTarget": "Skeleton visible ≤320ms from navigation/fetch trigger; zero layout shift (CLS = 0) when real content replaces skeleton."
    },
    {
      "id": "NFR-003",
      "category": "Responsive",
      "requirement": "Skeleton shapes must match the real content layout at all breakpoints (375/768/1280px). StatCardSkeleton must match the StatCard responsive grid (same column count and gap at each breakpoint).",
      "measurableTarget": "No layout shift at 375/768/1280px when skeleton transitions to real content; verified in Storybook viewport stories."
    },
    {
      "id": "NFR-004",
      "category": "Accessibility",
      "requirement": "Skeleton pulse animation (animate-pulse) must be gated by motion-safe: Tailwind variant so that users with prefers-reduced-motion: reduce see static bg-muted elements instead of animated ones.",
      "measurableTarget": "Zero animation frames fired in browser with prefers-reduced-motion: reduce; verified by fe-accessibility-auditor."
    },
    {
      "id": "NFR-005",
      "category": "i18n",
      "requirement": "The sr-only loading text must use t('Common.skeleton.loading') — no hardcoded string.",
      "measurableTarget": "bunx tsc --noEmit passes with no missing-key errors; key exists in both vi.json and en.json."
    }
  ],
  "uiStates": ["loading (skeleton visible)", "success (real content)", "error (parent shows error state — skeleton not used for errors)"],
  "dataDependencies": [
    {
      "source": "mock",
      "entity": "Skeleton is purely presentational — it renders when the parent is in loading state, regardless of data source. Actual data comes from existing feature data sources (core service or mock per mock-first pattern).",
      "sensitivity": "Public"
    }
  ],
  "scope": {
    "inScope": [
      "StatCardSkeleton shape for: discipline-screen.tsx stat-card grid, teacher dashboard stat-card grid, student dashboard stat-card grid",
      "TableRowSkeleton shape for: discipline-conduct table body",
      "motion-safe gate on animate-pulse for all new skeleton instances",
      "role='status' + aria-busy='true' + sr-only text on all skeleton wrappers",
      "Storybook stories for each new skeleton (loading state)"
    ],
    "outOfScope": [
      "Grade-entry, grade-approval, grade-book, exam-bank — these already have feature-local skeletons and are not changed",
      "Lesson-bank skeleton — mentioned in DR-011 design-spec but deprioritized; no confirmed screen exists yet",
      "Error state handling — parent component responsibility",
      "Skeleton for non-async/static content"
    ],
    "externalDependencies": [
      "src/components/ui/skeleton/ (shadcn Skeleton primitive — already exists)",
      "Common.skeleton.loading i18n key (confirmed present in vi.json/en.json)",
      "Common.skeleton.loadingAriaLabel i18n key (confirmed present)"
    ]
  },
  "assumptions": [
    "[ASSUMPTION] The teacher dashboard, student dashboard, and discipline dashboard all have a loading state exposed by their data-fetching layer (TanStack Query isLoading flag or equivalent). The FE team can conditionally render the skeleton from this flag.",
    "[ASSUMPTION] The StatCard shape is identical (or nearly identical) across discipline, teacher, and student dashboards such that a single shared StatCardSkeleton is viable. If shapes differ materially, three feature-local files are acceptable per FR-007.",
    "[ASSUMPTION] The shadcn Skeleton primitive at src/components/ui/skeleton/ already uses bg-muted. If it uses a raw color, the FE team must correct it before use."
  ],
  "openQuestions": [
    "Does the student-dashboard stat-card grid use the same 52×52px icon box layout as discipline/teacher dashboards? If different, three feature-local files are required instead of a shared component."
  ]
}
```

---

## 3. Prioritized Requirements Summary (MoSCoW)

| ID | Requirement | Priority | Rationale |
|----|-------------|----------|-----------|
| FR-001 | StatCardSkeleton on discipline dashboard | Must | Identified gap in DR-011 |
| FR-002 | StatCardSkeleton on teacher dashboard | Must | Identified gap in DR-011 |
| FR-003 | StatCardSkeleton on student dashboard | Must | Identified gap in DR-011 |
| FR-004 | TableRowSkeleton on discipline-conduct table | Must | Identified gap in DR-011 |
| FR-005 | role='status' + aria-busy + sr-only loading text | Must | WCAG 4.1.3 |
| FR-006 | motion-safe gate on animate-pulse | Must | WCAG 2.3.3 (motion) |
| FR-008 | Skeleton visible within 320ms | Must | Product NFR baseline |
| FR-007 | Shared vs feature-local placement decision | Should | Component-organization rule; FE decides at implementation |
| NFR-001 | A11y status announcement | Must | WCAG 4.1.3 |
| NFR-002 | ≤320ms + zero CLS | Must | Performance baseline |
| NFR-003 | Responsive shape match at all breakpoints | Must | No layout shift |
| NFR-004 | motion-safe animation gate | Must | Reduced-motion a11y |
| NFR-005 | No hardcoded loading strings | Must | i18n rule |

---

## 4. Handoff Notes

**For ba-integration-analyst:** No new BE integration. Skeletons render based on loading state from existing TanStack Query hooks. Confirm with FE that all three dashboard screens expose an `isLoading` boolean the skeleton can bind to.

**For ba-use-case-modeler:** AC needed per screen:
1. Given user navigates to discipline dashboard and data is fetching, Then StatCardSkeleton rows are visible instead of real cards, And role='status' aria-busy='true' is present on the wrapper.
2. Given user has prefers-reduced-motion: reduce enabled, Then skeleton elements are visible (bg-muted) but do not animate.
3. Given data resolves, Then skeletons are replaced by real content with no visible layout shift.

**Component placement note:** If StatCardSkeleton shape is identical across all three dashboards, canonical home is `src/components/shared/stat-card-skeleton/`. If shapes differ, feature-local files stay in each feature's `presentation/` folder. TableRowSkeleton stays feature-local to `discipline/presentation/` unless a second feature needs the identical shape.

**i18n key mapping:**

| Key path | Status | Usage |
|----------|--------|-------|
| `Common.skeleton.loading` | Confirmed present | FR-005 sr-only loading text |
| `Common.skeleton.loadingAriaLabel` | Confirmed present | Optional: aria-label on wrapper element |

No net-new i18n keys required for this story.
