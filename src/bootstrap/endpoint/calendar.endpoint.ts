export const CALENDAR_EP = {
  years: "/core/academic-years",
  year: (id: string) => `/core/academic-years/${id}`,
  terms: (yearId: string) => `/core/academic-years/${yearId}/terms`,
  term: (yearId: string, termId: string) =>
    `/core/academic-years/${yearId}/terms/${termId}`,
} as const;
