import "server-only";

import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { IWeeklyTimetableRepository } from "@/features/timetable/domain/repositories/i-weekly-timetable.repository";
import { GetChildListUseCase } from "@/features/timetable/domain/use-cases/get-child-list.use-case";
import { GetChildTimetableUseCase } from "@/features/timetable/domain/use-cases/get-child-timetable.use-case";
import { GetMyTimetableUseCase } from "@/features/timetable/domain/use-cases/get-my-timetable.use-case";
import { MockWeeklyTimetableRepository } from "@/features/timetable/infrastructure/repositories/mocks/weekly-timetable.mock.repository";
import { WeeklyTimetableRepository } from "@/features/timetable/infrastructure/repositories/weekly-timetable.repository";

async function makeRepo(): Promise<IWeeklyTimetableRepository> {
  if (USE_MOCK) return new MockWeeklyTimetableRepository();
  return new WeeklyTimetableRepository(await createServerHttpClient());
}

export async function makeGetMyTimetableUseCase() {
  return new GetMyTimetableUseCase(await makeRepo());
}

export async function makeGetChildListUseCase() {
  return new GetChildListUseCase(await makeRepo());
}

export async function makeGetChildTimetableUseCase() {
  return new GetChildTimetableUseCase(await makeRepo());
}
