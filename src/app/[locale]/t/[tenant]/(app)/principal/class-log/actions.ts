"use server";

import { revalidatePath } from "next/cache";
import {
  makeApproveEntryUseCase,
  makeRejectEntryUseCase,
} from "@/bootstrap/di/class-log.di";
import type { ClassLogFailure } from "@/features/class-log/domain/failures/class-log.failure";

const PRINCIPAL_PATH = "/[locale]/t/[tenant]/(app)/principal/class-log";

function toErrorKey(err: unknown): ClassLogFailure["type"] {
  if (err && typeof err === "object" && "type" in err) {
    return (err as ClassLogFailure).type;
  }
  return "unknown";
}

/**
 * Principals review only — they do not author/submit class logs.
 * These satisfy the screen VM contract while enforcing the role boundary.
 */
export async function createEntryAction(): Promise<{
  ok: false;
  errorKey: ClassLogFailure["type"];
}> {
  return { ok: false, errorKey: "unauthorized" };
}

export async function submitEntryAction(): Promise<{
  ok: false;
  errorKey: ClassLogFailure["type"];
}> {
  return { ok: false, errorKey: "unauthorized" };
}

export async function approveEntryAction(
  classId: string,
  entryId: string,
): Promise<{ ok: true } | { ok: false; errorKey: ClassLogFailure["type"] }> {
  try {
    const useCase = await makeApproveEntryUseCase();
    await useCase.execute(classId, entryId);
    revalidatePath(PRINCIPAL_PATH, "page");
    return { ok: true };
  } catch (err) {
    return { ok: false, errorKey: toErrorKey(err) };
  }
}

export async function rejectEntryAction(
  classId: string,
  entryId: string,
  reason?: string,
): Promise<{ ok: true } | { ok: false; errorKey: ClassLogFailure["type"] }> {
  try {
    const useCase = await makeRejectEntryUseCase();
    await useCase.execute(classId, entryId, reason);
    revalidatePath(PRINCIPAL_PATH, "page");
    return { ok: true };
  } catch (err) {
    return { ok: false, errorKey: toErrorKey(err) };
  }
}
