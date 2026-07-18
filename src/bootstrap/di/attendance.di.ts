import "server-only";

import { ensureFreshSession } from "@/bootstrap/di/auth.di";
import { getAccessToken } from "@/bootstrap/lib/auth-token.server";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { decodeSubClaim } from "@/bootstrap/lib/jwt";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { IAttendanceRepository } from "@/features/attendance/domain/repositories/i-attendance.repository";
import { GetClassAttendanceUseCase } from "@/features/attendance/domain/use-cases/get-class-attendance.use-case";
import { ListAttendanceHistoryUseCase } from "@/features/attendance/domain/use-cases/list-attendance-history.use-case";
import { ListMyHomeroomClassesUseCase } from "@/features/attendance/domain/use-cases/list-my-homeroom-classes.use-case";
import { SaveClassAttendanceUseCase } from "@/features/attendance/domain/use-cases/save-class-attendance.use-case";
import { toAttendanceFailure } from "@/features/attendance/infrastructure/mappers/attendance-failure.mapper";
import { AttendanceRepository } from "@/features/attendance/infrastructure/repositories/attendance.repository";
import { MockAttendanceRepository } from "@/features/attendance/infrastructure/repositories/mocks/attendance.mock.repository";

/** Re-exported so `app/.../actions.ts` (which may only import `bootstrap/di/`,
 *  never `infrastructure/` directly per the layer table) can map thrown errors
 *  to a stable failure key. */
export { toAttendanceFailure };

async function makeRepo(): Promise<IAttendanceRepository> {
  if (USE_MOCK) return new MockAttendanceRepository();
  // decision 0018 / epic playbook step 6 — proactive refresh BEFORE the
  // shared http client is created.
  await ensureFreshSession();
  const http = await createServerHttpClient();
  const token = await getAccessToken();
  const currentUserId = token ? decodeSubClaim(token) : null;
  return new AttendanceRepository(http, currentUserId);
}

export async function makeListMyHomeroomClassesUseCase() {
  return new ListMyHomeroomClassesUseCase(await makeRepo());
}

export async function makeGetClassAttendanceUseCase() {
  return new GetClassAttendanceUseCase(await makeRepo());
}

export async function makeSaveAttendanceUseCase() {
  return new SaveClassAttendanceUseCase(await makeRepo());
}

export async function makeGetAttendanceHistoryUseCase() {
  return new ListAttendanceHistoryUseCase(await makeRepo());
}
