/**
 * core service — staffing endpoints: departments, position titles, position
 * assignments (mock-first until `core` exists, decision 0014/0017).
 * Routed through Kong gateway (ADR 0030 / US-E06.3): `/core/api/v1/...`
 * → Kong strips `/core` → core receives `/api/v1/...`.
 */
export const STAFFING_EP = {
  // Departments
  departments: "/core/api/v1/departments",
  department: (id: string) => `/core/api/v1/departments/${id}`,
  archiveDepartment: (id: string) => `/core/api/v1/departments/${id}/archive`,
  // Position Titles
  positionTitles: "/core/api/v1/position-titles",
  positionTitle: (id: string) => `/core/api/v1/position-titles/${id}`,
  archivePositionTitle: (id: string) =>
    `/core/api/v1/position-titles/${id}/archive`,
  // Position Assignments
  positionAssignments: "/core/api/v1/position-assignments",
  positionAssignment: (id: string) => `/core/api/v1/position-assignments/${id}`,
  revokeAssignment: (id: string) =>
    `/core/api/v1/position-assignments/${id}/revoke`,
  copyAssignments: "/core/api/v1/position-assignments/copy",
} as const;
