"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/bootstrap/auth-guard";
import {
  makeCreateQuestionUseCase,
  makeGetQuestionUseCase,
  makePublishQuestionUseCase,
  makeUpdateQuestionUseCase,
} from "@/bootstrap/di/question-bank.di";
import type {
  BuilderActionResult,
  SaveQuestionInput,
} from "@/features/question-bank/presentation/question-bank-builder-screen/question-bank-builder-screen.i-vm";

const LIST_PATH = "/[locale]/t/[tenant]/(app)/teacher/question-bank";

/** Create (no id) or update (id) a DRAFT — INT-203 / INT-205. */
export async function saveQuestionAction(
  input: SaveQuestionInput,
): Promise<BuilderActionResult> {
  const guard = await requireRole(["teacher"]);
  if (!guard.ok) return { ok: false, errorKey: "forbidden-edit" };

  if (input.id) {
    const useCase = await makeUpdateQuestionUseCase();
    // FR-009: only body/expectedAnswer/tags are sent — the 4 immutable fields
    // are never included in the update request.
    const result = await useCase.execute(input.id, {
      body: input.body,
      expectedAnswer: input.expectedAnswer,
      tags: input.tags,
    });
    if (!result.ok) return { ok: false, errorKey: result.failure.type };
    revalidatePath(LIST_PATH, "page");
    return { ok: true, question: result.value };
  }

  const useCase = await makeCreateQuestionUseCase();
  const result = await useCase.execute({
    questionType: input.questionType,
    subjectId: input.subjectId,
    gradeLevel: input.gradeLevel,
    difficulty: input.difficulty,
    body: input.body,
    expectedAnswer: input.expectedAnswer,
    tags: input.tags,
  });
  if (!result.ok) return { ok: false, errorKey: result.failure.type };
  revalidatePath(LIST_PATH, "page");
  return { ok: true, question: result.value };
}

export async function publishAction(id: string): Promise<BuilderActionResult> {
  const guard = await requireRole(["teacher"]);
  if (!guard.ok) return { ok: false, errorKey: "forbidden-edit" };

  const useCase = await makePublishQuestionUseCase();
  const result = await useCase.execute(id);
  if (!result.ok) return { ok: false, errorKey: result.failure.type };
  revalidatePath(LIST_PATH, "page");
  return { ok: true, question: result.value };
}

export async function refetchAction(id: string): Promise<BuilderActionResult> {
  const guard = await requireRole(["teacher"]);
  if (!guard.ok) return { ok: false, errorKey: "forbidden-edit" };

  const useCase = await makeGetQuestionUseCase();
  const result = await useCase.execute(id);
  if (!result.ok) return { ok: false, errorKey: result.failure.type };
  return { ok: true, question: result.value };
}
