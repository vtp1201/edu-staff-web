"use server";

import { revalidatePath } from "next/cache";
import {
  makeApproveTeachingPlanUseCase,
  makeRejectTeachingPlanUseCase,
} from "@/bootstrap/di/teaching-plan.di";
import type { TeachingPlanFailure } from "@/features/teaching-plan/domain/failures/teaching-plan.failure";

const PRINCIPAL_PATH = "/[locale]/t/[tenant]/(app)/principal/teaching-plan";

type ActionResult =
  | { ok: true }
  | { ok: false; errorKey: TeachingPlanFailure["type"] };

function toErrorKey(err: unknown): TeachingPlanFailure["type"] {
  if (err && typeof err === "object" && "type" in err) {
    return (err as TeachingPlanFailure).type;
  }
  return "unknown";
}

export async function approveTeachingPlanAction(
  planId: string,
): Promise<ActionResult> {
  try {
    const useCase = await makeApproveTeachingPlanUseCase();
    await useCase.execute(planId);
    revalidatePath(PRINCIPAL_PATH, "page");
    return { ok: true };
  } catch (err) {
    return { ok: false, errorKey: toErrorKey(err) };
  }
}

export async function rejectTeachingPlanAction(
  planId: string,
  reason: string,
): Promise<ActionResult> {
  try {
    const useCase = await makeRejectTeachingPlanUseCase();
    await useCase.execute(planId, reason);
    revalidatePath(PRINCIPAL_PATH, "page");
    return { ok: true };
  } catch (err) {
    return { ok: false, errorKey: toErrorKey(err) };
  }
}
