import type {
  FeedCommentEntity,
  FeedCommentPage,
} from "../entities/feed-comment.entity";
import type {
  FeedPage,
  FeedPostEntity,
  FeedScopeSelection,
} from "../entities/feed-post.entity";
import type { ReactionState, ReactionType } from "../entities/reaction.entity";
import type { FeedFailure } from "../failures/feed.failure";

/** Result type used across the feed repository contract (no throw). */
export type FeedResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: FeedFailure };

export interface CreatePostInput {
  scope: FeedScopeSelection;
  content: string;
  /** Mock-only placeholder attachment (FR-003). */
  hasAttachment: boolean;
}

/**
 * Feed repository contract (US-E19.1). Implementations return a Result (no
 * throw); errors normalised from the BE ApiError by error.code/status (never
 * message), mapped to `FeedFailure`. Wire fields camelCase. One service
 * (`social`), INT-190-01..05. `togglePinMock` is local-only (INT-190-07) — no
 * HTTP endpoint exists yet; it is the swap seam for BE US-101.
 */
export interface IFeedRepository {
  getFeed(
    selection: FeedScopeSelection,
    cursor: string | null,
  ): Promise<FeedResult<FeedPage>>;
  createPost(input: CreatePostInput): Promise<FeedResult<FeedPostEntity>>;
  setReaction(
    postId: string,
    reactionType: ReactionType,
  ): Promise<FeedResult<ReactionState>>;
  removeReaction(postId: string): Promise<FeedResult<ReactionState>>;
  listComments(
    postId: string,
    cursor: string | null,
  ): Promise<FeedResult<FeedCommentPage>>;
  addComment(
    postId: string,
    content: string,
  ): Promise<FeedResult<FeedCommentEntity>>;
  /** Local-only pin flip (INT-190-07) — never issues an HTTP request. */
  togglePinMock(
    postId: string,
    pinned: boolean,
  ): Promise<FeedResult<{ postId: string; pinned: boolean }>>;
}

/** Cursor page size for feed + comment reads. */
export const FEED_LIST_PAGE_SIZE = 5;
