import type { UserRole } from "@/features/auth/domain/entities/auth-user.entity";

/**
 * Server-derived authorization context threaded into EVERY period-log /
 * period-prep mutation (decision 0063). Assembled ONLY in
 * `bootstrap/di/period-log.di.ts` from the httpOnly access token — never from
 * client input, never from a prop.
 *
 * `memberId` comes from the tenant-scoped `memberId` claim (decision 0074),
 * never `sub`: only that claim proves the token was scoped to a tenant, and
 * every core `*MemberId` field (here: the slot's `teacherMemberId`) is keyed by
 * it. An unreadable token yields `""`, which can never equal a real
 * `teacherMemberId` — deny-by-default.
 *
 * `role` is carried for shape parity with the other 0063 contexts and for a
 * future ADMIN-write path; today's check is purely
 * `memberId === assignedTeacherMemberId`, because core re-resolves the slot's
 * CURRENT teacher server-side and folds every write denial (MANAGER, wrong
 * teacher, no slot, weekend, out-of-term) into ONE 422 `PERIOD_LOG_NO_SLOT` /
 * `PERIOD_PREP_NO_SLOT` (VULN-233-001). This client guard is therefore
 * defense-in-depth + instant feedback on top of an already-authoritative BE
 * check, not the sole enforcement.
 */
export interface PeriodLogAuthContext {
  role: UserRole;
  memberId: string;
}

/**
 * The one ownership predicate every mutation use-case calls FIRST. Kept here
 * (not inlined) so the rule has exactly one spelling and one test target.
 */
export function ownsSlot(
  authCtx: PeriodLogAuthContext,
  assignedTeacherMemberId: string,
): boolean {
  return (
    authCtx.memberId.length > 0 && authCtx.memberId === assignedTeacherMemberId
  );
}
