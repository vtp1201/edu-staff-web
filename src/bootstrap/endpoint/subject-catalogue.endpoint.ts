/**
 * core service — subject catalogue endpoints (mock-first until `core` exists, decision 0014/0017).
 * Routed through Kong gateway (ADR 0030 / US-E06.3): `/core/api/v1/...`
 * → Kong strips `/core` → core receives `/api/v1/...`.
 */
export const SUBJECT_CATALOGUE_EP = {
  parents: "/core/api/v1/subject-parents",
  parent: (id: string) => `/core/api/v1/subject-parents/${id}`,
  archiveParent: (id: string) => `/core/api/v1/subject-parents/${id}/archive`,
  restoreParent: (id: string) => `/core/api/v1/subject-parents/${id}/restore`,
  subjects: "/core/api/v1/subjects",
  subject: (id: string) => `/core/api/v1/subjects/${id}`,
  archiveSubject: (id: string) => `/core/api/v1/subjects/${id}/archive`,
} as const;
