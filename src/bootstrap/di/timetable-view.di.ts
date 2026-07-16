import "server-only";

import { ensureFreshSession } from "@/bootstrap/di/auth.di";
import { getAccessToken } from "@/bootstrap/lib/auth-token.server";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { decodeSubClaim } from "@/bootstrap/lib/jwt";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import { resolveCurrentTermId } from "@/bootstrap/lib/resolve-current-term";
import type { IWeeklyTimetableRepository } from "@/features/timetable/domain/repositories/i-weekly-timetable.repository";
import { GetChildListUseCase } from "@/features/timetable/domain/use-cases/get-child-list.use-case";
import { GetChildTimetableUseCase } from "@/features/timetable/domain/use-cases/get-child-timetable.use-case";
import { GetMyTeachingScheduleUseCase } from "@/features/timetable/domain/use-cases/get-my-teaching-schedule.use-case";
import { GetMyTimetableUseCase } from "@/features/timetable/domain/use-cases/get-my-timetable.use-case";
import { MockWeeklyTimetableRepository } from "@/features/timetable/infrastructure/repositories/mocks/weekly-timetable.mock.repository";
import {
  HybridWeeklyTimetableRepository,
  RealWeeklyTimetableRepository,
} from "@/features/timetable/infrastructure/repositories/real-weekly-timetable.repository";

/**
 * Hybrid DI composite (US-E18.11) — only `getByTeacher` is genuinely wireable
 * (cross-repo ask #15); `getByClass`/`getMyTimetable`/`getChildren` route to
 * mock (see `HybridWeeklyTimetableRepository`'s doc for why `getByClass` also
 * stays mock here, unlike the admin builder feature).
 */
async function makeRepo(): Promise<IWeeklyTimetableRepository> {
  if (USE_MOCK) return new MockWeeklyTimetableRepository();
  // Proactive refresh (decision 0018, playbook step 6).
  await ensureFreshSession();
  const http = await createServerHttpClient();
  const token = await getAccessToken();
  const currentUserId = token ? decodeSubClaim(token) : null;
  const real = new RealWeeklyTimetableRepository(
    http,
    resolveCurrentTermId,
    currentUserId,
  );
  return new HybridWeeklyTimetableRepository(
    real,
    new MockWeeklyTimetableRepository(),
  );
}

export async function makeGetMyTimetableUseCase() {
  return new GetMyTimetableUseCase(await makeRepo());
}

export async function makeGetMyTeachingScheduleUseCase() {
  return new GetMyTeachingScheduleUseCase(await makeRepo());
}

export async function makeGetChildListUseCase() {
  return new GetChildListUseCase(await makeRepo());
}

export async function makeGetChildTimetableUseCase() {
  return new GetChildTimetableUseCase(await makeRepo());
}
