import type { ParentLinksFilter } from "./parent-links-screen.i-vm";

/**
 * Query-key hierarchy (US-E20.1, state-architecture §4). `cursor` is
 * deliberately EXCLUDED from `list()` — it is `useInfiniteQuery`'s own
 * pageParams, not a cache-partitioning dimension. `detail(linkId)` is reserved
 * for invalidation-only in this story (no query populates it — the detail
 * dialog reads row data from the list cache; wired so unlink invalidation is a
 * no-op today, correct if a future story keys a fetch by it).
 */
export const parentLinksKeys = {
  all: () => ["parent-links"] as const,
  lists: () => [...parentLinksKeys.all(), "list"] as const,
  list: (filter: ParentLinksFilter) =>
    [...parentLinksKeys.lists(), filter] as const,
  details: () => [...parentLinksKeys.all(), "detail"] as const,
  detail: (linkId: string) => [...parentLinksKeys.details(), linkId] as const,
  consent: (studentId: string, parentId: string) =>
    [...parentLinksKeys.all(), "consent", studentId, parentId] as const,
  studentSearch: (q: string, classId?: string) =>
    [...parentLinksKeys.all(), "student-search", q, classId ?? null] as const,
  parentSearch: (q: string) =>
    [...parentLinksKeys.all(), "parent-search", q] as const,
} as const;
