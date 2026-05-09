import "server-only";

import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { IAttendanceRepository } from "@/features/attendance/domain/repositories/i-attendance.repository";
import { GetRosterUseCase } from "@/features/attendance/domain/use-cases/get-roster.use-case";
import { ListAttendanceHistoryUseCase } from "@/features/attendance/domain/use-cases/list-attendance-history.use-case";
import { ListMyClassesUseCase } from "@/features/attendance/domain/use-cases/list-my-classes.use-case";
import { SaveAttendanceUseCase } from "@/features/attendance/domain/use-cases/save-attendance.use-case";
import { AttendanceRepository } from "@/features/attendance/infrastructure/repositories/attendance.repository";
import { MockAttendanceRepository } from "@/features/attendance/infrastructure/repositories/mocks/attendance.mock.repository";

async function makeRepo(): Promise<IAttendanceRepository> {
  if (USE_MOCK) return new MockAttendanceRepository();
  return new AttendanceRepository(await createServerHttpClient());
}

export async function makeListMyClassesUseCase() {
  return new ListMyClassesUseCase(await makeRepo());
}

export async function makeGetRosterUseCase() {
  return new GetRosterUseCase(await makeRepo());
}

export async function makeSaveAttendanceUseCase() {
  return new SaveAttendanceUseCase(await makeRepo());
}

export async function makeListAttendanceHistoryUseCase() {
  return new ListAttendanceHistoryUseCase(await makeRepo());
}
