import type { FeedScopeSelection } from "../../domain/entities/feed-post.entity";

/** Feed query-key factory (state-design §3). */
export const feedKeys = {
  all: () => ["feed"] as const,
  lists: () => [...feedKeys.all(), "list"] as const,
  list: (selection: FeedScopeSelection) =>
    selection.scope === "school"
      ? ([...feedKeys.lists(), "school"] as const)
      : ([...feedKeys.lists(), "class", selection.classId] as const),
  comments: () => [...feedKeys.all(), "comments"] as const,
  commentThread: (postId: string) => [...feedKeys.comments(), postId] as const,
} as const;
