---
name: project-e15-schedule-views
description: E15 Schedule Views epic — US-E15.1 (student/parent timetable) + US-E15.2 (teacher schedule) both implemented; pattern for scaffolding-ahead-of-time seams
metadata:
  type: project
---

E15 epic (`docs/stories/epics/E15-schedule-views/`): US-E15.1 "Timetable Read-only
View (Student and Parent)" and US-E15.2 "Teacher Schedule View (Read-only)" both
implemented and merged to main (2026-07-10/11).

**Scaffolding-ahead-of-time paid off**: US-E15.1's plan deliberately added a
`cellVariant: "class" | "teacher"` prop to `TimetableGrid` and a `className?`
field end-to-end (entity/DTO/mapper) even though only the "class" variant was
wired at the time — explicitly to seed US-E15.2. When US-E15.2 came up,
`fe-planner` found the seam already built and the story became a genuinely
small additive change (no new entities, no new component system, no new
tokens) — skip `fe-component-architect`/`fe-state-engineer` for this shape of
story. Worth repeating: when a plan identifies a near-future sibling screen,
scaffold the prop/field seam now rather than forking later.

**Recurring review finding for "sibling screen reusing a shared feature"
stories**: engineers copy small internal helper components (export button,
read-only field wrapper, error banner) verbatim into the new screen file
instead of promoting them — tech-lead-reviewer now flags this as a decision-0026
blocker by default (`ExportPdfButton`/`ReadOnlyField` case in US-E15.2). When
briefing `fe-nextjs-engineer` for a "new screen reusing an existing feature's
components" story, explicitly call out: extract ANY internal helper the new
screen would otherwise duplicate into a shared module in the same pass, don't
wait for review to catch it.

E15 status: both US done. No more stories currently planned in this epic
(check `EPIC-OVERVIEW.md` if picking up "tiếp tục" again for E15).
