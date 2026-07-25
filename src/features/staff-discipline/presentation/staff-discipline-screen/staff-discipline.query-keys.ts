/**
 * Query-key factory (state-design.md §4). Two fully independent subtrees —
 * `violations` and `conductNotes` — so the two tabs never share loading/error
 * state (AC-010.3). Mutations invalidate only their own sub-resource root.
 *
 * Only `staffMemberId` (both lists) and `termId` (conduct notes) are real server
 * params; `state`/`severity` narrowing is client-side and deliberately NOT part
 * of any key (spec §8 OQ3).
 */
export type ViolationsFilter = { staffMemberId?: string };
export type ConductNotesFilter = { staffMemberId?: string; termId?: string };

export const staffDisciplineKeys = {
  all: () => ["staff-discipline"] as const,

  violations: () => [...staffDisciplineKeys.all(), "violations"] as const,
  violationsLists: () => [...staffDisciplineKeys.violations(), "list"] as const,
  violationsList: (filter: ViolationsFilter) =>
    [...staffDisciplineKeys.violationsLists(), filter] as const,

  conductNotes: () => [...staffDisciplineKeys.all(), "conduct-notes"] as const,
  conductNotesLists: () =>
    [...staffDisciplineKeys.conductNotes(), "list"] as const,
  conductNotesList: (filter: ConductNotesFilter) =>
    [...staffDisciplineKeys.conductNotesLists(), filter] as const,
} as const;

/** Shared cache policy for both list keys (state-design.md §4). */
export const SD_LIST_QUERY_OPTIONS = {
  staleTime: 30_000,
  gcTime: 300_000,
  refetchOnWindowFocus: false,
} as const;
