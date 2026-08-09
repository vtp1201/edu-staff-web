import "server-only";

import { makeListYearsUseCase } from "@/bootstrap/di/calendar.di";
import { resolveNearestTermId } from "@/features/admin/timetable/domain/resolve-term";

/**
 * Shared term-resolution composition (US-E18.11 BE wiring) — every real
 * `core` timetable endpoint requires a mandatory `termId`. Resolves it by
 * composing the already-real `calendar` feature's `ListYearsUseCase`
 * (US-E18.1) with the pure, unit-tested `resolveContainingTermId` matcher
 * (`features/admin/timetable/domain/resolve-term.ts`) — reused here (not
 * re-derived) so the timetable-view feature's DI factory doesn't duplicate
 * the same matching logic. `bootstrap/di` — not a feature's domain — is
 * exactly where composing across features is allowed (decision 0017
 * one-repo-per-service; the timetable builder and timetable-view feature
 * modules stay decoupled from EACH OTHER at the domain/infra layer, but both
 * may compose calendar's public use-case + this pure matcher here).
 *
 * Throws a typed `{ type: "invalid-term"; message }` when no term contains
 * the date (no active year, or a gap between terms) — callers' failure
 * mappers pass an already-typed thrown value through unchanged.
 */
export async function resolveCurrentTermId(
  date: Date = new Date(),
): Promise<string> {
  return (await resolveCurrentTermContext(date)).termId;
}

/** What the calendar says "now" is — the id every core call needs, plus the
 *  LABELS screens display. Screens used to print a hardcoded year/semester
 *  string, which quietly went stale the moment a new year became active. */
export interface CurrentTermContext {
  termId: string;
  termName: string;
  academicYearLabel: string;
}

export async function resolveCurrentTermContext(
  date: Date = new Date(),
): Promise<CurrentTermContext> {
  const years = await (await makeListYearsUseCase()).execute();
  const activeYear = years.find((y) => y.isActive) ?? years[0];
  const terms = activeYear?.terms ?? [];
  // Nearest, not strictly containing: between/before terms (e.g. the summer
  // break) every timetable screen would otherwise fail to load. Only a year
  // with NO terms is a real error.
  const termId = resolveNearestTermId(terms, date);
  if (termId === null) {
    throw {
      type: "invalid-term",
      message: "No academic term covers this date",
    };
  }
  return {
    termId,
    termName: terms.find((t) => t.id === termId)?.name ?? "",
    academicYearLabel: activeYear?.label ?? "",
  };
}

/**
 * Sibling composition (US-E18.12 BE wiring) — resolves the active academic
 * year's label (e.g. `"2025-2026"`), the `year` query param every real
 * `core` grades endpoint requires. Reuses the same `ListYearsUseCase` call as
 * {@link resolveCurrentTermId} rather than re-deriving the "which year is
 * active" logic a second time.
 */
export async function resolveCurrentAcademicYear(): Promise<string> {
  const years = await (await makeListYearsUseCase()).execute();
  const activeYear = years.find((y) => y.isActive) ?? years[0];
  if (!activeYear) {
    throw {
      type: "invalid-term",
      message: "No academic year configured",
    };
  }
  return activeYear.label;
}

/**
 * `termId → name` for every term of every academic year — the display names
 * `core` does not carry on records/timetables. One calendar read, same
 * `ListYearsUseCase` composition as {@link resolveCurrentTermContext}.
 */
export async function resolveTermNames(): Promise<Map<string, string>> {
  const years = await (await makeListYearsUseCase()).execute();
  const names = new Map<string, string>();
  for (const year of years) {
    for (const term of year.terms) names.set(term.id, term.name);
  }
  return names;
}
