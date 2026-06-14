export type TeacherStatus = "ACTIVE" | "ON_LEAVE";

export interface SubjectAssignment {
  classSubjectId: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  hasConflict: boolean;
}

export interface PrincipalTeacher {
  teacherId: string;
  displayName: string;
  email: string;
  primarySubjectName: string | null;
  homeroomClassId: string | null;
  homeroomClassName: string | null;
  subjectAssignments: SubjectAssignment[];
  status: TeacherStatus;
}
