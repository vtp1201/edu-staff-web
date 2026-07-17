"use server";

import { revalidatePath } from "next/cache";
import {
  makeGetLessonPlanUseCase,
  makePublishLessonPlanUseCase,
  makeUpdateLessonPlanUseCase,
} from "@/bootstrap/di/lesson-plan.di";
import type {
  BuilderActionResult,
  SaveDraftInput,
} from "@/features/lesson-plan/presentation/lesson-plan-builder-screen/lesson-plan-builder-screen.i-vm";

const LIST_PATH = "/[locale]/t/[tenant]/(app)/teacher/lesson-plans";

/** Update a DRAFT (INT-118-05). `id` is always present on the edit route. */
export async function saveDraftAction(
  input: SaveDraftInput,
): Promise<BuilderActionResult> {
  if (!input.id) return { ok: false, errorKey: "invalid-id" };
  const useCase = await makeUpdateLessonPlanUseCase();
  const result = await useCase.execute(input.id, input);
  if (!result.ok) return { ok: false, errorKey: result.failure.type };
  revalidatePath(LIST_PATH, "page");
  return { ok: true, plan: result.value };
}

export async function publishAction(id: string): Promise<BuilderActionResult> {
  const useCase = await makePublishLessonPlanUseCase();
  const result = await useCase.execute(id);
  if (!result.ok) return { ok: false, errorKey: result.failure.type };
  revalidatePath(LIST_PATH, "page");
  return { ok: true, plan: result.value };
}

export async function refetchAction(id: string): Promise<BuilderActionResult> {
  const useCase = await makeGetLessonPlanUseCase();
  const result = await useCase.execute(id);
  if (!result.ok) return { ok: false, errorKey: result.failure.type };
  return { ok: true, plan: result.value };
}
