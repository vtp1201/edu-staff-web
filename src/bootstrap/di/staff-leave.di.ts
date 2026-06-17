import "server-only";

import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { IStaffLeaveRepository } from "@/features/staff-leave/domain/repositories/i-staff-leave.repository";
import { ApproveStaffLeaveUseCase } from "@/features/staff-leave/domain/use-cases/approve-staff-leave.use-case";
import { GetStaffLeaveRequestsUseCase } from "@/features/staff-leave/domain/use-cases/get-staff-leave-requests.use-case";
import { RejectStaffLeaveUseCase } from "@/features/staff-leave/domain/use-cases/reject-staff-leave.use-case";
import { MockStaffLeaveRepository } from "@/features/staff-leave/infrastructure/repositories/mocks/staff-leave.mock.repository";
import { StaffLeaveRepository } from "@/features/staff-leave/infrastructure/repositories/staff-leave.repository";

async function makeRepo(): Promise<IStaffLeaveRepository> {
  if (USE_MOCK) return new MockStaffLeaveRepository();
  return new StaffLeaveRepository(await createServerHttpClient());
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
