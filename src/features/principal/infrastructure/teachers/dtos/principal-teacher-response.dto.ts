export interface SubjectAssignmentDto {
  classSubjectId: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  hasConflict: boolean;
}

export interface PrincipalTeacherResponseDto {
  teacherId: string;
  displayName: string;
  email: string;
  primarySubjectName: string | null;
  homeroomClassId: string | null;
  homeroomClassName: string | null;
  subjectAssignments: SubjectAssignmentDto[];
  status: "ACTIVE" | "ON_LEAVE";
}
