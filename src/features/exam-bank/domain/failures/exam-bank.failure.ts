/**
 * Exam-bank failure union.
 *
 * Two layers coexist:
 *  - Client-side pre-submit guards (mock builder validation, DRAFT authoring):
 *    `missing-title`, `no-questions`, `question-empty-content`,
 *    `question-missing-answer`, `insufficient-options`, `cannot-delete-published`.
 *  - Server taxonomy, ground-truthed against `core`'s
 *    `internal/lms/exambank/core/domain/error/exam_paper.go` (UPPER_SNAKE wire
 *    codes via `codeFromKey`, decision 0008 holds for `core` — US-E18.15/ADR 0056).
 *    Since core US-152 (US-E18.28/ADR 0056 Amendment 2) the write path is wired
 *    for update/delete, so the question-level codes are genuinely reachable —
 *    as is `not-editable` (editing/deleting a non-DRAFT paper).
 *
 * `not-supported` is the remaining blocked-stub failure: `createExam` has no
 * bulk-create wire endpoint, so the real repository still throws it.
 */
export type ExamBankFailure =
  // client-side pre-submit guards
  | { type: "missing-title" }
  | { type: "no-questions" }
  | { type: "question-empty-content" }
  | { type: "question-missing-answer" }
  | { type: "insufficient-options" }
  | { type: "cannot-delete-published" }
  // Option-A blocked op (no create/update/delete endpoint exists)
  | { type: "not-supported" }
  // server taxonomy (core exam_paper.go)
  | { type: "not-found" } // EXAM_PAPER_NOT_FOUND / EXAM_PAPER_SUBJECT_NOT_FOUND
  | { type: "forbidden" } // EXAM_PAPER_FORBIDDEN
  | { type: "invalid-transition" } // EXAM_STATUS_TRANSITION_INVALID
  | { type: "not-editable" } // EXAM_STATUS_INVALID_FOR_EDIT
  | { type: "question-body-required" } // EXAM_QUESTION_BODY_REQUIRED
  | { type: "question-marks-invalid" } // EXAM_QUESTION_MARKS_INVALID
  | { type: "question-not-found" } // EXAM_QUESTION_NOT_FOUND
  | { type: "mcq-options-invalid" } // EXAM_MCQ_OPTIONS_INVALID
  | { type: "correct-option-invalid" } // EXAM_CORRECT_OPTION_INVALID
  | { type: "options-not-allowed" } // EXAM_OPTIONS_NOT_ALLOWED
  | { type: "question-difficulty-invalid" } // EXAM_QUESTION_DIFFICULTY_INVALID
  | { type: "answer-key-required" } // EXAM_ANSWER_KEY_REQUIRED_FOR_MCQ
  | { type: "answer-key-not-allowed" } // EXAM_ANSWER_KEY_NOT_ALLOWED
  | { type: "title-required" } // EXAM_PAPER_TITLE_REQUIRED
  | { type: "title-too-long" } // EXAM_PAPER_TITLE_TOO_LONG
  | { type: "duration-invalid" } // EXAM_PAPER_DURATION_INVALID
  | { type: "invalid-cursor" } // EXAM_PAPER_INVALID_CURSOR
  | { type: "network-error" }
  | { type: "unknown"; message?: string };
