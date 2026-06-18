"use server";

import { revalidatePath } from "next/cache";
import {
  makeCreateExamUseCase,
  makePublishExamUseCase,
} from "@/bootstrap/di/exam-bank.di";
import type { CreateExamInput } from "@/features/exam-bank/domain/entities/exam-bank-input.entity";
import type { ExamBankFailure } from "@/features/exam-bank/domain/failures/exam-bank.failure";

const TEACHER_EXAM_BANK_PATH = "/[locale]/t/[tenant]/(app)/teacher/exam-bank";

export async function createExamAction(
  input: CreateExamInput,
): Promise<
  { ok: true; id: string } | { ok: false; errorKey: ExamBankFailure["type"] }
> {
  const useCase = await makeCreateExamUseCase();
  const result = await useCase.execute(input);
  if (!result.ok) return { ok: false, errorKey: result.failure.type };
  revalidatePath(TEACHER_EXAM_BANK_PATH, "page");
  return { ok: true, id: result.exam.id };
}

export async function publishExamAction(
  id: string,
): Promise<{ ok: true } | { ok: false; errorKey: ExamBankFailure["type"] }> {
  const useCase = await makePublishExamUseCase();
  const result = await useCase.execute(id);
  if (!result.ok) return { ok: false, errorKey: result.failure.type };
  revalidatePath(TEACHER_EXAM_BANK_PATH, "page");
  return { ok: true };
}
