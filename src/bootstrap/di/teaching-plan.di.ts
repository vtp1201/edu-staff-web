import "server-only";
import type { ITeachingPlanRepository } from "@/features/teaching-plan/domain/repositories/i-teaching-plan.repository";
import { ApproveTeachingPlanUseCase } from "@/features/teaching-plan/domain/use-cases/approve-teaching-plan.use-case";
import { GetTeachingPlanUseCase } from "@/features/teaching-plan/domain/use-cases/get-teaching-plan.use-case";
import { ListPendingTeachingPlansUseCase } from "@/features/teaching-plan/domain/use-cases/list-pending-teaching-plans.use-case";
import { RejectTeachingPlanUseCase } from "@/features/teaching-plan/domain/use-cases/reject-teaching-plan.use-case";
import { SavePlanCellUseCase } from "@/features/teaching-plan/domain/use-cases/save-plan-cell.use-case";
import { SubmitTeachingPlanUseCase } from "@/features/teaching-plan/domain/use-cases/submit-teaching-plan.use-case";
import { MockTeachingPlanRepository } from "@/features/teaching-plan/infrastructure/repositories/mocks/teaching-plan.mock.repository";

/**
 * Teaching-plan repository factory (per-request).
 *
 * **PERMANENTLY mock-first regardless of `USE_MOCK`** (US-E18.9, cross-repo
 * ask #14, `EPIC-OVERVIEW.md`) — second fully-blocked factory in this epic
 * after `staff-leave.di.ts` (US-E18.8). Ground-truthed against
 * `edu-api/services/core/docs/openapi.yaml`'s `TeachingPlan (LMS)` tag + Go
 * source: the web screen's `(subjectId, classId, term)` key doesn't match the
 * real `(classSubjectId, academicYear, planId)` key (no term dimension
 * exists — one BE plan spans a full academic year); the grid's period axis
 * has no wire representation (`WeeklyEntryResponse` is week-only); and there
 * is NO endpoint to edit an existing plan's entries at all (`create` sets
 * `weeklyEntries` once, no `PUT`/`PATCH` afterward — the domain entity's
 * `UpdateEntries()` is dead code, never wired to a route). Forcing mock here
 * guards against the day the app-wide `USE_MOCK` flag flips to `false` and
 * would otherwise silently break this screen (`TeachingPlanRepository`'s real
 * class exists only as permanent blocked stubs — see its doc comment).
 */
async function makeRepo(): Promise<ITeachingPlanRepository> {
  return new MockTeachingPlanRepository();
}

export async function makeTeachingPlanRepository(): Promise<ITeachingPlanRepository> {
  return makeRepo();
}

export async function makeGetTeachingPlanUseCase() {
  return new GetTeachingPlanUseCase(await makeRepo());
}

export async function makeSavePlanCellUseCase() {
  return new SavePlanCellUseCase(await makeRepo());
}

export async function makeSubmitTeachingPlanUseCase() {
  return new SubmitTeachingPlanUseCase(await makeRepo());
}

export async function makeApproveTeachingPlanUseCase() {
  return new ApproveTeachingPlanUseCase(await makeRepo());
}

export async function makeRejectTeachingPlanUseCase() {
  return new RejectTeachingPlanUseCase(await makeRepo());
}

export async function makeListPendingTeachingPlansUseCase() {
  return new ListPendingTeachingPlansUseCase(await makeRepo());
}

export {
  MOCK_CLASSES,
  MOCK_SUBJECTS,
  MOCK_TEACHER_NAMES,
  MOCK_TERMS,
} from "@/features/teaching-plan/infrastructure/repositories/mocks/fixtures";
