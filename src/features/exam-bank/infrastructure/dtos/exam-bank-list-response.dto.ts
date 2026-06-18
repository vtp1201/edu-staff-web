export interface ExamBankSummaryDto {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  totalQuestions: number;
  durationMinutes: number;
  maxAttempts: number;
  status: "draft" | "published";
  createdAt: string;
}

export interface ExamBankListResponseDto {
  items: ExamBankSummaryDto[];
}
