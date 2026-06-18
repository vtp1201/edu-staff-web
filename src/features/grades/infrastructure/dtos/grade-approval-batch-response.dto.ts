/** Wire shapes for the grade-approval pipeline (camelCase per BE contract). */
export interface GradeApprovalBatchDto {
  id: string;
  className: string;
  subjectName: string;
  teacherName: string;
  term: string;
  studentCount: number;
  status: string;
  updatedAt: string;
}

export interface BatchScorePreviewRowDto {
  studentName: string;
  studentCode: string;
  average: number | null;
}

export interface GradeApprovalBatchDetailDto extends GradeApprovalBatchDto {
  averageScore: number | null;
  previewRows: BatchScorePreviewRowDto[];
}
