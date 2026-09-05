/**
 * Query keys for the `lms` client cache.
 *
 * Extracted the moment a second consumer needed the same shape (US-E24.10): a
 * key re-derived by hand at each call site is how two components end up reading
 * two different caches for one resource.
 */
export const lmsKeys = {
  all: () => ["lms"] as const,
  course: (courseId: string) => ["lms", "course", courseId] as const,
  /** The ordered course timeline — the one cache reorder writes optimistically. */
  courseItems: (courseId: string) =>
    ["lms", "course", courseId, "items"] as const,
};
