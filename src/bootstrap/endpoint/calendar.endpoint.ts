/**
 * core service — academic calendar endpoints (mock-first until `core` exists, decision 0014/0017).
 * Routed through Kong gateway (ADR 0030 / US-E06.3): `/core/api/v1/...`
 * → Kong strips `/core` → core receives `/api/v1/...`.
 */
export const CALENDAR_EP = {
  years: "/core/api/v1/academic-years",
  activeYear: "/core/api/v1/academic-years/active",
  year: (id: string) => `/core/api/v1/academic-years/${id}`,
  activateYear: (id: string) => `/core/api/v1/academic-years/${id}/activate`,
  archiveYear: (id: string) => `/core/api/v1/academic-years/${id}/archive`,
  terms: (yearId: string) => `/core/api/v1/academic-years/${yearId}/terms`,
  term: (yearId: string, termId: string) =>
    `/core/api/v1/academic-years/${yearId}/terms/${termId}`,
  archiveTerm: (yearId: string, termId: string) =>
    `/core/api/v1/academic-years/${yearId}/terms/${termId}/archive`,
} as const;
