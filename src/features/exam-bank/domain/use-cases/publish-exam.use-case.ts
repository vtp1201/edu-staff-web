import type { ExamBankSummary } from "../entities/exam-bank-summary.entity";
import type { ExamBankFailure } from "../failures/exam-bank.failure";
import type { IExamBankRepository } from "../repositories/i-exam-bank.repository";
import { mapRepoError } from "./map-repo-error";
import { validateQuestionsForPublish } from "./validate-questions";

export class PublishExamUseCase {
  constructor(private readonly repo: IExamBankRepository) {}

  async execute(
    id: string,
  ): Promise<
    | { ok: true; exam: ExamBankSummary }
    | { ok: false; failure: ExamBankFailure }
  > {
    try {
      const detail = await this.repo.getExamDetail(id);
      const validation = validateQuestionsForPublish(detail.questions);
      if (validation) return { ok: false, failure: validation };
      const exam = await this.repo.publishExam(id);
      return { ok: true, exam };
    } catch (err) {
      return { ok: false, failure: mapRepoError(err) };
    }
  }
}
