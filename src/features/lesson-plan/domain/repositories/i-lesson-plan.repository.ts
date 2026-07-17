import type {
  CreateLessonPlanInput,
  LessonPlanEntity,
  LessonPlanPage,
  ListLessonPlansBySubjectParams,
  ListMyLessonPlansParams,
  UpdateLessonPlanInput,
} from "../entities/lesson-plan.entity";

/**
 * Lesson-plan repository port (DIP). Throwing-repo idiom (same as exam-bank):
 * on failure a method throws `new Error(<failureKey>)` where the message is a
 * `LessonPlanFailure["type"]`; the use-case catches it and rebuilds the typed
 * failure via `mapRepoError`. 6 methods, one per INT-118-0x endpoint.
 */
export interface ILessonPlanRepository {
  create(input: CreateLessonPlanInput): Promise<LessonPlanEntity>; // INT-118-01
  listMine(params: ListMyLessonPlansParams): Promise<LessonPlanPage>; // INT-118-02
  listBySubject(
    params: ListLessonPlansBySubjectParams,
  ): Promise<LessonPlanPage>; // INT-118-03
  get(id: string): Promise<LessonPlanEntity>; // INT-118-04
  update(id: string, input: UpdateLessonPlanInput): Promise<LessonPlanEntity>; // INT-118-05
  publish(id: string): Promise<LessonPlanEntity>; // INT-118-06
}
