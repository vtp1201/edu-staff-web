"use server";

import { requireRole } from "@/bootstrap/auth-guard";
import { makeGetMyTeachingScheduleUseCase } from "@/bootstrap/di/timetable-view.di";
import type { TeacherScheduleActionResult } from "@/features/timetable/presentation/teacher-schedule/teacher-schedule.i-vm";

/** Teacher self-scope teaching schedule read. RBAC-guarded before any DI call. */
export async function getMyTeachingScheduleAction(): Promise<TeacherScheduleActionResult> {
  const guard = await requireRole(["teacher"]);
  if (!guard.ok) return { ok: false, errorKey: "forbidden" };

  const result = await (await makeGetMyTeachingScheduleUseCase()).execute();
  if (!result.ok) return { ok: false, errorKey: result.error.type };
  return { ok: true, data: result.data };
}
