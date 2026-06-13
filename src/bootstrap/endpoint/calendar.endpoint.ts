/**
 * core service — academic calendar endpoints (mock-first until `core` exists, decision 0014/0017).
 * Routed through Kong gateway (ADR 0030 / US-E06.3): `/core/api/v1/...`
 * → Kong strips `/core` → core receives `/api/v1/...`.
 */
export const CALENDAR_EP = {
  years: "/core/api/v1/academic-years",
  year: (id: string) => `/core/api/v1/academic-years/${id}`,
  terms: (yearId: string) => `/core/api/v1/academic-years/${yearId}/terms`,
  term: (yearId: string, termId: string) =>
    `/core/api/v1/academic-years/${yearId}/terms/${termId}`,
} as const;
