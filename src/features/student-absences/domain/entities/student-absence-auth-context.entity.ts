import type { UserRole } from "@/features/auth/domain/entities/auth-user.entity";

/**
 * Server-derived authorization context for EVERY student-absence call
 * (NFR-008, spec.md §"High-Risk-Grade Security Enforcement").
 *
 * Assembled in `bootstrap/di/student-absence.di.ts` from the httpOnly access
 * token — NEVER from client input — and constructor-injected into the
 * repository, which is the enforcement boundary while this feature is
 * mock-first.
 */
export interface StudentAbsenceAuthContext {
  /** Decoded token role. Deny-by-default when unreadable (never `principal`). */
  role: UserRole;
  /** Caller's member id (`sub` claim) — stamped as recordedBy/flaggedBy. */
  memberId: string;
  /**
   * The teacher's OWN homeroom class (GVCN). Empty string for a principal (and
   * for a deny-by-default context), which by construction fails every
   * teacher-scope ownership check — see `resolve-student-absence-auth-context.ts`.
   */
  classId: string;
}
