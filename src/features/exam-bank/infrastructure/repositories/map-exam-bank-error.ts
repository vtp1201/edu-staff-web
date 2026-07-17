import { errorCodeOf, statusOf } from "@/bootstrap/lib/api-envelope";
import type { ExamBankFailure } from "../../domain/failures/exam-bank.failure";

/**
 * Map a normalised {@link ApiError} to an exam-bank failure discriminant, by its
 * UPPER_SNAKE `code` (branch on `code`, never the localised message — TR-026 /
 * decision 0008). Codes ground-truthed against
 * `services/core/internal/lms/exambank/core/domain/error/exam_paper.go`
 * (`core` uses `codeFromKey = strings.ToUpper`, confirmed US-E18.7/8/9/11/12/13).
 *
 * The real repository throws the returned key as an `Error.message`; the domain
 * `mapRepoError` then rebuilds the typed `ExamBankFailure` (throwing-repo idiom).
 * Only a subset (not-found/forbidden/invalid-transition/invalid-cursor/network)
 * is reachable in Option A, but the full taxonomy is mapped for honesty and the
 * day the write path unblocks.
 */
export function mapExamBankApiError(
  err: unknown,
): Exclude<ExamBankFailure["type"], "unknown"> | "unknown" {
  const code = errorCodeOf(err);
  const status = statusOf(err);

  // No HTTP response received (transport failure).
  if (code === "NETWORK_ERROR" || status === undefined) return "network-error";

  switch (code) {
    case "EXAM_PAPER_NOT_FOUND":
    case "EXAM_PAPER_SUBJECT_NOT_FOUND":
      return "not-found";
    case "EXAM_PAPER_FORBIDDEN":
      return "forbidden";
    case "EXAM_STATUS_TRANSITION_INVALID":
      return "invalid-transition";
    case "EXAM_STATUS_INVALID_FOR_EDIT":
      return "not-editable";
    case "EXAM_QUESTION_BODY_REQUIRED":
      return "question-body-required";
    case "EXAM_QUESTION_MARKS_INVALID":
      return "question-marks-invalid";
    case "EXAM_ANSWER_KEY_REQUIRED_FOR_MCQ":
      return "answer-key-required";
    case "EXAM_ANSWER_KEY_NOT_ALLOWED":
      return "answer-key-not-allowed";
    case "EXAM_PAPER_TITLE_REQUIRED":
      return "title-required";
    case "EXAM_PAPER_TITLE_TOO_LONG":
      return "title-too-long";
    case "EXAM_PAPER_DURATION_INVALID":
      return "duration-invalid";
    case "EXAM_PAPER_INVALID_CURSOR":
      return "invalid-cursor";
    default:
      break;
  }

  // Generic status fallbacks (code first, status last).
  if (status === 403) return "forbidden";
  if (status === 404) return "not-found";
  if ((err as { retryable?: boolean })?.retryable) return "network-error";

  return "unknown";
}
