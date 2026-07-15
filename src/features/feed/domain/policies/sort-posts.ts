import type { FeedPostEntity } from "../entities/feed-post.entity";

/**
 * Pinned-first ordering (FR-008, AC-1907.1/.2). Pinned posts float above all
 * non-pinned; within each group, newest `createdAt` first. Pure + stable — a
 * new array (never mutates input) so it is safe as a TanStack Query `select`.
 */
export function sortPosts(posts: readonly FeedPostEntity[]): FeedPostEntity[] {
  return [...posts].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    // createdAt desc (ISO-8601 strings compare lexicographically = chronologically).
    return b.createdAt.localeCompare(a.createdAt);
  });
}
