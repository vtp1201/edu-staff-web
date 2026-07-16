"use server";

import { revalidatePath } from "next/cache";
import { makeLockTermUseCase } from "@/bootstrap/di/grades.di";
import type { ClassSubjectTermKey } from "@/features/grades/domain/entities/class-subject-term-key.entity";
import type { GradesFailure } from "@/features/grades/domain/failures/grades.failure";

const PATHS = [
  "/[locale]/t/[tenant]/(app)/admin/grade-book",
  "/[locale]/t/[tenant]/(app)/principal/grade-book",
];

type LockResult =
  | { ok: true; lockedCount: number }
  | { ok: false; errorKey: GradesFailure["type"] };

function isFailure(x: unknown): x is GradesFailure {
  return typeof x === "object" && x !== null && "type" in x;
}

/** Irreversible admin/manager bulk-lock (US-E18.12, ADR 0054 §3.2/§4). */
export async function lockTermAction(
  key: ClassSubjectTermKey,
): Promise<LockResult> {
  const useCase = await makeLockTermUseCase(key);
  const result = await useCase.execute(key);
  if (isFailure(result)) {
    return { ok: false, errorKey: result.type };
  }
  for (const path of PATHS) revalidatePath(path, "page");
  return { ok: true, lockedCount: result.lockedCount };
}
