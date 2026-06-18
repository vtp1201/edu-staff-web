import type { ExamBankQuestion } from "./exam-bank-question.entity";
import type { ExamBankSummary } from "./exam-bank-summary.entity";

export interface ExamBankDetail extends ExamBankSummary {
  questions: ExamBankQuestion[];
}
