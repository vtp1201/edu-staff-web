import type { ExamBankStatus } from "./exam-bank-summary.entity";

export interface ExamBankFilter {
  subjectId?: string;
  status?: ExamBankStatus;
  search?: string;
  teacherId?: string;
}
