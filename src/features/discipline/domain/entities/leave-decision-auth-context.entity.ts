import type { UserRole } from "@/features/auth/domain/entities/auth-user.entity";

/**
 * Server-derived authorization context for DECIDING a student leave request
 * (approve / reject) — decision `0063`.
 *
 * Assembled ONLY in `bootstrap/di/discipline.di.ts` from the httpOnly access
 * token's role claim plus the teacher's own class list; never from a prop, a
 * form field or a search param. Threaded through
 * `i-discipline.repository.ts` → use-case → repository so the check runs at the
 * data boundary, not merely at the route.
 */
export interface LeaveDecisionAuthContext {
  /** App role read from the token claim (`decodeRoleClaim`). */
  role: UserRole;
  /** Class ids where this member is the class's CURRENT homeroom teacher. */
  homeroomClassIds: string[];
}

/**
 * May this caller approve/reject a leave request belonging to `classId`?
 *
 * Mirrors core exactly: only the class's current HOMEROOM teacher (GVCN) may
 * decide (`403 LEAVE_REQUEST_FORBIDDEN` otherwise) — `ADMIN`/`MANAGER`/
 * `SUPER_ADMIN` have read-only oversight and cannot approve at MVP (ADR 0073
 * Follow-Up), which is why the role check is an allow-list of ONE, not a
 * deny-list. An empty `classId` can never match (deny-by-default: an
 * unreadable request is not a decidable one).
 */
export function canDecideLeave(
  ctx: LeaveDecisionAuthContext,
  classId: string,
): boolean {
  if (ctx.role !== "teacher") return false;
  if (classId.length === 0) return false;
  return ctx.homeroomClassIds.includes(classId);
}
