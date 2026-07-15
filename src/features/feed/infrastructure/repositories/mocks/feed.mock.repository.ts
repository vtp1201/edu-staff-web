import { mockDelay } from "@/bootstrap/lib/mock";
import type {
  FeedCommentEntity,
  FeedCommentPage,
} from "../../../domain/entities/feed-comment.entity";
import type {
  FeedPage,
  FeedPostEntity,
  FeedScopeSelection,
} from "../../../domain/entities/feed-post.entity";
import {
  emptyReactionCounts,
  type ReactionState,
  type ReactionType,
} from "../../../domain/entities/reaction.entity";
import type {
  CreatePostInput,
  FeedResult,
  IFeedRepository,
} from "../../../domain/repositories/i-feed.repository";
import { seedComments, seedPosts } from "./feed.seed";

const PAGE = 3;

/**
 * Full in-memory feed mock (US-E19.1 mock-first). Selected by feed.di while
 * NEXT_PUBLIC_USE_MOCK=true so the screen is demonstrable without a `social`
 * backend. Module-level mutable state persists across a session (same idiom as
 * MockMessagingRepository). `togglePinMock` never touches the network in EITHER
 * repo — it is INT-190-07's permanent local-only path.
 */
export class MockFeedRepository implements IFeedRepository {
  private posts: FeedPostEntity[] = seedPosts();
  private comments: Record<string, FeedCommentEntity[]> = seedComments();

  private inScope(p: FeedPostEntity, sel: FeedScopeSelection): boolean {
    return sel.scope === "school"
      ? p.scope === "school"
      : p.scope === "class" && p.classId === sel.classId;
  }

  async getFeed(
    selection: FeedScopeSelection,
    cursor: string | null,
  ): Promise<FeedResult<FeedPage>> {
    await mockDelay();
    const all = this.posts.filter((p) => this.inScope(p, selection));
    const start = cursor ? Number.parseInt(cursor, 10) : 0;
    const slice = all.slice(start, start + PAGE);
    const nextIndex = start + slice.length;
    const hasMore = nextIndex < all.length;
    return {
      ok: true,
      value: {
        posts: slice.map((p) => ({ ...p })),
        nextCursor: hasMore ? String(nextIndex) : null,
        hasMore,
      },
    };
  }

  async createPost(
    input: CreatePostInput,
  ): Promise<FeedResult<FeedPostEntity>> {
    await mockDelay();
    const created: FeedPostEntity = {
      postId: `p-${Date.now()}`,
      authorId: "me",
      authorName: "Bạn",
      authorRole: "teacher",
      authorAvatarInitials: "B",
      scope: input.scope.scope,
      classId: input.scope.scope === "class" ? input.scope.classId : undefined,
      content: input.content,
      attachments: input.hasAttachment
        ? [{ label: "ảnh: ảnh vừa tải lên", alt: "Ảnh đính kèm bài viết mới" }]
        : [],
      createdAt: new Date().toISOString(),
      pinned: false,
      reactions: { counts: emptyReactionCounts(), myReaction: null },
      commentCount: 0,
    };
    this.posts.unshift(created);
    return { ok: true, value: { ...created } };
  }

  private applyReaction(
    postId: string,
    next: ReactionType | null,
  ): ReactionState {
    const p = this.posts.find((x) => x.postId === postId);
    if (!p) return { counts: emptyReactionCounts(), myReaction: null };
    const counts = { ...p.reactions.counts };
    const prev = p.reactions.myReaction;
    if (prev) counts[prev] = Math.max(0, counts[prev] - 1);
    if (next) counts[next] = counts[next] + 1;
    p.reactions = { counts, myReaction: next };
    return { counts: { ...counts }, myReaction: next };
  }

  async setReaction(
    postId: string,
    reactionType: ReactionType,
  ): Promise<FeedResult<ReactionState>> {
    await mockDelay(120);
    return { ok: true, value: this.applyReaction(postId, reactionType) };
  }

  async removeReaction(postId: string): Promise<FeedResult<ReactionState>> {
    await mockDelay(120);
    return { ok: true, value: this.applyReaction(postId, null) };
  }

  async listComments(
    postId: string,
    _cursor: string | null,
  ): Promise<FeedResult<FeedCommentPage>> {
    await mockDelay();
    return {
      ok: true,
      value: {
        comments: (this.comments[postId] ?? []).map((c) => ({ ...c })),
        nextCursor: null,
        hasMore: false,
      },
    };
  }

  async addComment(
    postId: string,
    content: string,
  ): Promise<FeedResult<FeedCommentEntity>> {
    await mockDelay();
    const comment: FeedCommentEntity = {
      commentId: `c-${Date.now()}`,
      postId,
      authorId: "me",
      authorName: "Bạn",
      authorRole: "teacher",
      authorAvatarInitials: "B",
      content,
      createdAt: new Date().toISOString(),
    };
    this.comments[postId] = [...(this.comments[postId] ?? []), comment];
    const p = this.posts.find((x) => x.postId === postId);
    if (p) p.commentCount += 1;
    return { ok: true, value: { ...comment } };
  }

  togglePinMock(
    postId: string,
    pinned: boolean,
  ): Promise<FeedResult<{ postId: string; pinned: boolean }>> {
    const p = this.posts.find((x) => x.postId === postId);
    if (p) p.pinned = pinned;
    return Promise.resolve({ ok: true, value: { postId, pinned } });
  }
}
