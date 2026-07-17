import "server-only";

import { ensureFreshSession } from "@/bootstrap/di/auth.di";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { IExamBankRepository } from "@/features/exam-bank/domain/repositories/i-exam-bank.repository";
import { CreateExamUseCase } from "@/features/exam-bank/domain/use-cases/create-exam.use-case";
import { DeleteExamUseCase } from "@/features/exam-bank/domain/use-cases/delete-exam.use-case";
import { GetExamDetailUseCase } from "@/features/exam-bank/domain/use-cases/get-exam-detail.use-case";
import { ListExamBankUseCase } from "@/features/exam-bank/domain/use-cases/list-exam-bank.use-case";
import { PublishExamUseCase } from "@/features/exam-bank/domain/use-cases/publish-exam.use-case";
import { UpdateExamUseCase } from "@/features/exam-bank/domain/use-cases/update-exam.use-case";
import { ExamBankRepository } from "@/features/exam-bank/infrastructure/repositories/exam-bank.repository";
import { MockExamBankRepository } from "@/features/exam-bank/infrastructure/repositories/mocks/exam-bank.mock.repository";

async function makeRepo(): Promise<IExamBankRepository> {
  if (USE_MOCK) return new MockExamBankRepository();
  // Hybrid factory (US-E18.15/ADR 0056): list/getDetail/publish wire real;
  // create/update/delete are permanently blocked stubs inside the real repo.
  // Proactive refresh (decision 0018, playbook step 6) before the protected
  // core call — first time wired into this factory.
  await ensureFreshSession();
  return new ExamBankRepository(await createServerHttpClient());
}

export async function makeListExamBankUseCase() {
  return new ListExamBankUseCase(await makeRepo());
}

export async function makeGetExamDetailUseCase() {
  return new GetExamDetailUseCase(await makeRepo());
}

export async function makeCreateExamUseCase() {
  return new CreateExamUseCase(await makeRepo());
}

export async function makeUpdateExamUseCase() {
  return new UpdateExamUseCase(await makeRepo());
}

export async function makePublishExamUseCase() {
  return new PublishExamUseCase(await makeRepo());
}

export async function makeDeleteExamUseCase() {
  return new DeleteExamUseCase(await makeRepo());
}
