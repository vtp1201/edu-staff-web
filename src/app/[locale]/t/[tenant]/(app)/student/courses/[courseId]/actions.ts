"use server";

import { requireRole } from "@/bootstrap/auth-guard";
import {
  makeAskQuestionUseCase,
  makeGetNoteUseCase,
  makeListQuestionsUseCase,
  makeMarkLessonCompleteUseCase,
  makeSaveNoteUseCase,
} from "@/bootstrap/di/lms.di";
import type {
  AskQuestionResult,
  GetNoteResult,
  ListQuestionsResult,
  MarkCompleteResult,
  SaveNoteResult,
} from "@/features/lms/presentation/lesson-player/lesson-player.i-vm";

export async function markLessonCompleteAction(
  lessonId: string,
): Promise<MarkCompleteResult> {
  const guard = await requireRole(["student"]);
  if (!guard.ok) return { ok: false, errorKey: "forbidden" };
  const useCase = await makeMarkLessonCompleteUseCase();
  const result = await useCase.execute(lessonId);
  if (!result.ok) return { ok: false, errorKey: result.failure.type };
  return { ok: true, data: result.data };
}

export async function getNoteAction(lessonId: string): Promise<GetNoteResult> {
  const guard = await requireRole(["student"]);
  if (!guard.ok) return { ok: false, errorKey: "forbidden" };
  try {
    const useCase = await makeGetNoteUseCase();
    return { ok: true, data: await useCase.execute(lessonId) };
  } catch {
    return { ok: false, errorKey: "unknown" };
  }
}

export async function saveNoteAction(
  lessonId: string,
  content: string,
): Promise<SaveNoteResult> {
  const guard = await requireRole(["student"]);
  if (!guard.ok) return { ok: false, errorKey: "forbidden" };
  try {
    const useCase = await makeSaveNoteUseCase();
    return { ok: true, data: await useCase.execute(lessonId, content) };
  } catch {
    return { ok: false, errorKey: "unknown" };
  }
}

export async function listQuestionsAction(
  lessonId: string,
): Promise<ListQuestionsResult> {
  const guard = await requireRole(["student"]);
  if (!guard.ok) return { ok: false, errorKey: "forbidden" };
  try {
    const useCase = await makeListQuestionsUseCase();
    return { ok: true, data: await useCase.execute(lessonId) };
  } catch {
    return { ok: false, errorKey: "unknown" };
  }
}

export async function askQuestionAction(
  lessonId: string,
  question: string,
): Promise<AskQuestionResult> {
  const guard = await requireRole(["student"]);
  if (!guard.ok) return { ok: false, errorKey: "forbidden" };
  try {
    const useCase = await makeAskQuestionUseCase();
    return { ok: true, data: await useCase.execute(lessonId, question) };
  } catch {
    return { ok: false, errorKey: "unknown" };
  }
}
