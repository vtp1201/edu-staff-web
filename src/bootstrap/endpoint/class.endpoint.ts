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
  classSubjects: (classId: string) =>
    `/core/api/v1/classes/${classId}/subjects`,
  classSubjectTeacher: (classId: string, subjectId: string) =>
    `/core/api/v1/classes/${classId}/subjects/${subjectId}/teacher`,
  /**
   * A class's GVBM (subject-teacher) assignments — `SubjectAssignmentResponse[]`,
   * UNPAGINATED (`response.OK`, one teacher per subject), readable by
   * ADMIN/SUPER_ADMIN/MANAGER or a TEACHER assigned to the class (BE US-181,
   * ground-truthed in `list_subject_assignments.go`).
   *
   * DISTINCT from {@link CLASS_EP.classSubjects} (`.../subjects`), which is the
   * curriculum `ClassSubject` offering listing (US-057) — a different aggregate
   * with a different shape. Do not substitute one for the other.
   */
  classSubjectAssignments: (classId: string) =>
    `/core/api/v1/classes/${classId}/subject-assignments`,
} as const;
// `principalTeachers: "/core/api/v1/teachers"` was REMOVED in US-E18.40: BE
// closed ask #44 by declaring that route permanently out of scope (option b,
// `docs/reports/2026-08-04-be-to-fe-response.md`). The principal teachers
// screen now reads the IAM member directory instead — see
// `bootstrap/di/principal-teachers.di.ts`.
