---
name: project-exam-bank-e113-plan
description: US-E11.3 Exam Bank + Builder plan decisions — feature separation, dnd-kit ADR, missing design file, builder layout pattern
metadata:
  type: project
---

Key decisions made during planning US-E11.3 (2026-06-18):

- `src/features/exam-bank/` is a SEPARATE module from `src/features/exam/` (student-side). `ExamBankQuestion` redeclares fields like `correctOptionId`, `difficulty`, `subjectId` — not shared with student `ExamQuestion`.
- `@dnd-kit/core` + `@dnd-kit/sortable` NOT in package.json. ADR 0043 required before Phase 4. Fallback = Up/Down keyboard buttons (no new dep).
- Builder full-screen layout: use Next.js segment `layout.tsx` in `create/` and `[id]/edit/` route segments to suppress app shell. **[OPEN QUESTION]** whether `(app)/layout.tsx` forces sidebar unconditionally — may need a `(builder)` route group.
- `design_src/edu/exam-bank.jsx` referenced in story but does NOT exist in the design_src directory (only `exam.jsx` exists). Flag to fe-lead before Phase 4.
- US-E12.3 subject catalogue dependency is unblocked for mock-first — MOCK_SUBJECTS fixture in `infrastructure/repositories/mocks/fixtures.ts`.
- ExamBuilderScreen recommends custom hook `useExamBuilder(initial?)` for question array local state — makes state testable without component render.
- Plan written to: `docs/stories/epics/E11-lms-exams/US-E11.3-exam-bank/plan.md`

**Why:** lms service not shipped; mock-first per decision 0014. Builder is a complex client-side form (drag + MCQ + multi-question) with no server state complexity.

**How to apply:** If a future story extends exam-bank, start from `exam-bank.di.ts` + `i-exam-bank.repository.ts` — do not import from `features/exam/`.
