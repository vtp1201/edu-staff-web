"use server";

import {
  makeArchiveDepartmentUseCase,
  makeArchivePositionTitleUseCase,
  makeAssignPositionUseCase,
  makeCopyAssignmentsUseCase,
  makeCreateDepartmentUseCase,
  makeCreatePositionTitleUseCase,
  makeStaffingRepository,
} from "@/bootstrap/di/staffing.di";
import type {
  CreateDepartmentInput,
  PatchDepartmentInput,
} from "@/features/admin/staffing/domain/entities/department.entity";
import type {
  CopyAssignmentsInput,
  CreateAssignmentInput,
} from "@/features/admin/staffing/domain/entities/position-assignment.entity";
import type {
  CreatePositionTitleInput,
  PatchPositionTitleInput,
} from "@/features/admin/staffing/domain/entities/position-title.entity";
// ── Departments ────────────────────────────────────────────────────────────

export async function createDepartmentAction(input: CreateDepartmentInput) {
  const useCase = await makeCreateDepartmentUseCase();
  const result = await useCase.execute(input);
  if (!result.ok) {
    return { ok: false as const, errorKey: result.failure.type };
  }
  return { ok: true as const, department: result.value };
}

export async function patchDepartmentAction(
  id: string,
  input: PatchDepartmentInput,
) {
  const repo = await makeStaffingRepository();
  const result = await repo.patchDepartment(id, input);
  if (!result.ok) {
    return { ok: false as const, errorKey: result.failure.type };
  }
  return { ok: true as const, department: result.value };
}

export async function archiveDepartmentAction(id: string) {
  const repo = await makeStaffingRepository();
  const found = await repo.getDepartment(id);
  if (!found.ok) {
    return { ok: false as const, errorKey: found.failure.type };
  }
  const useCase = await makeArchiveDepartmentUseCase();
  const result = await useCase.execute(id, found.value);
  if (!result.ok) {
    return { ok: false as const, errorKey: result.failure.type };
  }
  return { ok: true as const };
}

// ── Position Titles ──────────────────────────────────────────────────────────

export async function createPositionTitleAction(
  input: CreatePositionTitleInput,
) {
  const useCase = await makeCreatePositionTitleUseCase();
  const result = await useCase.execute(input);
  if (!result.ok) {
    return { ok: false as const, errorKey: result.failure.type };
  }
  return { ok: true as const, positionTitle: result.value };
}

export async function patchPositionTitleAction(
  id: string,
  input: PatchPositionTitleInput,
) {
  const repo = await makeStaffingRepository();
  const result = await repo.patchPositionTitle(id, input);
  if (!result.ok) {
    return { ok: false as const, errorKey: result.failure.type };
  }
  return { ok: true as const, positionTitle: result.value };
}

export async function archivePositionTitleAction(id: string) {
  const repo = await makeStaffingRepository();
  const found = await repo.getPositionTitle(id);
  if (!found.ok) {
    return { ok: false as const, errorKey: found.failure.type };
  }
  const useCase = await makeArchivePositionTitleUseCase();
  const result = await useCase.execute(id, found.value);
  if (!result.ok) {
    return { ok: false as const, errorKey: result.failure.type };
  }
  return { ok: true as const };
}

// ── Assignments ──────────────────────────────────────────────────────────────

export async function assignPositionAction(input: CreateAssignmentInput) {
  // Academic-year validation is mock-first (no academic-year service yet, decision 0014):
  // the year is treated as active. Replace with a real lookup when `core` lands.
  const academicYearIsActive = true;
  const useCase = await makeAssignPositionUseCase();
  const result = await useCase.execute(input, academicYearIsActive);
  if (!result.ok) {
    return { ok: false as const, errorKey: result.failure.type };
  }
  return { ok: true as const, assignment: result.value };
}

export async function revokeAssignmentAction(id: string) {
  const repo = await makeStaffingRepository();
  const result = await repo.revokeAssignment(id);
  if (!result.ok) {
    return { ok: false as const, errorKey: result.failure.type };
  }
  return { ok: true as const };
}

export async function copyAssignmentsAction(input: CopyAssignmentsInput) {
  const useCase = await makeCopyAssignmentsUseCase();
  const result = await useCase.execute(input);
  if (!result.ok) {
    return { ok: false as const, errorKey: result.failure.type };
  }
  return { ok: true as const, result: result.value };
}
