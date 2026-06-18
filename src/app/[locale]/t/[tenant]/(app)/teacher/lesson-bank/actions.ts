"use server";

import { revalidatePath } from "next/cache";
import {
  makeDeleteLessonUseCase,
  makeUploadLessonUseCase,
} from "@/bootstrap/di/lesson-bank.di";
import type { LessonEntity } from "@/features/lesson-bank/domain/entities/lesson.entity";
import type { UploadLessonInput } from "@/features/lesson-bank/domain/entities/upload-lesson-input.entity";
import type { LessonBankFailure } from "@/features/lesson-bank/domain/failures/lesson-bank.failure";

const TEACHER_PATH = "/[locale]/t/[tenant]/(app)/teacher/lesson-bank";

export async function uploadLessonAction(
  input: UploadLessonInput,
): Promise<
  | { ok: true; lesson: LessonEntity }
  | { ok: false; errorKey: LessonBankFailure["type"] }
> {
  const useCase = await makeUploadLessonUseCase();
  const result = await useCase.execute(input);
  if (!result.ok) return { ok: false, errorKey: result.failure.type };
  revalidatePath(TEACHER_PATH, "page");
  return { ok: true, lesson: result.lesson };
}

export async function deleteLessonAction(
  id: string,
): Promise<{ ok: true } | { ok: false; errorKey: LessonBankFailure["type"] }> {
  const useCase = await makeDeleteLessonUseCase();
  const result = await useCase.execute(id);
  if (!result.ok) return { ok: false, errorKey: result.failure.type };
  revalidatePath(TEACHER_PATH, "page");
  return { ok: true };
}
