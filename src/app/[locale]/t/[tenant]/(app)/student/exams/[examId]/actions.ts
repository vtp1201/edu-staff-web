"use server";

import { makeSubmitExamUseCase } from "@/bootstrap/di/exam.di";
import type { ExamResult } from "@/features/exam/domain/entities/exam-result.entity";
import type { ExamFailure } from "@/features/exam/domain/failures/exam.failure";
import type { SubmitAnswer } from "@/features/exam/domain/repositories/i-exam.repository";

export type SubmitAnswerPayload = SubmitAnswer;

export type SubmitExamActionResult =
  | { ok: true; result: ExamResult }
  | { ok: false; errorKey: ExamFailure["type"] };

export async function submitExamAction(
  examId: string,
  answers: SubmitAnswerPayload[],
  startedAt: number,
): Promise<SubmitExamActionResult> {
  const useCase = await makeSubmitExamUseCase();
  const outcome = await useCase.execute({ examId, answers, startedAt });
  if (outcome.ok) return { ok: true, result: outcome.result };
  return { ok: false, errorKey: outcome.failure.type };
}
