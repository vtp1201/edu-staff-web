export type ExamBankStatus = "draft" | "published";

export interface ExamBankSummary {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  totalQuestions: number;
  durationMinutes: number;
  maxAttempts: number;
  status: ExamBankStatus;
  createdAt: string;
}
