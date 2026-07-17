import type {
  QuestionPage,
  SearchQuestionsParams,
} from "../entities/question.entity";
import type { IQuestionBankRepository } from "../repositories/i-question-bank.repository";
import { isSearchFilterSatisfied } from "./is-search-filter-satisfied";
import { mapRepoError } from "./map-repo-error";
import { fail, ok, type Result } from "./result";

export class SearchQuestionsUseCase {
  constructor(private readonly repo: IQuestionBankRepository) {}

  async execute(params: SearchQuestionsParams): Promise<Result<QuestionPage>> {
    // Mandatory-filter gate (FR-002): never invoke the repo when neither a
    // subject nor a tag is set — mirror the BE 422 as the same failure key so
    // presentation renders the required-filter prompt, not a generic error.
    if (!isSearchFilterSatisfied(params.subjectId ?? "", params.tag ?? "")) {
      return fail({ type: "search-filter-required" });
    }
    try {
      return ok(await this.repo.search(params));
    } catch (err) {
      return fail(mapRepoError(err));
    }
  }
}
