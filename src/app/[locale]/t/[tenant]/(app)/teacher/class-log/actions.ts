"use server";

import { revalidatePath } from "next/cache";
import {
  makeCreateEntryUseCase,
  makeReviseEntryUseCase,
  makeSubmitEntryUseCase,
} from "@/bootstrap/di/class-log.di";
import type { HomeroomEntry } from "@/features/class-log/domain/entities/homeroom-entry.entity";
import type { ClassLogFailure } from "@/features/class-log/domain/failures/class-log.failure";

const TEACHER_PATH = "/[locale]/t/[tenant]/(app)/teacher/class-log";

function toErrorKey(err: unknown): ClassLogFailure["type"] {
  if (err && typeof err === "object" && "type" in err) {
    return (err as ClassLogFailure).type;
  }
  return "unknown";
}

export async function createEntryAction(
  classId: string,
  entryDate: string,
  summary: string,
  notableEvents?: string,
): Promise<
  | { ok: true; entry: HomeroomEntry }
  | { ok: false; errorKey: ClassLogFailure["type"] }
> {
  try {
    const useCase = await makeCreateEntryUseCase();
    const entry = await useCase.execute(
      classId,
      entryDate,
      summary,
      notableEvents,
    );
    revalidatePath(TEACHER_PATH, "page");
    return { ok: true, entry };
  } catch (err) {
    return { ok: false, errorKey: toErrorKey(err) };
  }
}

export async function submitEntryAction(
  classId: string,
  entryId: string,
): Promise<
  | { ok: true; entry: HomeroomEntry }
  | { ok: false; errorKey: ClassLogFailure["type"] }
> {
  try {
    const useCase = await makeSubmitEntryUseCase();
    const entry = await useCase.execute(classId, entryId);
    revalidatePath(TEACHER_PATH, "page");
    return { ok: true, entry };
  } catch (err) {
    return { ok: false, errorKey: toErrorKey(err) };
  }
}

export async function reviseEntryAction(
  classId: string,
  entryId: string,
): Promise<
  | { ok: true; entry: HomeroomEntry }
  | { ok: false; errorKey: ClassLogFailure["type"] }
> {
  try {
    const useCase = await makeReviseEntryUseCase();
    const entry = await useCase.execute(classId, entryId);
    revalidatePath(TEACHER_PATH, "page");
    return { ok: true, entry };
  } catch (err) {
    return { ok: false, errorKey: toErrorKey(err) };
  }
}

/**
 * Teachers cannot approve/reject their own class log — only BGH (principal).
 * These satisfy the screen VM contract while enforcing the role boundary.
 */
export async function approveEntryAction(): Promise<{
  ok: false;
  errorKey: ClassLogFailure["type"];
}> {
  return { ok: false, errorKey: "unauthorized" };
}

export async function rejectEntryAction(): Promise<{
  ok: false;
  errorKey: ClassLogFailure["type"];
}> {
  return { ok: false, errorKey: "unauthorized" };
}
