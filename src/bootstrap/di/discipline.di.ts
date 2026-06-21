import "server-only";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { IDisciplineRepository } from "@/features/discipline/domain/repositories/i-discipline.repository";
import { ApproveLeaveUseCase } from "@/features/discipline/domain/use-cases/approve-leave.use-case";
import { GetChildConductSummaryUseCase } from "@/features/discipline/domain/use-cases/get-child-conduct-summary.use-case";
import { GetChildLeaveRequestsUseCase } from "@/features/discipline/domain/use-cases/get-child-leave-requests.use-case";
import { GetChildViolationsUseCase } from "@/features/discipline/domain/use-cases/get-child-violations.use-case";
import { GetChildrenUseCase } from "@/features/discipline/domain/use-cases/get-children.use-case";
import { GetConductSummaryUseCase } from "@/features/discipline/domain/use-cases/get-conduct-summary.use-case";
import { GetLeaveRequestsUseCase } from "@/features/discipline/domain/use-cases/get-leave-requests.use-case";
import { GetMyConductSummaryUseCase } from "@/features/discipline/domain/use-cases/get-my-conduct-summary.use-case";
import { GetMyLeaveRequestsUseCase } from "@/features/discipline/domain/use-cases/get-my-leave-requests.use-case";
import { GetMyViolationsUseCase } from "@/features/discipline/domain/use-cases/get-my-violations.use-case";
import { GetViolationsUseCase } from "@/features/discipline/domain/use-cases/get-violations.use-case";
import { OverrideConductGradeUseCase } from "@/features/discipline/domain/use-cases/override-conduct-grade.use-case";
import { RecordViolationUseCase } from "@/features/discipline/domain/use-cases/record-violation.use-case";
import { RejectLeaveUseCase } from "@/features/discipline/domain/use-cases/reject-leave.use-case";
import { SubmitChildLeaveRequestUseCase } from "@/features/discipline/domain/use-cases/submit-child-leave-request.use-case";
import { SubmitLeaveRequestUseCase } from "@/features/discipline/domain/use-cases/submit-leave-request.use-case";
import { DisciplineRepository } from "@/features/discipline/infrastructure/repositories/discipline.repository";
import { MockDisciplineRepository } from "@/features/discipline/infrastructure/repositories/mocks/discipline.mock.repository";

async function makeRepo(): Promise<IDisciplineRepository> {
  if (USE_MOCK) return new MockDisciplineRepository();
  return new DisciplineRepository(await createServerHttpClient());
}

export async function makeDisciplineRepository(): Promise<IDisciplineRepository> {
  return makeRepo();
}

export async function makeGetViolationsUseCase() {
  return new GetViolationsUseCase(await makeRepo());
}

export async function makeRecordViolationUseCase() {
  return new RecordViolationUseCase(await makeRepo());
}

export async function makeGetConductSummaryUseCase() {
  return new GetConductSummaryUseCase(await makeRepo());
}

export async function makeOverrideConductGradeUseCase() {
  return new OverrideConductGradeUseCase(await makeRepo());
}

export async function makeGetLeaveRequestsUseCase() {
  return new GetLeaveRequestsUseCase(await makeRepo());
}

export async function makeApproveLeaveUseCase() {
  return new ApproveLeaveUseCase(await makeRepo());
}

export async function makeRejectLeaveUseCase() {
  return new RejectLeaveUseCase(await makeRepo());
}

// --- Student / parent self-service (US-E09.2) ---

export async function makeGetMyConductSummaryUseCase() {
  return new GetMyConductSummaryUseCase(await makeRepo());
}

export async function makeGetMyViolationsUseCase() {
  return new GetMyViolationsUseCase(await makeRepo());
}

export async function makeGetMyLeaveRequestsUseCase() {
  return new GetMyLeaveRequestsUseCase(await makeRepo());
}

export async function makeSubmitLeaveRequestUseCase() {
  return new SubmitLeaveRequestUseCase(await makeRepo());
}

// --- Parent multi-child view (US-E09.4) ---

export async function makeGetChildrenUseCase() {
  return new GetChildrenUseCase(await makeRepo());
}

export async function makeGetChildConductSummaryUseCase() {
  return new GetChildConductSummaryUseCase(await makeRepo());
}

export async function makeGetChildViolationsUseCase() {
  return new GetChildViolationsUseCase(await makeRepo());
}

export async function makeGetChildLeaveRequestsUseCase() {
  return new GetChildLeaveRequestsUseCase(await makeRepo());
}

export async function makeSubmitChildLeaveRequestUseCase() {
  return new SubmitChildLeaveRequestUseCase(await makeRepo());
}
