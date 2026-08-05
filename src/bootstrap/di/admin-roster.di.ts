import "server-only";
import { ensureFreshSession } from "@/bootstrap/di/auth.di";
import {
  makeBatchResolveMembersUseCase,
  makeSearchMembersUseCase,
} from "@/bootstrap/di/iam-directory.di";
import { getAccessToken } from "@/bootstrap/lib/auth-token.server";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { decodeTenantId } from "@/bootstrap/lib/jwt";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import { resolveCurrentAcademicYear } from "@/bootstrap/lib/resolve-current-term";
import type { IRosterRepository } from "@/features/admin-roster/domain/repositories/i-roster.repository";
import type { RosterStudentDetail } from "@/features/admin-roster/infrastructure/mappers/roster.mapper";
import { MockRosterRepository } from "@/features/admin-roster/infrastructure/repositories/mock-roster.repository";
import type {
  ResolveStudentDetails,
  SearchPoolSources,
} from "@/features/admin-roster/infrastructure/repositories/roster.repository";
import { RosterRepository } from "@/features/admin-roster/infrastructure/repositories/roster.repository";

/**
 * Roster repository factory (per-request).
 *
 * `getClassRoster` went REAL in US-E18.35. US-E18.5 had force-mocked it for one
 * stated reason — the wire `EnrollmentResponse` carries no student display
 * fields and "IAM has no public batch/by-id profile lookup" — and IAM US-144 /
 * ADR-0120 / US-169 removed exactly that: `GET /members?ids=` now returns
 * `displayName` for any tenant member and, for a STAFF-tier caller like this
 * admin/principal surface, `dob` + `gender` too. So the real branch composes
 * two services (only `bootstrap/di` may — decision 0017):
 * - core `GET /classes/{id}/students` → WHICH students are enrolled (authority);
 * - `iam-directory`'s `BatchResolveMembersUseCase` → their name/dob/gender
 *   (decoration, one batched call, chunked ≤50 ids). This is the app's single
 *   batch-lookup client; do NOT add a second. A failed lookup yields an EMPTY
 *   map, never throws — the roster still renders, with placeholders.
 *
 * `getSearchPool` went REAL in US-E18.41 — the LAST force-mock on this
 * repository, so the anonymous per-method composition below is gone and the
 * factory is a plain `USE_MOCK ? Mock : Real` gate (decision 0014). BE's answer
 * to ask #9 (US-182 / `edu-api` ADR 0125) is that the unassigned pool will never
 * be one endpoint, so the FE composes it from two services — again only in
 * `bootstrap/di` (decision 0017):
 * - `iam-directory`'s `SearchMembersUseCase` with `role: "STUDENT"` + the
 *   token-derived tenant id → the candidate universe (it drains every page
 *   itself; this app has ONE directory client, do not add a second);
 * - core `GET /enrollments/student-ids?academicYear=` (inside the repository,
 *   it is core's own endpoint) → the ids to subtract.
 * The year label comes from `resolveCurrentAcademicYear()`
 * (`bootstrap/lib/resolve-current-term.ts`, US-E18.12), REUSED rather than
 * re-deriving "which academic year is active" a third time. It is passed as a
 * lazy callback so pages that never open the Add panel pay no calendar call.
 *
 * `getClasses` (+ enriched homeroom name) and the write operations
 * (`enrollStudent`/`unenrollStudent`/`unenrollStudents`/`transferStudent`) were
 * already real. `ensureFreshSession()` runs before `createServerHttpClient()`
 * in the real branch (playbook step 6, decision 0018).
 */
export async function makeRosterRepository(): Promise<IRosterRepository> {
  if (USE_MOCK) return new MockRosterRepository();

  await ensureFreshSession();
  const batchResolve = await makeBatchResolveMembersUseCase();
  const resolveStudentDetails: ResolveStudentDetails = async (memberIds) => {
    const result = await batchResolve.execute(memberIds);
    const details = new Map<string, RosterStudentDetail>();
    if (!result.ok) return details;
    for (const m of result.value) {
      // Conditional spread: an unset dob/gender (legitimate per ADR-0122) must
      // stay ABSENT, so the mapper can leave the roster field absent and
      // presentation can render "chưa cập nhật".
      details.set(m.memberId, {
        name: m.displayName,
        ...(m.dob !== undefined ? { dob: m.dob } : {}),
        ...(m.gender !== undefined ? { gender: m.gender } : {}),
      });
    }
    return details;
  };

  const tenantId = decodeTenantId((await getAccessToken()) ?? "") ?? "";
  const searchMembers = await makeSearchMembersUseCase();
  const searchPoolSources: SearchPoolSources = {
    searchStudentDirectory: () =>
      searchMembers.execute({ tenantId, role: "STUDENT" }),
    // Lazy: only invoked when the Add panel's pool is actually read.
    resolveAcademicYear: resolveCurrentAcademicYear,
  };

  return new RosterRepository(
    await createServerHttpClient(),
    resolveStudentDetails,
    searchPoolSources,
  );
}
