export const attendanceKeys = {
  all: ["attendance"] as const,
  history: (classId: string, from: string, to: string) =>
    ["attendance-history", classId, from, to] as const,
  /**
   * Per-student summary tab (US-E24.14) — a family of its OWN, deliberately
   * NOT under `attendance-history`: the two tabs answer different projections
   * of different (differently bounded) ranges, and neither must invalidate or
   * refetch the other when its filters change. Proved in the sibling test.
   */
  summary: (classId: string, from: string, to: string) =>
    ["attendance-summary", classId, from, to] as const,
  /** The academic calendar behind the term/year segments — one cached read for
   *  the whole tab, not one per range switch. */
  terms: () => ["attendance-summary-terms"] as const,
  /** Prefix used to invalidate every cached range for a class after a save
   *  (the exact `from`/`to` the user has open isn't known to the save action). */
  historyPrefix: (classId: string) => ["attendance-history", classId] as const,
};
