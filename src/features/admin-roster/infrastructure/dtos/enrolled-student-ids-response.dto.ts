/**
 * Wire shape of `GET /core/api/v1/enrollments/student-ids?academicYear=`
 * (`EnrolledStudentIdsResponse`, BE US-182 / `edu-api` ADR 0125), ground-truthed
 * against `services/core/.../enrollment_pool_handler.go` + `dto/class.go` — not
 * only the openapi entry, which can drift from the running server.
 *
 * Ids-only by design (no PII on this call) and UNPAGINATED: the handler returns
 * a flat array, `[]` rather than `null` when nothing is enrolled. `academicYear`
 * echoes BE's NORMALISED label (the use-case trims the query value), so it is
 * not necessarily byte-identical to what the FE sent.
 */
export interface EnrolledStudentIdsResponseDto {
  academicYear: string;
  studentMemberIds: string[];
}
