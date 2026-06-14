export interface ClassResponseDto {
  id: string;
  name: string;
  gradeLevel: number;
  status: "ACTIVE" | "ARCHIVED";
  academicYear: string;
  studentCount: number;
  homeroomTeacherId: string | null;
  homeroomTeacherName: string | null;
}

export interface ClassListResponseDto {
  items: ClassResponseDto[];
}
