/**
 * Pure term-resolution helper (US-E18.11 BE wiring).
 *
 * Every real `core` timetable endpoint requires a mandatory `termId`, but nothing
 * in the builder threads a term concept (the screen only knows a class + a mock
 * year label). We resolve the containing term from a date by composing the
 * already-real `calendar` feature (its `ListYearsUseCase` supplies the term list)
 * with this pure matcher — kept framework-free so it unit-tests without I/O.
 *
 * Structural input (`{ id, startDate, endDate }[]`) so the domain does NOT import
 * calendar's entity across the feature boundary (Clean-Arch: domain imports only
 * internal types). The DI factory adapts calendar's `Term` to this shape.
 */
export interface TermWindow {
  id: string;
  /** Inclusive start, `YYYY-MM-DD`. */
  startDate: string;
  /** Inclusive end, `YYYY-MM-DD`. */
  endDate: string;
}

/**
 * Return the id of the first term whose `[startDate, endDate]` window contains
 * `date` (inclusive), or `null` if none matches. ISO date-string comparison is
 * lexicographic-safe for `YYYY-MM-DD`; the UTC calendar day is used so the result
 * is deterministic regardless of server timezone.
 */
export function resolveContainingTermId(
  terms: readonly TermWindow[],
  date: Date,
): string | null {
  const iso = date.toISOString().slice(0, 10);
  for (const term of terms) {
    if (term.startDate <= iso && iso <= term.endDate) {
      return term.id;
    }
  }
  return null;
}
