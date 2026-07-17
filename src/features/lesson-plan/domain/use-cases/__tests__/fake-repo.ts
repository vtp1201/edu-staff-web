import type {
  CreateLessonPlanInput,
  LessonPlanEntity,
  LessonPlanPage,
  ListLessonPlansBySubjectParams,
  ListMyLessonPlansParams,
  UpdateLessonPlanInput,
} from "../../entities/lesson-plan.entity";
import type { ILessonPlanRepository } from "../../repositories/i-lesson-plan.repository";

export function makePlan(
  over: Partial<LessonPlanEntity> = {},
): LessonPlanEntity {
  return {
    planId: "lp-1",
    teacherId: "t-1",
    subjectId: "sub-math",
    gradeLevel: "11",
    title: "Giáo án mẫu",
    objectives: "o",
    contentOutline: "c",
    activities: "a",
    assessmentMethod: "m",
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
export class FakeLessonPlanRepository implements ILessonPlanRepository {
  createResult: LessonPlanEntity | Error = makePlan();
  updateResult: LessonPlanEntity | Error = makePlan();
  publishResult: LessonPlanEntity | Error = makePlan({ status: "PUBLISHED" });
  getResult: LessonPlanEntity | Error = makePlan();
  listMineResult: LessonPlanPage | Error = { items: [], hasMore: false };
  listBySubjectResult: LessonPlanPage | Error = { items: [], hasMore: false };

  lastCreateInput?: CreateLessonPlanInput;
  lastUpdate?: { id: string; input: UpdateLessonPlanInput };
  lastPublishId?: string;
  lastGetId?: string;
  lastListMineParams?: ListMyLessonPlansParams;
  lastListBySubjectParams?: ListLessonPlansBySubjectParams;

  private out<T>(v: T | Error): Promise<T> {
    if (v instanceof Error) return Promise.reject(v);
    return Promise.resolve(v);
  }

  async create(input: CreateLessonPlanInput): Promise<LessonPlanEntity> {
    this.lastCreateInput = input;
    return this.out(this.createResult);
  }
  async update(
    id: string,
    input: UpdateLessonPlanInput,
  ): Promise<LessonPlanEntity> {
    this.lastUpdate = { id, input };
    return this.out(this.updateResult);
  }
  async publish(id: string): Promise<LessonPlanEntity> {
    this.lastPublishId = id;
    return this.out(this.publishResult);
  }
  async get(id: string): Promise<LessonPlanEntity> {
    this.lastGetId = id;
    return this.out(this.getResult);
  }
  async listMine(params: ListMyLessonPlansParams): Promise<LessonPlanPage> {
    this.lastListMineParams = params;
    return this.out(this.listMineResult);
  }
  async listBySubject(
    params: ListLessonPlansBySubjectParams,
  ): Promise<LessonPlanPage> {
    this.lastListBySubjectParams = params;
    return this.out(this.listBySubjectResult);
  }
}
