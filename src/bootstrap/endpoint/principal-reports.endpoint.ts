/**
 * Principal-reports endpoint constants (INT-001..005). MOCK-FIRST — these are
 * a web-side proposed contract for the `core` service (spec §6 [OPEN QUESTION];
 * no BE-confirmed shape exists yet). No magic strings in repositories.
 */
export const PRINCIPAL_REPORTS_EP = {
  summary: "/core/api/v1/principal/reports/summary",
  subjectAverages: "/core/api/v1/principal/reports/subject-averages",
  attendanceTrend: "/core/api/v1/principal/reports/attendance-trend",
  list: "/core/api/v1/principal/reports",
  generate: "/core/api/v1/principal/reports", // POST, same path as list
} as const;
