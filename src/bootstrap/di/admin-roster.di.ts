import "server-only";
import { ensureFreshSession } from "@/bootstrap/di/auth.di";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { IRosterRepository } from "@/features/admin-roster/domain/repositories/i-roster.repository";
import { MockRosterRepository } from "@/features/admin-roster/infrastructure/repositories/mock-roster.repository";
import { RosterRepository } from "@/features/admin-roster/infrastructure/repositories/roster.repository";

/**
 * Roster repository factory (per-request).
 *
 * `getClassRoster` and `getSearchPool` are PERMANENTLY mock-first regardless of
 * `USE_MOCK` (US-E18.5, cross-repo ask #9): the wire `EnrollmentResponse`
 * carries no student display fields (name/DOB/gender/status) and IAM has no
 * public batch/by-id profile lookup (no `gender` field anywhere), so a real
 * roster listing would render raw UUIDs for every row — not a shippable screen.
 * We delegate those two methods to the mock repo even when the real repo serves
 * everything else (same precedent as class-management's `listTeachers`,
 * US-E18.4). `getClasses` (+ homeroom-name fan-out) and the write operations
 * (`enrollStudent`/`unenrollStudent`/`unenrollStudents`/`transferStudent`) go
 * real. `ensureFreshSession()` runs before `createServerHttpClient()` in the
 * real branch (playbook step 6, decision 0018 — this factory predated it).
 */
export async function makeRosterRepository(): Promise<IRosterRepository> {
  if (USE_MOCK) return new MockRosterRepository();

  await ensureFreshSession();
  const real = new RosterRepository(await createServerHttpClient());
  const mock = new MockRosterRepository();

  return new (class implements IRosterRepository {
    getClasses = real.getClasses.bind(real);
    enrollStudent = real.enrollStudent.bind(real);
    unenrollStudent = real.unenrollStudent.bind(real);
    unenrollStudents = real.unenrollStudents.bind(real);
    transferStudent = real.transferStudent.bind(real);
    // mock-first fallback (see doc above + roster.repository.ts stubs)
    getClassRoster = mock.getClassRoster.bind(mock);
    getSearchPool = mock.getSearchPool.bind(mock);
  })();
}
