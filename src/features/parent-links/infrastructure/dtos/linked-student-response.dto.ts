/**
 * `GET /core/api/v1/members/{memberId}/linked-students` — ground-truthed
 * against the live wire 2026-08-09. The response is an OBJECT wrapping a
 * `links` array (not a bare array), each row keyed by `studentMemberId`, and it
 * carries NO student display name — the contract-first guess this file used to
 * hold (`studentId` / `fullName` / a top-level array) matched none of that, so
 * the parent's own children list came back empty/forbidden.
 */
export interface LinkedStudentResponseDto {
  linkId: string;
  parentMemberId: string;
  studentMemberId: string;
  createdAt?: string;
  /** Class context, enriched by BE US-148. */
  classId?: string;
  className?: string;
}

/** The wrapper the endpoint actually returns. */
export interface LinkedStudentsResponseDto {
  links: LinkedStudentResponseDto[];
}
