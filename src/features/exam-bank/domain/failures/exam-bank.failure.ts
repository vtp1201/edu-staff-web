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
 *    Only a subset is reachable in Option A (list/get/publish are wired; create/
 *    add-question are blocked) but the full taxonomy is mapped for honesty and
 *    for the day the write path unblocks.
 *
 * `not-supported` is the Option-A blocked-stub failure: create/update/delete have
 * no wire endpoint at all on the real contract, so the real repository throws it.
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
  | { type: "answer-key-required" } // EXAM_ANSWER_KEY_REQUIRED_FOR_MCQ
  | { type: "answer-key-not-allowed" } // EXAM_ANSWER_KEY_NOT_ALLOWED
  | { type: "title-required" } // EXAM_PAPER_TITLE_REQUIRED
  | { type: "title-too-long" } // EXAM_PAPER_TITLE_TOO_LONG
  | { type: "duration-invalid" } // EXAM_PAPER_DURATION_INVALID
  | { type: "invalid-cursor" } // EXAM_PAPER_INVALID_CURSOR
  | { type: "network-error" }
  | { type: "unknown"; message?: string };
