"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/bootstrap/auth-guard";
import {
  makeRejectColumnEntryUseCase,
  makeSaveScoreUseCase,
  makeSubmitColumnScoresUseCase,
} from "@/bootstrap/di/grades.di";
import type { ClassSubjectTermKey } from "@/features/grades/domain/entities/class-subject-term-key.entity";
import type { GradesFailure } from "@/features/grades/domain/failures/grades.failure";
import type { SubmitTarget } from "@/features/grades/domain/use-cases/submit-column-scores.use-case";

const GRADES_PATH = "/[locale]/t/[tenant]/(app)/teacher/grades";
const DEFAULT_MAX_SCORE = 10;

type ActionResult =
  | { ok: true }
  | { ok: false; errorKey: GradesFailure["type"] };

function isFailure(x: unknown): x is GradesFailure {
  return typeof x === "object" && x !== null && "type" in x;
}

export async function saveScoreAction(
  key: ClassSubjectTermKey,
  studentId: string,
  columnId: string,
  value: number,
): Promise<ActionResult> {
  const useCase = await makeSaveScoreUseCase(key);
  const result = await useCase.execute(
    key,
    studentId,
    columnId,
    value,
    DEFAULT_MAX_SCORE,
  );
  if (isFailure(result)) {
    return { ok: false, errorKey: result.type };
  }
  revalidatePath(GRADES_PATH, "page");
  return { ok: true };
}

/**
 * Fans out `submit` over every target (US-E18.12, ADR 0054 §2.2). "ok: true"
 * means the operation ran, NOT that every target succeeded — the caller
 * inspects `result.submitted`/`result.failed` (never silently swallowed).
 */
export async function submitScoresAction(
  key: ClassSubjectTermKey,
  targets: SubmitTarget[],
): Promise<
  | { ok: true; result: Awaited<ReturnType<typeof runSubmit>> }
  | { ok: false; errorKey: GradesFailure["type"] }
> {
  const result = await runSubmit(key, targets);
  revalidatePath(GRADES_PATH, "page");
  return { ok: true, result };
}

async function runSubmit(key: ClassSubjectTermKey, targets: SubmitTarget[]) {
  const useCase = await makeSubmitColumnScoresUseCase(key);
  return useCase.execute(key, targets);
}

/**
 * US-E18.44 (BE US-184) — reject / request revision on ONE `PENDING_APPROVAL`
 * cell (`PENDING_APPROVAL → DRAFT` + a required reason ≤500 chars).
 *
 * A Server Action is a publicly callable endpoint, so the ADMIN/MANAGER gate is
 * re-checked HERE with the server-derived role claim, BEFORE any DI/HTTP call —
 * the VM's absent `rejectEntryAction` only removes the UI affordance, it is not
 * an authorization boundary. `core` enforces its own 403 on top (both BE
 * ADMIN and MANAGER collapse to the `principal` appRole via ROLE_ENUM_TO_APP;
 * `admin` covers the platform-admin/mock-mode token).
 */
export async function rejectEntryAction(
  key: ClassSubjectTermKey,
  studentId: string,
  columnId: string,
  reason: string,
): Promise<ActionResult> {
  const guard = await requireRole(["principal", "admin"]);
  if (!guard.ok) return { ok: false, errorKey: "forbidden" };

  const useCase = await makeRejectColumnEntryUseCase(key);
  const result = await useCase.execute(key, studentId, columnId, reason);
  if (isFailure(result)) {
    return { ok: false, errorKey: result.type };
  }
  revalidatePath(GRADES_PATH, "page");
  return { ok: true };
}
