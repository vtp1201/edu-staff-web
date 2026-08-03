"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/bootstrap/auth-guard";
import {
  makeApproveStaffLeaveUseCase,
  makeRejectStaffLeaveUseCase,
} from "@/bootstrap/di/staff-leave.di";
import type { StaffLeaveActionOutcome } from "@/features/staff-leave/presentation/staff-leave-screen/staff-leave-screen.i-vm";

const STAFF_LEAVE_ROUTE = "/[locale]/t/[tenant]/(app)/admin/staff-leave";

/**
 * `staffId` is not redundant: core's approve/reject routes require a
 * `staffMemberId` query param that completes the storage key (US-E18.36).
 *
 * `requireRole` FIRST (zero DI/use-case calls when it rejects): a Server Action
 * is an independently-invocable POST endpoint, so the `(app)/admin` RSC layout
 * guard covers only the page render — not this path. Load-bearing since
 * US-E18.36 made this a REAL tenant-state mutation; core re-authorizes too
 * (403 `VIOLATION_FORBIDDEN`), this is the defense-in-depth half (ADR 0063).
 */
export async function approveStaffLeaveAction(
  id: string,
  staffId: string,
): Promise<StaffLeaveActionOutcome> {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return { ok: false, errorKey: "forbidden" };

  const useCase = await makeApproveStaffLeaveUseCase();
  const result = await useCase.execute(id, staffId);
  if (result.ok) {
    revalidatePath(STAFF_LEAVE_ROUTE, "page");
    return { ok: true };
  }
  return { ok: false, errorKey: result.error.type };
}

/** Same `requireRole` gate as approve — see `approveStaffLeaveAction`. */
export async function rejectStaffLeaveAction(
  id: string,
  staffId: string,
  reason: string,
): Promise<StaffLeaveActionOutcome> {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return { ok: false, errorKey: "forbidden" };

  const useCase = await makeRejectStaffLeaveUseCase();
  const result = await useCase.execute(id, staffId, reason);
  if (result.ok) {
    revalidatePath(STAFF_LEAVE_ROUTE, "page");
    return { ok: true };
  }
  return { ok: false, errorKey: result.error.type };
}
