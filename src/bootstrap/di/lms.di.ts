import "server-only";

import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { ILmsRepository } from "@/features/lms/domain/repositories/i-lms.repository";
import { AskQuestionUseCase } from "@/features/lms/domain/use-cases/ask-question.use-case";
import { GetCourseLessonsUseCase } from "@/features/lms/domain/use-cases/get-course-lessons.use-case";
import { GetNoteUseCase } from "@/features/lms/domain/use-cases/get-note.use-case";
import { ListCoursesUseCase } from "@/features/lms/domain/use-cases/list-courses.use-case";
import { ListQuestionsUseCase } from "@/features/lms/domain/use-cases/list-questions.use-case";
import { MarkLessonCompleteUseCase } from "@/features/lms/domain/use-cases/mark-lesson-complete.use-case";
import { SaveNoteUseCase } from "@/features/lms/domain/use-cases/save-note.use-case";
import { LmsRepository } from "@/features/lms/infrastructure/repositories/lms.repository";
import { MockLmsRepository } from "@/features/lms/infrastructure/repositories/mocks/lms.mock.repository";

async function makeRepo(): Promise<ILmsRepository> {
  if (USE_MOCK) return new MockLmsRepository();
  return new LmsRepository(await createServerHttpClient());
}

export async function makeListCoursesUseCase() {
  return new ListCoursesUseCase(await makeRepo());
}

export async function makeGetCourseLessonsUseCase() {
  return new GetCourseLessonsUseCase(await makeRepo());
}

export async function makeMarkLessonCompleteUseCase() {
  return new MarkLessonCompleteUseCase(await makeRepo());
}

export async function makeGetNoteUseCase() {
  return new GetNoteUseCase(await makeRepo());
}

export async function makeSaveNoteUseCase() {
  return new SaveNoteUseCase(await makeRepo());
}

export async function makeListQuestionsUseCase() {
  return new ListQuestionsUseCase(await makeRepo());
}

export async function makeAskQuestionUseCase() {
  return new AskQuestionUseCase(await makeRepo());
}
