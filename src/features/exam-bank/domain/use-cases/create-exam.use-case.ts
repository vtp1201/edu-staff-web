import type { ExamBankDetail } from "../entities/exam-bank-detail.entity";
import type { CreateExamInput } from "../entities/exam-bank-input.entity";
import type { ExamBankFailure } from "../failures/exam-bank.failure";
import type { IExamBankRepository } from "../repositories/i-exam-bank.repository";
import { mapRepoError } from "./map-repo-error";

export class CreateExamUseCase {
  constructor(private readonly repo: IExamBankRepository) {}

  async execute(
    input: CreateExamInput,
  ): Promise<
    { ok: true; exam: ExamBankDetail } | { ok: false; failure: ExamBankFailure }
  > {
    if (!input.title?.trim()) {
      return { ok: false, failure: { type: "missing-title" } };
    }
    try {
      const exam = await this.repo.createExam(input);
      return { ok: true, exam };
    } catch (err) {
      return { ok: false, failure: mapRepoError(err) };
    }
  }
}
