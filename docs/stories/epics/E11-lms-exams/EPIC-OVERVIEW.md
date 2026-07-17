# Epic E11 — LMS & Exams

## Summary

He thong hoc tap so (LMS): hoc sinh lam bai thi trac nghiem co timer (E11.1),
giao vien quan ly kho bai giang (E11.2), giao vien tao va chinh sua kho de thi
MCQ (E11.3), va giao vien soan + trinh phe duyet ke hoach bai day PPCT (E11.4).
Tat ca deu mock-first voi `lms` / `core` service (BE chua ship).

## Design Source

- `design_src/edu/exam.jsx`          — 1506 handoff (E11.1)
- `design_src/edu/lesson-bank.jsx`   — 1506 handoff (E11.2)
- `design_src/edu/exam-bank.jsx`     — 1506 handoff (E11.3)
- `design_src/edu/teaching-plan.jsx` — 1506 handoff (E11.4)
- `design_src/edu/lesson-plan.jsx` — DR-021 2026-07-17 (E11.8)
- `design_src/edu/question-bank.jsx` — DR-021 2026-07-17 (E11.9)

## Scope

| US | Screen | Roles | BE Service | Design |
| --- | --- | --- | --- | --- |
| E11.1 | Student Exam: list + briefing + taking (timer + MCQ + navigator) + results | student | lms mock-first | `exam.jsx` |
| E11.2 | Lesson Bank: grid/list + upload drawer + detail sheet | teacher, principal (read) | lms mock-first | `lesson-bank.jsx` |
| E11.3 | Exam Bank + Builder: list + 2-col MCQ editor, draft/publish | teacher, admin | lms mock-first | `exam-bank.jsx` |
| E11.4 | Teaching Plan / PPCT: weekly grid, draft/submit/approve workflow | teacher (submit), principal (approve) | core mock-first | `teaching-plan.jsx` |
| E11.8 | Lesson Plan Authoring: list (own DRAFT+PUBLISHED + browse-by-subject) + 2-col builder, one-way publish | teacher | core — real contract ground-truthed (`lessonplan`, US-E18.16), mock-first dev default | `lesson-plan.jsx` (DR-021) |
| E11.9 | Question Bank: list + mandatory subjectId/tag search filter (422 gate) + builder (ESSAY/SHORT_ANSWER/FILL_IN), one-way publish | teacher (staff-only search) | core — real contract ground-truthed (`exercisebank`, US-E18.16), mock-first dev default | `question-bank.jsx` (DR-021) |

## BE Dependencies

- `lms` service — exam endpoints, lesson-bank endpoints, exam-bank endpoints — mock-first (US-053, US-054, US-055 BE deferred)
- `core` service — teaching-plan / PPCT endpoints — mock-first (US-051 BE deferred)
- All services: openapi.yaml not yet updated; contract-first design before wiring

## Key Design Rules (from design files)

- Exam taking: timer auto-submits at 0; flagging system (star icon); navigator grid; prev/next navigation
- Exam states: available / completed / expired
- Timer color: green > 10min, warning 5-10min, error < 5min
- Question difficulty: easy / medium / hard banded by count
- Lesson file types: pdf / pptx / mp4 / link; visibility: private / dept / school
- Exam bank states: draft / published
- Teaching plan workflow: draft -> submitted -> approved | rejected
- PPCT: weekly grid per (subject x class x term); lesson rows (title + objectives + notes)
- Principal reviews and approves teaching plans submitted by teachers

## Notes

- E11.1 exam result screen shows score circle, rank/percentile, per-question review (correct/incorrect/skipped filter)
- E11.2 lesson bank: principal sees school-wide aggregate view
- E11.3 exam-bank builder: full-screen 2-column layout (question list left, MCQ editor right)
- E11.4 PPCT: rejection reason required from principal when rejecting
