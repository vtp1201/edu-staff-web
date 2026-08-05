import "server-only";

import { ensureFreshSession } from "@/bootstrap/di/auth.di";
import { makeBatchResolveMembersUseCase } from "@/bootstrap/di/iam-directory.di";
import { getAccessToken } from "@/bootstrap/lib/auth-token.server";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { decodeSubClaim } from "@/bootstrap/lib/jwt";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import { resolveCurrentTermId } from "@/bootstrap/lib/resolve-current-term";
import type { IWeeklyTimetableRepository } from "@/features/timetable/domain/repositories/i-weekly-timetable.repository";
import { GetChildListUseCase } from "@/features/timetable/domain/use-cases/get-child-list.use-case";
import { GetChildTimetableUseCase } from "@/features/timetable/domain/use-cases/get-child-timetable.use-case";
import { GetMemberTimetableUseCase } from "@/features/timetable/domain/use-cases/get-member-timetable.use-case";
import { GetMyTeachingScheduleUseCase } from "@/features/timetable/domain/use-cases/get-my-teaching-schedule.use-case";
import { GetMyTimetableUseCase } from "@/features/timetable/domain/use-cases/get-my-timetable.use-case";
import { MockWeeklyTimetableRepository } from "@/features/timetable/infrastructure/repositories/mocks/weekly-timetable.mock.repository";
import {
  HybridWeeklyTimetableRepository,
  RealWeeklyTimetableRepository,
} from "@/features/timetable/infrastructure/repositories/real-weekly-timetable.repository";

/**
 * Hybrid DI composite. US-E18.11 could only wire `getByTeacher` (cross-repo
 * ask #15); US-E18.26 un-mocked the rest against BE US-153/US-148, so
 * `getByMember`/`getMyTimetable`/`getChildren` are real too. Only `getByClass`
 * still routes to mock — and only because nothing calls it (see
 * `HybridWeeklyTimetableRepository`'s doc).
 */
async function makeRepo(): Promise<IWeeklyTimetableRepository> {
  if (USE_MOCK) return new MockWeeklyTimetableRepository();
  // Proactive refresh (decision 0018, playbook step 6).
  await ensureFreshSession();
  const http = await createServerHttpClient();
  const token = await getAccessToken();
  const currentUserId = token ? decodeSubClaim(token) : null;
  // US-E18.33 — child display names. `linked-students` carries none (BE US-148
  // ground truth), so the picker fell back to "Con thứ N" (ask #20 residual).
  // IAM ADR-0120 made `GET /members?ids=` callable by a PARENT, so compose
  // `iam-directory`'s existing `BatchResolveMembersUseCase` here (decision
  // 0017 — cross-feature composition lives in `bootstrap/di`, and this is the
  // app's ONLY batch-lookup client). A failed lookup yields an EMPTY map, never
  // throws: the ordinal fallback stays the defensive path.
  const batchResolve = await makeBatchResolveMembersUseCase();
  const resolveChildNames = async (memberIds: string[]) => {
    const result = await batchResolve.execute(memberIds);
    const names = new Map<string, string>();
    if (result.ok) {
      for (const m of result.value) names.set(m.memberId, m.displayName);
    }
    return names;
  };
  const real = new RealWeeklyTimetableRepository(
    http,
    resolveCurrentTermId,
    currentUserId,
    resolveChildNames,
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

/**
 * Member-scoped read for the PRINCIPAL screen (US-E15.3,
 * `(app)/principal/schedule`).
 *
 * Was force-mocked (US-E15.3 fix round, cross-repo ask #43): `MANAGER` — the
 * principal `appRole` — matched no branch of `get_member_timetable.go`'s
 * `authorize()`, and the 403 degraded INVISIBLY (`TIMETABLE_FORBIDDEN →
 * not-found → empty`). BE **US-175** added `hasRole(ActorRoles, roleManager)`
 * to that `authorize()` (admin-tier READ only — `roleManager` is deliberately
 * kept out of `isAdmin`, which also gates timetable writes), so this factory
 * now takes the ordinary `USE_MOCK ? Mock : Real` gate via `makeRepo()`, exactly
 * like its siblings above (US-E18.38).
 */
export async function makeGetMemberTimetableForPrincipalUseCase() {
  return new GetMemberTimetableUseCase(await makeRepo());
}
