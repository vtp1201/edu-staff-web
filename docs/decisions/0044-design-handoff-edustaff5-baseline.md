# 0044 Design Handoff edustaff_5 Baseline

Date: 2026-06-19

## Status

Accepted

## Context

A new design handoff package `edustaff_5` was delivered on 2026-06-19, replacing the prior
`1506` baseline captured in ADR 0038. The package lives at
`/Users/vietthangpham/Downloads/edustaff_5/` and contains updated/new JSX source files
under `edu/`, standalone HTML previews at the root, and two handoff documentation folders
(`design_handoff_eduportal/` and `design_handoff_eduportal_complete/`).

A full diff between `edustaff_5/edu/` and `design_src/edu/` (current repo baseline) was
conducted to identify net-new screens, meaningful functional additions (DR-numbered
enhancements), and cosmetic-only changes. At the time of this ADR, US-E11.3 (Exam Bank)
is actively in-flight on branch `feat/us-e11.3-exam-bank` and its working files must not
be disturbed.

## Decision

### New design source added to repo baseline

The following files from `edustaff_5/edu/` are new and were not in `design_src/edu/`:

| File | Description |
|------|-------------|
| `exam-bank.jsx` | Exam Bank list + Builder (2-col MCQ/Essay). Authoritative design for US-E11.3 (in-flight). |
| `timetable-view.jsx` | Read-only timetable weekly grid for Student + Parent (`/student/schedule`, `/parent/schedule`). Decoupled from admin TimetableBuilder. |

The repo's `design_src/edu/` will be updated with these files when the relevant FE stories
are implemented (copy from handoff at that time — decision 0011: handoff = visual/UX spec,
not architecture).

### Functional additions captured as new stories

| DR Reference | File | Net-new feature | Story |
|---|---|---|---|
| DR-002 | `gradebook.jsx` (+36 lines) | `ChildSwitcher` — parent switches between multiple children's grade books; `VIEWER_DATA_BY_CHILD` per-child seed | US-E13.7 (new) |
| DR-008 | `messaging.jsx` (+1390 lines) | "Tạo nhóm" 2-step modal; group info panel (320px slide-in); message context menu (reply/pin/copy/delete); reply/quote UI strip; richer group list rows | US-E10.1 scope update (story was planned, DR-008 integrated) |
| — | `discipline.jsx` (+546 lines) | TAB 4 Staff Leave re-integrated; `ParentDisciplineScreen` new role variant (parent views child conduct + violations + files leave requests on child's behalf) | US-E09.4 (new) |
| — | `timetable-view.jsx` (new) | Read-only student/parent schedule view | US-E15.1 (new Epic E15) |

### Cosmetic-only changes (no new stories)

`staff-leave.jsx` (6 lines — JS quote escaping only), `grade-entry.jsx` (2 lines — quote
escaping), `gradebook.jsx` string literals changed from ASCII to proper diacritics (vi
labels). All other files (`classops.jsx`, `academic-record-view.jsx`, `academic-records.jsx`,
`assessment.jsx`, `lesson-bank.jsx`, `teaching-plan.jsx`, `grade-approval.jsx`) are
unchanged between the two handoffs.

### Standalone HTML screens (no new stories)

The HTML files at the root of `edustaff_5/` (`Grade Book v2.html`, `Messaging.html`,
`Discipline.html`, etc.) are browser-preview wrappers for already-mapped design files.
They reference DR-002 (Grade Book v2) and DR-008 (Messaging) but do not introduce new
screens beyond what the JSX additions already capture.

## Alternatives Considered

1. **Update `design_src/edu/` in-place now** — rejected: would mix planned-story code with
   in-flight US-E11.3 work and create unnecessary merge conflicts on `feat/us-e11.3-exam-bank`.
2. **Single omnibus story for all DR additions** — rejected: violates 1-story-1-concern;
   each DR targets a different feature domain (messaging, grades, discipline, schedule).
3. **Skip DR-008 messaging since E10.1 is implemented** — rejected: DR-008 is a meaningful
   UX addition (group creation, context menus, reply threads) that must be captured before
   the FE team closes the messaging feature area.

## Consequences

Positive:

- Clear paper trail of what changed vs prior `1506` baseline.
- New stories (US-E09.4, US-E13.7, US-E15.1) correctly scoped and ready for FE team.
- US-E10.1 messaging story updated to include DR-008 group/context-menu scope.
- US-E11.3 in-flight work unaffected (exam-bank.jsx acknowledged as its authoritative design).

Tradeoffs:

- `design_src/edu/exam-bank.jsx` and `timetable-view.jsx` not yet copied into repo — FE team
  must reference `edustaff_5/edu/` directly until those stories are implemented.
- `ParentDisciplineScreen` in `discipline.jsx` (US-E09.4) overlaps the `features/discipline`
  module with US-E09.1/E09.2 already implemented — FE team must extend without breaking
  existing implemented tests.

## Follow-Up

- FE team: copy `edustaff_5/edu/exam-bank.jsx` → `design_src/edu/exam-bank.jsx` when
  US-E11.3 merges (the file is the authoritative spec).
- FE team: copy `edustaff_5/edu/timetable-view.jsx` → `design_src/edu/timetable-view.jsx`
  when US-E15.1 starts.
- BA team: update `docs/product/design-spec.jsonc` with per-screen entries for
  `timetable-view.jsx` (US-E15.1) before implementation.
