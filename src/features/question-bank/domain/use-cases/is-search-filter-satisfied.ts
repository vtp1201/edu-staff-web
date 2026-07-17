/** Sentinel the filter dropdown uses for "all subjects" (not a real subjectId). */
export const ALL_SUBJECTS = "all";

/**
 * The FR-002/FR-003 mandatory-search-filter gate as a pure, HTTP-free predicate.
 *
 * Returns `true` iff a real `subjectId` is chosen (not empty, not the "all"
 * sentinel) OR a non-empty (non-whitespace) tag is set. Reused both by the
 * list screen's gate check (blocks the `GET /questions/search` request until
 * satisfied — AC-902.1/.4) and by the `search-filter-required` defense-in-depth
 * mapping (same predicate proves the client gate SHOULD have blocked it).
 */
export function isSearchFilterSatisfied(
  subjectId: string,
  tag: string,
): boolean {
  const hasSubject = subjectId !== "" && subjectId !== ALL_SUBJECTS;
  const hasTag = tag.trim().length > 0;
  return hasSubject || hasTag;
}
