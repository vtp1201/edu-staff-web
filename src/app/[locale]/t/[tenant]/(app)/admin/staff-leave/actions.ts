"use server";

import { revalidatePath } from "next/cache";
import {
  makeApproveStaffLeaveUseCase,
  makeRejectStaffLeaveUseCase,
} from "@/bootstrap/di/staff-leave.di";
import type { StaffLeaveActionOutcome } from "@/features/staff-leave/presentation/staff-leave-screen/staff-leave-screen.i-vm";

const STAFF_LEAVE_ROUTE = "/[locale]/t/[tenant]/(app)/admin/staff-leave";

export async function approveStaffLeaveAction(
  id: string,
): Promise<StaffLeaveActionOutcome> {
  const useCase = await makeApproveStaffLeaveUseCase();
  const result = await useCase.execute(id);
  if (result.ok) {
    revalidatePath(STAFF_LEAVE_ROUTE, "page");
    return { ok: true };
  }
  return { ok: false, errorKey: result.error.type };
}

export async function rejectStaffLeaveAction(
  id: string,
  reason: string,
): Promise<StaffLeaveActionOutcome> {
  const useCase = await makeRejectStaffLeaveUseCase();
  const result = await useCase.execute(id, reason);
  if (result.ok) {
    revalidatePath(STAFF_LEAVE_ROUTE, "page");
    return { ok: true };
  }
  return { ok: false, errorKey: result.error.type };
}
