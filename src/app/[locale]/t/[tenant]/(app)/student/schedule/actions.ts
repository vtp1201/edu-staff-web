"use server";

import { requireRole } from "@/bootstrap/auth-guard";
import { makeGetMyTimetableUseCase } from "@/bootstrap/di/timetable-view.di";
import type { TimetableActionResult } from "@/features/timetable/presentation/timetable-view/timetable-view.i-vm";

/** Student self-scope timetable read. RBAC-guarded before any DI call. */
export async function getMyTimetableAction(): Promise<TimetableActionResult> {
  const guard = await requireRole(["student"]);
  if (!guard.ok) return { ok: false, errorKey: "forbidden" };

  const result = await (await makeGetMyTimetableUseCase()).execute();
  if (!result.ok) return { ok: false, errorKey: result.error.type };
  return { ok: true, data: result.data };
}
