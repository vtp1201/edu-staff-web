"use server";

import { revalidatePath } from "next/cache";
import {
  makeDecideLeaveUseCases,
  makeDeleteViolationUseCase,
  makeOverrideConductGradeUseCase,
  makeRecordViolationUseCase,
} from "@/bootstrap/di/discipline.di";
import type { ConductGrade } from "@/features/discipline/domain/entities/conduct-summary.entity";
import type { RecordViolationInput } from "@/features/discipline/domain/entities/violation.entity";
import type { DisciplineFailure } from "@/features/discipline/domain/failures/discipline.failure";

const PRINCIPAL_PATH = "/[locale]/t/[tenant]/(app)/principal/discipline";

function toErrorKey(err: unknown): DisciplineFailure["type"] {
  if (err && typeof err === "object" && "type" in err) {
    return (err as DisciplineFailure).type;
  }
  return "network-error";
}

export async function recordViolationAction(
  input: RecordViolationInput,
): Promise<{ errorKey?: DisciplineFailure["type"] }> {
  try {
    await (await makeRecordViolationUseCase()).execute(input);
    revalidatePath(PRINCIPAL_PATH, "page");
    return {};
  } catch (err) {
    return { errorKey: toErrorKey(err) };
  }
}

export async function deleteViolationAction(
  id: string,
): Promise<{ errorKey?: DisciplineFailure["type"] }> {
  try {
    await (await makeDeleteViolationUseCase()).execute(id);
    revalidatePath(PRINCIPAL_PATH, "page");
    return {};
  } catch (err) {
    return { errorKey: toErrorKey(err) };
  }
}

/**
 * Legacy multi-class dashboard approve. `studentMemberId` + `classId` complete
 * core's addressing (US-E24.11); the SERVER-DERIVED `authCtx` (decision `0063`)
 * is threaded exactly as on the class hub. `makeDecideLeaveUseCases()` hands
 * back the context with the use-case, so this action cannot forget it, and the
 * context carries the caller's whole homeroom set — a multi-class dashboard
 * needs no scope of its own. A non-GVCN caller (a principal on
 * `/principal/discipline`) is therefore denied `forbidden` here, which is the
 * CORRECT behaviour: BGH have read-only oversight at MVP (ADR 0073 Follow-Up).
 */
export async function approveLeaveAction(
  id: string,
  studentMemberId: string,
  classId: string,
): Promise<{ errorKey?: DisciplineFailure["type"] }> {
  try {
    const { approve, authCtx } = await makeDecideLeaveUseCases();
    await approve.execute({ id, studentMemberId, classId, authCtx });
    revalidatePath(PRINCIPAL_PATH, "page");
    return {};
  } catch (err) {
    return { errorKey: toErrorKey(err) };
  }
}

export async function rejectLeaveAction(
  id: string,
  studentMemberId: string,
  classId: string,
  reason: string,
): Promise<{ errorKey?: DisciplineFailure["type"] }> {
  try {
    const { reject, authCtx } = await makeDecideLeaveUseCases();
    await reject.execute({ id, studentMemberId, classId, reason, authCtx });
    revalidatePath(PRINCIPAL_PATH, "page");
    return {};
  } catch (err) {
    return { errorKey: toErrorKey(err) };
  }
}

export async function overrideConductGradeAction(
  studentId: string,
  grade: ConductGrade,
  note: string,
): Promise<{ errorKey?: DisciplineFailure["type"] }> {
  try {
    await (await makeOverrideConductGradeUseCase()).execute(
      studentId,
      grade,
      note,
    );
    revalidatePath(PRINCIPAL_PATH, "page");
    return {};
  } catch (err) {
    return { errorKey: toErrorKey(err) };
  }
}
