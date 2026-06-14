/** A student enrolled in one of the teacher's classes (read-only roster view). */
export interface TeacherRosterStudent {
  enrollmentId: string;
  studentMemberId: string;
  /** Display name — may be a mock value if BE doesn't return it yet. */
  displayName: string;
  academicYearLabel: string;
  enrolledAt: string;
  status: "active" | "transferred";
}
