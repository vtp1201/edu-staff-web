export interface TeacherRosterStudentVM {
  enrollmentId: string;
  displayName: string;
  /** studentMemberId, shown to the teacher as the student code. */
  studentCode: string;
  status: "active" | "transferred";
}

export interface TeacherClassStudentsScreenVM {
  /** "ready" → render the table (possibly empty). "error" → error message. */
  status: "ready" | "error";
  className: string;
  /** App-relative route back to the class list (breadcrumb link). */
  classesHref: string;
  students: TeacherRosterStudentVM[];
}
