/**
 * core service — class management endpoints (mock-first until `core` exists,
 * decision 0014/0017). Routed through Kong gateway (ADR 0030 / US-E06.3):
 * `/core/api/v1/...` → Kong strips `/core` → core receives `/api/v1/...`.
 */
export const CLASS_EP = {
  classes: "/core/api/v1/classes",
  class: (classId: string) => `/core/api/v1/classes/${classId}`,
  classArchive: (classId: string) => `/core/api/v1/classes/${classId}/archive`,
  classHomeroomTeacher: (classId: string) =>
    `/core/api/v1/classes/${classId}/homeroom-teacher`,
  classStudents: (classId: string) =>
    `/core/api/v1/classes/${classId}/students`,
  classSubjects: (classId: string) =>
    `/core/api/v1/classes/${classId}/subjects`,
  classSubjectTeacher: (classId: string, subjectId: string) =>
    `/core/api/v1/classes/${classId}/subjects/${subjectId}/teacher`,
  principalTeachers: "/core/api/v1/teachers",
} as const;
