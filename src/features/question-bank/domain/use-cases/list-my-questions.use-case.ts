import type {
  ListMyQuestionsParams,
  QuestionPage,
} from "../entities/question.entity";
import type { IQuestionBankRepository } from "../repositories/i-question-bank.repository";
import { mapRepoError } from "./map-repo-error";
import { fail, ok, type Result } from "./result";

export class ListMyQuestionsUseCase {
  constructor(private readonly repo: IQuestionBankRepository) {}

  async execute(
    params: ListMyQuestionsParams = {},
  ): Promise<Result<QuestionPage>> {
    try {
      return ok(await this.repo.listMine(params));
    } catch (err) {
      return fail(mapRepoError(err));
    }
  }
}
