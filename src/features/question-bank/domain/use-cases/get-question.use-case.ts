import type { QuestionEntity } from "../entities/question.entity";
import type { IQuestionBankRepository } from "../repositories/i-question-bank.repository";
import { mapRepoError } from "./map-repo-error";
import { fail, ok, type Result } from "./result";

export class GetQuestionUseCase {
  constructor(private readonly repo: IQuestionBankRepository) {}

  async execute(id: string): Promise<Result<QuestionEntity>> {
    try {
      return ok(await this.repo.getById(id));
    } catch (err) {
      return fail(mapRepoError(err));
    }
  }
}
