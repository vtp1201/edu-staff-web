/**
 * Staff-leave endpoint constants (US-E09.3, `core` service — mock-first).
 * No magic strings in repositories.
 */
export const STAFF_LEAVE_EP = {
  list: "/core/api/v1/staff-leave-requests",
  approve: (id: string) => `/core/api/v1/staff-leave-requests/${id}/approve`,
  reject: (id: string) => `/core/api/v1/staff-leave-requests/${id}/reject`,
} as const;
