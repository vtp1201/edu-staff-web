/**
 * Query-key factory (state-design.md §4). ONE flat list family — this feature has
 * a single list resource (no tabs, unlike `staff-discipline`).
 *
 * `classId` is always present for the teacher route (server-scoped anyway) and
 * optional for the principal route (`undefined` = schoolwide) — both are legal
 * members of the SAME filter shape, so there is one cache-key family, not two.
 *
 * There is deliberately no `detail(...)` key: no single-record endpoint exists
 * (INT-001/003/004 all return the full mutated entity inline) — YAGNI.
 */
export type StudentAbsenceFilter = {
  classId?: string;
  /** Bare `YYYY-MM-DD`. */
  from?: string;
  /** Bare `YYYY-MM-DD`. */
  to?: string;
};

export const studentAbsenceKeys = {
  all: () => ["student-absences"] as const,
  lists: () => [...studentAbsenceKeys.all(), "list"] as const,
  list: (filter: StudentAbsenceFilter) =>
    [...studentAbsenceKeys.lists(), filter] as const,
} as const;

/** Cache policy — copied verbatim from `SD_LIST_QUERY_OPTIONS` (same shape). */
export const SA_LIST_QUERY_OPTIONS = {
  staleTime: 30_000,
  gcTime: 300_000,
  refetchOnWindowFocus: false,
} as const;
