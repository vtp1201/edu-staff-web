/**
 * TanStack Query key factory for question-bank lists (state-architecture.md §4).
 *
 * Client-side-only filters (questionType always; status in mine-scope) are
 * NEVER key segments — they run over already-fetched pages so they must not
 * fragment the cache (FR-005 split table).
 *
 * `searchRoot` is MODE-CONDITIONAL — the single most important state decision:
 *   - subject-mode (subjectId set): gradeLevel/difficulty ARE real server
 *     params (AC-902.14), so they ARE key segments — a change genuinely
 *     re-fetches a differently-narrowed page.
 *   - tag-mode (only tag set): gradeLevel/difficulty are IGNORED server-side
 *     (AC-902.13), so they are NOT key segments — putting them in the key would
 *     fragment the cache into entries that fetch the identical response.
 * The two modes produce disjoint key shapes, so a mode switch can never serve a
 * stale page from the other mode's cache entry.
 */
export const questionBankKeys = {
  all: () => ["question-bank"] as const,

  listMineRoot: () => ["question-bank", "list", "mine"] as const,

  searchRoot: (params: {
    subjectId?: string;
    tag?: string;
    gradeLevel?: string;
    difficulty?: string;
  }) =>
    params.subjectId
      ? ([
          "question-bank",
          "search",
          "subject",
          params.subjectId,
          params.tag ?? null,
          params.gradeLevel ?? null,
          params.difficulty ?? null,
        ] as const)
      : (["question-bank", "search", "tag", params.tag ?? null] as const),

  /** Reserved/latent — no active useQuery consumer this story (RSC + local state). */
  detail: (id: string) => ["question-bank", "detail", id] as const,
};
