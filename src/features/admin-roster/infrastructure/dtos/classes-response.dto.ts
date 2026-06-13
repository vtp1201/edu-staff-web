export interface ClassDto {
  id: string;
  name: string;
  gradeLevel: number;
  homeroomTeacher: string | null;
  year: string;
}

export type ClassesResponseDto = ClassDto[];
