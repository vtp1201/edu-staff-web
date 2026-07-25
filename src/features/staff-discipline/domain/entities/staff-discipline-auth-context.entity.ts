import type { UserRole } from "@/features/auth/domain/entities/auth-user.entity";

/**
 * Server-derived authorization context for EVERY staff-discipline repository
 * call (spec.md §"High-Risk-Grade Security Enforcement" pts. 1–3, NFR-008).
 *
 * Why an explicit param instead of an implicit http/session read: the denial
 * must be reproducible by calling the repository method DIRECTLY with a forged
 * non-`principal` role (AC-009.5) — a hidden client-side `if` is explicitly
 * insufficient. Mirrors US-E20.1's `AuthContext` seam on parent-student links.
 *
 * Assembled ONLY in `bootstrap/di/staff-discipline.di.ts` from the httpOnly
 * access-token claims — never from client input.
 */
export interface StaffDisciplineAuthContext {
  /** Caller's authenticated app role. Only `principal` may mutate. */
  role: UserRole;
  /** Caller's member id (`sub` claim) — author/approver identity. */
  memberId: string;
  /** Caller's own staff-member id — the server-forced list scope for `teacher`. */
  staffMemberId: string;
}
