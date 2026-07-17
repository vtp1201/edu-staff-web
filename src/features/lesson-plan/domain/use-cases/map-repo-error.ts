import type { LessonPlanFailure } from "../failures/lesson-plan.failure";

/**
 * Known failure discriminants a repository may throw as an `Error.message`
 * (throwing-repo idiom). Both the mock repo (throws stable keys like
 * "not-found") and the real repo (maps `ApiError.code` → failure key via
 * `map-lesson-plan-error`, then throws it) funnel through here.
 *
 * `unknown` is excluded — an unmatched message becomes
 * `{ type: "unknown", message }`, preserving the raw text for diagnostics.
 */
const KNOWN_FAILURE_TYPES = [
  "not-found",
  "not-visible",
  "already-published",
  "tag-limit-exceeded",
  "title-required",
  "title-too-long",
  "tag-too-long",
  "subject-not-found",
  "invalid-id",
  "invalid-cursor",
  "forbidden",
  "network-error",
] as const satisfies readonly Exclude<LessonPlanFailure["type"], "unknown">[];

function isKnownFailureType(
  msg: string,
): msg is (typeof KNOWN_FAILURE_TYPES)[number] {
  return (KNOWN_FAILURE_TYPES as readonly string[]).includes(msg);
}

/** Map a thrown repo Error (message = failure key) to a LessonPlanFailure. */
export function mapRepoError(err: unknown): LessonPlanFailure {
  const msg = err instanceof Error ? err.message : "";
  if (isKnownFailureType(msg)) return { type: msg };
  return { type: "unknown", message: msg };
}
