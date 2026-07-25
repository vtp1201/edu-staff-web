"use server";

import {
  makeApproveStaffConductNoteUseCase,
  makeApproveStaffViolationUseCase,
  makeCreateStaffViolationUseCase,
  makeListStaffConductNotesUseCase,
  makeListStaffViolationsUseCase,
  makeRejectStaffConductNoteUseCase,
  makeRejectStaffViolationUseCase,
  makeSetStaffConductNoteUseCase,
  makeStaffDisciplineAuthContext,
  makeSubmitStaffConductNoteUseCase,
  makeSubmitStaffViolationUseCase,
} from "@/bootstrap/di/staff-discipline.di";
import type {
  SetStaffConductNoteInput,
  StaffConductNoteEntity,
} from "@/features/staff-discipline/domain/entities/staff-conduct-note.entity";
import type {
  CreateStaffViolationInput,
  RejectStaffViolationInput,
  StaffViolationEntity,
} from "@/features/staff-discipline/domain/entities/staff-violation.entity";
import {
  fieldErrorsOf,
  toStaffDisciplineFailureType,
} from "@/features/staff-discipline/domain/failures/staff-discipline.failure";
import type { StaffDisciplineActionResult } from "@/features/staff-discipline/presentation/staff-discipline-screen/staff-discipline-screen.i-vm";

/**
 * Server Actions for `/teacher/staff-discipline` (US-E09.5) — the file-scoped
 * mirror of `principal/staff-discipline/actions.ts` over the SAME DI factories
 * (Next Server Actions cannot be shared across route segments).
 *
 * The teacher view is read-only, but every action is still exported so the ONE
 * shared screen component keeps a complete VM. That is safe precisely because
 * authorization does not come from this file: the repository re-checks the
 * `authCtx` role decoded from the httpOnly token (NFR-008), so a mutating call
 * made from this route is rejected with `forbidden` — the mock repository's
 * forged-role tests prove it.
 *
 * These actions return STABLE failure keys only — no i18n at this boundary.
 */
const ROLE_HINT = "teacher" as const;

function fail<T>(err: unknown): StaffDisciplineActionResult<T> {
  const errorKey = toStaffDisciplineFailureType(err);
  const fields = fieldErrorsOf(err);
  return {
    ok: false,
    errorKey,
    fields: fields.length > 0 ? fields : undefined,
    retryable: errorKey === "network-error",
  };
}

export async function listViolationsAction(params: {
  staffMemberId?: string;
}): Promise<StaffDisciplineActionResult<StaffViolationEntity[]>> {
  try {
    const authCtx = await makeStaffDisciplineAuthContext(ROLE_HINT);
    const useCase = await makeListStaffViolationsUseCase();
    return { ok: true, data: await useCase.execute(params, authCtx) };
  } catch (err) {
    return fail(err);
  }
}

export async function createViolationAction(
  input: CreateStaffViolationInput,
): Promise<StaffDisciplineActionResult<StaffViolationEntity>> {
  try {
    const authCtx = await makeStaffDisciplineAuthContext(ROLE_HINT);
    const useCase = await makeCreateStaffViolationUseCase();
    return { ok: true, data: await useCase.execute(input, authCtx) };
  } catch (err) {
    return fail(err);
  }
}

export async function submitViolationAction(
  recordId: string,
): Promise<StaffDisciplineActionResult<StaffViolationEntity>> {
  try {
    const authCtx = await makeStaffDisciplineAuthContext(ROLE_HINT);
    const useCase = await makeSubmitStaffViolationUseCase();
    return { ok: true, data: await useCase.execute(recordId, authCtx) };
  } catch (err) {
    return fail(err);
  }
}

export async function approveViolationAction(
  recordId: string,
): Promise<StaffDisciplineActionResult<StaffViolationEntity>> {
  try {
    const authCtx = await makeStaffDisciplineAuthContext(ROLE_HINT);
    const useCase = await makeApproveStaffViolationUseCase();
    return { ok: true, data: await useCase.execute(recordId, authCtx) };
  } catch (err) {
    return fail(err);
  }
}

export async function rejectViolationAction(
  input: RejectStaffViolationInput,
): Promise<StaffDisciplineActionResult<StaffViolationEntity>> {
  try {
    const authCtx = await makeStaffDisciplineAuthContext(ROLE_HINT);
    const useCase = await makeRejectStaffViolationUseCase();
    return { ok: true, data: await useCase.execute(input, authCtx) };
  } catch (err) {
    return fail(err);
  }
}

export async function listConductNotesAction(params: {
  staffMemberId?: string;
  termId?: string;
}): Promise<StaffDisciplineActionResult<StaffConductNoteEntity[]>> {
  try {
    const authCtx = await makeStaffDisciplineAuthContext(ROLE_HINT);
    const useCase = await makeListStaffConductNotesUseCase();
    return { ok: true, data: await useCase.execute(params, authCtx) };
  } catch (err) {
    return fail(err);
  }
}

export async function setConductNoteAction(
  input: SetStaffConductNoteInput,
): Promise<StaffDisciplineActionResult<StaffConductNoteEntity>> {
  try {
    const authCtx = await makeStaffDisciplineAuthContext(ROLE_HINT);
    const useCase = await makeSetStaffConductNoteUseCase();
    return { ok: true, data: await useCase.execute(input, authCtx) };
  } catch (err) {
    return fail(err);
  }
}

export async function submitConductNoteAction(
  staffMemberId: string,
  termId: string,
): Promise<StaffDisciplineActionResult<StaffConductNoteEntity>> {
  try {
    const authCtx = await makeStaffDisciplineAuthContext(ROLE_HINT);
    const useCase = await makeSubmitStaffConductNoteUseCase();
    return {
      ok: true,
      data: await useCase.execute(staffMemberId, termId, authCtx),
    };
  } catch (err) {
    return fail(err);
  }
}

export async function approveConductNoteAction(
  staffMemberId: string,
  termId: string,
): Promise<StaffDisciplineActionResult<StaffConductNoteEntity>> {
  try {
    const authCtx = await makeStaffDisciplineAuthContext(ROLE_HINT);
    const useCase = await makeApproveStaffConductNoteUseCase();
    return {
      ok: true,
      data: await useCase.execute(staffMemberId, termId, authCtx),
    };
  } catch (err) {
    return fail(err);
  }
}

export async function rejectConductNoteAction(
  staffMemberId: string,
  termId: string,
  rejectionReason: string,
): Promise<StaffDisciplineActionResult<StaffConductNoteEntity>> {
  try {
    const authCtx = await makeStaffDisciplineAuthContext(ROLE_HINT);
    const useCase = await makeRejectStaffConductNoteUseCase();
    return {
      ok: true,
      data: await useCase.execute(
        staffMemberId,
        termId,
        rejectionReason,
        authCtx,
      ),
    };
  } catch (err) {
    return fail(err);
  }
}
