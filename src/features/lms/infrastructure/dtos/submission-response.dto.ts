/** `services/lms` `Submission` / `SubmissionSummary` — camelCase, 1:1 with openapi.yaml. */

export interface SubmissionResponseDto {
  assignmentId: string;
  studentUserId: string;
  content: string;
  status: "SUBMITTED";
  submittedAt: string;
}

/** Teacher list row — NO `content` (never exfiltrate a class's work in one read). */
export interface SubmissionSummaryResponseDto {
  assignmentId: string;
  studentUserId: string;
  status: "SUBMITTED";
  submittedAt: string;
}
