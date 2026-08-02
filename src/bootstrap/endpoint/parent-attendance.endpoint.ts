/**
 * Core service endpoint consumed by the parent-facing child-attendance read
 * (US-E18.34, decision `0017`).
 *
 * Ground-truthed against `edu-api/services/core/internal/attendance/adapter/
 * http/routes.go` (`members.Get("/:memberId/attendance", …)`) — the same
 * operation the openapi documents as `getMemberAttendance`. Declared here
 * rather than reused from `ATTENDANCE_EP` because that constant is the
 * TEACHER-facing class-scoped set; this one is member-scoped and belongs to a
 * different feature module (same self-containment precedent noted in
 * `attendance.endpoint.ts`).
 */
export const PARENT_ATTENDANCE_EP = {
  memberAttendance: (memberId: string) =>
    `/core/api/v1/members/${encodeURIComponent(memberId)}/attendance`,
} as const;
