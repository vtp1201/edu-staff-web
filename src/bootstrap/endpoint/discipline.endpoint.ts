/**
 * Core service `discipline` endpoints (US-E09.1). Mock-first until the core
 * service ships. Base: /core/api/v1/discipline
 */
export const DISCIPLINE_EP = {
  violations: "/core/api/v1/discipline/violations",
  recordViolation: "/core/api/v1/discipline/violations",
  conduct: "/core/api/v1/discipline/conduct",
  overrideConduct: (studentId: string) =>
    `/core/api/v1/discipline/conduct/${studentId}/override`,
  leaveRequests: "/core/api/v1/discipline/leave-requests",
  approveLeave: (id: string) =>
    `/core/api/v1/discipline/leave-requests/${id}/approve`,
  rejectLeave: (id: string) =>
    `/core/api/v1/discipline/leave-requests/${id}/reject`,
  // Student / parent self-service (US-E09.2)
  myConduct: "/core/api/v1/discipline/my-conduct",
  myViolations: "/core/api/v1/discipline/my-violations",
  myLeaveRequests: "/core/api/v1/discipline/my-leave-requests",
  submitLeaveRequest: "/core/api/v1/discipline/leave-requests",
  // Parent multi-child view (US-E09.4). parentChildren shares the path with
  // GRADES_EP.childList (US-E13.7) but is its own constant — do not break E13.7.
  parentChildren: "/core/api/v1/parent/children",
  childConductSummary: (childId: string) =>
    `/core/api/v1/discipline/children/${childId}/conduct-summary`,
  childViolations: (childId: string) =>
    `/core/api/v1/discipline/children/${childId}/violations`,
  childLeaveRequests: (childId: string) =>
    `/core/api/v1/discipline/children/${childId}/leave-requests`,
  submitChildLeaveRequest: (childId: string) =>
    `/core/api/v1/discipline/children/${childId}/leave-requests`,
} as const;
