"use server";

import { revalidatePath } from "next/cache";
import {
  makePublishGradesUseCase,
  makeSaveScoreUseCase,
} from "@/bootstrap/di/grades.di";
import type { GradesFailure } from "@/features/grades/domain/failures/grades.failure";

const GRADES_PATH = "/[locale]/t/[tenant]/(app)/teacher/grades";
const DEFAULT_MAX_SCORE = 10;

type ActionResult =
  | { ok: true }
  | { ok: false; errorKey: GradesFailure["type"] };

function isFailure(x: unknown): x is GradesFailure {
  return typeof x === "object" && x !== null && "type" in x;
}

export async function saveScoreAction(
  csId: string,
  studentId: string,
  columnId: string,
  value: number,
): Promise<ActionResult> {
  const useCase = await makeSaveScoreUseCase();
  const result = await useCase.execute(
    csId,
    studentId,
    columnId,
    value,
    DEFAULT_MAX_SCORE,
  );
  if (isFailure(result)) {
    return { ok: false, errorKey: result.type };
  }
  revalidatePath(GRADES_PATH, "page");
  return { ok: true };
}

export async function publishGradesAction(
  csId: string,
  term: string,
): Promise<ActionResult> {
  const useCase = await makePublishGradesUseCase();
  const result = await useCase.execute(csId, term);
  if ("ok" in result && result.ok) {
    revalidatePath(GRADES_PATH, "page");
    return { ok: true };
  }
  if (isFailure(result)) {
    return { ok: false, errorKey: result.type };
  }
  return { ok: false, errorKey: "unknown" };
}
