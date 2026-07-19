import type { ParentLinksFilter } from "./parent-links-screen.i-vm";

/**
 * Parse an applied {@link ParentLinksFilter} from URL search params (US-E20.1).
 * Empty values are normalised so the filter (and its query key) is stable — an
 * all-empty query string and `{ q: "", classId: null }` hash identically.
 * Same 3-function contract as audit-log's `filter-search-params.ts` (new file,
 * not a new pattern — state-architecture §9).
 */
export function parseFilterFromParams(
  params: URLSearchParams,
): ParentLinksFilter {
  const q = params.get("q")?.trim() ?? "";
  const classId = params.get("classId")?.trim() || null;
  return { q, classId };
}

/** Serialize a filter to a query string (omitting empty values). */
export function filterToQueryString(filter: ParentLinksFilter): string {
  const params = new URLSearchParams();
  if (filter.q.trim()) params.set("q", filter.q.trim());
  if (filter.classId) params.set("classId", filter.classId);
  return params.toString();
}

/** Structural equality of two filters (empty-normalized). */
export function filtersEqual(
  a: ParentLinksFilter,
  b: ParentLinksFilter,
): boolean {
  return filterToQueryString(a) === filterToQueryString(b);
}

/** True when any filter is active (drives the two empty-state variants, FR-008). */
export function hasActiveFilter(filter: ParentLinksFilter): boolean {
  return filter.q.trim() !== "" || filter.classId !== null;
}
