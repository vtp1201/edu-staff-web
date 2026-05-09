"use server";

import { revalidatePath } from "next/cache";
import { makeSaveAttendanceUseCase } from "@/bootstrap/di/attendance.di";
import type { AttendanceRecord } from "@/features/attendance/domain/entities/attendance-record.entity";

export async function saveAttendanceAction(
  periodId: string,
  records: AttendanceRecord[],
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const useCase = await makeSaveAttendanceUseCase();
    await useCase.execute(periodId, records);
    revalidatePath("/teacher/attendance");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "save-failed",
    };
  }
}
