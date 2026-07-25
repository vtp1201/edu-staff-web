import type { UserRole } from "@/features/auth/domain/entities/auth-user.entity";
import type { StudentAbsenceAuthContext } from "../entities/student-absence-auth-context.entity";

export interface ResolveStudentAbsenceAuthContextInput {
  /** `decodeRoleClaim(token)` — null when unreadable/absent. */
  claimRole: UserRole | null;
  /** `decodeSubClaim(token)` — the caller's member id, null when unreadable. */
  claimMemberId: string | null;
  /**
   * The caller's OWN homeroom class, if a real claim/lookup ever provides one.
   * There is no homeroom claim on today's IAM token and no class-assignment
   * lookup the web can reach (roster-UUID gap), so the DI factory passes `null`
   * in real mode — which deny-by-defaults to `""`. Kept in the signature so the
   * future real-wiring story has one obvious place to feed it.
   */
  claimHomeroomClassId: string | null;
  /** `NEXT_PUBLIC_USE_MOCK` — mock tokens carry a synthetic role claim. */
  useMock: boolean;
  /**
   * Route-scoped role used ONLY in mock mode, where `decodeRoleClaim` returns a
   * synthetic "admin" for any token (`bootstrap/lib/jwt.ts`) and would otherwise
   * deny every teacher record/edit and every principal flag in local dev.
   * IGNORED entirely when `useMock` is false — a dev affordance, never an
   * authorization input.
   */
  mockRoleHint: UserRole;
  mockMemberId: string;
  /** The mock GVCN's homeroom class — applied to the `teacher` hint ONLY. */
  mockClassId: string;
}

/**
 * Pure resolver for the server-derived `StudentAbsenceAuthContext` (NFR-008).
 *
 * Deny-by-default on BOTH dimensions:
 *  - an unreadable/absent role claim resolves to a NON-`principal`,
 *    NON-`teacher` role, so a broken token can neither flag nor record;
 *  - an unresolvable homeroom resolves `classId` to `""`, which can never equal
 *    a real class id — so every teacher record/edit ownership check fails closed
 *    rather than falling back to something permissive (plan.md §8 risk #8).
 *
 * In real mode the token claim ALWAYS wins over the mock hint.
 */
export function resolveStudentAbsenceAuthContext(
  input: ResolveStudentAbsenceAuthContextInput,
): StudentAbsenceAuthContext {
  if (input.useMock) {
    return {
      role: input.mockRoleHint,
      memberId: input.mockMemberId,
      // Only a GVCN owns a homeroom; a principal is schoolwide/flag-only and
      // must never carry a class scope it could accidentally write through.
      classId: input.mockRoleHint === "teacher" ? input.mockClassId : "",
    };
  }
  return {
    // Unknown role ⇒ deny-by-default (neither principal nor teacher).
    role: input.claimRole ?? "student",
    memberId: input.claimMemberId ?? "",
    classId:
      input.claimRole === "teacher" ? (input.claimHomeroomClassId ?? "") : "",
  };
}
