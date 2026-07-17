/**
 * TanStack Query key factory for lesson-plan lists (state-architecture.md §4).
 *
 * Client-side filters (subject/grade/status/search) are NOT part of any key —
 * the server accepts only cursor/limit (mine) or tag/cursor/limit (browse), so
 * those filters run over already-fetched pages and must not fragment the cache.
 * `subjectId` + `tag` ARE in the browse key (real server params → a subject
 * switch discards the previous subject's results for free, AC-007.5).
 */
export const lessonPlanKeys = {
  all: () => ["lesson-plan"] as const,
  listMineRoot: () => ["lesson-plan", "list", "mine"] as const,
  listBySubjectRoot: (subjectId: string, tag?: string) =>
    ["lesson-plan", "list", "subject", subjectId, tag ?? null] as const,
  detail: (id: string) => ["lesson-plan", "detail", id] as const,
};
