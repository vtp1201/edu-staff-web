import "server-only";

import { ensureFreshSession } from "@/bootstrap/di/auth.di";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import { GetChildAttendanceUseCase } from "@/features/parent-attendance/domain/use-cases/get-child-attendance.use-case";
import { ChildAttendanceRepository } from "@/features/parent-attendance/infrastructure/repositories/child-attendance.repository";
import { MockChildAttendanceRepository } from "@/features/parent-attendance/infrastructure/repositories/mocks/mock-child-attendance.repository";

/**
 * Parent child-attendance (US-E20.5, un-mocked by US-E18.34).
 *
 * `GET /core/api/v1/members/{memberId}/attendance` authorizes a PARENT reading
 * a LINKED child — and has since US-047. US-E20.5 wired an honest degrade
 * (`UnavailableChildAttendanceRepository`, `forbidden` with no HTTP) on the
 * strength of the openapi summary's "STUDENT-self or ADMIN"; that prose was
 * simply never updated after US-047. The authoritative branch is
 * `get_student_attendance.go`'s `authorize()`: admin → any; actor's own
 * memberId → self; `hasRole(PARENT)` + `links.IsLinked(tenant, actor, target)`
 * → allowed, fail-closed on a link-store error; anything else →
 * `ErrAttendanceForbidden()` (403 `ATTENDANCE_FORBIDDEN`).
 *
 * The mock stays `NEXT_PUBLIC_USE_MOCK`-gated rather than becoming a real-mode
 * fallback: fabricating present/late/excused/absent rows for a parent's REAL
 * child is data a parent could act on, so a real environment must show either
 * genuine records or a typed failure — never invented ones. An unlinked child
 * now degrades through the real 403 instead of a hard-coded rejection, and the
 * screen still omits (never disables) retry for it (`isRetryableFailure`).
 */
export async function makeGetChildAttendanceUseCase() {
  if (USE_MOCK) {
    return new GetChildAttendanceUseCase(new MockChildAttendanceRepository());
  }
  // Proactive refresh (decision 0018, playbook step 6).
  await ensureFreshSession();
  const http = await createServerHttpClient();
  return new GetChildAttendanceUseCase(new ChildAttendanceRepository(http));
}
