"use server";

import {
  makeListLessonPlansBySubjectUseCase,
  makeListMyLessonPlansUseCase,
} from "@/bootstrap/di/lesson-plan.di";
import type { ListActionResult } from "@/features/lesson-plan/presentation/shared.i-vm";

/** Cursor-paginated fetch — "Của tôi" scope (INT-118-02). */
export async function listMineAction(
  cursor?: string,
): Promise<ListActionResult> {
  const useCase = await makeListMyLessonPlansUseCase();
  const result = await useCase.execute({ cursor });
  if (!result.ok) return { ok: false, errorKey: result.failure.type };
  return { ok: true, page: result.value };
}

/** Cursor-paginated fetch — "Toàn trường" browse scope (INT-118-03). */
export async function listBySubjectAction(
  subjectId: string,
  opts?: { tag?: string; cursor?: string },
): Promise<ListActionResult> {
  const useCase = await makeListLessonPlansBySubjectUseCase();
  const result = await useCase.execute({
    subjectId,
    tag: opts?.tag,
    cursor: opts?.cursor,
  });
  if (!result.ok) return { ok: false, errorKey: result.failure.type };
  return { ok: true, page: result.value };
}
