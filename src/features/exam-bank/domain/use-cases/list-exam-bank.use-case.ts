import type { ExamBankFilter } from "../entities/exam-bank-filter.entity";
import type { ExamBankSummary } from "../entities/exam-bank-summary.entity";
import type { IExamBankRepository } from "../repositories/i-exam-bank.repository";

export class ListExamBankUseCase {
  constructor(private readonly repo: IExamBankRepository) {}

  async execute(filter: ExamBankFilter = {}): Promise<ExamBankSummary[]> {
    return this.repo.listExamBank(filter);
  }
}
