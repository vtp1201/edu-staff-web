import type { CourseProgress, CourseStatus } from "../entities/course.entity";

/**
 * Pure progress calculator — the single source of truth for course progress,
 * used both server-side (use-case / Server Action) and client-side (optimistic
 * cache patch) so the two never drift. No framework deps → client-bundle-safe.
 *
 * Domain rule (Design Notes): status = not-started (done 0) / completed
 * (done >= total) / in-progress (otherwise). `total <= 0` → not-started, pct 0.
 */
export function calculateCourseProgress(
  done: number,
  total: number,
): CourseProgress {
  if (total <= 0) {
    return { done: 0, total: 0, pct: 0, status: "not-started" };
  }
  const pct = Math.round((done / total) * 100);
  const status: CourseStatus =
    done <= 0 ? "not-started" : done >= total ? "completed" : "in-progress";
  return { done, total, pct, status };
}
