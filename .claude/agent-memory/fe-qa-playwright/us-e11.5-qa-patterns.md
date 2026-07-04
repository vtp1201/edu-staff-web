---
name: us-e11.5-qa-patterns
description: US-E11.5 mixed-exam pending-essay: all 10 ACs passed cleanly; patterns for multi-status exam result branching
metadata:
  type: project
---

## Key patterns observed

- `isResultFinal()` in `exam-result.entity.ts` drives the branch — guard in `ExamResultScreen` calls `PendingEssayResultView` for `submitted_pending_essay`; a secondary null-check on `score`/`passed` provides belt-and-suspenders.
- `MOCK_PENDING_ESSAY_RESULT` in `exam.fixtures.ts` has `score: null`, `passed: null`, `mcqScore: 6.25`, `mcqMax: 6`, `essayCount: 3`, `essayMax: 4` — use these fields when asserting AC-5 hero display.
- Navigator uses `essayIds` Set prop (or falls back to `q.type === "essay"`) to render `FileText` icon vs number — both paths work; fixture `buildMockMixedQuestions(n, m)` creates n MCQ + m essay.
- `EssayQuestionInput` uses `useId()` + `aria-describedby={id + "-count"}` for char count (AC-9 hookup is clean).
- Submit modal `role="alert"` is on the `hasEmptyEssay` warning block (not the outer `DialogContent`) — use `within(document.body)` for Radix portal queries.
- All E11.5 i18n keys are under `exam.*` namespace in both vi.json and en.json; `mcqLabel` key ("TN") is the abbreviation shown next to the partial-score hero denominator.
- `Result_PendingEssay` play asserts three distinct strings: "CHƯA CÓ ĐIỂM TỔNG" (partialResultBadge), "Điểm tự luận đang chờ giáo viên chấm" (pendingEssayTitle), "Câu tự luận (chờ chấm)" (essayPending stat card label).
- `Result_CompletedAfterEssay` uses `status: "completed"` override on exam-005 result — confirms E11.1 regression path is exercised.
- `Taking_EssayQuestion` story clicks `getByRole("button", { name: "Câu 4" })` to jump to the essay question (1-indexed label).

**Why:** Multi-status entity branching is a recurring pattern in this codebase; memo the specific field nullability contract (score/passed null for pending, mcqScore/mcqMax always present for mixed exams).
