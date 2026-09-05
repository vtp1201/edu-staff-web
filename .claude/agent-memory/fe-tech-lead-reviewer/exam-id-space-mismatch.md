---
name: exam-id-space-mismatch
description: lms CourseItem.exam.examId and the features/exam mock list are different id spaces — every "Vào làm bài" in-app CTA lands on /student/exams/[examId], which resolves via makeListExamsUseCase(MOCK_STUDENT_ID)
metadata:
  type: project
---

Every student "Vào làm bài" CTA (course player `body-exam.tsx`, cross-subject row
`cross-subject.derive.ts`) that has NO external `examUrl` falls back to
`/student/exams/[examId]`. That route resolves the exam by scanning
`makeListExamsUseCase().execute(MOCK_STUDENT_ID)` from `features/exam` — a
different service/id space than `lms`'s `CourseItem.exam.examId`, and still
hardcoded `MOCK_STUDENT_ID` (core has no single-exam GET).

**Why:** `lms` exam items shipped (US-E24.1/E24.5) before `features/exam` was
re-pointed at a real contract. A real lms `examId` therefore likely renders
`exam.errors.not-found` rather than the exam.

**How to apply:** do NOT bill this to a story that merely reuses the existing
`examHrefFor` pattern (US-E24.5 set the precedent, US-E24.4 followed it) — it is
a pre-existing cross-feature gap, worth a follow-up/BE ask, not a per-story
blocker. Related: [[be-lms-live-contract]].
