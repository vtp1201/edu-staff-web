export interface ClassSubjectResponseDto {
  id: string;
  classId: string;
  subjectId: string;
  subjectName: string;
  teacherId: string | null;
  teacherName: string | null;
}
