"use server";

import { revalidatePath } from "next/cache";
import {
  makeDeleteExamUseCase,
  makePublishExamUseCase,
} from "@/bootstrap/di/exam-bank.di";
import type { ExamBankFailure } from "@/features/exam-bank/domain/failures/exam-bank.failure";

const TEACHER_EXAM_BANK_PATH = "/[locale]/t/[tenant]/(app)/teacher/exam-bank";

export async function publishExamAction(
  id: string,
): Promise<{ ok: true } | { ok: false; errorKey: ExamBankFailure["type"] }> {
  const useCase = await makePublishExamUseCase();
  const result = await useCase.execute(id);
  if (!result.ok) return { ok: false, errorKey: result.failure.type };
  revalidatePath(TEACHER_EXAM_BANK_PATH, "page");
  return { ok: true };
}

export async function deleteExamAction(
  id: string,
): Promise<{ ok: true } | { ok: false; errorKey: ExamBankFailure["type"] }> {
  const useCase = await makeDeleteExamUseCase();
  const result = await useCase.execute(id);
  if (!result.ok) return { ok: false, errorKey: result.failure.type };
  revalidatePath(TEACHER_EXAM_BANK_PATH, "page");
  return { ok: true };
}
