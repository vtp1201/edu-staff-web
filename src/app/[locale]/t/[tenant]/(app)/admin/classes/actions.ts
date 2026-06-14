"use server";

import { makeSchoolConfigRepository } from "@/bootstrap/di/admin-school-setup.di";
import { makeClassManagementRepository } from "@/bootstrap/di/class-management.di";
import type {
  CreateClassInput,
  RenameClassInput,
} from "@/features/admin/class-management/domain/entities/class.entity";
import { AssignHomeroomTeacherUseCase } from "@/features/admin/class-management/domain/use-cases/assign-homeroom-teacher.use-case";
import { CreateClassUseCase } from "@/features/admin/class-management/domain/use-cases/create-class.use-case";
import { RenameClassUseCase } from "@/features/admin/class-management/domain/use-cases/rename-class.use-case";
import type {
  ClassActionResult,
  TeacherListActionResult,
} from "@/features/admin/class-management/presentation/class-management-screen/class-management-screen.i-vm";

async function resolveGradeRange(): Promise<{
  minGrade: number;
  maxGrade: number;
} | null> {
  const schoolRepo = await makeSchoolConfigRepository();
  const config = await schoolRepo.getConfig();
  if (config.ok && config.data.gradeLevelRange) {
    return {
      minGrade: config.data.gradeLevelRange.minGrade,
      maxGrade: config.data.gradeLevelRange.maxGrade,
    };
  }
  return null;
}

export async function createClassAction(
  input: CreateClassInput,
): Promise<ClassActionResult> {
  const repo = await makeClassManagementRepository();
  const useCase = new CreateClassUseCase(repo);
  const gradeRange = await resolveGradeRange();
  const result = await useCase.execute(input, gradeRange);
  if (!result.ok) return { ok: false, errorKey: result.failure.type };
  return { ok: true, data: result.value };
}

export async function renameClassAction(
  classId: string,
  input: RenameClassInput,
): Promise<ClassActionResult> {
  const repo = await makeClassManagementRepository();
  const useCase = new RenameClassUseCase(repo);
  const result = await useCase.execute(classId, input);
  if (!result.ok) return { ok: false, errorKey: result.failure.type };
  return { ok: true, data: result.value };
}

export async function archiveClassAction(
  classId: string,
): Promise<ClassActionResult> {
  const repo = await makeClassManagementRepository();
  const result = await repo.archiveClass(classId);
  if (!result.ok) return { ok: false, errorKey: result.failure.type };
  return { ok: true };
}

export async function assignHomeroomAction(
  classId: string,
  teacherUserId: string,
): Promise<ClassActionResult> {
  const repo = await makeClassManagementRepository();
  const useCase = new AssignHomeroomTeacherUseCase(repo);
  const result = await useCase.execute(classId, teacherUserId);
  if (!result.ok) return { ok: false, errorKey: result.failure.type };
  return { ok: true };
}

export async function listTeachersAction(
  search?: string,
): Promise<TeacherListActionResult> {
  const repo = await makeClassManagementRepository();
  const result = await repo.listTeachers({ search });
  if (!result.ok) return { ok: false, errorKey: result.failure.type };
  return { ok: true, data: result.value };
}
