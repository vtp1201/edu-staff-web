"use server";

import { revalidatePath } from "next/cache";
import { makeDecideLeaveUseCases } from "@/bootstrap/di/discipline.di";
import {
  makeAddDocumentItemUseCase,
  makeCreateAssignmentUseCase,
  makeCreateLessonUseCase,
  makeDeleteItemUseCase,
  makeGetCourseUseCase,
  makeListCourseItemsUseCase,
  makePatchItemUseCase,
  makePublishCourseUseCase,
  makeReorderItemsUseCase,
} from "@/bootstrap/di/lms.di";
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
  Course,
  CourseStatus,
} from "@/features/lms/domain/entities/course.entity";
import type { CourseItem } from "@/features/lms/domain/entities/course-item.entity";
import type { LmsFailure } from "@/features/lms/domain/failures/lms.failure";
import type {
  CreateDocumentItemInput,
  CreateLessonInput,
  UpdateCourseItemInput,
} from "@/features/lms/domain/repositories/i-lms.repository";
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

/* ── Tab Khoá học online (US-E24.10, HIGH-RISK) ──────────────────────────── */

export type LmsActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; errorKey: LmsFailure["type"] };

/**
 * Is this course READABLE by the caller here — i.e. does it belong to a class
 * the caller teaches at all (GVCN or GVBM)?
 *
 * The weaker of the two gates on purpose: a GVCN legitimately reads the
 * timeline of a subject someone else teaches (`mode: "readonly"`). It still
 * pins the course to the `classId` in the URL, so a valid course id from
 * ANOTHER class cannot be read through this route.
 */
async function assertCourseInMyClass(
  classId: string,
  courseId: string,
): Promise<{ ok: true; course: Course } | { ok: false }> {
  const [classResult, courseResult] = await Promise.all([
    (await makeGetMyClassUseCase()).execute(classId),
    (await makeGetCourseUseCase()).execute(courseId),
  ]);
  if (!classResult.ok || !courseResult.ok) return { ok: false };
  if (courseResult.data.classId !== classId) return { ok: false };
  return { ok: true, course: courseResult.data };
}

/**
 * Is this course's SUBJECT one the caller teaches in this class? The gate every
 * mutation below runs first (decision `0063`).
 *
 * Re-derived server-side on EVERY call from the caller's own class list — never
 * from a prop, never from the fact that the client rendered a grip handle. A
 * client that forces `mode: "teacher"` still gets `forbidden` here.
 *
 * Defense in depth, not a replacement for BE: `lms` enforces course-level
 * teaching assignment (`LMS_COURSE_TEACHER_NOT_ASSIGNED`) but has no
 * GVCN-vs-GVBM distinction yet (epic ask #7). This gate is the finer one, so a
 * GVCN cannot edit a colleague's course through the tab that lets them READ it.
 */
async function assertOwnCourseSubject(
  classId: string,
  courseId: string,
): Promise<{ ok: true; course: Course } | { ok: false }> {
  const [classResult, courseResult] = await Promise.all([
    (await makeGetMyClassUseCase()).execute(classId),
    (await makeGetCourseUseCase()).execute(courseId),
  ]);
  if (!classResult.ok || !courseResult.ok) return { ok: false };
  const course = courseResult.data;
  if (course.classId !== classId) return { ok: false };
  const owns = classResult.data.subjects.some((s) => s.id === course.subjectId);
  return owns ? { ok: true, course } : { ok: false };
}

/** Re-read the timeline. Serves both the "Thử lại" banner and the client
 *  cache's own refetch, so there is ONE server read behind both. */
export async function listCourseItemsAction(
  classId: string,
  courseId: string,
): Promise<LmsActionResult<CourseItem[]>> {
  if (!(await assertCourseInMyClass(classId, courseId)).ok) {
    return { ok: false, errorKey: "forbidden" };
  }
  const result = await (await makeListCourseItemsUseCase()).execute(courseId);
  return result.ok
    ? { ok: true, data: result.data }
    : { ok: false, errorKey: result.failure.type };
}

export async function reorderItemsAction(
  classId: string,
  courseId: string,
  itemIds: string[],
): Promise<LmsActionResult<CourseItem[]>> {
  if (!(await assertOwnCourseSubject(classId, courseId)).ok) {
    return { ok: false, errorKey: "forbidden" };
  }
  const result = await (await makeReorderItemsUseCase()).execute(
    courseId,
    itemIds,
  );
  if (result.ok) revalidatePath(CLASS_HUB_PATH, "page");
  return result.ok
    ? { ok: true, data: result.data }
    : { ok: false, errorKey: result.failure.type };
}

export async function patchItemAction(
  classId: string,
  courseId: string,
  itemId: string,
  patch: UpdateCourseItemInput,
): Promise<LmsActionResult<CourseItem>> {
  if (!(await assertOwnCourseSubject(classId, courseId)).ok) {
    return { ok: false, errorKey: "forbidden" };
  }
  const result = await (await makePatchItemUseCase()).execute(
    courseId,
    itemId,
    patch,
  );
  if (result.ok) revalidatePath(CLASS_HUB_PATH, "page");
  return result.ok
    ? { ok: true, data: result.data }
    : { ok: false, errorKey: result.failure.type };
}

/**
 * The three creates all answer with the WHOLE refreshed timeline rather than
 * the created entity.
 *
 * `POST /lessons` and `POST /assignments` return the lesson/assignment — NOT
 * the timeline tile BE derives from it — so there is nothing tile-shaped to
 * hand back, and even `addDocumentItem`'s own tile would arrive without
 * knowing where BE placed it among its siblings. One read-back per create
 * keeps the client cache authoritative on both count and order.
 */
async function itemsAfterWrite(
  courseId: string,
): Promise<LmsActionResult<CourseItem[]>> {
  const items = await (await makeListCourseItemsUseCase()).execute(courseId);
  return items.ok
    ? { ok: true, data: items.data }
    : { ok: false, errorKey: items.failure.type };
}

export async function createLessonAction(
  classId: string,
  courseId: string,
  input: CreateLessonInput,
): Promise<LmsActionResult<CourseItem[]>> {
  if (!(await assertOwnCourseSubject(classId, courseId)).ok) {
    return { ok: false, errorKey: "forbidden" };
  }
  const result = await (await makeCreateLessonUseCase()).execute(
    courseId,
    input,
  );
  if (!result.ok) return { ok: false, errorKey: result.failure.type };
  revalidatePath(CLASS_HUB_PATH, "page");
  return itemsAfterWrite(courseId);
}

/**
 * `classId`/`subjectId` on the assignment body are taken from the GATE's own
 * course read, never from the client — a caller-supplied pair would be an
 * authorization input the caller controls.
 */
export async function createAssignmentAction(
  classId: string,
  courseId: string,
  input: {
    title: string;
    instructions?: string;
    startAt?: string | null;
    dueAt?: string | null;
  },
): Promise<LmsActionResult<CourseItem[]>> {
  const gate = await assertOwnCourseSubject(classId, courseId);
  if (!gate.ok) return { ok: false, errorKey: "forbidden" };

  const result = await (await makeCreateAssignmentUseCase()).execute({
    classId: gate.course.classId,
    subjectId: gate.course.subjectId,
    courseId,
    ...input,
  });
  if (!result.ok) return { ok: false, errorKey: result.failure.type };
  revalidatePath(CLASS_HUB_PATH, "page");
  return itemsAfterWrite(courseId);
}

export async function addDocumentItemAction(
  classId: string,
  courseId: string,
  input: CreateDocumentItemInput,
): Promise<LmsActionResult<CourseItem[]>> {
  if (!(await assertOwnCourseSubject(classId, courseId)).ok) {
    return { ok: false, errorKey: "forbidden" };
  }
  const result = await (await makeAddDocumentItemUseCase()).execute(
    courseId,
    input,
  );
  if (!result.ok) return { ok: false, errorKey: result.failure.type };
  revalidatePath(CLASS_HUB_PATH, "page");
  return itemsAfterWrite(courseId);
}

/** DRAFT → PUBLISHED. Only the status crosses back: the banner is the one
 *  thing that changes, and the timeline is untouched by a publish. */
export async function publishCourseAction(
  classId: string,
  courseId: string,
): Promise<LmsActionResult<CourseStatus>> {
  if (!(await assertOwnCourseSubject(classId, courseId)).ok) {
    return { ok: false, errorKey: "forbidden" };
  }
  const result = await (await makePublishCourseUseCase()).execute(courseId);
  if (result.ok) revalidatePath(CLASS_HUB_PATH, "page");
  return result.ok
    ? { ok: true, data: result.data.status }
    : { ok: false, errorKey: result.failure.type };
}

export async function deleteItemAction(
  classId: string,
  courseId: string,
  itemId: string,
): Promise<LmsActionResult<null>> {
  if (!(await assertOwnCourseSubject(classId, courseId)).ok) {
    return { ok: false, errorKey: "forbidden" };
  }
  const result = await (await makeDeleteItemUseCase()).execute(
    courseId,
    itemId,
  );
  if (result.ok) revalidatePath(CLASS_HUB_PATH, "page");
  return result.ok
    ? { ok: true, data: null }
    : { ok: false, errorKey: result.failure.type };
}
