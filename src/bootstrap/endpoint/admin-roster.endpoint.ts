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
 * NOTE (US-E18.5): the roster LISTING (`classStudents`, `GET`) and the search
 * pool are BOTH permanently mock-first — not just the search pool as previously
 * framed. The real wire `EnrollmentResponse` (`GET .../students`) carries only
 * `enrollmentId`/`classId`/`studentMemberId`/`academicYearLabel`/`enrolledAt` —
 * no student name/DOB/gender/status — and IAM has no public batch/by-id profile
 * lookup (no `gender` field anywhere), so it cannot be joined into a readable
 * roster table. The DI factory delegates `getClassRoster`/`getSearchPool` to
 * the mock repo regardless of `USE_MOCK` (cross-repo ask #9, EPIC-OVERVIEW.md).
 * `classStudents` (POST enroll) and `unenroll` (DELETE) ARE wired real.
 */
export const ROSTER_EP = {
  classes: "/core/api/v1/classes",
  class: (classId: string) => `/core/api/v1/classes/${classId}`,
  /** GET enrolled students; POST to enroll. Build path with classStudentsPath(). */
  classStudents: "/core/api/v1/classes/:classId/students",
  /** DELETE one student from a class. Build path with unenrollPath(). */
  unenroll: "/core/api/v1/classes/:classId/students/:studentMemberId",
  /**
   * Search pool for the Add-panel: NO core endpoint exists for this query
   * (`/students/unassigned` is a placeholder). Permanently mock-first — the DI
   * factory always delegates `getSearchPool` to the mock repo (US-E18.5,
   * cross-repo ask #9). Kept here only as documentation of the missing endpoint.
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
