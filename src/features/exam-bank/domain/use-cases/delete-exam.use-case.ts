import type { ExamBankFailure } from "../failures/exam-bank.failure";
import type { IExamBankRepository } from "../repositories/i-exam-bank.repository";
import { mapRepoError } from "./map-repo-error";

export class DeleteExamUseCase {
  constructor(private readonly repo: IExamBankRepository) {}

  async execute(
    id: string,
  ): Promise<{ ok: true } | { ok: false; failure: ExamBankFailure }> {
    if (!id?.trim()) return { ok: false, failure: { type: "not-found" } };
    try {
      const detail = await this.repo.getExamDetail(id);
      if (detail.status === "published") {
        return { ok: false, failure: { type: "cannot-delete-published" } };
      }
      await this.repo.deleteExam(id);
      return { ok: true };
    } catch (err) {
      return { ok: false, failure: mapRepoError(err) };
    }
  }
}
