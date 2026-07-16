import "server-only";

import type { IStaffLeaveRepository } from "@/features/staff-leave/domain/repositories/i-staff-leave.repository";
import { ApproveStaffLeaveUseCase } from "@/features/staff-leave/domain/use-cases/approve-staff-leave.use-case";
import { GetStaffLeaveRequestsUseCase } from "@/features/staff-leave/domain/use-cases/get-staff-leave-requests.use-case";
import { RejectStaffLeaveUseCase } from "@/features/staff-leave/domain/use-cases/reject-staff-leave.use-case";
import { MockStaffLeaveRepository } from "@/features/staff-leave/infrastructure/repositories/mocks/staff-leave.mock.repository";

/**
 * Staff-leave repository factory (per-request).
 *
 * **PERMANENTLY mock-first regardless of `USE_MOCK`** (US-E18.8, cross-repo
 * ask #13, `EPIC-OVERVIEW.md`) — the first fully-blocked factory in this
 * epic (previous "permanently mock" cases — `admin-roster.di.ts`,
 * `class-management.di.ts` — were hybrid/partial, some ops real). Ground-truthed
 * against `edu-api/services/core/docs/openapi.yaml`
 * `/api/v1/conduct/staff-leave-requests*`: the real `GET` requires a mandatory
 * `staffMemberId` query param (no tenant-wide oversight list exists — this
 * admin screen shows every staff member's requests at once), AND
 * `StaffLeaveRequestResponse` carries zero display fields (no
 * `staffName`/`department`/`leaveType`) with no IAM lookup to backfill one
 * (cross-repo ask #6/#7). `approve`/`reject` are therefore also unreachable —
 * their only source of a valid id is the (mock) list. Forcing mock here
 * guards against the day the app-wide `USE_MOCK` flag flips to `false` and
 * would otherwise silently break this screen (`StaffLeaveRepository`'s real
 * class exists only as permanent blocked stubs — see its doc comment).
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
