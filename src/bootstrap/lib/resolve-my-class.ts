import "server-only";

import { TIMETABLE_VIEW_EP } from "@/bootstrap/endpoint/timetable-view.endpoint";
import { getAccessToken } from "@/bootstrap/lib/auth-token.server";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { decodeMemberIdClaim } from "@/bootstrap/lib/jwt";
import { USE_MOCK } from "@/bootstrap/lib/mock";

/**
 * The signed-in student's own `classId` (US-E24.1).
 *
 * WHY THIS EXISTS: every `lms` read is CLASS-scoped — `GET /courses?classId=`
 * and `GET /assignments?classId=` both REQUIRE it — but `lms` publishes no
 * self-scope discovery route (`GET /courses/me` is DRAFT-only, BE US-254). The
 * enrollment read that answers it lives in `core`:
 * `GET /members/{memberId}/enrollment` (BE US-148), which a STUDENT may call
 * for THEMSELVES (any other target is `403 ROSTER_ACCESS_FORBIDDEN`).
 *
 * Cross-service composition belongs in `bootstrap`, never inside a feature's
 * repository (decision 0017) — hence a bootstrap helper rather than a join
 * hidden in `LmsRepository`.
 *
 * Reads the `memberId` CLAIM, not `sub` (decision 0074): only that claim
 * guarantees the token is tenant-scoped. A token that carries `sub` but no
 * `memberId` resolves to `null` — `sub` is NEVER used as a fallback (hence
 * `decodeMemberIdClaim()`, not `decodeMemberId()`, which does fall back).
 *
 * MOCK MODE is caller-supplied (`mockClassId`): this helper is generic
 * `bootstrap/lib` infrastructure and must not know any one feature's seed
 * data. The LMS DI factory passes its own `MOCK_CLASS_ID`
 * (`resolveMyLmsClassId()` in `bootstrap/di/lms.di.ts`); a caller that
 * supplies nothing gets `null` in mock mode rather than someone else's class.
 *
 * FAIL-SOFT: returns `null` for "cannot resolve" (no token, no claim, no
 * enrollment, denied). The caller renders an honest empty/error state — it
 * must never fall back to someone else's class.
 */
export async function resolveMyClassId(
  mockClassId: string | null = null,
): Promise<string | null> {
  if (USE_MOCK) return mockClassId;

  const token = await getAccessToken();
  if (!token) return null;
  const memberId = decodeMemberIdClaim(token);
  if (!memberId) return null;

  try {
    const http = await createServerHttpClient();
    // `yearLabel` omitted → BE resolves the LATEST enrolled year label. For the
    // conventional `YYYY-YYYY` label that is the current year; for a free-form
    // label it may not be (documented BE caveat, not a silent assumption).
    const enrollment = (await http.get(
      TIMETABLE_VIEW_EP.memberEnrollment(memberId),
    )) as unknown as { classId?: string };
    return typeof enrollment?.classId === "string" && enrollment.classId !== ""
      ? enrollment.classId
      : null;
  } catch {
    return null;
  }
}
