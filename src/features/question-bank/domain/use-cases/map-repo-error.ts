import type { QuestionBankFailure } from "../failures/question-bank.failure";

/**
 * Known failure discriminants a repository may throw as an `Error.message`
 * (throwing-repo idiom). Both the mock repo (throws stable keys like
 * "not-found") and the real repo (maps `ApiError.code` + call-site → failure
 * key via `map-question-bank-error`, then throws it) funnel through here.
 *
 * `unknown` is excluded — an unmatched message becomes
 * `{ type: "unknown", message }`, preserving the raw text for diagnostics.
 */
const KNOWN_FAILURE_TYPES = [
  "not-found",
  "not-visible",
  "forbidden-browse",
  "forbidden-edit",
  "already-published",
  "type-not-supported",
  "search-filter-required",
  "body-required",
  "body-too-long",
  "tag-limit-exceeded",
  "tag-too-long",
  "invalid-difficulty",
  "subject-not-found",
  "invalid-cursor",
  "network-error",
] as const satisfies readonly Exclude<QuestionBankFailure["type"], "unknown">[];

function isKnownFailureType(
  msg: string,
): msg is (typeof KNOWN_FAILURE_TYPES)[number] {
  return (KNOWN_FAILURE_TYPES as readonly string[]).includes(msg);
}

/** Map a thrown repo Error (message = failure key) to a QuestionBankFailure. */
export function mapRepoError(err: unknown): QuestionBankFailure {
  const msg = err instanceof Error ? err.message : "";
  if (isKnownFailureType(msg)) return { type: msg };
  return { type: "unknown", message: msg };
}
