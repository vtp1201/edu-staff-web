/** Teaching-plan (PPCT) endpoints on the core service (US-E11.4). */
export const TEACHING_PLAN_EP = {
  list: "/core/api/v1/teaching-plans",
  get: (id: string) => `/core/api/v1/teaching-plans/${id}`,
  cells: (id: string) => `/core/api/v1/teaching-plans/${id}/cells`,
  submit: (id: string) => `/core/api/v1/teaching-plans/${id}/submit`,
  approve: (id: string) => `/core/api/v1/teaching-plans/${id}/approve`,
  reject: (id: string) => `/core/api/v1/teaching-plans/${id}/reject`,
} as const;
