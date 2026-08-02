import type { FeedRole } from "./feed-post.entity";

/**
 * A comment on a feed post. Wire fields camelCase. `authorName`/`authorRole`
 * are nullable for the same reason as {@link FeedPostEntity} — the real wire's
 * denormalized identity (BE US-165) is nullable.
 */
export interface FeedCommentEntity {
  commentId: string;
  postId: string;
  authorId: string;
  authorName: string | null;
  authorRole: FeedRole | null;
  authorAvatarInitials: string;
  content: string;
  createdAt: string;
}

/** One page of a comment thread (single-page for now, state-design §3). */
export interface FeedCommentPage {
  comments: FeedCommentEntity[];
  nextCursor: string | null;
  hasMore: boolean;
}
