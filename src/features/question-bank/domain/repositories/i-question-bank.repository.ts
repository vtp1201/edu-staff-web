import type {
  CreateQuestionInput,
  ListMyQuestionsParams,
  QuestionEntity,
  QuestionPage,
  SearchQuestionsParams,
  UpdateQuestionInput,
} from "../entities/question.entity";

/**
 * Question-bank repository port (DIP). Throwing-repo idiom (same as
 * lesson-plan): on failure a method throws `new Error(<failureKey>)` where the
 * message is a `QuestionBankFailure["type"]`; the use-case catches it and
 * rebuilds the typed failure via `mapRepoError`. 6 methods, one per
 * INT-201..206 endpoint.
 */
export interface IQuestionBankRepository {
  search(params: SearchQuestionsParams): Promise<QuestionPage>; // INT-201
  listMine(params: ListMyQuestionsParams): Promise<QuestionPage>; // INT-202
  create(input: CreateQuestionInput): Promise<QuestionEntity>; // INT-203
  getById(id: string): Promise<QuestionEntity>; // INT-204
  update(id: string, input: UpdateQuestionInput): Promise<QuestionEntity>; // INT-205
  publish(id: string): Promise<QuestionEntity>; // INT-206
}
