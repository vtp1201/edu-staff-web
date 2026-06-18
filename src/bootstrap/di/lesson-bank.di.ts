import "server-only";

import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { ILessonBankRepository } from "@/features/lesson-bank/domain/repositories/i-lesson-bank.repository";
import { DeleteLessonUseCase } from "@/features/lesson-bank/domain/use-cases/delete-lesson.use-case";
import { GetLessonDetailUseCase } from "@/features/lesson-bank/domain/use-cases/get-lesson-detail.use-case";
import { ListLessonsUseCase } from "@/features/lesson-bank/domain/use-cases/list-lessons.use-case";
import { UploadLessonUseCase } from "@/features/lesson-bank/domain/use-cases/upload-lesson.use-case";
import { LessonBankRepository } from "@/features/lesson-bank/infrastructure/repositories/lesson-bank.repository";
import { MockLessonBankRepository } from "@/features/lesson-bank/infrastructure/repositories/mocks/lesson-bank.mock.repository";

async function makeRepo(): Promise<ILessonBankRepository> {
  if (USE_MOCK) return new MockLessonBankRepository();
  return new LessonBankRepository(await createServerHttpClient());
}

export async function makeListLessonsUseCase() {
  return new ListLessonsUseCase(await makeRepo());
}

export async function makeGetLessonDetailUseCase() {
  return new GetLessonDetailUseCase(await makeRepo());
}

export async function makeUploadLessonUseCase() {
  return new UploadLessonUseCase(await makeRepo());
}

export async function makeDeleteLessonUseCase() {
  return new DeleteLessonUseCase(await makeRepo());
}
