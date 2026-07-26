import type { Class } from "@/features/admin/class-management/domain/entities/class.entity";

export type ClassStatusFilter = "ACTIVE" | "ARCHIVED" | "ALL";
export type ClassGradeFilter = number | "ALL";
export type ClassSortKey = "name" | "gradeLevel";
export type ClassSort = { key: ClassSortKey; dir: "asc" | "desc" };

export interface ClassFilterState {
  statusFilter: ClassStatusFilter;
  gradeFilter: ClassGradeFilter;
  nameSearch: string;
  sort: ClassSort | null;
}

/**
 * Client-side status → grade → name → sort pipeline for the principal class
 * list (US-E13.8, FR-003/004/005). Client-side because the real
 * `GET /api/v1/classes` contract exposes no `status`/`gradeLevel`/`name`/`sort`
 * query param — it operates on rows already loaded into the browser
 * (initial page + any "load more"'d pages), AND semantics (AC-1.13).
 *
 * Pure: never mutates `classes`. `sort === null` preserves the server's
 * insertion order.
 */
export function deriveVisibleClasses(
  classes: Class[],
  state: ClassFilterState,
): Class[] {
  const query = state.nameSearch.trim().toLowerCase();

  const filtered = classes.filter((c) => {
    if (state.statusFilter !== "ALL" && c.status !== state.statusFilter) {
      return false;
    }
    if (state.gradeFilter !== "ALL" && c.gradeLevel !== state.gradeFilter) {
      return false;
    }
    if (query && !c.name.toLowerCase().includes(query)) return false;
    return true;
  });

  const { sort } = state;
  if (!sort) return filtered;

  const factor = sort.dir === "desc" ? -1 : 1;
  return [...filtered].sort((a, b) => {
    if (sort.key === "gradeLevel" && a.gradeLevel !== b.gradeLevel) {
      return (a.gradeLevel - b.gradeLevel) * factor;
    }
    // Vietnamese collation (same precedent as principal-teachers-screen);
    // also the tie-breaker within one grade level.
    return a.name.localeCompare(b.name, "vi") * factor;
  });
}
