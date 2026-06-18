export interface StudentScoreRowDto {
  studentId: string;
  studentName: string;
  studentCode: string;
  scores: Record<string, number | null>;
  average: number | null;
  publishStatus: string;
}

export interface GradeSheetResponseDto {
  classSubjectId: string;
  term: string;
  rows: StudentScoreRowDto[];
}
