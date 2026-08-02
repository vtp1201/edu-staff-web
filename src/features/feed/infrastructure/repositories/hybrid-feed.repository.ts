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

/** The one shared degrade result — a typed failure, never a fabricated value. */
function degraded<T>(): Promise<FeedResult<T>> {
  return Promise.resolve({ ok: false, error: { type: "forbidden" } });
}

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
 * MUTATIONS **honestly degrade** to `{ type: "forbidden" }` with NO HTTP
 * attempted — the `Unavailable*Repository` posture (US-E20.5). This class is
 * constructed ONLY in the non-mock DI branch, i.e. exactly the configuration
 * production runs (`USE_MOCK` is `false` when unset, and `next.config.ts`
 * refuses to build a deploy with the flag on), so the alternative — delegating
 * to the in-memory `MockFeedRepository` — would tell a user their post /
 * reaction / comment / pin succeeded and then lose it on the very next
 * refetch (a fresh `makeRepo()` = a fresh empty store). On a school
 * communications product that also means a fake-published announcement and, via
 * the still-force-mocked `moderation` feature now receiving REAL content ids, a
 * fake-successful report or removal. A disabled control with an explanation
 * beats a lie; the presentation gates these affordances off up-front
 * (`writesEnabled = USE_MOCK`, mirroring exam-bank's `authoringEnabled`), so
 * this failure is the belt-and-braces server half.
 *
 * Why each write is still unshippable against the real contract:
 * - `setReaction`/`removeReaction` — real `emoji ∈ {like,love,haha,wow,sad,
 *   angry}` with a single `reactionCount` + `callerReaction`, vs web's
 *   `ReactionType ∈ {like,love,celebrate,clap}` with per-type counts. No
 *   lossless mapping exists in either direction (product decision).
 * - `createPost` — real `POST /feeds/{scope}` takes `textBody` (+ optional
 *   `linkUrl`, + ONE optional image as `multipart/form-data`); web models
 *   multiple placeholder `FeedAttachment[]` and has no upload pipeline at all.
 * - `togglePin` — the endpoint IS real (US-101) and real reads finally give it
 *   valid post ids, but the presentation fires it and ignores the result (local
 *   pin flip), so routing it real would swallow 403/404 silently.
 * - `addComment` — has NO contract gap; the real call is already wired and
 *   unit-tested in `FeedRepository`. It degrades only to stay coherent with the
 *   rest of the write side (a comment thread whose composer is the one live
 *   control on an otherwise read-only screen). Promoting it is a one-line
 *   change once the composer gating is revisited.
 */
export class HybridFeedRepository implements IFeedRepository {
  constructor(private readonly real: IFeedRepository) {}

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

  // --- Honestly-degraded slice: mutations (no HTTP, no fake success) ---
  createPost(_input: CreatePostInput): Promise<FeedResult<FeedPostEntity>> {
    return degraded();
  }

  setReaction(
    _postId: string,
    _reactionType: ReactionType,
  ): Promise<FeedResult<ReactionState>> {
    return degraded();
  }

  removeReaction(_postId: string): Promise<FeedResult<ReactionState>> {
    return degraded();
  }

  addComment(
    _postId: string,
    _content: string,
  ): Promise<FeedResult<FeedCommentEntity>> {
    return degraded();
  }

  togglePin(
    _postId: string,
    _pinned: boolean,
  ): Promise<FeedResult<{ postId: string; pinned: boolean }>> {
    return degraded();
  }
}
