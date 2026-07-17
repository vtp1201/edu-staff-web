import "server-only";
import type { AxiosInstance } from "axios";
import { LESSON_PLAN_EP } from "@/bootstrap/endpoint/lesson-plan.endpoint";
import { type ApiEnvelope, parseEnvelope } from "@/bootstrap/lib/api-envelope";
import type {
  CreateLessonPlanInput,
  LessonPlanEntity,
  LessonPlanPage,
  ListLessonPlansBySubjectParams,
  ListMyLessonPlansParams,
  UpdateLessonPlanInput,
} from "../../domain/entities/lesson-plan.entity";
import type { ILessonPlanRepository } from "../../domain/repositories/i-lesson-plan.repository";
import type {
  LessonPlanResponseDto,
  ListLessonPlansResponseDto,
} from "../dtos/lesson-plan-response.dto";
import { mapLessonPlan } from "../mappers/lesson-plan.mapper";
import { mapLessonPlanApiError } from "./map-lesson-plan-error";

/**
 * Real `core` lessonplan repository (US-E11.8). The http interceptor unwraps the
 * envelope, so single-resource calls receive the payload directly
 * (`as unknown as <Dto>`, no `.data`). List calls use `{ raw: true }` — a
 * TOP-LEVEL sibling of `params`, never nested inside it (nesting silently skips
 * envelope-parse — regression class US-E18.2/19) — then `parseEnvelope()` to read
 * `meta.pagination`. Errors map by `code` (`mapLessonPlanApiError`), then the
 * failure key is re-thrown (throwing-repo idiom → domain `mapRepoError`).
 */
export class LessonPlanRepository implements ILessonPlanRepository {
  constructor(private readonly http: AxiosInstance) {}

  private async fetchPage(
    url: string,
    params: Record<string, string>,
  ): Promise<LessonPlanPage> {
    const env = (await this.http.get(url, {
      params,
      raw: true,
    })) as unknown as ApiEnvelope<ListLessonPlansResponseDto>;
    const { data, pagination } = parseEnvelope(env);
    return {
      items: (data.items ?? []).map(mapLessonPlan),
      nextCursor:
        pagination?.hasMore && pagination.nextCursor
          ? pagination.nextCursor
          : undefined,
      hasMore: pagination?.hasMore ?? false,
    };
  }

  async create(input: CreateLessonPlanInput): Promise<LessonPlanEntity> {
    try {
      const dto = (await this.http.post(
        LESSON_PLAN_EP.create,
        input,
      )) as unknown as LessonPlanResponseDto;
      return mapLessonPlan(dto);
    } catch (err) {
      throw new Error(mapLessonPlanApiError(err));
    }
  }

  async listMine(params: ListMyLessonPlansParams): Promise<LessonPlanPage> {
    try {
      const q: Record<string, string> = {};
      if (params.cursor) q.cursor = params.cursor;
      if (params.limit != null) q.limit = String(params.limit);
      return await this.fetchPage(LESSON_PLAN_EP.list, q);
    } catch (err) {
      throw new Error(mapLessonPlanApiError(err));
    }
  }

  async listBySubject(
    params: ListLessonPlansBySubjectParams,
  ): Promise<LessonPlanPage> {
    try {
      const q: Record<string, string> = {};
      if (params.tag) q.tag = params.tag;
      if (params.cursor) q.cursor = params.cursor;
      if (params.limit != null) q.limit = String(params.limit);
      return await this.fetchPage(
        LESSON_PLAN_EP.bySubject(params.subjectId),
        q,
      );
    } catch (err) {
      throw new Error(mapLessonPlanApiError(err));
    }
  }

  async get(id: string): Promise<LessonPlanEntity> {
    try {
      const dto = (await this.http.get(
        LESSON_PLAN_EP.detail(id),
      )) as unknown as LessonPlanResponseDto;
      return mapLessonPlan(dto);
    } catch (err) {
      throw new Error(mapLessonPlanApiError(err));
    }
  }

  async update(
    id: string,
    input: UpdateLessonPlanInput,
  ): Promise<LessonPlanEntity> {
    try {
      const dto = (await this.http.put(
        LESSON_PLAN_EP.update(id),
        input,
      )) as unknown as LessonPlanResponseDto;
      return mapLessonPlan(dto);
    } catch (err) {
      throw new Error(mapLessonPlanApiError(err));
    }
  }

  async publish(id: string): Promise<LessonPlanEntity> {
    try {
      // No body — the actor (owner) comes from the JWT session (INT-118-06).
      const dto = (await this.http.put(
        LESSON_PLAN_EP.publish(id),
      )) as unknown as LessonPlanResponseDto;
      return mapLessonPlan(dto);
    } catch (err) {
      throw new Error(mapLessonPlanApiError(err));
    }
  }
}
