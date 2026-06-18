import "server-only";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { ITeachingPlanRepository } from "@/features/teaching-plan/domain/repositories/i-teaching-plan.repository";
import { ApproveTeachingPlanUseCase } from "@/features/teaching-plan/domain/use-cases/approve-teaching-plan.use-case";
import { GetTeachingPlanUseCase } from "@/features/teaching-plan/domain/use-cases/get-teaching-plan.use-case";
import { ListPendingTeachingPlansUseCase } from "@/features/teaching-plan/domain/use-cases/list-pending-teaching-plans.use-case";
import { RejectTeachingPlanUseCase } from "@/features/teaching-plan/domain/use-cases/reject-teaching-plan.use-case";
import { SavePlanCellUseCase } from "@/features/teaching-plan/domain/use-cases/save-plan-cell.use-case";
import { SubmitTeachingPlanUseCase } from "@/features/teaching-plan/domain/use-cases/submit-teaching-plan.use-case";
import { MockTeachingPlanRepository } from "@/features/teaching-plan/infrastructure/repositories/mocks/teaching-plan.mock.repository";
import { TeachingPlanRepository } from "@/features/teaching-plan/infrastructure/repositories/teaching-plan.repository";

async function makeRepo(): Promise<ITeachingPlanRepository> {
  if (USE_MOCK) return new MockTeachingPlanRepository();
  return new TeachingPlanRepository(await createServerHttpClient());
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
