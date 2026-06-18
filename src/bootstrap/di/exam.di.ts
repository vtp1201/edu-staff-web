import "server-only";

import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { IExamRepository } from "@/features/exam/domain/repositories/i-exam.repository";
import { GetExamQuestionsUseCase } from "@/features/exam/domain/use-cases/get-exam-questions.use-case";
import { GetExamResultUseCase } from "@/features/exam/domain/use-cases/get-exam-result.use-case";
import { ListExamsUseCase } from "@/features/exam/domain/use-cases/list-exams.use-case";
import { SubmitExamUseCase } from "@/features/exam/domain/use-cases/submit-exam.use-case";
import { ExamRepository } from "@/features/exam/infrastructure/repositories/exam.repository";
import { MockExamRepository } from "@/features/exam/infrastructure/repositories/mocks/exam.mock.repository";

async function makeRepo(): Promise<IExamRepository> {
  if (USE_MOCK) return new MockExamRepository();
  return new ExamRepository(await createServerHttpClient());
}

export async function makeListExamsUseCase() {
  return new ListExamsUseCase(await makeRepo());
}

export async function makeGetExamQuestionsUseCase() {
  return new GetExamQuestionsUseCase(await makeRepo());
}

export async function makeSubmitExamUseCase() {
  return new SubmitExamUseCase(await makeRepo());
}

export async function makeGetExamResultUseCase() {
  return new GetExamResultUseCase(await makeRepo());
}
