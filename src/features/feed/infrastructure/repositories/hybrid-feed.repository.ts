import "server-only";
import type {
  FeedCommentEntity,
  FeedCommentPage,
} from "../../domain/entities/feed-comment.entity";
import type {
  FeedPage,
  FeedPostEntity,
  FeedScopeSelection,
} from "../../domain/entities/feed-post.entity";
import type {
  ReactionState,
  ReactionType,
} from "../../domain/entities/reaction.entity";
import type {
  CreatePostInput,
  FeedResult,
  IFeedRepository,
} from "../../domain/repositories/i-feed.repository";

/**
 * US-E18.31 partial-real facade — the same shape as
 * `HybridMessagingRepository` (US-E18.17 / ADR 0060) and
 * `AcademicRecordsSealHybridRepository`.
 *
 * READS are served by `real`: BE US-165 denormalizes `authorName`/`authorRole`
 * onto every `Post`/`Comment`, which closed the identity gap that had made a
 * real feed read unshippable (a feed row without a name/role/avatar is not a
 * feed row). This is the majority of the screen's value — browsing a real,
 * correctly-attributed feed.
 *
 * MUTATIONS are force-served by `mock` **regardless of `NEXT_PUBLIC_USE_MOCK`**,
 * because they depend on two contract mismatches that are product decisions, not
 * wiring bugs, and no decision has been made:
 * - `setReaction`/`removeReaction` — real `emoji ∈ {like,love,haha,wow,sad,
 *   angry}` with a single `reactionCount` + `callerReaction`, vs web's
 *   `ReactionType ∈ {like,love,celebrate,clap}` with per-type counts. No
 *   lossless mapping exists in either direction.
 * - `createPost` — real `POST /feeds/{scope}` takes `textBody` (+ optional
 *   `linkUrl`, + ONE optional image as `multipart/form-data`); web models
 *   multiple placeholder `FeedAttachment[]` and has no upload pipeline at all.
 * - `togglePinMock` — the endpoint IS real (US-101) and real reads finally give
 *   it valid post ids, but the presentation fires it and ignores the result
 *   (local pin flip), so routing it real would swallow 403/404 silently.
 * - `addComment` — has NO contract gap; the real call is already wired and
 *   unit-tested in `FeedRepository`. It stays on the mock only to keep the
 *   write side coherent with `createPost` (a comment on a mock-created post
 *   would 404 against the real service). Promoting it is a one-line change.
 *
 * KNOWN CONSEQUENCE, deliberately accepted and flagged to fe-lead: in real mode
 * a mutation succeeds against the in-memory mock and then disappears on the
 * next real refetch. That is tolerable today because the app ships with
 * `NEXT_PUBLIC_USE_MOCK=true` (the pure mock repo, no hybrid). Before the flag
 * flips, the write half needs either a product decision on gaps #2/#3 or an
 * honest degrade (return `{ type: "forbidden" }` here instead of delegating) —
 * a fake-published school announcement is worse than a disabled composer.
 */
export class HybridFeedRepository implements IFeedRepository {
  constructor(
    private readonly real: IFeedRepository,
    private readonly mock: IFeedRepository,
  ) {}

  // --- Real slice: reads (US-165 author identity) ---
  getFeed(
    selection: FeedScopeSelection,
    cursor: string | null,
  ): Promise<FeedResult<FeedPage>> {
    return this.real.getFeed(selection, cursor);
  }

  listComments(
    postId: string,
    cursor: string | null,
  ): Promise<FeedResult<FeedCommentPage>> {
    return this.real.listComments(postId, cursor);
  }

  // --- Force-mocked slice: mutations (gaps #2/#3 unresolved) ---
  createPost(input: CreatePostInput): Promise<FeedResult<FeedPostEntity>> {
    return this.mock.createPost(input);
  }

  setReaction(
    postId: string,
    reactionType: ReactionType,
  ): Promise<FeedResult<ReactionState>> {
    return this.mock.setReaction(postId, reactionType);
  }

  removeReaction(postId: string): Promise<FeedResult<ReactionState>> {
    return this.mock.removeReaction(postId);
  }

  addComment(
    postId: string,
    content: string,
  ): Promise<FeedResult<FeedCommentEntity>> {
    return this.mock.addComment(postId, content);
  }

  togglePinMock(
    postId: string,
    pinned: boolean,
  ): Promise<FeedResult<{ postId: string; pinned: boolean }>> {
    return this.mock.togglePinMock(postId, pinned);
  }
}
