# US-E17.11 — Touch Target ≥44px on Mobile

**Story ID:** US-E17.11
**Epic:** E17 — UX Polish: Confirmations, Navigation, Loading & Feedback
**Design Request:** DR-011 (UX-08)
**Priority:** P2

---

## 1. Requirements Summary

The system must enforce a minimum 44×44px touch target on interactive rows in the grade-book table and discipline violation log rows, addressing a WCAG 2.5.5 AA gap. Grade table data cells receive `min-h-[44px]` plus a sticky first column for horizontal-scroll usability on mobile. Discipline violation rows receive `py-2.5 min-h-[44px]`. This story is complementary to US-E17.2 (grade table mobile scrollability) — they touch the same file but apply different, non-conflicting changes. No new design tokens are needed; Tailwind utility classes only. Actors are all roles that view grade tables or violation logs on mobile viewports.

**Cross-reference — US-E17.2:** US-E17.2 adds `-webkit-overflow-scrolling: touch`, `min-w-[640px]` to the grade table, and a sticky first column with `border-r`. US-E17.11 adds `min-h-[44px]` to grade table row cells. These changes are non-overlapping but target the same file (`grade-book-table.tsx`). The FE team must verify both stories are not claimed simultaneously to avoid merge conflicts.

---

## 2. Technical Requirements

```json
{
  "requirementId": "TR-E17.11",
  "title": "Touch Target ≥44px — Grade Table Rows and Discipline Violation Rows",
  "status": "Draft",
  "actors": [
    {
      "role": "teacher",
      "capabilities": [
        "Interact with grade table rows at 44px minimum height on mobile",
        "Interact with discipline violation rows at 44px minimum height on mobile"
      ]
    },
    {
      "role": "principal",
      "capabilities": [
        "Interact with grade table rows at 44px minimum height on mobile",
        "Interact with discipline violation rows at 44px minimum height on mobile"
      ]
    },
    {
      "role": "student",
      "capabilities": [
        "Interact with grade table rows in student view at 44px minimum height on mobile"
      ]
    },
    {
      "role": "parent",
      "capabilities": [
        "Interact with grade table rows in parent view at 44px minimum height on mobile"
      ]
    }
  ],
  "functionalRequirements": [
    {
      "id": "FR-001",
      "priority": "Must",
      "description": "The system SHALL add min-h-[44px] (Tailwind min-h-11) to each data row cell in the grade-book table component (src/components/shared/grade-book-table/grade-book-table.tsx) so that row height is at least 44px on all viewports. This applies to every interactive <td> or row container in the table.",
      "trigger": "Grade book table renders on any viewport",
      "preconditions": ["Grade book table is rendered"],
      "postconditions": ["Every grade table row is at least 44px tall; row height expands with content if content is taller than 44px"],
      "errorConditions": ["If adding min-h-[44px] breaks the existing desktop layout, the constraint should be scoped to mobile breakpoints using md:min-h-auto or similar — FE to verify"]
    },
    {
      "id": "FR-002",
      "priority": "Must",
      "description": "The system SHALL add a sticky first column to the grade-book table for mobile horizontal scrolling. The first column cell SHALL have position: sticky, left: 0, bg-card, z-10 so it remains visible when the user scrolls horizontally on mobile.",
      "trigger": "Grade table renders on mobile viewport (375px) with horizontal scroll",
      "preconditions": ["Grade table has horizontal overflow (min-w-[640px] from US-E17.2 or equivalent)"],
      "postconditions": ["First column (student name or row label) remains fixed during horizontal scroll; remaining columns scroll underneath"],
      "errorConditions": ["If US-E17.2 has not been merged yet, the sticky first column has no scrollable context — FE must note this dependency and verify US-E17.2 is merged first or coordinate implementation"]
    },
    {
      "id": "FR-003",
      "priority": "Must",
      "description": "The system SHALL add py-2.5 min-h-[44px] to violation log row containers in the discipline screen (src/features/discipline/presentation/discipline-screen/discipline-screen.tsx) so that each violation row is at least 44px tall and has adequate vertical padding.",
      "trigger": "Discipline screen violation log renders",
      "preconditions": ["Discipline screen is rendered with at least one violation"],
      "postconditions": ["Each violation row is at least 44px tall; py-2.5 provides visual separation between rows"],
      "errorConditions": []
    },
    {
      "id": "FR-004",
      "priority": "Must",
      "description": "The system SHALL apply the same min-h-[44px] min-w-[44px] touch target to icon-only action buttons in grade table rows and violation rows (e.g. edit, delete action triggers within rows). These are individual interactive elements and must meet the 44×44px minimum independently.",
      "trigger": "Icon-only button renders within a table row",
      "preconditions": ["Row contains icon-only action buttons"],
      "postconditions": ["Icon-only buttons have min-h-[44px] min-w-[44px]; they are individually tappable without triggering the row"],
      "errorConditions": []
    },
    {
      "id": "FR-005",
      "priority": "Should",
      "description": "The system SHOULD scope min-h-[44px] row height enforcement to mobile viewports only if adding it unconditionally causes density issues on desktop (e.g. grade book with 30+ rows appearing too spaced out). FE team may apply md:min-h-auto to restore desktop density if needed, but mobile constraint must not be removed.",
      "trigger": "FE implementation decision",
      "preconditions": ["FE team evaluates desktop layout impact"],
      "postconditions": ["Mobile rows are ≥44px; desktop rows may be their natural height"],
      "errorConditions": []
    }
  ],
  "nonFunctionalRequirements": [
    {
      "id": "NFR-001",
      "category": "Accessibility",
      "requirement": "All interactive row elements and icon-only buttons in grade table and violation log must meet WCAG 2.5.5 AA minimum target size of 44×44px on mobile (375px).",
      "measurableTarget": "WCAG 2.5.5 AA: every interactive element in grade table rows and violation rows measures ≥44px height on a 375px viewport; verified by fe-accessibility-auditor."
    },
    {
      "id": "NFR-002",
      "category": "Responsive",
      "requirement": "The sticky first column in the grade table must not create z-index conflicts with the sticky table header or with any overlay/modal on top of the table. The first column z-index (z-10) must be lower than modal/dialog z-index.",
      "measurableTarget": "No visual z-index collision at 375px; sticky column header intersection verified at 375 and 768px."
    },
    {
      "id": "NFR-003",
      "category": "Responsive",
      "requirement": "The min-h-[44px] addition must not cause layout shift or change the desktop grid density unacceptably. If grade table has >20 rows at 44px min-height, the desktop experience should remain usable.",
      "measurableTarget": "Grade table with 30 rows at 44px min-height = 1320px total body height; FE to confirm this is acceptable in desktop scroll context or apply breakpoint scoping."
    },
    {
      "id": "NFR-004",
      "category": "Accessible",
      "requirement": "No new tokens required. All changes use Tailwind utility classes (min-h-11, py-2.5, sticky, z-10, bg-card). No raw colors or magic values.",
      "measurableTarget": "Zero new entries needed in src/app/tokens.css; bunx tsc --noEmit passes; biome lint passes."
    }
  ],
  "uiStates": ["default (rows rendered at min 44px)", "desktop-compact (optional: md:min-h-auto if FR-005 applied)", "sticky-column-scroll (horizontal scroll on mobile with sticky first col)"],
  "dataDependencies": [
    {
      "source": "mock",
      "entity": "No BE dependency — layout-only changes to existing components. Data comes from existing grade and discipline data sources.",
      "sensitivity": "Public"
    }
  ],
  "scope": {
    "inScope": [
      "src/components/shared/grade-book-table/grade-book-table.tsx — add min-h-[44px] to data row cells + sticky first column (position:sticky, left:0, bg-card, z-10)",
      "src/features/discipline/presentation/discipline-screen/discipline-screen.tsx — add py-2.5 min-h-[44px] to violation row containers",
      "Icon-only action buttons within affected rows — add min-h-[44px] min-w-[44px]",
      "student-conduct-screen.tsx if it shares the same violation row markup"
    ],
    "outOfScope": [
      "US-E17.2 changes (horizontal scroll setup, min-w-[640px], border-r on sticky col) — those are a separate story; this story only adds min-h-[44px] and z-10/bg-card to the already-sticky column",
      "Grade table header row touch target — header cells are not interactive tappable elements",
      "Pagination controls touch target — separate audit concern",
      "Any screen not listed above"
    ],
    "externalDependencies": [
      "US-E17.2 (grade table mobile scroll) — FR-002 sticky first column requires US-E17.2's horizontal-scroll wrapper to be present. FE must coordinate branch ordering or implement both on the same branch if US-E17.2 is not yet merged."
    ]
  },
  "assumptions": [
    "[ASSUMPTION] The grade-book-table component is the shared canonical implementation for all grade table views (teacher grade entry, parent grade view, student grade view). A single change to grade-book-table.tsx propagates to all consumers.",
    "[ASSUMPTION] The student-conduct-screen.tsx uses the same violation row markup as discipline-screen.tsx; if so, FR-003 applies to both files. FE to verify at implementation time.",
    "[ASSUMPTION] US-E17.2 is either already merged or will be on the same branch as US-E17.11 to avoid the sticky column having no scroll context."
  ],
  "openQuestions": [
    "Should min-h-[44px] be applied unconditionally to all viewports or only below md breakpoint? DR-011 spec says 'scope: 375px mobile breakpoint and up' — apply unconditionally is simpler and acceptable since 44px is not visually jarring on desktop either."
  ]
}
```

---

## 3. Prioritized Requirements Summary (MoSCoW)

| ID | Requirement | Priority | Rationale |
|----|-------------|----------|-----------|
| FR-001 | min-h-[44px] on grade table data rows | Must | WCAG 2.5.5 AA — identified mobile gap |
| FR-002 | Sticky first column in grade table | Must | Design-spec.jsonc spec; horizontal scroll usability |
| FR-003 | py-2.5 min-h-[44px] on violation rows | Must | WCAG 2.5.5 AA — identified mobile gap |
| FR-004 | min-h-[44px] min-w-[44px] on icon-only row buttons | Must | WCAG 2.5.5 — individual interactive elements |
| FR-005 | Breakpoint scoping if desktop density impacted | Should | UX quality on desktop; mobile must not be compromised |
| NFR-001 | 44×44px verified on 375px viewport | Must | WCAG 2.5.5 AA |
| NFR-002 | Sticky column z-index no conflicts | Must | Visual correctness |
| NFR-003 | No unacceptable desktop density degradation | Should | UX quality |
| NFR-004 | No new tokens — Tailwind utilities only | Must | Design system rule |

---

## 4. Handoff Notes

**For ba-integration-analyst:** No BE integration required. Layout-only changes.

**For ba-use-case-modeler:** AC needed:
1. Given user is on grade book page on a 375px viewport, When the grade table renders, Then all data rows are at least 44px tall and the first column is sticky during horizontal scroll.
2. Given user is on discipline screen on a 375px viewport, When violation rows render, Then each row is at least 44px tall.
3. Given user has a 375px viewport and scrolls the grade table horizontally, Then the first column (student name) remains visible while other columns scroll underneath.

**Dependency note for FE team:** This story and US-E17.2 both modify `grade-book-table.tsx`. They must NOT be claimed simultaneously on different branches. The FE team should either sequence them (US-E17.2 first, then US-E17.11) or implement both on the same branch. This constraint must be checked during the claim step (`git fetch --prune` + dependency check per parallel-workflow.md).

**i18n key mapping:** No i18n keys required for this story. All changes are layout/CSS utilities only.
