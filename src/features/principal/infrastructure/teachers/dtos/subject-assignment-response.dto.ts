/**
 * `SubjectAssignmentResponse` — one row of
 * `GET /core/api/v1/classes/{classId}/subject-assignments` (BE US-181).
 *
 * Ground-truthed against `services/core/internal/class/adapter/http/dto/class.go`
 * (not only `openapi.yaml`, which has drifted before). The response is a plain
 * unpaginated array under the standard envelope (`response.OK`), so the repo
 * reads it WITHOUT `{ raw: true }`.
 *
 * Deliberately narrow: no `subjectName`, no `className`, no conflict flag — the
 * wire carries none of them.
 */
export interface SubjectAssignmentResponseDto {
  classId: string;
  subjectId: string;
  teacherMemberId: string;
  /** RFC3339 date-time. Unused by the current screen; kept because the wire has it. */
  assignedAt: string;
  assignedBy: string;
}
