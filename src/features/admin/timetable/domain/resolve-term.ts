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

/**
 * Same as {@link resolveContainingTermId} but never gives up while the year has
 * ANY term: outside every window (school holidays, or the weeks before term 1
 * starts) it falls back to the next term that has not ended yet, else the last
 * one. Callers that must show a timetable — the teacher/student schedule — use
 * this so "no term covers today" reads as "next term's schedule" instead of a
 * load error. `null` only when the year has no terms at all.
 */
export function resolveNearestTermId(
  terms: readonly TermWindow[],
  date: Date,
): string | null {
  const containing = resolveContainingTermId(terms, date);
  if (containing !== null) return containing;
  const iso = date.toISOString().slice(0, 10);
  const byStart = [...terms].sort((a, b) =>
    a.startDate < b.startDate ? -1 : 1,
  );
  const upcoming = byStart.find((t) => t.endDate >= iso);
  return upcoming?.id ?? byStart.at(-1)?.id ?? null;
}
