/**
 * Submission — `services/lms` `Submission` / `SubmissionSummary` (US-E24.1).
 *
 * SINGLE ATTEMPT: a student submits exactly once (a second attempt is
 * `409 LMS_SUBMISSION_ALREADY_SUBMITTED`). `status` has exactly one value until
 * grading (BE US-141) introduces more — there is no score or feedback field.
 */

export type SubmissionStatus = "SUBMITTED";

/** WITH content — `.../submissions/me`, `.../submissions/{studentUserId}`, and
 *  the `POST` response. */
export interface Submission {
  assignmentId: string;
  studentUserId: string;
  content: string;
  status: SubmissionStatus;
  submittedAt: string;
}

/** Teacher list row — omits `content` so one request cannot exfiltrate every
 *  student's work. */
export interface SubmissionSummary {
  assignmentId: string;
  studentUserId: string;
  status: SubmissionStatus;
  submittedAt: string;
}
