import "server-only";

import { ensureFreshSession } from "@/bootstrap/di/auth.di";
import { makeBatchResolveMembersUseCase } from "@/bootstrap/di/iam-directory.di";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { IStaffLeaveRepository } from "@/features/staff-leave/domain/repositories/i-staff-leave.repository";
import { ApproveStaffLeaveUseCase } from "@/features/staff-leave/domain/use-cases/approve-staff-leave.use-case";
import { GetStaffLeaveRequestsUseCase } from "@/features/staff-leave/domain/use-cases/get-staff-leave-requests.use-case";
import { RejectStaffLeaveUseCase } from "@/features/staff-leave/domain/use-cases/reject-staff-leave.use-case";
import { MockStaffLeaveRepository } from "@/features/staff-leave/infrastructure/repositories/mocks/staff-leave.mock.repository";
import { StaffLeaveRepository } from "@/features/staff-leave/infrastructure/repositories/staff-leave.repository";

/**
 * Staff-leave repository factory (per-request).
 *
 * **UN-MOCKED in US-E18.36** — this is now the plain `USE_MOCK ? Mock : Real`
 * gate every other DI factory uses (decision 0014). It used to force the mock
 * regardless of `USE_MOCK` (US-E18.8), and all three blockers behind that are
 * now closed:
 *
 * 1. ~~No tenant-wide oversight list~~ — core US-149 made `staffMemberId`
 *    OPTIONAL on `GET /conduct/staff-leave-requests`; omitting it yields the
 *    tenant-wide, `status`-sliced list (ADMIN/MANAGER/SUPER_ADMIN).
 * 2. ~~No IAM lookup to backfill a name~~ — IAM US-144; resolved by COMPOSING
 *    `iam-directory`'s `BatchResolveMembersUseCase` (one batch call per list,
 *    chunked at 50 ids inside that module), exactly as `staffing.di.ts` does
 *    for assignment display names. `bootstrap/di`, not a feature's domain, is
 *    where composing across features belongs (decision 0017).
 * 3. ~~`department` / `leaveType` have no wire source~~ — core US-170 put both
 *    on `StaffLeaveRequestResponse`. Both are NULLABLE for DIFFERENT reasons
 *    (legacy-row gap vs ongoing no-department state); the entity/DTO were
 *    widened and presentation renders a distinct placeholder for each, so no
 *    value is ever invented.
 *
 * The mock branch is unaffected: `MockStaffLeaveRepository` keeps its own
 * seeded rows (including one that exercises both nulls).
 */
async function makeRepo(): Promise<IStaffLeaveRepository> {
  if (USE_MOCK) return new MockStaffLeaveRepository();
  // Proactive refresh (decision 0018): rotate the access token BEFORE the
  // protected core call if it's about to expire, avoiding a wasted 401.
  await ensureFreshSession();
  const resolveMembers = await makeBatchResolveMembersUseCase();
  return new StaffLeaveRepository(await createServerHttpClient(), (memberIds) =>
    resolveMembers.execute(memberIds),
  );
}

/** Exposed for the DI env-matrix test; screens use the use-case factories. */
export async function makeStaffLeaveRepository(): Promise<IStaffLeaveRepository> {
  return makeRepo();
}

export async function makeGetStaffLeaveRequestsUseCase() {
  return new GetStaffLeaveRequestsUseCase(await makeRepo());
}

export async function makeApproveStaffLeaveUseCase() {
  return new ApproveStaffLeaveUseCase(await makeRepo());
}

export async function makeRejectStaffLeaveUseCase() {
  return new RejectStaffLeaveUseCase(await makeRepo());
}
