import type { ExamBankFailure } from "../failures/exam-bank.failure";

/**
 * Known failure discriminants that a repository may throw as an `Error.message`
 * (the "throwing-repo failure idiom"). Both the mock repo (throws stable keys
 * like "not-found") and the real repo (maps `ApiError.code` → failure type via
 * `map-exam-bank-error`, then throws that key) funnel through here.
 *
 * `unknown` is intentionally excluded — an unmatched message becomes
 * `{ type: "unknown", message }` so the raw text is preserved for diagnostics.
 */
const KNOWN_FAILURE_TYPES = [
  "missing-title",
  "no-questions",
  "question-empty-content",
  "question-missing-answer",
  "insufficient-options",
  "cannot-delete-published",
  "not-supported",
  "not-found",
  "forbidden",
  "invalid-transition",
  "not-editable",
  "question-body-required",
  "question-marks-invalid",
  "answer-key-required",
  "answer-key-not-allowed",
  "title-required",
  "title-too-long",
  "duration-invalid",
  "invalid-cursor",
  "network-error",
] as const satisfies readonly Exclude<ExamBankFailure["type"], "unknown">[];

function isKnownFailureType(
  msg: string,
): msg is (typeof KNOWN_FAILURE_TYPES)[number] {
  return (KNOWN_FAILURE_TYPES as readonly string[]).includes(msg);
}

/** Map a thrown repo Error (message = failure key) to an ExamBankFailure. */
export function mapRepoError(err: unknown): ExamBankFailure {
  const msg = err instanceof Error ? err.message : "";
  if (isKnownFailureType(msg)) return { type: msg };
  return { type: "unknown", message: msg };
}
