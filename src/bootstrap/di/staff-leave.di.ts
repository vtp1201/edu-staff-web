import "server-only";

import type { IStaffLeaveRepository } from "@/features/staff-leave/domain/repositories/i-staff-leave.repository";
import { ApproveStaffLeaveUseCase } from "@/features/staff-leave/domain/use-cases/approve-staff-leave.use-case";
import { GetStaffLeaveRequestsUseCase } from "@/features/staff-leave/domain/use-cases/get-staff-leave-requests.use-case";
import { RejectStaffLeaveUseCase } from "@/features/staff-leave/domain/use-cases/reject-staff-leave.use-case";
import { MockStaffLeaveRepository } from "@/features/staff-leave/infrastructure/repositories/mocks/staff-leave.mock.repository";

/**
 * Staff-leave repository factory (per-request).
 *
 * **PERMANENTLY mock-first regardless of `USE_MOCK`** (US-E18.8; rationale
 * REVISED in US-E18.23 — cross-repo ask #13 is now PARTIALLY resolved and the
 * residual gap is ask **#41**, `EPIC-OVERVIEW.md`).
 *
 * The original two-part premise no longer holds:
 *   - "no tenant-wide oversight list exists" — FALSE since core US-149;
 *     `staffMemberId` is optional now and omitting it yields the tenant-wide,
 *     `status`-sliced list (ADMIN/MANAGER/SUPER_ADMIN).
 *   - "no IAM lookup to backfill a name" — FALSE since IAM US-144;
 *     `iam-directory`'s batch lookup resolves `staffMemberId` → `staffName`,
 *     as `staffing.di.ts` already does for assignment display names.
 *
 * What still blocks wiring is narrower and unchanged: `department` and
 * `leaveType` have NO source anywhere on `StaffLeaveRequestResponse`
 * (re-ground-truthed 2026-08-01), yet both are required non-optional on the
 * entity and read unguarded by the shipped card. A leave *category* cannot be
 * substituted by a raw id the way `memberName` can, and inventing one is
 * forbidden — so this screen keeps its shipped mock UX rather than shipping a
 * half-real row. Forcing mock here guards against the day the app-wide
 * `USE_MOCK` flag flips to `false` (`StaffLeaveRepository`'s real class exists
 * only as permanent blocked stubs — see its doc comment).
 */
async function makeRepo(): Promise<IStaffLeaveRepository> {
  return new MockStaffLeaveRepository();
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
