/**
 * core service — student roster / class enrollment endpoints (US-E06.7).
 * Routed through Kong gateway (ADR 0030 / US-E06.3): `/core/api/v1/...`
 * → Kong strips `/core` → core receives `/api/v1/...`.
 *
 * NOTE: There is NO dedicated transfer endpoint in the core service.
 * Transfer = unenroll from old class (DELETE) + enroll in new class (POST).
 * The `ROSTER_STUDENT_ALREADY_ENROLLED` (409) response from POST enroll signals
 * that the student is already in another class (transfer-warning UX, TR-032).
 *
 * NOTE: Search pool (students not yet in any class) is mock-first (TR-033).
 * No core endpoint exists for this query yet (decision 0014).
 */
export const ROSTER_EP = {
  classes: "/core/api/v1/classes",
  class: (classId: string) => `/core/api/v1/classes/${classId}`,
  /** GET enrolled students; POST to enroll. Build path with classStudentsPath(). */
  classStudents: "/core/api/v1/classes/:classId/students",
  /** DELETE one student from a class. Build path with unenrollPath(). */
  unenroll: "/core/api/v1/classes/:classId/students/:studentMemberId",
  /**
   * Search pool for the Add-panel: mock-first until a core/IAM endpoint exists.
   * Guarded by USE_MOCK in the DI factory (TR-033, decision 0014).
   */
  searchPool: "/core/api/v1/students/unassigned",
} as const;

export function classStudentsPath(classId: string): string {
  return ROSTER_EP.classStudents.replace(":classId", classId);
}

export function unenrollPath(classId: string, studentMemberId: string): string {
  return ROSTER_EP.unenroll
    .replace(":classId", classId)
    .replace(":studentMemberId", studentMemberId);
}
