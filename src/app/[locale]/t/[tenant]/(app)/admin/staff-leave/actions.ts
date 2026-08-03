"use server";

import { revalidatePath } from "next/cache";
import {
  makeApproveStaffLeaveUseCase,
  makeRejectStaffLeaveUseCase,
} from "@/bootstrap/di/staff-leave.di";
import type { StaffLeaveActionOutcome } from "@/features/staff-leave/presentation/staff-leave-screen/staff-leave-screen.i-vm";

const STAFF_LEAVE_ROUTE = "/[locale]/t/[tenant]/(app)/admin/staff-leave";

/**
 * `staffId` is not redundant: core's approve/reject routes require a
 * `staffMemberId` query param that completes the storage key (US-E18.36).
 */
export async function approveStaffLeaveAction(
  id: string,
  staffId: string,
): Promise<StaffLeaveActionOutcome> {
  const useCase = await makeApproveStaffLeaveUseCase();
  const result = await useCase.execute(id, staffId);
  if (result.ok) {
    revalidatePath(STAFF_LEAVE_ROUTE, "page");
    return { ok: true };
  }
  return { ok: false, errorKey: result.error.type };
}

export async function rejectStaffLeaveAction(
  id: string,
  staffId: string,
  reason: string,
): Promise<StaffLeaveActionOutcome> {
  const useCase = await makeRejectStaffLeaveUseCase();
  const result = await useCase.execute(id, staffId, reason);
  if (result.ok) {
    revalidatePath(STAFF_LEAVE_ROUTE, "page");
    return { ok: true };
  }
  return { ok: false, errorKey: result.error.type };
}
