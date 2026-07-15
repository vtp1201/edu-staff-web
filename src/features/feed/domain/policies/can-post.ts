import type { FeedRole, FeedScope } from "../entities/feed-post.entity";

/**
 * Composer-visibility policy (FR-002, AC-1902.1/.2). Pure — independently
 * unit-testable and reused by the composer.
 *
 * - school scope → teacher | principal
 * - class scope  → teacher | principal | student
 * - parent       → never, in any scope
 */
export function canPost(role: FeedRole, scope: FeedScope): boolean {
  if (role === "parent") return false;
  if (scope === "school") return role === "teacher" || role === "principal";
  // class scope
  return role === "teacher" || role === "principal" || role === "student";
}
