import { errorCodeOf, statusOf } from "@/bootstrap/lib/api-envelope";
import type { LessonPlanFailure } from "../../domain/failures/lesson-plan.failure";

/**
 * Map a normalised {@link ApiError} to a lesson-plan failure discriminant by its
 * UPPER_SNAKE `code` (branch on `code`, never the localised message — decision
 * 0008 / `.claude/rules/api-integration.md`).
 *
 * VERIFIED (US-E11.8 spec §8 open-question 4, done not assumed): the wire codes
 * were ground-truthed against the running `core` source this session —
 *   - domain keys in `core/internal/lms/lessonplan/core/domain/error/lesson_plan.go`
 *     + `.../valueobject/ids.go` are snake_case (`lesson_plan_not_found`,
 *     `forbidden_action`, `subject_not_found`, `lesson_plan_invalid_subject_id`, …);
 *   - the HTTP boundary emits `code = codeFromKey(key) = strings.ToUpper(key)`
 *     (`pkg/kit/response/error.go:108`) — a pure uppercase, keys already have
 *     underscores, so e.g. `lesson_plan_already_published` → the exact
 *     `LESSON_PLAN_ALREADY_PUBLISHED` branched on below.
 * This matches exam-bank's `codeFromKey` precedent — but was re-verified against
 * the lessonplan source directly per the spec's caution (ADR 0056 class).
 */
export function mapLessonPlanApiError(
  err: unknown,
): Exclude<LessonPlanFailure["type"], "unknown"> | "unknown" {
  const code = errorCodeOf(err);
  const status = statusOf(err);

  // No HTTP response received (transport failure).
  if (code === "NETWORK_ERROR" || status === undefined) return "network-error";

  switch (code) {
    case "LESSON_PLAN_NOT_FOUND":
      return "not-found";
    case "LESSON_PLAN_NOT_VISIBLE":
      return "not-visible";
    case "LESSON_PLAN_ALREADY_PUBLISHED":
      return "already-published";
    case "LESSON_PLAN_TAG_LIMIT_EXCEEDED":
      return "tag-limit-exceeded";
    case "LESSON_PLAN_TITLE_REQUIRED":
      return "title-required";
    case "LESSON_PLAN_TITLE_TOO_LONG":
      return "title-too-long";
    case "LESSON_PLAN_TAG_TOO_LONG":
      return "tag-too-long";
    case "SUBJECT_NOT_FOUND":
      return "subject-not-found";
    case "LESSON_PLAN_INVALID_ID":
    case "LESSON_PLAN_INVALID_TENANT_ID":
    case "LESSON_PLAN_INVALID_SUBJECT_ID":
    case "LESSON_PLAN_INVALID_MEMBER_ID":
      return "invalid-id";
    case "LESSON_PLAN_INVALID_CURSOR":
      return "invalid-cursor";
    case "FORBIDDEN_ACTION":
      return "forbidden";
    default:
      break;
  }

  // Generic status fallbacks (code first, status last).
  if (status === 403) return "forbidden";
  if (status === 404) return "not-found";
  if ((err as { retryable?: boolean })?.retryable) return "network-error";

  return "unknown";
}
