import "server-only";

import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { ITimetableRepository } from "@/features/admin/timetable/domain/repositories/i-timetable.repository";
import { ClearSlotUseCase } from "@/features/admin/timetable/domain/use-cases/clear-slot.use-case";
import { GetTimetableUseCase } from "@/features/admin/timetable/domain/use-cases/get-timetable.use-case";
import { UpdateSlotUseCase } from "@/features/admin/timetable/domain/use-cases/update-slot.use-case";
import { MockTimetableRepository } from "@/features/admin/timetable/infrastructure/repositories/mocks/timetable.mock.repository";
import { TimetableRepository } from "@/features/admin/timetable/infrastructure/repositories/timetable.repository";

async function makeRepo(): Promise<ITimetableRepository> {
  if (USE_MOCK) return new MockTimetableRepository();
  return new TimetableRepository(await createServerHttpClient());
}

export async function makeGetTimetableUseCase() {
  return new GetTimetableUseCase(await makeRepo());
}

export async function makeUpdateSlotUseCase() {
  return new UpdateSlotUseCase(await makeRepo());
}

export async function makeClearSlotUseCase() {
  return new ClearSlotUseCase(await makeRepo());
}
