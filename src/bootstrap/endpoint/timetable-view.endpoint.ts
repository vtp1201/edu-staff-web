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
  /** Parent's children roster. */
  myChildren: "/core/api/v1/timetable/my-children",
} as const;
