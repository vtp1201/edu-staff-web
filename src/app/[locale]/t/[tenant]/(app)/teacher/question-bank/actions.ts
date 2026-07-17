"use server";

import { requireRole } from "@/bootstrap/auth-guard";
import {
  makeListMyQuestionsUseCase,
  makeSearchQuestionsUseCase,
} from "@/bootstrap/di/question-bank.di";
import type { ListActionResult } from "@/features/question-bank/presentation/shared.i-vm";

/** Cursor-paginated fetch — "Của tôi" scope (INT-202). */
export async function listMineAction(
  cursor?: string,
): Promise<ListActionResult> {
  // Defensive role guard — actions are independently invocable (NFR-008).
  const guard = await requireRole(["teacher"]);
  if (!guard.ok) return { ok: false, errorKey: "forbidden-browse" };

  const useCase = await makeListMyQuestionsUseCase();
  const result = await useCase.execute({ cursor });
  if (!result.ok) return { ok: false, errorKey: result.failure.type };
  return { ok: true, page: result.value };
}

/** Cursor-paginated fetch — "Tìm kiếm" cross-teacher PUBLISHED scope (INT-201). */
export async function searchAction(
  params: {
    subjectId?: string;
    tag?: string;
    gradeLevel?: string;
    difficulty?: string;
  },
  cursor?: string,
): Promise<ListActionResult> {
  const guard = await requireRole(["teacher"]);
  if (!guard.ok) return { ok: false, errorKey: "forbidden-browse" };

  const useCase = await makeSearchQuestionsUseCase();
  const result = await useCase.execute({ ...params, cursor });
  if (!result.ok) return { ok: false, errorKey: result.failure.type };
  return { ok: true, page: result.value };
}
