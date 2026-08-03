/**
 * `EnrollmentResponse` — one row of `GET /core/api/v1/classes/{classId}/students`
 * (cursor-paginated). Ground-truthed against
 * `edu-api/services/core/docs/openapi.yaml` (`EnrollmentResponse`, all five
 * fields required) on 2026-08-03.
 *
 * There is deliberately nothing displayable here and NO status field: the
 * endpoint is the authority for WHICH students are enrolled, and enrollment
 * rows are hard-deleted on unenroll/transfer, so "returned" IS "currently
 * enrolled". Names/dob/gender come from a separate IAM batch lookup.
 */
export interface EnrollmentDto {
  enrollmentId: string;
  classId: string;
  /** The student's memberId — the key every roster mutation uses. */
  studentMemberId: string;
  academicYearLabel: string;
  /** RFC3339 date-time. */
  enrolledAt: string;
}

export type EnrollmentListResponseDto = EnrollmentDto[];
