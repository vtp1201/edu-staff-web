import type {
  CreateQuestionInput,
  ListMyQuestionsParams,
  QuestionEntity,
  QuestionPage,
  SearchQuestionsParams,
  UpdateQuestionInput,
} from "../../entities/question.entity";
import type { IQuestionBankRepository } from "../../repositories/i-question-bank.repository";

export function makeQuestion(
  over: Partial<QuestionEntity> = {},
): QuestionEntity {
  return {
    id: "q-1",
    tenantId: "tn-1",
    authorId: "t-me",
    questionType: "ESSAY",
    subjectId: "sub-math",
    gradeLevel: "11",
    difficulty: "MEDIUM",
    body: "Nội dung câu hỏi mẫu",
    expectedAnswer: "Đáp án mẫu",
    status: "DRAFT",
    tags: [],
    createdAt: "2026-07-01T00:00:00Z",
    updatedAt: "2026-07-01T00:00:00Z",
    ...over,
  };
}

/**
 * Configurable fake repo for use-case unit tests: each method either resolves
 * with a preset value or throws a preset Error(<failureKey>).
 */
export class FakeQuestionBankRepository implements IQuestionBankRepository {
  createResult: QuestionEntity | Error = makeQuestion();
  updateResult: QuestionEntity | Error = makeQuestion();
  publishResult: QuestionEntity | Error = makeQuestion({ status: "PUBLISHED" });
  getResult: QuestionEntity | Error = makeQuestion();
  searchResult: QuestionPage | Error = { items: [], hasMore: false };
  listMineResult: QuestionPage | Error = { items: [], hasMore: false };

  lastCreateInput?: CreateQuestionInput;
  lastUpdate?: { id: string; input: UpdateQuestionInput };
  lastPublishId?: string;
  lastGetId?: string;
  lastSearchParams?: SearchQuestionsParams;
  lastListMineParams?: ListMyQuestionsParams;

  private out<T>(v: T | Error): Promise<T> {
    if (v instanceof Error) return Promise.reject(v);
    return Promise.resolve(v);
  }

  async search(params: SearchQuestionsParams): Promise<QuestionPage> {
    this.lastSearchParams = params;
    return this.out(this.searchResult);
  }
  async listMine(params: ListMyQuestionsParams): Promise<QuestionPage> {
    this.lastListMineParams = params;
    return this.out(this.listMineResult);
  }
  async create(input: CreateQuestionInput): Promise<QuestionEntity> {
    this.lastCreateInput = input;
    return this.out(this.createResult);
  }
  async getById(id: string): Promise<QuestionEntity> {
    this.lastGetId = id;
    return this.out(this.getResult);
  }
  async update(
    id: string,
    input: UpdateQuestionInput,
  ): Promise<QuestionEntity> {
    this.lastUpdate = { id, input };
    return this.out(this.updateResult);
  }
  async publish(id: string): Promise<QuestionEntity> {
    this.lastPublishId = id;
    return this.out(this.publishResult);
  }
}
