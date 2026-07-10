/**
 * Read-only timetable view endpoints (`core` service — mock-first, decision 0014).
 * Kept separate from the admin builder's `timetable.endpoint.ts` so the two
 * feature modules' infra stay decoupled (plan decision 3).
 */
export const TIMETABLE_VIEW_EP = {
  /** Class-scoped published timetable. */
  classTimetable: (classId: string) =>
    `/core/api/v1/timetable/class/${encodeURIComponent(classId)}`,
  /** Signed-in student's own class timetable. */
  myTimetable: "/core/api/v1/timetable/me",
  /**
   * Signed-in teacher's personal teaching schedule (self-scope, across classes).
   * BE resolves teacherId from the bearer token — consistent with `myTimetable`'s
   * `/me` convention. Plan open question #1: confirm vs. path-param form once
   * `core` ships (contract-readiness only today; mock-first, decision 0014).
   */
  teacherSchedule: "/core/api/v1/timetable/teacher/me",
  /** Parent's children roster. */
  myChildren: "/core/api/v1/timetable/my-children",
} as const;
