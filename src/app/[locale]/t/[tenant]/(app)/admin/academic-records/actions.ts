"use server";

import { requireRole } from "@/bootstrap/auth-guard";
import {
  makeConfirmUnsealUseCase,
  makeGetSealAuditTrailUseCase,
  makeGetSealStatusUseCase,
  makeInitiateUnsealUseCase,
  makeListAvailableClassesUseCase,
  makeListPendingUnsealRequestsUseCase,
  makeListSealedStudentsUseCase,
  makeListTenantAdminsUseCase,
  makeSealAcademicRecordUseCase,
} from "@/bootstrap/di/academic-records.di";
import { getAccessToken } from "@/bootstrap/lib/auth-token.server";
import { decodeSubClaim } from "@/bootstrap/lib/jwt";
import type {
  ClassOption,
  SealAuditEntry,
  SealBatchKey,
  SealBatchResult,
  SealBatchStatus,
  SealedStudentOption,
  TenantAdminSummary,
  Term,
  UnsealRequest,
} from "@/features/academic-records/domain/entities/seal-batch.entity";
import type { AcademicRecordsFailure } from "@/features/academic-records/domain/failures/academic-records.failure";
import type {
  InitiateUnsealInput,
  SealActionResult,
} from "@/features/academic-records/presentation/academic-record-seal-screen/academic-record-seal-screen.i-vm";

/** Narrow an unknown caught throw to an AcademicRecordsFailure key. */
function toErrorKey(err: unknown): AcademicRecordsFailure["type"] {
  if (
    err &&
    typeof err === "object" &&
    "type" in err &&
    typeof (err as { type: unknown }).type === "string"
  ) {
    return (err as AcademicRecordsFailure).type;
  }
  return "unknown";
}

/** Resolve the acting admin id from the httpOnly access token (server-side). */
async function currentAdminId(): Promise<string | null> {
  const token = await getAccessToken();
  return token ? decodeSubClaim(token) : null;
}

export async function listAvailableClassesAction(filter: {
  term: Term;
  year: string;
}): Promise<SealActionResult<ClassOption[]>> {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return { ok: false, errorKey: "forbidden" };
  try {
    const useCase = await makeListAvailableClassesUseCase();
    const result = await useCase.execute(filter);
    return result.ok
      ? { ok: true, data: result.data }
      : { ok: false, errorKey: result.error.type };
  } catch (err) {
    return { ok: false, errorKey: toErrorKey(err) };
  }
}

export async function getSealStatusAction(
  key: SealBatchKey,
): Promise<SealActionResult<SealBatchStatus>> {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return { ok: false, errorKey: "forbidden" };
  try {
    const useCase = await makeGetSealStatusUseCase();
    const result = await useCase.execute(key);
    return result.ok
      ? { ok: true, data: result.data }
      : { ok: false, errorKey: result.error.type };
  } catch (err) {
    return { ok: false, errorKey: toErrorKey(err) };
  }
}

export async function sealAction(
  key: SealBatchKey,
): Promise<SealActionResult<SealBatchResult>> {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return { ok: false, errorKey: "forbidden" };
  const adminId = await currentAdminId();
  if (!adminId) return { ok: false, errorKey: "forbidden" };
  try {
    const useCase = await makeSealAcademicRecordUseCase();
    const result = await useCase.execute(key, adminId);
    return result.ok
      ? { ok: true, data: result.data }
      : { ok: false, errorKey: result.error.type };
  } catch (err) {
    return { ok: false, errorKey: toErrorKey(err) };
  }
}

export async function getAuditTrailAction(
  filter?: Partial<SealBatchKey>,
): Promise<SealActionResult<SealAuditEntry[]>> {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return { ok: false, errorKey: "forbidden" };
  try {
    const useCase = await makeGetSealAuditTrailUseCase();
    const result = await useCase.execute(filter);
    return result.ok
      ? { ok: true, data: result.data }
      : { ok: false, errorKey: result.error.type };
  } catch (err) {
    return { ok: false, errorKey: toErrorKey(err) };
  }
}

export async function listSealedStudentsAction(
  filter?: Partial<SealBatchKey>,
): Promise<SealActionResult<SealedStudentOption[]>> {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return { ok: false, errorKey: "forbidden" };
  try {
    const useCase = await makeListSealedStudentsUseCase();
    const result = await useCase.execute(filter);
    return result.ok
      ? { ok: true, data: result.data }
      : { ok: false, errorKey: result.error.type };
  } catch (err) {
    return { ok: false, errorKey: toErrorKey(err) };
  }
}

export async function getPendingUnsealRequestsAction(): Promise<
  SealActionResult<UnsealRequest[]>
> {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return { ok: false, errorKey: "forbidden" };
  try {
    const useCase = await makeListPendingUnsealRequestsUseCase();
    const result = await useCase.execute();
    return result.ok
      ? { ok: true, data: result.data }
      : { ok: false, errorKey: result.error.type };
  } catch (err) {
    return { ok: false, errorKey: toErrorKey(err) };
  }
}

export async function initiateUnsealAction(
  input: InitiateUnsealInput,
): Promise<SealActionResult<UnsealRequest>> {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return { ok: false, errorKey: "forbidden" };
  const adminId = await currentAdminId();
  if (!adminId) return { ok: false, errorKey: "forbidden" };
  try {
    const useCase = await makeInitiateUnsealUseCase();
    const result = await useCase.execute({ ...input, initiatorId: adminId });
    return result.ok
      ? { ok: true, data: result.data }
      : { ok: false, errorKey: result.error.type };
  } catch (err) {
    return { ok: false, errorKey: toErrorKey(err) };
  }
}

export async function confirmUnsealAction(
  requestId: string,
  coSignerId: string | null,
): Promise<SealActionResult<{ request: UnsealRequest; fallback: boolean }>> {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return { ok: false, errorKey: "forbidden" };
  try {
    const useCase = await makeConfirmUnsealUseCase();
    const result = await useCase.execute(requestId, coSignerId);
    return result.ok
      ? { ok: true, data: result.data }
      : { ok: false, errorKey: result.error.type };
  } catch (err) {
    return { ok: false, errorKey: toErrorKey(err) };
  }
}

export async function listTenantAdminsAction(): Promise<
  SealActionResult<TenantAdminSummary[]>
> {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return { ok: false, errorKey: "forbidden" };
  try {
    const useCase = await makeListTenantAdminsUseCase();
    const result = await useCase.execute();
    return result.ok
      ? { ok: true, data: result.data }
      : { ok: false, errorKey: result.error.type };
  } catch (err) {
    return { ok: false, errorKey: toErrorKey(err) };
  }
}
