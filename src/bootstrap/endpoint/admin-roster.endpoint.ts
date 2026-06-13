/** core service — student roster / class enrollment endpoints (mock-first, decision 0014/0017). */
export const ROSTER_EP = {
  classes: "/core/classes",
  /** GET enrolled students; POST to enroll. `:classId` substituted at call site. */
  classStudents: "/core/classes/:classId/students",
  /** DELETE one student from a class. `:classId` / `:studentId` substituted. */
  unenroll: "/core/classes/:classId/students/:studentId",
  /** POST transfer { fromClassId, toClassId }. `:studentId` substituted. */
  transfer: "/core/students/:studentId/transfer",
  /** GET candidate pool for the Add panel (students not in the target class). */
  searchPool: "/core/students/unassigned",
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
