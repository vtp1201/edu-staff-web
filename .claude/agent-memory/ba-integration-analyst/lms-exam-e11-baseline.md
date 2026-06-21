---
name: lms-exam-e11-baseline
description: E11.1 + E11.5 exam feature contracts — entity shapes, DTO shapes, mock fixtures, failure union, open type gaps
metadata:
  type: project
---

## E11.1 implemented entities (confirmed by reading source)

- `ExamStatus` = `"available" | "completed" | "expired"` (in `exam.entity.ts`)
- `ExamSummary` has NO `hasEssayQuestions`, `essayCount`, `mcqScore`, `mcqMax`, `essayMax`, `questionTypes`
- `ExamQuestion` has NO `type` discriminant; `options` is always required non-empty array
- `ExamResult` has NO `status` field; `score: number` and `passed: boolean` are NON-NULLABLE
- `QuestionResult` has no `type`, no `textAnswer`, `correctOptionId: string` (non-nullable), `isCorrect: boolean` (non-nullable)
- `ExamAnswer` (ViewModel) = `{ questionId: string; selectedOptionId: string | null }` — no essay support
- `SubmitExamDto` uses `{ questionId, selectedOptionId: string | null }` per answer item

## E11.5 deltas (integration map US-E11.5)

All 5 endpoints are MOCK-FIRST (lms not shipped, decision 0014).

Fields added to ExamSummary entity + DTO: `hasEssayQuestions`, `essayCount`, `essayMax`, `mcqScore`, `mcqMax`, `questionTypes`
Fields added to ExamQuestion entity + DTO: `type: 'mcq' | 'essay'` (safe default 'mcq' for E11.1 backward compat)
Fields added to ExamResult entity + DTO: `status: 'completed' | 'submitted_pending_essay'`, `mcqScore`, `mcqMax`, `essayMax`, `essayCount`
Fields added to QuestionResult: `type`, `textAnswer: string | null`; relax `correctOptionId` and `isCorrect` to nullable
ExamAnswer ViewModel becomes discriminated union: MCQ variant (`selectedOptionId`) + essay variant (`textAnswer`)

## Breaking entity changes flagged to ba-lead

- `score: number | null` and `passed: boolean | null` on ExamResult — currently non-nullable; changing affects all E11.1 components
- `ExamQuestion.type` is absent in E11.1 — adding it requires updating `buildMockQuestions` factory and all E11.1 tests

## Open questions (see integration.md §8)

- `selectedOption` integer vs `selectedOptionId` string on submit payload
- `EXAM_ESSAY_TOO_LONG` error code (not in lms ERROR_CODES — lms not shipped)
- `EXAM_RESULT_NOT_READY` error code
- `questionTypes` field on exam detail endpoint
- `score`/`passed` nullability ADR need

**Why:** lms service not shipped; all gaps require mock-first approach and ADR decisions when service ships.
**How to apply:** When asked about exam-related integration for E11.x stories, read entity files first; they differ from the integration map assumptions.
