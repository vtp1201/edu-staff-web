// 3-value lifecycle mirroring the real core contract (DRAFT → PUBLISHED →
// CONFIDENTIAL, terminal — US-E18.15/ADR 0056). Mock seeds only draft/published;
// `confidential` appears only from the real wire (admin-visible).
export type ExamBankStatus = "draft" | "published" | "confidential";

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
