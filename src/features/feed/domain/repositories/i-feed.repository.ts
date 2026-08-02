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
 * (`social`), INT-190-01..05.
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
  /**
   * Pin / unpin a post (FR-011).
   *
   * The REAL endpoint EXISTS and is reachable — `PUT`/`DELETE
   * /feeds/posts/{postId}/pin` (BE US-101), implemented in `FeedRepository`;
   * INT-190-07's "local-only, no endpoint" premise is stale, hence the name
   * (it was `togglePinMock`). It is nonetheless NOT routed to the real service
   * today: `HybridFeedRepository` degrades every write to `forbidden` while the
   * rest of the write side is blocked on the reaction/attachment contract gaps,
   * and the presentation fires pin fire-and-forget (a real 403/404 would be
   * swallowed). `MockFeedRepository` still flips it in memory under
   * NEXT_PUBLIC_USE_MOCK.
   */
  togglePin(
    postId: string,
    pinned: boolean,
  ): Promise<FeedResult<{ postId: string; pinned: boolean }>>;
}

/** Cursor page size for feed + comment reads. */
export const FEED_LIST_PAGE_SIZE = 5;
