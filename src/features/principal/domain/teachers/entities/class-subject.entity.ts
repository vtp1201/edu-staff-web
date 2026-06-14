export interface PrincipalClassSubject {
  id: string; // classSubjectId
  classId: string;
  subjectId: string;
  subjectName: string;
  teacherId: string | null;
  teacherName: string | null;
}
