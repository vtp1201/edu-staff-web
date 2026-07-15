import type { FeedRole } from "./feed-post.entity";

/** A comment on a feed post (INT-190-05 payload row). Wire fields camelCase. */
export interface FeedCommentEntity {
  commentId: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorRole: FeedRole;
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
