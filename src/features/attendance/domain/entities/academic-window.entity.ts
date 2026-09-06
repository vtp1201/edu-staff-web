/**
 * The academic-calendar shape the attendance feature reads ranges from.
 *
 * STRUCTURAL on purpose — deliberately NOT `AcademicYear`/`Term` from
 * `features/admin/calendar`: attendance has no business depending on the admin
 * calendar feature, and these two fields are all any attendance range resolver
 * needs. An `AcademicYear[]` from `makeListYearsUseCase()` satisfies it
 * structurally, at the Server Action / page boundary where the two meet.
 *
 * Canonical home is `domain/` (US-E24.14): both
 * `presentation/student-attendance-screen/resolve-student-range.ts` (US-E24.6,
 * which first declared it) and `domain/resolve-summary-range.ts` speak it, and
 * a domain module may not import from presentation. `resolve-student-range.ts`
 * re-exports these names, so its callers are unaffected.
 */
export interface TermWindow {
  /** ISO `YYYY-MM-DD`. */
  startDate: string;
  /** ISO `YYYY-MM-DD`. */
  endDate: string;
}

export interface YearWindow {
  /** Exactly one academic year is the current/active one. */
  isActive: boolean;
  terms: readonly TermWindow[];
}
