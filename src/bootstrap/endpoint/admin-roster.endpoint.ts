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
  /**
   * ONE enrollment row: DELETE = unenroll (build with unenrollPath()).
   *
   * The GET on this same path used to be the academic-record viewer's
   * `classId → academicYearLabel` source (US-E18.54) — the only class-context
   * read whose RBAC covers a STUDENT, but which admits no PARENT. US-E18.56
   * deleted that join outright: BE denormalized `academicYear` onto every
   * academic-record row (ask #47 / migration 051), so nothing in this app reads
   * this path with GET any more and the `studentEnrollmentPath()` builder is
   * gone with it. Re-add a builder here (do not inline the string) if a future
   * screen genuinely needs the single-enrollment read.
   */
  unenroll: "/core/api/v1/classes/:classId/students/:studentMemberId",
  /**
   * Enrolled-student ids for ONE academic year (`?academicYear=2025-2026`):
   * tenant-wide, deduplicated, ids-only, UNPAGINATED (BE US-182 / `edu-api`
   * ADR 0125; ADMIN/SUPER_ADMIN/MANAGER). Plain unwrapped GET — there is no
   * `meta.pagination` on this response, so no `raw: true`.
   *
   * This is HALF of the Add-panel search pool, which core deliberately does NOT
   * expose as one endpoint: BE's answer to ask #9 is FE-COMPOSE, so
   * pool = IAM's STUDENT directory (`GET /iam/api/v1/tenants/{id}/members?
   * role=STUDENT`, fully drained) MINUS this id set. The composition lives in
   * `bootstrap/di/admin-roster.di.ts` (decision 0017). The former placeholder
   * `searchPool: "/core/api/v1/students/unassigned"` never existed on any
   * server and is DELETED (US-E18.41).
   *
   * Accepted BE caveat: an ARCHIVED class still holds its enrollments, so its
   * students stay in this set and do NOT re-appear in the pool.
   */
  enrolledStudentIds: "/core/api/v1/enrollments/student-ids",
} as const;

export function classStudentsPath(classId: string): string {
  return ROSTER_EP.classStudents.replace(":classId", classId);
}

export function unenrollPath(classId: string, studentMemberId: string): string {
  return ROSTER_EP.unenroll
    .replace(":classId", classId)
    .replace(":studentMemberId", studentMemberId);
}
