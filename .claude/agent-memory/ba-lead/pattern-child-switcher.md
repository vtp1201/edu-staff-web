---
name: pattern-child-switcher
description: BA spec pattern for multi-child switcher features (parent role) — ARIA tablist, getChildList repo method, child.color tint, OQ-001 open question
metadata:
  type: project
---

US-E13.7 (2026-06-21) established the pattern for parent multi-child switcher on a grade/report screen.

## Key decisions

- `ChildSwitcher` component placed feature-local at `features/grades/presentation/child-switcher/`; promote to `components/shared/` deferred until 2nd screen needs it (e.g. US-E09.4 discipline parent view, US-E15.1 timetable parent view — flag when those stories are BA'd).
- `getChildList(): Promise<ChildSummary[]>` added to `IGradeBookRepository` (Option A: co-located with grade-book repo since both are `core` service); stub in real repo, mock in `MockGradeBookRepository`.
- New endpoint constant: `GRADES_EP.childList = '/core/api/v1/parent/children'` — mock-first (core not shipped).
- `childrenList` + `activeChildId` added additively to `GradeBookScreenVM` (parent branch only); all other roles leave them `undefined`.
- `MockGradeBookRepository.getChildGrades` must be made childId-aware: dispatch on childId to return VIEWER_DATA_BY_CHILD[0] vs [1].

## ARIA pattern (WCAG 2.1 AA tablist)

- Wrapper: `role="tablist"`
- Each button: `role="tab"` + `aria-selected="true/false"` + roving tabindex (active=0, others=-1)
- Table container: `role="tabpanel"` + associated via `aria-controls`/`aria-labelledby`
- ArrowLeft/Right: focus-only (no fetch); Enter/Space: activate + fetch
- Space key: `preventDefault()` to block page scroll on `role="tab"`

## OQ-001 (open — child list source)

child list may come from: (a) GET /core/api/v1/parent/children REST endpoint, (b) GET /iam/api/v1/users/me field, or (c) JWT claim. Until BE confirms, use mock-first path (a). If (c) confirmed, async loading states for child list can be removed — flag to fe-lead.

## child.color+'14' implementation note

CSS variable values cannot have a hex suffix appended at runtime. fe-lead must resolve as implementation detail: `color-mix()`, CSS custom property override, or opacity utility. NOT a spec decision.

## Multi-child switcher in other stories

US-E09.4 (parent discipline, planned) and US-E15.1 (timetable parent view, planned) also have "multi-child switcher" in their description. When BA'd, re-use this pattern and consider promoting `ChildSwitcher` to `components/shared/` at that point.

**Why:** reduces duplicate implementation; signals when component should be promoted per `.claude/rules/component-organization.md`.
**How to apply:** when next parent multi-child story enters BA pipeline, reference this pattern; add "promote ChildSwitcher" as in-scope if it is the 2nd screen.

## Spec location

`docs/stories/epics/E13-teacher-workspace/US-E13.7-gradebook-parent-child-switcher/spec.md`
(843 lines, 18 sections, 9 TR, 8 NFR, 2 INT, 7 UC, 42 AC, 14 edge cases, 4 required Storybook stories)
