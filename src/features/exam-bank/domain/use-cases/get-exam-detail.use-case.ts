import type { ExamBankDetail } from "../entities/exam-bank-detail.entity";
import type { IExamBankRepository } from "../repositories/i-exam-bank.repository";

export class GetExamDetailUseCase {
  constructor(private readonly repo: IExamBankRepository) {}

  async execute(id: string): Promise<ExamBankDetail> {
    return this.repo.getExamDetail(id);
  }
}
