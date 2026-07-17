import "server-only";
import { mockDelay } from "@/bootstrap/lib/mock";
import type {
  CreateLessonPlanInput,
  LessonPlanEntity,
  LessonPlanPage,
  ListLessonPlansBySubjectParams,
  ListMyLessonPlansParams,
  UpdateLessonPlanInput,
} from "../../../domain/entities/lesson-plan.entity";
import type { ILessonPlanRepository } from "../../../domain/repositories/i-lesson-plan.repository";
import { MOCK_CURRENT_TEACHER_ID, MOCK_LESSON_PLANS } from "./fixtures";

const DEFAULT_LIMIT = 6;

// Module-level mutable store (mock-first wiring pattern — mutate-in-place so
// toggling NEXT_PUBLIC_USE_MOCK off requires zero UI change).
const store = new Map<string, LessonPlanEntity>(
  MOCK_LESSON_PLANS.map((p) => [p.planId, { ...p }]),
);
let idCounter = 100;

/** Trivial index-based cursor sufficient to exercise useInfiniteQuery wiring. */
function paginate(
  all: LessonPlanEntity[],
  cursor: string | undefined,
  limit: number,
): LessonPlanPage {
  const start = cursor ? Number.parseInt(cursor, 10) : 0;
  if (Number.isNaN(start) || start < 0) throw new Error("invalid-cursor");
  const slice = all.slice(start, start + limit);
  const nextIndex = start + limit;
  const hasMore = nextIndex < all.length;
  return {
    items: slice.map((p) => structuredClone(p)),
    nextCursor: hasMore ? String(nextIndex) : undefined,
    hasMore,
  };
}

function byUpdatedDesc(a: LessonPlanEntity, b: LessonPlanEntity): number {
  return b.updatedAt.localeCompare(a.updatedAt);
}

export class MockLessonPlanRepository implements ILessonPlanRepository {
  async create(input: CreateLessonPlanInput): Promise<LessonPlanEntity> {
    await mockDelay(300);
    idCounter += 1;
    const now = new Date().toISOString();
    const plan: LessonPlanEntity = {
      planId: `lp-mock-${idCounter}`,
      teacherId: MOCK_CURRENT_TEACHER_ID,
      subjectId: input.subjectId,
      gradeLevel: input.gradeLevel,
      title: input.title,
      objectives: input.objectives ?? "",
      contentOutline: input.contentOutline ?? "",
      activities: input.activities ?? "",
      assessmentMethod: input.assessmentMethod ?? "",
      status: "DRAFT",
      tags: input.tags ?? [],
      // publishedAt intentionally absent for DRAFT.
      createdAt: now,
      updatedAt: now,
    };
    store.set(plan.planId, plan);
    return structuredClone(plan);
  }

  async listMine(params: ListMyLessonPlansParams): Promise<LessonPlanPage> {
    await mockDelay(200);
    const mine = Array.from(store.values())
      .filter((p) => p.teacherId === MOCK_CURRENT_TEACHER_ID)
      .sort(byUpdatedDesc);
    return paginate(mine, params.cursor, params.limit ?? DEFAULT_LIMIT);
  }

  async listBySubject(
    params: ListLessonPlansBySubjectParams,
  ): Promise<LessonPlanPage> {
    await mockDelay(200);
    let items = Array.from(store.values())
      .filter(
        (p) => p.subjectId === params.subjectId && p.status === "PUBLISHED",
      )
      .sort(byUpdatedDesc);
    if (params.tag) {
      items = items.filter((p) => p.tags.includes(params.tag as string));
    }
    return paginate(items, params.cursor, params.limit ?? DEFAULT_LIMIT);
  }

  async get(id: string): Promise<LessonPlanEntity> {
    await mockDelay(150);
    const found = store.get(id);
    if (!found) throw new Error("not-found");
    return structuredClone(found);
  }

  async update(
    id: string,
    input: UpdateLessonPlanInput,
  ): Promise<LessonPlanEntity> {
    await mockDelay(280);
    const existing = store.get(id);
    if (!existing) throw new Error("not-found");
    if (existing.status === "PUBLISHED") throw new Error("already-published");
    const updated: LessonPlanEntity = {
      ...existing,
      gradeLevel: input.gradeLevel,
      title: input.title,
      objectives: input.objectives ?? "",
      contentOutline: input.contentOutline ?? "",
      activities: input.activities ?? "",
      assessmentMethod: input.assessmentMethod ?? "",
      tags: input.tags ?? [],
      updatedAt: new Date().toISOString(),
    };
    store.set(id, updated);
    return structuredClone(updated);
  }

  async publish(id: string): Promise<LessonPlanEntity> {
    await mockDelay(250);
    const existing = store.get(id);
    if (!existing) throw new Error("not-found");
    if (existing.status === "PUBLISHED") throw new Error("already-published");
    const now = new Date().toISOString();
    const published: LessonPlanEntity = {
      ...existing,
      status: "PUBLISHED",
      publishedAt: now,
      updatedAt: now,
    };
    store.set(id, published);
    return structuredClone(published);
  }
}
