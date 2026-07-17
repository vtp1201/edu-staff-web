import type {
  CreateQuestionInput,
  QuestionEntity,
} from "../entities/question.entity";
import type { IQuestionBankRepository } from "../repositories/i-question-bank.repository";
import { mapRepoError } from "./map-repo-error";
import { fail, ok, type Result } from "./result";
import { validateWriteInput } from "./validate-question";

export class CreateQuestionUseCase {
  constructor(private readonly repo: IQuestionBankRepository) {}

  async execute(input: CreateQuestionInput): Promise<Result<QuestionEntity>> {
    const invalid = validateWriteInput(input);
    if (invalid) return fail(invalid);
    try {
      return ok(await this.repo.create(input));
    } catch (err) {
      return fail(mapRepoError(err));
    }
  }
}
