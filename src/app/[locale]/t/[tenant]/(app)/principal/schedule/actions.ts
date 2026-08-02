"use server";

import { requireRole } from "@/bootstrap/auth-guard";
import { makeGetPrincipalTeachersUseCase } from "@/bootstrap/di";
import { makeGetMemberTimetableUseCase } from "@/bootstrap/di/timetable-view.di";
import type { PrincipalTeachersFailure } from "@/features/principal/domain/teachers/failures/principal-teachers.failure";
import type {
  TeacherListActionResult,
  TimetableActionResult,
  TimetableErrorKey,
} from "@/features/timetable/presentation/timetable-view/timetable-view.i-vm";

/**
 * Explicit bridge between two Result conventions (packet §Phase 2): the
 * `principal` feature's failure union is WIDER than the timetable view's error
 * keys, so every member is mapped by hand. `conflict-exists`/`unknown` have no
 * timetable counterpart — they surface as the retryable error banner rather
 * than being silently collapsed into the "no timetable published" empty state.
 */
function toTimetableErrorKey(
  failure: PrincipalTeachersFailure,
): TimetableErrorKey {
  switch (failure.type) {
    case "forbidden":
      return "forbidden";
    case "not-found":
      return "not-found";
    default:
      return "network-error";
  }
}

/** Teacher roster driving the picker. RBAC-guarded before any DI call. */
export async function getPrincipalTeacherListAction(): Promise<TeacherListActionResult> {
  const guard = await requireRole(["principal"]);
  if (!guard.ok) return { ok: false, errorKey: "forbidden" };

  const result = await (await makeGetPrincipalTeachersUseCase()).execute();
  if (!result.ok)
    return { ok: false, errorKey: toTimetableErrorKey(result.failure) };
  return { ok: true, data: result.value };
}

/** Weekly timetable of the selected teacher. RBAC-guarded before any DI call. */
export async function getMemberTimetableAction(
  memberId: string,
  weekStart?: string,
): Promise<TimetableActionResult> {
  const guard = await requireRole(["principal"]);
  if (!guard.ok) return { ok: false, errorKey: "forbidden" };

  const result = await (await makeGetMemberTimetableUseCase()).execute(
    memberId,
    weekStart,
  );
  if (!result.ok) return { ok: false, errorKey: result.error.type };
  return { ok: true, data: result.data };
}
