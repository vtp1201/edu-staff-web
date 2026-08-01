import "server-only";
import { ensureFreshSession } from "@/bootstrap/di/auth.di";
import { makeBatchResolveMembersUseCase } from "@/bootstrap/di/iam-directory.di";
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

/**
 * Staffing repository factory (per-request).
 *
 * Assignment `memberName` is resolved by COMPOSING `iam-directory`'s
 * `BatchResolveMembersUseCase` (IAM US-144, wired in US-E18.23) — one batch
 * call per assignments page, chunked at 50 ids inside that module.
 * `bootstrap/di`, not a feature's domain, is where composing across features
 * belongs (decision 0017). The mock branch is unaffected:
 * `MockStaffingRepository` already carries its own seeded names.
 */
async function makeRepo(): Promise<IStaffingRepository> {
  if (USE_MOCK) return new MockStaffingRepository();
  // Proactive refresh (decision 0018): rotate the access token BEFORE the
  // protected core call if it's about to expire, avoiding a wasted 401. See
  // EPIC-OVERVIEW.md playbook step 6 — documented but historically only wired
  // in auth.di; each wiring US closes it for its own cluster (US-E18.2).
  await ensureFreshSession();
  const resolveMembers = await makeBatchResolveMembersUseCase();
  return new StaffingRepository(await createServerHttpClient(), (memberIds) =>
    resolveMembers.execute(memberIds),
  );
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
