import "server-only";
import { ensureFreshSession } from "@/bootstrap/di/auth.di";
import { makeBatchResolveMembersUseCase } from "@/bootstrap/di/iam-directory.di";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { IRosterRepository } from "@/features/admin-roster/domain/repositories/i-roster.repository";
import type { RosterStudentDetail } from "@/features/admin-roster/infrastructure/mappers/roster.mapper";
import { MockRosterRepository } from "@/features/admin-roster/infrastructure/repositories/mock-roster.repository";
import type { ResolveStudentDetails } from "@/features/admin-roster/infrastructure/repositories/roster.repository";
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
 * `getSearchPool` STAYS force-mocked regardless of `USE_MOCK`. That is a
 * DIFFERENT, still-open gap and US-169 does nothing for it: core exposes no
 * endpoint for the unassigned/transfer-candidate pool at all (`/students/
 * unassigned` does not exist), and a lookup BY ID cannot enumerate candidates.
 * Same precedent as class-management's `listTeachers` (US-E18.4).
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

  const real = new RosterRepository(
    await createServerHttpClient(),
    resolveStudentDetails,
  );
  const mock = new MockRosterRepository();

  return new (class implements IRosterRepository {
    getClasses = real.getClasses.bind(real);
    getClassRoster = real.getClassRoster.bind(real);
    enrollStudent = real.enrollStudent.bind(real);
    unenrollStudent = real.unenrollStudent.bind(real);
    unenrollStudents = real.unenrollStudents.bind(real);
    transferStudent = real.transferStudent.bind(real);
    // mock-first fallback — MISSING ENDPOINT, see the doc above.
    getSearchPool = mock.getSearchPool.bind(mock);
  })();
}
