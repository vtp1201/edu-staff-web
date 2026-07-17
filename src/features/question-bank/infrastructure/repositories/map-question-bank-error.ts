import { errorCodeOf, statusOf } from "@/bootstrap/lib/api-envelope";
import type { QuestionBankFailure } from "../../domain/failures/question-bank.failure";

/**
 * Which kind of call produced the error — the ONLY way to disambiguate the two
 * `403 FORBIDDEN_ACTION` meanings (spec §6.4, the story's highest-risk detail):
 *   - `"browse"` — search / list-mine / create (role gate `canBrowseBank`).
 *   - `"edit"`   — update / publish (ownership check `IsOwnedBy`).
 * The caller (each repository method) passes a FIXED literal; this mapper NEVER
 * infers the call-site from the error code (the wire code is identical).
 */
export type QuestionBankCallSite = "browse" | "edit";

/**
 * Map a normalised {@link ApiError} to a question-bank failure discriminant by
 * its UPPER_SNAKE `code` (branch on `code`, never the localised message —
 * decision 0008 / `.claude/rules/api-integration.md`) PLUS the fixed
 * `callSite` for the ambiguous `FORBIDDEN_ACTION` code.
 *
 * Wire codes ground-truthed against the `core` `exercisebank` source this
 * session; the HTTP boundary emits `code = strings.ToUpper(key)`.
 */
export function mapQuestionBankApiError(
  err: unknown,
  callSite: QuestionBankCallSite,
): Exclude<QuestionBankFailure["type"], "unknown"> | "unknown" {
  const code = errorCodeOf(err);
  const status = statusOf(err);

  // No HTTP response received (transport failure).
  if (code === "NETWORK_ERROR" || status === undefined) return "network-error";

  switch (code) {
    // Distinct 403 — single-GET visibility gate only, no call-site ambiguity.
    case "QUESTION_NOT_VISIBLE":
      return "not-visible";
    // The mandatory disambiguation: SAME wire code, two meanings, resolved by
    // the fixed per-method call-site (never by the code).
    case "FORBIDDEN_ACTION":
      return callSite === "browse" ? "forbidden-browse" : "forbidden-edit";
    case "QUESTION_ALREADY_PUBLISHED":
      return "already-published";
    case "QUESTION_TYPE_NOT_SUPPORTED":
      return "type-not-supported";
    case "QUESTION_SEARCH_FILTER_REQUIRED":
      return "search-filter-required";
    case "QUESTION_BODY_REQUIRED":
      return "body-required";
    case "QUESTION_BODY_TOO_LONG":
      return "body-too-long";
    case "QUESTION_TAG_LIMIT_EXCEEDED":
      return "tag-limit-exceeded";
    case "QUESTION_TAG_TOO_LONG":
      return "tag-too-long";
    case "QUESTION_INVALID_DIFFICULTY":
      return "invalid-difficulty";
    case "SUBJECT_NOT_FOUND":
      return "subject-not-found";
    case "QUESTION_INVALID_CURSOR":
      return "invalid-cursor";
    case "QUESTION_NOT_FOUND":
    case "QUESTION_INVALID_ID":
      return "not-found";
    default:
      break;
  }

  // Generic status fallbacks (code first, status last). A bare 403 defaults to
  // the call-site's forbidden variant.
  if (status === 403)
    return callSite === "browse" ? "forbidden-browse" : "forbidden-edit";
  if (status === 404) return "not-found";
  if ((err as { retryable?: boolean })?.retryable) return "network-error";

  return "unknown";
}
