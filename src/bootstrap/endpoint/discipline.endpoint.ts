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
} as const;
