"use server";

import { revalidatePath } from "next/cache";
import {
  makeGetAttendanceHistoryUseCase,
  makeSaveAttendanceUseCase,
  toAttendanceFailure,
} from "@/bootstrap/di/attendance.di";
import type { AttendanceDaySummary } from "@/features/attendance/domain/entities/attendance-day-summary.entity";
import type { AttendanceRecord } from "@/features/attendance/domain/entities/attendance-record.entity";
import type { AttendanceFailure } from "@/features/attendance/domain/failures/attendance.failure";

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; errorKey: AttendanceFailure["type"] };

export async function saveAttendanceAction(
  classId: string,
  date: string,
  records: AttendanceRecord[],
): Promise<{ ok: true } | Err> {
  try {
    const useCase = await makeSaveAttendanceUseCase();
    await useCase.execute(classId, date, records);
    // Tenant-scoped route (US-E05.1); revalidate the attendance page template.
    revalidatePath("/[locale]/t/[tenant]/(app)/teacher/attendance", "page");
    return { ok: true };
  } catch (err) {
    return { ok: false, errorKey: toAttendanceFailure(err).type };
  }
}

export async function getAttendanceHistoryAction(
  classId: string,
  from: string,
  to: string,
): Promise<Ok<AttendanceDaySummary[]> | Err> {
  try {
    const useCase = await makeGetAttendanceHistoryUseCase();
    return { ok: true, data: await useCase.execute(classId, from, to) };
  } catch (err) {
    return { ok: false, errorKey: toAttendanceFailure(err).type };
  }
}
