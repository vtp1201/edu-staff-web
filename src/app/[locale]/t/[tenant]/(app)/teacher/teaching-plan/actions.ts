"use server";

import { revalidatePath } from "next/cache";
import {
  makeSavePlanCellUseCase,
  makeSubmitTeachingPlanUseCase,
} from "@/bootstrap/di/teaching-plan.di";
import type { PlanCell } from "@/features/teaching-plan/domain/entities/plan-cell.entity";
import type { TeachingPlanFailure } from "@/features/teaching-plan/domain/failures/teaching-plan.failure";

const TEACHER_PATH = "/[locale]/t/[tenant]/(app)/teacher/teaching-plan";

type ActionResult =
  | { ok: true }
  | { ok: false; errorKey: TeachingPlanFailure["type"] };

function toErrorKey(err: unknown): TeachingPlanFailure["type"] {
  if (err && typeof err === "object" && "type" in err) {
    return (err as TeachingPlanFailure).type;
  }
  return "unknown";
}

export async function savePlanCellAction(
  planId: string,
  cell: PlanCell,
): Promise<ActionResult> {
  try {
    const useCase = await makeSavePlanCellUseCase();
    await useCase.execute(planId, cell);
    revalidatePath(TEACHER_PATH, "page");
    return { ok: true };
  } catch (err) {
    return { ok: false, errorKey: toErrorKey(err) };
  }
}

export async function submitTeachingPlanAction(
  planId: string,
): Promise<ActionResult> {
  try {
    const useCase = await makeSubmitTeachingPlanUseCase();
    await useCase.execute(planId);
    revalidatePath(TEACHER_PATH, "page");
    return { ok: true };
  } catch (err) {
    return { ok: false, errorKey: toErrorKey(err) };
  }
}
