import type { ExamBankDetail } from "../entities/exam-bank-detail.entity";
import type { ExamBankFilter } from "../entities/exam-bank-filter.entity";
import type {
  CreateExamInput,
  UpdateExamInput,
} from "../entities/exam-bank-input.entity";
import type { ExamBankSummary } from "../entities/exam-bank-summary.entity";

export interface IExamBankRepository {
  listExamBank(filter: ExamBankFilter): Promise<ExamBankSummary[]>;
  getExamDetail(id: string): Promise<ExamBankDetail>;
  createExam(input: CreateExamInput): Promise<ExamBankDetail>;
  updateExam(id: string, input: UpdateExamInput): Promise<ExamBankDetail>;
  publishExam(id: string): Promise<ExamBankSummary>;
  deleteExam(id: string): Promise<void>;
}
