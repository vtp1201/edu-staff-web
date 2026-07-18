/** Core service endpoints consumed by the attendance feature (ADR `0058`,
 *  decision `0017`). Ground-truthed against
 *  `edu-api/services/core/internal/attendance` — daily, class-wide, no
 *  period/subject axis. `myClasses`/`classStudents` deliberately duplicate
 *  `TEACHER_EP`'s constants rather than importing them, keeping
 *  `features/attendance` self-contained (see `class-list-response.dto.ts`). */
export const ATTENDANCE_EP = {
  myClasses: "/core/api/v1/classes",
  classStudents: (classId: string) =>
    `/core/api/v1/classes/${encodeURIComponent(classId)}/students`,
  classAttendance: (classId: string) =>
    `/core/api/v1/classes/${encodeURIComponent(classId)}/attendance`,
} as const;
