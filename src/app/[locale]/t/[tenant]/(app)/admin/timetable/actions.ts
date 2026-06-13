"use server";

import { revalidatePath } from "next/cache";
import {
  makeClearSlotUseCase,
  makeUpdateSlotUseCase,
} from "@/bootstrap/di/timetable.di";
import type {
  SlotActionResult,
  TimetableErrorKey,
} from "@/features/admin/timetable/presentation/timetable-screen/timetable-screen.i-vm";

const TIMETABLE_ROUTE = "/[locale]/t/[tenant]/(app)/admin/timetable";

function toErrorKey(err: unknown): TimetableErrorKey {
  // Repository normalizes transport errors to a typed TimetableFailure with a
  // `type`; fall back to fetch-failed for anything unexpected.
  if (
    err &&
    typeof err === "object" &&
    "type" in err &&
    typeof (err as { type: unknown }).type === "string"
  ) {
    const type = (err as { type: string }).type;
    if (type === "save-failed" || type === "slot-not-found") {
      return type;
    }
  }
  return "fetch-failed";
}

export async function updateSlotAction(
  classId: string,
  yearId: string,
  day: number,
  period: number,
  data: { subjectId: string; teacherId: string; room: string },
): Promise<SlotActionResult> {
  try {
    const useCase = await makeUpdateSlotUseCase();
    const result = await useCase.execute({
      classId,
      yearId,
      day,
      period,
      data,
    });
    if (!result.ok) return { ok: false, errorKey: result.failure.type };
    revalidatePath(TIMETABLE_ROUTE, "page");
    return { ok: true };
  } catch (err) {
    return { ok: false, errorKey: toErrorKey(err) };
  }
}

export async function clearSlotAction(
  classId: string,
  yearId: string,
  day: number,
  period: number,
): Promise<SlotActionResult> {
  try {
    const useCase = await makeClearSlotUseCase();
    const result = await useCase.execute(classId, yearId, day, period);
    if (!result.ok) return { ok: false, errorKey: result.failure.type };
    revalidatePath(TIMETABLE_ROUTE, "page");
    return { ok: true };
  } catch (err) {
    return { ok: false, errorKey: toErrorKey(err) };
  }
}
