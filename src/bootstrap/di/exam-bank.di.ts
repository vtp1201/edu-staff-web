import "server-only";

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
