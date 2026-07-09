"use server";

import { requireRole } from "@/bootstrap/auth-guard";
import {
  makeGetChildListUseCase,
  makeGetChildTimetableUseCase,
} from "@/bootstrap/di/timetable-view.di";
import type {
  ChildListActionResult,
  TimetableActionResult,
} from "@/features/timetable/presentation/timetable-view/timetable-view.i-vm";

/** Parent's children roster. RBAC-guarded before any DI call. */
export async function getChildListAction(): Promise<ChildListActionResult> {
  const guard = await requireRole(["parent"]);
  if (!guard.ok) return { ok: false, errorKey: "forbidden" };

  const result = await (await makeGetChildListUseCase()).execute();
  if (!result.ok) return { ok: false, errorKey: result.error.type };
  return { ok: true, data: result.data };
}

/** Timetable for a selected child. RBAC-guarded before any DI call. */
export async function getChildTimetableAction(
  childId: string,
): Promise<TimetableActionResult> {
  const guard = await requireRole(["parent"]);
  if (!guard.ok) return { ok: false, errorKey: "forbidden" };

  const result = await (await makeGetChildTimetableUseCase()).execute(childId);
  if (!result.ok) return { ok: false, errorKey: result.error.type };
  return { ok: true, data: result.data };
}
