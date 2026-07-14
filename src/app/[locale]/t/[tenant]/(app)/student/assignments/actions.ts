"use server";

import { requireRole } from "@/bootstrap/auth-guard";
import {
  makeListAssignmentsUseCase,
  makeSubmitAssignmentUseCase,
} from "@/bootstrap/di/lms.di";
import type {
  AssignmentStatusFilter,
  SubmitAssignmentInput,
} from "@/features/lms/domain/entities/assignment.entity";
import type {
  ListAssignmentsResult,
  SubmitAssignmentResult,
} from "@/features/lms/presentation/student-assignments/student-assignments-screen.i-vm";

const MOCK_STUDENT_ID = "current-student";

/** Per-tab list fetch for the client screen's non-default tab queries. */
export async function listAssignmentsAction(
  tab: AssignmentStatusFilter,
): Promise<ListAssignmentsResult> {
  const guard = await requireRole(["student"]);
  if (!guard.ok) return { ok: false, errorKey: "forbidden" };
  const useCase = await makeListAssignmentsUseCase();
  const result = await useCase.execute(MOCK_STUDENT_ID, tab);
  if (!result.ok) return { ok: false, errorKey: result.failure.type };
  return { ok: true, data: result.data };
}

/** Submit a pending assignment (mock-first). Returns the updated entity. */
export async function submitAssignmentAction(
  assignmentId: string,
  input: SubmitAssignmentInput,
): Promise<SubmitAssignmentResult> {
  const guard = await requireRole(["student"]);
  if (!guard.ok) return { ok: false, errorKey: "forbidden" };
  const useCase = await makeSubmitAssignmentUseCase();
  const result = await useCase.execute(assignmentId, input);
  if (!result.ok) return { ok: false, errorKey: result.failure.type };
  return { ok: true, data: result.data };
}
