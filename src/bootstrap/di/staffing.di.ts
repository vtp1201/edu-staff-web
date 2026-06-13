import "server-only";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { IStaffingRepository } from "@/features/admin/staffing/domain/repositories/i-staffing.repository";
import { ArchiveDepartmentUseCase } from "@/features/admin/staffing/domain/use-cases/archive-department.use-case";
import { ArchivePositionTitleUseCase } from "@/features/admin/staffing/domain/use-cases/archive-position-title.use-case";
import { AssignPositionUseCase } from "@/features/admin/staffing/domain/use-cases/assign-position.use-case";
import { CopyAssignmentsUseCase } from "@/features/admin/staffing/domain/use-cases/copy-assignments.use-case";
import { CreateDepartmentUseCase } from "@/features/admin/staffing/domain/use-cases/create-department.use-case";
import { CreatePositionTitleUseCase } from "@/features/admin/staffing/domain/use-cases/create-position-title.use-case";
import { MockStaffingRepository } from "@/features/admin/staffing/infrastructure/repositories/mocks/staffing.mock.repository";
import { StaffingRepository } from "@/features/admin/staffing/infrastructure/repositories/staffing.repository";

async function makeRepo(): Promise<IStaffingRepository> {
  if (USE_MOCK) return new MockStaffingRepository();
  return new StaffingRepository(await createServerHttpClient());
}

export async function makeStaffingRepository(): Promise<IStaffingRepository> {
  return makeRepo();
}

export async function makeCreateDepartmentUseCase() {
  return new CreateDepartmentUseCase(await makeRepo());
}

export async function makeArchiveDepartmentUseCase() {
  return new ArchiveDepartmentUseCase(await makeRepo());
}

export async function makeCreatePositionTitleUseCase() {
  return new CreatePositionTitleUseCase(await makeRepo());
}

export async function makeArchivePositionTitleUseCase() {
  return new ArchivePositionTitleUseCase(await makeRepo());
}

export async function makeAssignPositionUseCase() {
  return new AssignPositionUseCase(await makeRepo());
}

export async function makeCopyAssignmentsUseCase() {
  return new CopyAssignmentsUseCase(await makeRepo());
}
