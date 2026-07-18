export const attendanceKeys = {
  all: ["attendance"] as const,
  history: (classId: string, from: string, to: string) =>
    ["attendance-history", classId, from, to] as const,
  /** Prefix used to invalidate every cached range for a class after a save
   *  (the exact `from`/`to` the user has open isn't known to the save action). */
  historyPrefix: (classId: string) => ["attendance-history", classId] as const,
};
