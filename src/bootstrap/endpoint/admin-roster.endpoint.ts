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
 * NOTE (US-E18.35): the roster LISTING (`classStudents`, `GET`) is REAL. The
 * wire `EnrollmentResponse` still carries only `enrollmentId`/`classId`/
 * `studentMemberId`/`academicYearLabel`/`enrolledAt` — it is the authority for
 * WHICH students are enrolled — and the display fields now come from IAM's
 * batch member lookup (`GET /members?ids=`, US-144/ADR-0120/US-169: displayName
 * + staff-tier dob/gender), joined in `bootstrap/di/admin-roster.di.ts`. This
 * retires the US-E18.5 force-mock of `getClassRoster` (cross-repo ask #7/#9).
 * `classStudents` (POST enroll) and `unenroll` (DELETE) were already real.
 *
 * Two wire gaps remain and are handled by ABSENCE, never by invention:
 * - no `status` field anywhere — unenroll/transfer hard-delete the enrollment
 *   row, so every row returned IS a current enrollment (`status: "active"`);
 * - no student CODE ("mã học sinh") in any core/IAM contract — the column
 *   renders a placeholder rather than the member uuid.
 */
export const ROSTER_EP = {
  classes: "/core/api/v1/classes",
  class: (classId: string) => `/core/api/v1/classes/${classId}`,
  /**
   * GET enrolled students (cursor-paginated, `limit` ≤ 100); POST to enroll.
   * Build the path with classStudentsPath().
   */
  classStudents: "/core/api/v1/classes/:classId/students",
  /** DELETE one student from a class. Build path with unenrollPath(). */
  unenroll: "/core/api/v1/classes/:classId/students/:studentMemberId",
  /**
   * Search pool for the Add-panel: NO core endpoint exists for this query
   * (`/students/unassigned` is a placeholder). Still permanently mock-first
   * after US-E18.35 — this is a MISSING-ENDPOINT gap, unrelated to the
   * display-field gap that story closed, and an IAM lookup BY ID cannot
   * enumerate candidates. The DI factory always delegates `getSearchPool` to
   * the mock repo (US-E18.5, cross-repo ask #9). Kept here only as
   * documentation of the missing endpoint.
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
