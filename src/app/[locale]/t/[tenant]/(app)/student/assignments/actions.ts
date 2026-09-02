"use server";

import { requireRole } from "@/bootstrap/auth-guard";
import {
  makeGetAssignmentDetailUseCase,
  makeListAssignmentsUseCase,
  makeSubmitAssignmentUseCase,
  resolveMyLmsClassId,
} from "@/bootstrap/di/lms.di";
import type {
  GetAssignmentDetailResult,
  ListAssignmentsResult,
  SubmitAssignmentResult,
} from "@/features/lms/presentation/student-assignments/student-assignments-screen.i-vm";

/** Client-triggered refetch of the class's assignment list. */
export async function listAssignmentsAction(): Promise<ListAssignmentsResult> {
  const guard = await requireRole(["student"]);
  if (!guard.ok) return { ok: false, errorKey: "forbidden" };

  const classId = await resolveMyLmsClassId();
  // No resolvable class → the class-scoped list cannot be requested at all.
  // Same condition, same key as the RSC page: `no-class`, never `not-found`.
  if (classId === null) return { ok: false, errorKey: "no-class" };

  const result = await (await makeListAssignmentsUseCase()).execute(classId);
  if (!result.ok) return { ok: false, errorKey: result.failure.type };
  return { ok: true, data: result.data };
}

/** Full assignment + the caller's own submission (null = not submitted yet). */
export async function getAssignmentDetailAction(
  assignmentId: string,
): Promise<GetAssignmentDetailResult> {
  const guard = await requireRole(["student"]);
  if (!guard.ok) return { ok: false, errorKey: "forbidden" };

  const result = await (await makeGetAssignmentDetailUseCase()).execute(
    assignmentId,
  );
  if (!result.ok) return { ok: false, errorKey: result.failure.type };
  return { ok: true, data: result.data };
}

/** Submit work — SINGLE ATTEMPT, and refused outright after `dueAt`. */
export async function submitAssignmentAction(
  assignmentId: string,
  content: string,
): Promise<SubmitAssignmentResult> {
  const guard = await requireRole(["student"]);
  if (!guard.ok) return { ok: false, errorKey: "forbidden" };

  const result = await (await makeSubmitAssignmentUseCase()).execute(
    assignmentId,
    content,
  );
  if (!result.ok) return { ok: false, errorKey: result.failure.type };
  return { ok: true, data: result.data };
}
