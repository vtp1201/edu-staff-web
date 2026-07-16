import "server-only";

import { ensureFreshSession } from "@/bootstrap/di/auth.di";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import { resolveCurrentTermId } from "@/bootstrap/lib/resolve-current-term";
import type { ITimetableRepository } from "@/features/admin/timetable/domain/repositories/i-timetable.repository";
import { ClearSlotUseCase } from "@/features/admin/timetable/domain/use-cases/clear-slot.use-case";
import { GetTimetableUseCase } from "@/features/admin/timetable/domain/use-cases/get-timetable.use-case";
import { UpdateSlotUseCase } from "@/features/admin/timetable/domain/use-cases/update-slot.use-case";
import { MockTimetableRepository } from "@/features/admin/timetable/infrastructure/repositories/mocks/timetable.mock.repository";
import {
  type TermIdResolver,
  TimetableRepository,
} from "@/features/admin/timetable/infrastructure/repositories/timetable.repository";

/** Delegates to the shared `bootstrap/lib/resolve-current-term.ts` composition
 *  (calendar's real term list + the pure `resolveContainingTermId` matcher). */
const resolveTermId: TermIdResolver = (date) => resolveCurrentTermId(date);

async function makeRepo(): Promise<ITimetableRepository> {
  if (USE_MOCK) return new MockTimetableRepository();
  // Proactive refresh (decision 0018, playbook step 6).
  await ensureFreshSession();
  return new TimetableRepository(await createServerHttpClient(), resolveTermId);
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
