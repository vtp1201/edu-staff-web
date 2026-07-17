import "server-only";
import type { AxiosInstance } from "axios";
import { QUESTION_BANK_EP } from "@/bootstrap/endpoint/lms.endpoint";
import { type ApiEnvelope, parseEnvelope } from "@/bootstrap/lib/api-envelope";
import type {
  CreateQuestionInput,
  ListMyQuestionsParams,
  QuestionEntity,
  QuestionPage,
  SearchQuestionsParams,
  UpdateQuestionInput,
} from "../../domain/entities/question.entity";
import type { IQuestionBankRepository } from "../../domain/repositories/i-question-bank.repository";
import type {
  ListQuestionsResponseDto,
  QuestionResponseDto,
} from "../dtos/question-response.dto";
import { mapQuestion } from "../mappers/question.mapper";
import { mapQuestionBankApiError } from "./map-question-bank-error";

/**
 * Real `core` `exercisebank` repository (US-E11.9). The http interceptor
 * unwraps the envelope, so single-resource calls receive the payload directly
 * (`as unknown as <Dto>`, no `.data`). List calls use `{ raw: true }` — a
 * TOP-LEVEL sibling of `params`, never nested inside it (nesting silently skips
 * envelope-parse — regression class US-E18.2/19) — then `parseEnvelope()` to
 * read `meta.pagination`.
 *
 * Errors map by `code` + a FIXED per-method `callSite` (the mandatory
 * `forbidden-browse` vs `forbidden-edit` disambiguation, spec §6.4): the three
 * read/create methods pass `"browse"`; `update`/`publish` pass `"edit"`. The
 * mapped failure key is re-thrown (throwing-repo idiom → domain `mapRepoError`).
 */
export class QuestionBankRepository implements IQuestionBankRepository {
  constructor(private readonly http: AxiosInstance) {}

  private async fetchPage(
    url: string,
    params: Record<string, string>,
  ): Promise<QuestionPage> {
    const env = (await this.http.get(url, {
      params,
      raw: true,
    })) as unknown as ApiEnvelope<ListQuestionsResponseDto>;
    const { data, pagination } = parseEnvelope(env);
    return {
      items: (data.items ?? []).map(mapQuestion),
      nextCursor:
        pagination?.hasMore && pagination.nextCursor
          ? pagination.nextCursor
          : undefined,
      hasMore: pagination?.hasMore ?? false,
    };
  }

  async search(params: SearchQuestionsParams): Promise<QuestionPage> {
    try {
      const q: Record<string, string> = {};
      if (params.subjectId) q.subjectId = params.subjectId;
      if (params.tag) q.tag = params.tag;
      if (params.gradeLevel) q.gradeLevel = params.gradeLevel;
      if (params.difficulty) q.difficulty = params.difficulty;
      if (params.cursor) q.cursor = params.cursor;
      if (params.limit != null) q.limit = String(params.limit);
      return await this.fetchPage(QUESTION_BANK_EP.search, q);
    } catch (err) {
      throw new Error(mapQuestionBankApiError(err, "browse"));
    }
  }

  async listMine(params: ListMyQuestionsParams): Promise<QuestionPage> {
    try {
      const q: Record<string, string> = {};
      if (params.cursor) q.cursor = params.cursor;
      if (params.limit != null) q.limit = String(params.limit);
      return await this.fetchPage(QUESTION_BANK_EP.list, q);
    } catch (err) {
      throw new Error(mapQuestionBankApiError(err, "browse"));
    }
  }

  async create(input: CreateQuestionInput): Promise<QuestionEntity> {
    try {
      const dto = (await this.http.post(
        QUESTION_BANK_EP.list,
        input,
      )) as unknown as QuestionResponseDto;
      return mapQuestion(dto);
    } catch (err) {
      throw new Error(mapQuestionBankApiError(err, "browse"));
    }
  }

  async getById(id: string): Promise<QuestionEntity> {
    try {
      const dto = (await this.http.get(
        QUESTION_BANK_EP.detail(id),
      )) as unknown as QuestionResponseDto;
      return mapQuestion(dto);
    } catch (err) {
      // getById's only 403 is the distinct QUESTION_NOT_VISIBLE code — the
      // "browse" call-site is irrelevant to it (never hits the forbidden branch).
      throw new Error(mapQuestionBankApiError(err, "browse"));
    }
  }

  async update(
    id: string,
    input: UpdateQuestionInput,
  ): Promise<QuestionEntity> {
    try {
      const dto = (await this.http.put(
        QUESTION_BANK_EP.detail(id),
        input,
      )) as unknown as QuestionResponseDto;
      return mapQuestion(dto);
    } catch (err) {
      throw new Error(mapQuestionBankApiError(err, "edit"));
    }
  }

  async publish(id: string): Promise<QuestionEntity> {
    try {
      // No body — the actor (owner) comes from the JWT session (INT-206).
      const dto = (await this.http.put(
        QUESTION_BANK_EP.publish(id),
      )) as unknown as QuestionResponseDto;
      return mapQuestion(dto);
    } catch (err) {
      throw new Error(mapQuestionBankApiError(err, "edit"));
    }
  }
}
