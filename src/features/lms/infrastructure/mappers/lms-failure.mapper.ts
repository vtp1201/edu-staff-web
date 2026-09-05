import { errorCodeOf, statusOf } from "@/bootstrap/lib/api-envelope";
import type { LmsFailure } from "../../domain/failures/lms.failure";

/**
 * Normalized `ApiError` → `LmsFailure`, branching on the UPPER_SNAKE
 * `error.code` (NEVER on the message). Authority:
 * `edu-api/services/lms/docs/ERROR_CODES.md`.
 *
 * Two doctrines the table encodes rather than flattens:
 *
 * 1. **Existence oracle.** A course/assignment/item id is a secret, so BE
 *    collapses "no such row", "not my class" and "not published" into one
 *    `404 *_NOT_FOUND`. The client must not try to un-collapse it — every one
 *    of those maps to the single `not-found` member.
 * 2. **A caller-supplied `classId` is NOT a secret.** The class-scoped LISTS
 *    answer `403 LMS_CLASS_NOT_FOUND` instead, which is a genuinely different
 *    user-facing situation ("this isn't your class") → `forbidden`.
 *
 * `LMS_INVALID_*_ID` (400) are malformed-UUID client bugs with no useful user
 * copy; they fall through to `unknown` deliberately.
 */
const CODE_TO_FAILURE: Record<string, LmsFailure["type"]> = {
  // ── 404, existence-oracle collapsed ─────────────────────────────────────
  LMS_COURSE_NOT_FOUND: "not-found",
  LMS_LESSON_NOT_FOUND: "not-found",
  LMS_ASSIGNMENT_NOT_FOUND: "not-found",
  LMS_ITEM_NOT_FOUND: "not-found",
  LMS_SUBMISSION_NOT_FOUND: "not-found",
  LMS_SUBJECT_NOT_FOUND: "not-found",
  // A student reaching an item before its `startAt`. 404-shaped on purpose:
  // an unopened item is absent from the timeline, so a 403 would confirm it.
  LMS_ITEM_NOT_OPEN: "not-found",
  RESOURCE_NOT_FOUND: "not-found",

  // ── 403, the caller knows the resource exists ───────────────────────────
  LMS_CLASS_NOT_FOUND: "forbidden",
  LMS_COURSE_TEACHER_NOT_ASSIGNED: "forbidden",
  LMS_ASSIGNMENT_TEACHER_NOT_ASSIGNED: "forbidden",
  LMS_SUBMISSION_FORBIDDEN: "forbidden",
  UNAUTHORIZED_ACCESS: "forbidden",

  // ── 409, business conflicts ─────────────────────────────────────────────
  LMS_SUBMISSION_ALREADY_SUBMITTED: "already-submitted",
  LMS_ITEM_CLOSED: "closed",
  LMS_ITEM_NOT_DOCUMENT: "not-document",
  // Publish is terminal: a second call (or the loser of two concurrent ones)
  // is a benign race, so it gets its own key rather than a generic conflict.
  LMS_COURSE_INVALID_STATUS_TRANSITION: "already-published",
  // `POST /assignments` requires a PUBLISHED course (BE US-229) — actionable.
  LMS_ASSIGNMENT_COURSE_NOT_PUBLISHED: "course-not-published",
  LMS_EXAM_WINDOW_NOT_EDITABLE: "exam-window-not-editable",
  LMS_COURSE_LIMIT_EXCEEDED: "limit-exceeded",
  LMS_LESSON_LIMIT_EXCEEDED: "limit-exceeded",
  LMS_ASSIGNMENT_LIMIT_EXCEEDED: "limit-exceeded",
  LMS_ITEM_LIMIT_EXCEEDED: "limit-exceeded",

  // ── 422, request-shape conflicts ────────────────────────────────────────
  LMS_ITEM_INVALID_WINDOW: "invalid-window",
  LMS_ITEM_URL_INVALID: "invalid-url",
  // BE re-validates the work text (empty / over its 20 000-rune cap). The
  // client guards both first, so these only reach us when the two limits
  // disagree — still an honest, actionable message rather than `unknown`.
  LMS_SUBMISSION_CONTENT_REQUIRED: "invalid-content",
  LMS_SUBMISSION_CONTENT_TOO_LONG: "invalid-content",
};

export function toLmsFailure(err: unknown): LmsFailure {
  const code = errorCodeOf(err);
  const mapped = code ? CODE_TO_FAILURE[code] : undefined;
  if (mapped) return { type: mapped };

  // No usable code: fall back to the status class, so a bare gateway/transport
  // failure is still an honest "connection problem" rather than "unknown".
  const status = statusOf(err);
  if (status === undefined || status === 0 || status >= 500) {
    return { type: "network-error" };
  }
  if (status === 404) return { type: "not-found" };
  if (status === 403 || status === 401) return { type: "forbidden" };
  return { type: "unknown" };
}

/** True when the error is specifically "this student has not submitted yet",
 *  which `getMySubmission` answers with `null` rather than a failure. */
export function isSubmissionNotFound(err: unknown): boolean {
  return errorCodeOf(err) === "LMS_SUBMISSION_NOT_FOUND";
}
