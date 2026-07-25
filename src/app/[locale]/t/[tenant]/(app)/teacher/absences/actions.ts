"use server";

import {
  makeEditStudentAbsenceUseCase,
  makeListStudentAbsencesUseCase,
  makeRecordStudentAbsenceUseCase,
  makeStudentAbsenceAuthContext,
} from "@/bootstrap/di/student-absence.di";
import type {
  EditStudentAbsenceInput,
  RecordStudentAbsenceInput,
  StudentAbsenceEntity,
} from "@/features/student-absences/domain/entities/student-absence.entity";
import { toStudentAbsenceFailureType } from "@/features/student-absences/domain/failures/student-absence.failure";
import type { StudentAbsencesActionResult } from "@/features/student-absences/presentation/student-absences-screen/student-absences-screen.i-vm";

/**
 * Server Actions for `/teacher/absences` (US-E09.6) — the file-scoped mirror of
 * `principal/absences/actions.ts` over the SAME DI factories (Next Server Actions
 * cannot be shared across route segments).
 *
 * There is NO `flagAbsenceAction` here: flagging is a principal capability and
 * this route exposes no path to it at all (FR-005/FR-009). And there is no
 * unflag action anywhere in the app (FR-006/FR-013).
 *
 * Authorization does NOT come from this file: `makeStudentAbsenceAuthContext`
 * decodes the acting role + homeroom from the httpOnly token and the repository
 * re-checks both (NFR-008), so a forged `classId` in any argument below is
 * rejected with `forbidden` — the mock repository's forged-context tests prove it.
 *
 * These actions return STABLE failure keys only — no i18n at this boundary.
 */
const ROLE_HINT = "teacher" as const;

function fail<T>(err: unknown): StudentAbsencesActionResult<T> {
  const errorKey = toStudentAbsenceFailureType(err);
  return { ok: false, errorKey, retryable: errorKey === "network-error" };
}

export async function listAbsencesAction(params: {
  classId?: string;
  from?: string;
  to?: string;
}): Promise<StudentAbsencesActionResult<StudentAbsenceEntity[]>> {
  try {
    const authCtx = await makeStudentAbsenceAuthContext(ROLE_HINT);
    const useCase = await makeListStudentAbsencesUseCase(authCtx);
    return { ok: true, data: await useCase.execute(params) };
  } catch (err) {
    return fail(err);
  }
}

export async function recordAbsenceAction(
  input: RecordStudentAbsenceInput,
): Promise<StudentAbsencesActionResult<StudentAbsenceEntity>> {
  try {
    const authCtx = await makeStudentAbsenceAuthContext(ROLE_HINT);
    const useCase = await makeRecordStudentAbsenceUseCase(authCtx);
    return { ok: true, data: await useCase.execute(input) };
  } catch (err) {
    return fail(err);
  }
}

export async function editAbsenceAction(
  input: EditStudentAbsenceInput,
): Promise<StudentAbsencesActionResult<StudentAbsenceEntity>> {
  try {
    const authCtx = await makeStudentAbsenceAuthContext(ROLE_HINT);
    const useCase = await makeEditStudentAbsenceUseCase(authCtx);
    return { ok: true, data: await useCase.execute(input) };
  } catch (err) {
    return fail(err);
  }
}
