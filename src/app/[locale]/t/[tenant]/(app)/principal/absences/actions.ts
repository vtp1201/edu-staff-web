"use server";

import {
  makeFlagStudentAbsenceUseCase,
  makeListStudentAbsencesUseCase,
  makeStudentAbsenceAuthContext,
} from "@/bootstrap/di/student-absence.di";
import type {
  StudentAbsenceEntity,
  StudentAbsenceKey,
} from "@/features/student-absences/domain/entities/student-absence.entity";
import { toStudentAbsenceFailureType } from "@/features/student-absences/domain/failures/student-absence.failure";
import type { StudentAbsencesActionResult } from "@/features/student-absences/presentation/student-absences-screen/student-absences-screen.i-vm";

/**
 * Server Actions for `/principal/absences` (US-E09.6) — the file-scoped mirror of
 * `teacher/absences/actions.ts` over the SAME DI factories (Next Server Actions
 * cannot be shared across route segments).
 *
 * This file exports NO record/edit action: those are GVCN capabilities and this
 * route exposes no path to them at all (FR-009/AC-006.5). There is no unflag
 * action anywhere in the app (FR-006/FR-013) — the transition is terminal.
 *
 * Authorization does NOT come from this file: `makeStudentAbsenceAuthContext`
 * decodes the acting role from the httpOnly token and the repository re-checks it
 * (NFR-008 pt.2), so a non-principal actor reaching this action is rejected with
 * `forbidden` — the mock repository's forged-context tests prove it.
 *
 * These actions return STABLE failure keys only — no i18n at this boundary.
 */
const ROLE_HINT = "principal" as const;

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

export async function flagAbsenceAction(
  key: StudentAbsenceKey,
): Promise<StudentAbsencesActionResult<StudentAbsenceEntity>> {
  try {
    const authCtx = await makeStudentAbsenceAuthContext(ROLE_HINT);
    const useCase = await makeFlagStudentAbsenceUseCase(authCtx);
    return { ok: true, data: await useCase.execute(key) };
  } catch (err) {
    return fail(err);
  }
}
