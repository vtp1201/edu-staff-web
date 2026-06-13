/**
 * core service — student roster / class enrollment endpoints (mock-first, decision 0014/0017).
 * Routed through Kong gateway (ADR 0030 / US-E06.3): `/core/api/v1/...`
 * → Kong strips `/core` → core receives `/api/v1/...`.
 */
export const ROSTER_EP = {
  classes: "/core/api/v1/classes",
  /** GET enrolled students; POST to enroll. `:classId` substituted at call site. */
  classStudents: "/core/api/v1/classes/:classId/students",
  /** DELETE one student from a class. `:classId` / `:studentId` substituted. */
  unenroll: "/core/api/v1/classes/:classId/students/:studentId",
  /** POST transfer { fromClassId, toClassId }. `:studentId` substituted. */
  transfer: "/core/api/v1/students/:studentId/transfer",
  /** GET candidate pool for the Add panel (students not in the target class). */
  searchPool: "/core/api/v1/students/unassigned",
} as const;

export function classStudentsPath(classId: string): string {
  return ROSTER_EP.classStudents.replace(":classId", classId);
}

export function unenrollPath(classId: string, studentId: string): string {
  return ROSTER_EP.unenroll
    .replace(":classId", classId)
    .replace(":studentId", studentId);
}

export function transferPath(studentId: string): string {
  return ROSTER_EP.transfer.replace(":studentId", studentId);
}
