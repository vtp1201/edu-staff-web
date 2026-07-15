/**
 * Real wire shape — `core` `HomeroomAssignmentResponse` (US-E18.4). No
 * display name on the wire (only `teacherMemberId`, a raw uuid) — IAM has no
 * public endpoint to resolve a member id to a name (cross-repo gap, same as
 * US-E18.2's `memberName`; see EPIC-OVERVIEW.md cross-repo ask #6/#7).
 */
export interface HomeroomAssignmentResponseDto {
  classId: string;
  teacherMemberId: string;
  assignedAt: string;
  assignedBy: string;
}

export interface AssignHomeroomRequestDto {
  teacherMemberId: string;
}
