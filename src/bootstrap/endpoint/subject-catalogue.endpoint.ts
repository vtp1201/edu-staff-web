/** core service — subject catalogue endpoints (mock-first until `core` exists, decision 0014/0017). */
export const SUBJECT_CATALOGUE_EP = {
  parents: "/core/subject-parents",
  parent: (id: string) => `/core/subject-parents/${id}`,
  archiveParent: (id: string) => `/core/subject-parents/${id}/archive`,
  restoreParent: (id: string) => `/core/subject-parents/${id}/restore`,
  subjects: "/core/subjects",
  subject: (id: string) => `/core/subjects/${id}`,
  archiveSubject: (id: string) => `/core/subjects/${id}/archive`,
} as const;
