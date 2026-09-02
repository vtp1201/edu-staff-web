/**
 * Single failure catalog for the whole `lms` feature (US-E24.1 merged the old
 * `LmsFailure` + `AssignmentFailure` — one service, one error surface).
 *
 * Stable keys: presentation translates `courses.errors.<type>` /
 * `assignments.errors.<type>`; nothing below this layer ever translates
 * (i18n.md). Each member is produced by mapping a documented UPPER_SNAKE
 * `error.code` (never a message) — see
 * `infrastructure/mappers/lms-failure.mapper.ts` for the code → member table
 * and `edu-api/services/lms/docs/ERROR_CODES.md` for the authority.
 */
export type LmsFailure =
  /** LMS_COURSE/LESSON/ASSIGNMENT/ITEM/SUBMISSION_NOT_FOUND, LMS_ITEM_NOT_OPEN. */
  | { type: "not-found" }
  /** LMS_CLASS_NOT_FOUND, LMS_*_TEACHER_NOT_ASSIGNED, LMS_SUBMISSION_FORBIDDEN. */
  | { type: "forbidden" }
  /** LMS_SUBMISSION_ALREADY_SUBMITTED — the single-attempt policy. */
  | { type: "already-submitted" }
  /** LMS_ITEM_CLOSED — submitting after `dueAt` (enforced since BE US-228). */
  | { type: "closed" }
  /** LMS_ITEM_NOT_DOCUMENT — edit/delete addressed at a LESSON/ASSIGNMENT tile. */
  | { type: "not-document" }
  /** LMS_EXAM_WINDOW_NOT_EDITABLE — an exam's schedule belongs to core. */
  | { type: "exam-window-not-editable" }
  /** LMS_ITEM_INVALID_WINDOW — `dueAt <= startAt`. */
  | { type: "invalid-window" }
  /** LMS_ITEM_URL_INVALID — not an absolute https URL with a host. */
  | { type: "invalid-url" }
  /** LMS_*_LIMIT_EXCEEDED — per-course/class caps. */
  | { type: "limit-exceeded" }
  /** Transport / gateway / anything with no usable code. */
  | { type: "network-error" }
  | { type: "unknown" };

/** Every member's `type`, for exhaustive i18n-key checks in tests. */
export const LMS_FAILURE_TYPES = [
  "not-found",
  "forbidden",
  "already-submitted",
  "closed",
  "not-document",
  "exam-window-not-editable",
  "invalid-window",
  "invalid-url",
  "limit-exceeded",
  "network-error",
  "unknown",
] as const satisfies ReadonlyArray<LmsFailure["type"]>;
