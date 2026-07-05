"use server";

import { revalidatePath } from "next/cache";
import {
  makeApproveLeaveUseCase,
  makeDeleteViolationUseCase,
  makeOverrideConductGradeUseCase,
  makeRecordViolationUseCase,
  makeRejectLeaveUseCase,
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

export async function approveLeaveAction(
  id: string,
): Promise<{ errorKey?: DisciplineFailure["type"] }> {
  try {
    await (await makeApproveLeaveUseCase()).execute(id);
    revalidatePath(PRINCIPAL_PATH, "page");
    return {};
  } catch (err) {
    return { errorKey: toErrorKey(err) };
  }
}

export async function rejectLeaveAction(
  id: string,
  reason: string,
): Promise<{ errorKey?: DisciplineFailure["type"] }> {
  try {
    await (await makeRejectLeaveUseCase()).execute(id, reason);
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
