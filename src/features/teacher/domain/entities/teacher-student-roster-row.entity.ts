/**
 * One row of the teacher's cross-class student roster. Distinct from
 * `TeacherRosterStudent` (the per-class entity) because it carries the class it
 * was found in — the aggregating use-case injects that, since the per-class
 * roster entity has no class field.
 */
export interface TeacherStudentRosterRow {
  studentMemberId: string;
  displayName: string;
  classId: string;
  className: string;
  status: "active" | "transferred";
}

/**
 * The aggregate returned by `ListMyStudentsUseCase`. `failedClassCount` makes a
 * partial degrade visible instead of silently dropping data: the screen renders
 * the classes that DID resolve and announces how many did not.
 */
export interface TeacherStudentsRoster {
  rows: TeacherStudentRosterRow[];
  /** Number of classes whose roster fetch failed (0 = fully loaded). */
  failedClassCount: number;
}
