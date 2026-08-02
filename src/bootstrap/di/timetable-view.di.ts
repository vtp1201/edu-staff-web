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

/**
 * Member-scoped read for the PRINCIPAL screen (US-E15.3,
 * `(app)/principal/schedule`).
 *
 * ⚠️ INTENTIONALLY NOT GATED BY `USE_MOCK` — do NOT "fix" this to branch on
 * `NEXT_PUBLIC_USE_MOCK` like `makeRepo()` above. It is permanently forced onto
 * `MockWeeklyTimetableRepository`, because a REAL call cannot succeed for a
 * principal:
 *
 * - Go ground truth:
 *   `../edu-api/services/core/internal/timetable/core/application/usecase/get_member_timetable.go:119-139`
 *   → `(*GetMemberTimetableUseCase).authorize()` returns `nil` for
 *   `isAdmin(ActorIsSuperAdmin, ActorRoles)` (SUPER_ADMIN/ADMIN), for the target
 *   member itself (`ActorMemberID == memberID`), and for a `PARENT` with a
 *   verified link — otherwise `domainerror.ErrTimetableForbidden()`. `MANAGER`
 *   (the principal `appRole`) matches NO branch; `.../usecase/shared.go:14-24`
 *   confirms the role constant set is `ADMIN`/`TEACHER`/`STUDENT`/`PARENT` with
 *   no `MANAGER` at all. So `GET /members/{id}/timetable` is a hard
 *   `403 TIMETABLE_FORBIDDEN` for every principal user.
 * - Worse than a visible error: `RealWeeklyTimetableRepository` deliberately
 *   maps `TIMETABLE_FORBIDDEN → not-found` (existence-opacity for the parent
 *   path) and `toDataState()` collapses `not-found → empty`, so a real call
 *   would render a silent, permanent "no schedule published" empty state for
 *   EVERY teacher — cosmetically fine, functionally dead.
 * - Same class of gap as cross-repo ask #39 (`MANAGER` missing from `core`'s
 *   class-list RBAC, US-E13.8) — same remedy as
 *   `bootstrap/di/principal-classes.di.ts`. Flip this factory to the
 *   `USE_MOCK ? Mock : Real` shape only once `core` grants MANAGER on this
 *   endpoint.
 *
 * The sibling factories above are deliberately untouched: student self-view,
 * teacher self-view and the parent child-view are ALL authorized by that same
 * `authorize()`, so their real paths still work.
 */
export async function makeGetMemberTimetableForPrincipalUseCase() {
  return new GetMemberTimetableUseCase(new MockWeeklyTimetableRepository());
}
