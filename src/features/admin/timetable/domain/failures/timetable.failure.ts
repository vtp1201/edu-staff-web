/**
 * Typed timetable failures. Use-cases/repository return a stable `type` key;
 * presentation maps it to a translated string via `timetable.errors.<type>`.
 *
 * The BE-facing codes mirror the real `core` timetable error taxonomy
 * (`services/core/docs/ERROR_CODES.md`, UPPER_SNAKE, decision 0008); the repo
 * maps `error.code` → the matching `type` here (branch on code, never message).
 * `save-failed` is a client-side validation failure raised by the use-case
 * (not a wire code); `fetch-failed` is the transport/unknown fallback.
 */
export type TimetableFailure =
  | { type: "invalid-tenant"; message: string } // TIMETABLE_INVALID_TENANT_ID
  | { type: "invalid-class"; message: string } // TIMETABLE_INVALID_CLASS_ID
  | { type: "invalid-term"; message: string } // TIMETABLE_INVALID_TERM_ID
  | { type: "invalid-member"; message: string } // TIMETABLE_INVALID_MEMBER_ID
  | { type: "invalid-subject"; message: string } // TIMETABLE_INVALID_SUBJECT_ID
  | { type: "invalid-slot"; message: string } // TIMETABLE_INVALID_SLOT_ID
  | { type: "invalid-day"; message: string } // TIMETABLE_INVALID_DAY
  | { type: "invalid-period"; message: string } // TIMETABLE_INVALID_PERIOD
  | { type: "forbidden"; message: string } // TIMETABLE_FORBIDDEN
  | { type: "slot-not-found"; message: string } // TIMETABLE_SLOT_NOT_FOUND
  | { type: "teacher-conflict"; message: string } // TIMETABLE_TEACHER_CONFLICT
  | { type: "save-failed"; message: string } // client-side validation
  | { type: "fetch-failed"; message: string }; // transport/unknown fallback
