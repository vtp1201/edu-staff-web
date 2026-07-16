import "server-only";

import { makeListYearsUseCase } from "@/bootstrap/di/calendar.di";
import { resolveContainingTermId } from "@/features/admin/timetable/domain/resolve-term";

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
  const years = await (await makeListYearsUseCase()).execute();
  const activeYear = years.find((y) => y.isActive) ?? years[0];
  const terms = activeYear?.terms ?? [];
  const termId = resolveContainingTermId(terms, date);
  if (termId === null) {
    throw {
      type: "invalid-term",
      message: "No academic term covers this date",
    };
  }
  return termId;
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
