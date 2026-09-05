"use server";

import { revalidatePath } from "next/cache";
import { makeDecideLeaveUseCases } from "@/bootstrap/di/discipline.di";
import {
  makeDeletePeriodLogUseCase,
  makeDeletePeriodPrepUseCase,
  makeSavePeriodLogUseCase,
  makeSavePeriodPrepUseCase,
} from "@/bootstrap/di/period-log.di";
import { makeGetMyClassUseCase } from "@/bootstrap/di/teacher-class.di";
import { resolveCurrentTermContext } from "@/bootstrap/lib/resolve-current-term";
import type { HomeroomEntry } from "@/features/class-log/domain/entities/homeroom-entry.entity";
import type { ClassLogFailure } from "@/features/class-log/domain/failures/class-log.failure";
import type { DisciplineFailure } from "@/features/discipline/domain/failures/discipline.failure";
import type {
  PeriodLog,
  SavePeriodLogInput,
} from "@/features/period-log/domain/entities/period-log.entity";
import type {
  PeriodPrep,
  SavePeriodPrepInput,
} from "@/features/period-log/domain/entities/period-prep.entity";
import type { PeriodLogFailure } from "@/features/period-log/domain/failures/period-log.failure";
import {
  createEntryAction,
  reviseEntryAction,
  submitEntryAction,
} from "../../class-log/actions";

/** One target for all seven mutations: `page.tsx` assembles the whole route in
 *  a single server render, so there is no per-tab or per-week cache segment to
 *  bust separately. It invalidates the Router Cache (prefetch/back-forward);
 *  the CURRENT view updates from the returned entity, not from this call. */
const CLASS_HUB_PATH = "/[locale]/t/[tenant]/(app)/teacher/classes/[classId]";

export type PeriodLogActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; errorKey: PeriodLogFailure["type"] };

export type DailyEntryActionResult =
  | { ok: true; entry: HomeroomEntry }
  | { ok: false; errorKey: ClassLogFailure["type"] };

/**
 * Resolve the calendar context both period writes require. A year/term that
 * cannot be resolved is reported as `slot-forbidden-or-missing` — the SAME key
 * core itself returns for an unresolvable term/year pair (VULN-232-001), so the
 * UI never gains a distinction the BE deliberately removed.
 */
async function termContext(): Promise<{
  termId: string;
  academicYearId: string;
} | null> {
  try {
    const { termId, academicYearId } = await resolveCurrentTermContext();
    return { termId, academicYearId };
  } catch {
    return null;
  }
}

export async function savePeriodLogAction(
  classId: string,
  date: string,
  periodNumber: number,
  assignedTeacherMemberId: string,
  input: SavePeriodLogInput,
): Promise<PeriodLogActionResult<PeriodLog>> {
  const ctx = await termContext();
  if (!ctx) return { ok: false, errorKey: "slot-forbidden-or-missing" };

  const { useCase, authCtx } = await makeSavePeriodLogUseCase();
  const result = await useCase.execute(authCtx, {
    classId,
    date,
    periodNumber,
    assignedTeacherMemberId,
    ...ctx,
    input,
  });
  if (result.ok) revalidatePath(CLASS_HUB_PATH, "page");
  return result.ok
    ? { ok: true, data: result.data }
    : { ok: false, errorKey: result.error.type };
}

export async function deletePeriodLogAction(
  classId: string,
  date: string,
  periodNumber: number,
  assignedTeacherMemberId: string,
): Promise<PeriodLogActionResult<null>> {
  const ctx = await termContext();
  if (!ctx) return { ok: false, errorKey: "slot-forbidden-or-missing" };

  const { useCase, authCtx } = await makeDeletePeriodLogUseCase();
  const result = await useCase.execute(authCtx, {
    classId,
    date,
    periodNumber,
    assignedTeacherMemberId,
    ...ctx,
  });
  if (result.ok) revalidatePath(CLASS_HUB_PATH, "page");
  return result.ok
    ? { ok: true, data: null }
    : { ok: false, errorKey: result.error.type };
}

export async function savePeriodPrepAction(
  classId: string,
  date: string,
  periodNumber: number,
  assignedTeacherMemberId: string,
  input: SavePeriodPrepInput,
): Promise<PeriodLogActionResult<PeriodPrep>> {
  const ctx = await termContext();
  if (!ctx) return { ok: false, errorKey: "slot-forbidden-or-missing" };

  const { useCase, authCtx } = await makeSavePeriodPrepUseCase();
  const result = await useCase.execute(authCtx, {
    classId,
    date,
    periodNumber,
    assignedTeacherMemberId,
    ...ctx,
    input,
  });
  if (result.ok) revalidatePath(CLASS_HUB_PATH, "page");
  return result.ok
    ? { ok: true, data: result.data }
    : { ok: false, errorKey: result.error.type };
}

export async function deletePeriodPrepAction(
  classId: string,
  date: string,
  periodNumber: number,
  assignedTeacherMemberId: string,
): Promise<PeriodLogActionResult<null>> {
  const ctx = await termContext();
  if (!ctx) return { ok: false, errorKey: "slot-forbidden-or-missing" };

  const { useCase, authCtx } = await makeDeletePeriodPrepUseCase();
  const result = await useCase.execute(authCtx, {
    classId,
    date,
    periodNumber,
    assignedTeacherMemberId,
    ...ctx,
  });
  if (result.ok) revalidatePath(CLASS_HUB_PATH, "page");
  return result.ok
    ? { ok: true, data: null }
    : { ok: false, errorKey: result.error.type };
}

/* ── Sổ chủ nhiệm theo ngày (homeroom-entries) ───────────────────────────── */

/**
 * Is the caller this class's GVCN? Re-derived SERVER-SIDE from the teacher's
 * own class list on every call — never trusted from a prop, and never inferred
 * from the fact that the screen rendered the button.
 *
 * Why the gate is new here (decision 0063's role-only carve-out): the
 * class-log repository has no per-record authorization of its own, which was
 * previously acceptable because `createEntry`/`submitEntry`/`reviseEntry` were
 * reachable only from `/teacher/class-log`, a route a subject teacher has no
 * way into. This tab is the first surface a GVBM can load that exposes those
 * actions, so the same class lookup the shell already performs becomes the
 * scope proof. No new repository, no new entity — `TeacherClass.roles` IS the
 * fact being checked.
 */
async function assertHomeroomOf(classId: string): Promise<boolean> {
  const result = await (await makeGetMyClassUseCase()).execute(classId);
  return result.ok && result.data.roles.includes("homeroom");
}

export async function saveDailyEntryAction(
  classId: string,
  entryDate: string,
  summary: string,
  notableEvents?: string,
): Promise<DailyEntryActionResult> {
  if (!(await assertHomeroomOf(classId))) {
    return { ok: false, errorKey: "forbidden" };
  }
  const result = await createEntryAction(
    classId,
    entryDate,
    summary,
    notableEvents,
  );
  if (result.ok) revalidatePath(CLASS_HUB_PATH, "page");
  return result;
}

export async function submitDailyEntryAction(
  classId: string,
  entryId: string,
): Promise<DailyEntryActionResult> {
  if (!(await assertHomeroomOf(classId))) {
    return { ok: false, errorKey: "forbidden" };
  }
  const result = await submitEntryAction(classId, entryId);
  if (result.ok) revalidatePath(CLASS_HUB_PATH, "page");
  return result;
}

export async function reviseDailyEntryAction(
  classId: string,
  entryId: string,
): Promise<DailyEntryActionResult> {
  if (!(await assertHomeroomOf(classId))) {
    return { ok: false, errorKey: "forbidden" };
  }
  const result = await reviseEntryAction(classId, entryId);
  if (result.ok) revalidatePath(CLASS_HUB_PATH, "page");
  return result;
}

/* ── Đơn xin nghỉ của lớp chủ nhiệm (US-E24.11, HIGH-RISK) ───────────────── */

export type LeaveDecisionActionResult =
  | { ok: true }
  | { ok: false; errorKey: DisciplineFailure["type"] };

/** A thrown `DisciplineFailure` keeps its stable key; anything else degrades to
 *  `network-error` rather than leaking an unmapped error to the client. */
function toLeaveErrorKey(err: unknown): DisciplineFailure["type"] {
  if (err && typeof err === "object" && "type" in err) {
    return (err as DisciplineFailure).type;
  }
  return "network-error";
}

/**
 * Approve a student leave request from the GVCN homeroom tab.
 *
 * `makeDecideLeaveUseCases()` returns the use-case AND the server-derived
 * `authCtx` together (decision `0063`), so this action physically cannot call
 * the mutation without threading the scope it must be checked against. The
 * check itself runs at the repository boundary — a `classId` outside the
 * caller's homeroom set is refused before any HTTP call.
 *
 * Approvals are terminal for the student: there is no un-approve route. The
 * route is only revalidated when the decision actually landed.
 */
export async function approveLeaveAction(
  id: string,
  studentMemberId: string,
  classId: string,
): Promise<LeaveDecisionActionResult> {
  const { approve, authCtx } = await makeDecideLeaveUseCases();
  try {
    await approve.execute({ id, studentMemberId, classId, authCtx });
    revalidatePath(CLASS_HUB_PATH, "page");
    return { ok: true };
  } catch (err) {
    return { ok: false, errorKey: toLeaveErrorKey(err) };
  }
}

/** Reject a student leave request with a mandatory reason. See
 *  {@link approveLeaveAction} for the authorization shape. */
export async function rejectLeaveAction(
  id: string,
  studentMemberId: string,
  classId: string,
  reason: string,
): Promise<LeaveDecisionActionResult> {
  const { reject, authCtx } = await makeDecideLeaveUseCases();
  try {
    await reject.execute({ id, studentMemberId, classId, reason, authCtx });
    revalidatePath(CLASS_HUB_PATH, "page");
    return { ok: true };
  } catch (err) {
    return { ok: false, errorKey: toLeaveErrorKey(err) };
  }
}
