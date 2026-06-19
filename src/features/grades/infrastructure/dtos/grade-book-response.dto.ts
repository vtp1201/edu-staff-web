export interface GradeBookRowDto {
  studentId: string;
  studentName: string;
  studentCode: string;
  scores: Record<string, number | null>;
  average: number | null;
  conductGrade: "Tot" | "Kha" | "TB" | "Yeu";
  publishStatus: "DRAFT" | "PENDING_APPROVAL" | "PUBLISHED";
}

export interface GradeBookResponseDto {
  classSubjectId: string;
  term: string;
  className: string;
  subjectName: string;
  rows: GradeBookRowDto[];
}
