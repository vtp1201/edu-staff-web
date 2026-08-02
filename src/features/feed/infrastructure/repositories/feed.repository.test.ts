import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/bootstrap/lib/api-envelope";
import { FEED_LIST_PAGE_SIZE } from "../../domain/repositories/i-feed.repository";
import { FeedRepository, toFeedFailure } from "./feed.repository";

// ── toFeedFailure — code-only branching (never message) ─────────────────────
// US-E18.20: every `code` below is verbatim from
// `edu-api/services/social/docs/ERROR_CODES.md` (§Feed/Post US-097, §reaction
// US-099, §comment US-100, §pinning US-101). UPPER_SNAKE on the wire via
// `pkg/kit/response/error.go`'s `codeFromKey()`.
describe("toFeedFailure — code/status branching, never message", () => {
  it("FEED_NOT_SCHOOL_ADMIN → forbidden even with a retryable-sounding message", () => {
    const err = new ApiError({
      code: "FEED_NOT_SCHOOL_ADMIN",
      message: "please retry",
      retryable: true,
      status: 403,
    });
    expect(toFeedFailure(err)).toEqual({ type: "forbidden" });
  });

  it("FEED_NOT_HOMEROOM_TEACHER → forbidden (CLASS create/pin gate)", () => {
    const err = new ApiError({
      code: "FEED_NOT_HOMEROOM_TEACHER",
      message: "temporary hiccup, try again",
      retryable: true,
      status: 403,
    });
    expect(toFeedFailure(err)).toEqual({ type: "forbidden" });
  });

  it("FEED_NO_TENANT_MEMBERSHIP → forbidden (SCHOOL read gate)", () => {
    const err = new ApiError({
      code: "FEED_NO_TENANT_MEMBERSHIP",
      message: "ok",
      retryable: false,
      status: 403,
    });
    expect(toFeedFailure(err)).toEqual({ type: "forbidden" });
  });

  it("FEED_CLASS_ARCHIVED (409) → forbidden — terminal, never retried", () => {
    const err = new ApiError({
      code: "FEED_CLASS_ARCHIVED",
      message: "conflict",
      retryable: false,
      status: 409,
    });
    expect(toFeedFailure(err)).toEqual({ type: "forbidden" });
  });

  it("422 VALIDATION_FAILED → validation, carrying field errors", () => {
    const err = new ApiError({
      code: "VALIDATION_FAILED",
      message: "ok",
      retryable: false,
      status: 422,
      fields: [{ field: "textBody", message: "required" }],
    });
    expect(toFeedFailure(err)).toEqual({
      type: "validation",
      fields: [{ field: "textBody", message: "required" }],
    });
  });

  it("FEED_INVALID_REACTION_EMOJI (422) → validation", () => {
    const err = new ApiError({
      code: "FEED_INVALID_REACTION_EMOJI",
      message: "server exploded",
      retryable: true,
      status: 422,
    });
    expect(toFeedFailure(err)).toEqual({ type: "validation" });
  });

  it("FEED_CLASS_NOT_FOUND → scope-not-found regardless of conflictKind", () => {
    const err = new ApiError({
      code: "FEED_CLASS_NOT_FOUND",
      message: "gone",
      retryable: false,
      status: 404,
    });
    // Existence-masked (US-107): also covers "class exists, caller may not read".
    expect(toFeedFailure(err, "scope")).toEqual({ type: "scope-not-found" });
    expect(toFeedFailure(err, "post")).toEqual({ type: "scope-not-found" });
  });

  it("FEED_POST_NOT_FOUND → post-not-found regardless of conflictKind", () => {
    const err = new ApiError({
      code: "FEED_POST_NOT_FOUND",
      message: "gone",
      retryable: false,
      status: 404,
    });
    expect(toFeedFailure(err, "post")).toEqual({ type: "post-not-found" });
    expect(toFeedFailure(err, "scope")).toEqual({ type: "post-not-found" });
  });

  it("bare 404 (no known code) falls back to the call's conflictKind", () => {
    const err = new ApiError({
      code: "UNKNOWN_ERROR",
      message: "gone",
      retryable: false,
      status: 404,
    });
    expect(toFeedFailure(err, "scope")).toEqual({ type: "scope-not-found" });
    expect(toFeedFailure(err, "post")).toEqual({ type: "post-not-found" });
  });

  it("FEED_RATE_LIMIT_EXCEEDED (429) → fetch-failed (documented retryable)", () => {
    const err = new ApiError({
      code: "FEED_RATE_LIMIT_EXCEEDED",
      message: "forbidden",
      retryable: true,
      status: 429,
    });
    expect(toFeedFailure(err)).toEqual({ type: "fetch-failed" });
  });

  it("503 → fetch-failed even when the message says 'forbidden'", () => {
    const err = new ApiError({
      code: "SERVICE_UNAVAILABLE",
      message: "forbidden",
      retryable: true,
      status: 503,
    });
    expect(toFeedFailure(err)).toEqual({ type: "fetch-failed" });
  });

  it("no response / transport → network-error", () => {
    const err = new ApiError({
      code: "NETWORK_ERROR",
      message: "boom",
      retryable: true,
      status: 0,
    });
    expect(toFeedFailure(err)).toEqual({ type: "network-error" });
  });
});

// ── Repository ↔ HTTP contract ──────────────────────────────────────────────
function fakeHttp(overrides: Partial<AxiosInstance>): AxiosInstance {
  return overrides as unknown as AxiosInstance;
}

/** A real `social` `Post` row (openapi.yaml `Post`, US-165 identity fields). */
function wirePost(over: Record<string, unknown> = {}) {
  return {
    id: "p1",
    authorUserId: "a1",
    scope: "SCHOOL",
    tenantId: "t1",
    classId: null,
    clubId: null,
    textBody: "hello",
    linkUrl: null,
    reactionCount: 3,
    callerReaction: "haha",
    commentCount: 2,
    isPinned: true,
    createdAt: "2026-07-11T09:15:00.000Z",
    authorName: "Trần Minh Quân",
    authorRole: "TEACHER",
    avatarUrl: null,
    ...over,
  };
}

describe("FeedRepository — envelope + error mapping", () => {
  it("getFeed unwraps the raw envelope, the FeedPage object + meta.pagination", async () => {
    const get = vi.fn().mockResolvedValue({
      success: true,
      // US-101/ADR 0083: `data` is a FeedPage OBJECT, not a bare Post[].
      data: { posts: [wirePost()], pinnedPost: null },
      error: null,
      meta: { pagination: { nextCursor: "5", hasMore: true } },
    });
    const repo = new FeedRepository(fakeHttp({ get }));
    const res = await repo.getFeed({ scope: "school" }, null);
    if (!res.ok) throw new Error("expected ok");
    expect(res.value.hasMore).toBe(true);
    expect(res.value.nextCursor).toBe("5");
    expect(res.value.posts[0]).toMatchObject({
      postId: "p1",
      authorId: "a1",
      authorName: "Trần Minh Quân",
      authorRole: "teacher",
      authorAvatarInitials: "TQ",
      content: "hello",
      pinned: true,
      commentCount: 2,
    });
    // Gap #2 — the real emoji taxonomy is never remapped onto web's 4 types.
    expect(res.value.posts[0].reactions).toEqual({
      counts: { like: 0, love: 0, celebrate: 0, clap: 0 },
      myReaction: null,
    });
  });

  it("getFeed asks the school endpoint with the declared page size, no cursor on page 1", async () => {
    const get = vi.fn().mockResolvedValue({
      success: true,
      data: { posts: [], pinnedPost: null },
      error: null,
      meta: {},
    });
    const repo = new FeedRepository(fakeHttp({ get }));
    await repo.getFeed({ scope: "school" }, null);
    expect(get).toHaveBeenCalledWith(
      "/social/api/v1/feeds/school",
      expect.objectContaining({
        params: { limit: FEED_LIST_PAGE_SIZE },
        raw: true,
      }),
    );
  });

  it("getFeed passes the opaque cursor + class path on a later class page", async () => {
    const get = vi.fn().mockResolvedValue({
      success: true,
      data: { posts: [], pinnedPost: null },
      error: null,
      meta: {},
    });
    const repo = new FeedRepository(fakeHttp({ get }));
    await repo.getFeed({ scope: "class", classId: "c-7" }, "opaque-cursor");
    expect(get).toHaveBeenCalledWith(
      "/social/api/v1/feeds/classes/c-7",
      expect.objectContaining({
        params: { limit: FEED_LIST_PAGE_SIZE, cursor: "opaque-cursor" },
      }),
    );
  });

  it("getFeed surfaces a pinnedPost that is not in the chronological page", async () => {
    const get = vi.fn().mockResolvedValue({
      success: true,
      data: {
        posts: [wirePost({ id: "p1", isPinned: false })],
        pinnedPost: wirePost({ id: "p9", isPinned: true }),
      },
      error: null,
      meta: {},
    });
    const repo = new FeedRepository(fakeHttp({ get }));
    const res = await repo.getFeed({ scope: "school" }, null);
    if (!res.ok) throw new Error("expected ok");
    expect(res.value.posts.map((p) => p.postId)).toEqual(["p9", "p1"]);
  });

  it("getFeed keeps a null author identity null (pre-US-165 rows)", async () => {
    const get = vi.fn().mockResolvedValue({
      success: true,
      data: {
        posts: [wirePost({ authorName: null, authorRole: null })],
        pinnedPost: null,
      },
      error: null,
      meta: {},
    });
    const repo = new FeedRepository(fakeHttp({ get }));
    const res = await repo.getFeed({ scope: "school" }, null);
    if (!res.ok) throw new Error("expected ok");
    expect(res.value.posts[0].authorName).toBeNull();
    expect(res.value.posts[0].authorRole).toBeNull();
    expect(res.value.posts[0].authorAvatarInitials).toBe("?");
  });

  it("listComments unwraps the bare Comment[] envelope + identity", async () => {
    const get = vi.fn().mockResolvedValue({
      success: true,
      data: [
        {
          id: "c1",
          postId: "p1",
          authorUserId: "a2",
          text: "hay quá",
          createdAt: "2026-07-11T09:20:00.000Z",
          authorName: "Nguyễn Thị Hương",
          authorRole: "STUDENT",
          avatarUrl: null,
        },
      ],
      error: null,
      meta: { pagination: { nextCursor: "c-2", hasMore: true } },
    });
    const repo = new FeedRepository(fakeHttp({ get }));
    const res = await repo.listComments("p1", null);
    if (!res.ok) throw new Error("expected ok");
    expect(get).toHaveBeenCalledWith(
      "/social/api/v1/feeds/posts/p1/comments",
      expect.objectContaining({
        params: { limit: FEED_LIST_PAGE_SIZE },
        raw: true,
      }),
    );
    expect(res.value).toEqual({
      comments: [
        {
          commentId: "c1",
          postId: "p1",
          authorId: "a2",
          authorName: "Nguyễn Thị Hương",
          authorRole: "student",
          authorAvatarInitials: "NH",
          content: "hay quá",
          createdAt: "2026-07-11T09:20:00.000Z",
        },
      ],
      nextCursor: "c-2",
      hasMore: true,
    });
  });

  it("listComments maps a post 404 to post-not-found", async () => {
    const get = vi.fn().mockRejectedValue(
      new ApiError({
        code: "FEED_POST_NOT_FOUND",
        message: "gone",
        retryable: false,
        status: 404,
      }),
    );
    const repo = new FeedRepository(fakeHttp({ get }));
    const res = await repo.listComments("p1", null);
    expect(res).toEqual({ ok: false, error: { type: "post-not-found" } });
  });

  it("getFeed on a SCHOOL-scope 403 maps to forbidden", async () => {
    const get = vi.fn().mockRejectedValue(
      new ApiError({
        code: "FEED_NO_TENANT_MEMBERSHIP",
        message: "no",
        retryable: false,
        status: 403,
      }),
    );
    const repo = new FeedRepository(fakeHttp({ get }));
    const res = await repo.getFeed({ scope: "school" }, null);
    expect(res).toEqual({ ok: false, error: { type: "forbidden" } });
  });

  it("getFeed on a class-scope 404 maps to scope-not-found", async () => {
    const get = vi.fn().mockRejectedValue(
      new ApiError({
        code: "FEED_CLASS_NOT_FOUND",
        message: "gone",
        retryable: false,
        status: 404,
      }),
    );
    const repo = new FeedRepository(fakeHttp({ get }));
    const res = await repo.getFeed({ scope: "class", classId: "12C3" }, null);
    expect(res).toEqual({ ok: false, error: { type: "scope-not-found" } });
  });

  it("setReaction returns the updated reaction state", async () => {
    const put = vi
      .fn()
      .mockResolvedValue({ counts: { love: 1 }, myReaction: "love" });
    const repo = new FeedRepository(fakeHttp({ put }));
    const res = await repo.setReaction("p1", "love");
    if (!res.ok) throw new Error("expected ok");
    expect(res.value.myReaction).toBe("love");
    expect(put).toHaveBeenCalledWith("/social/api/v1/feeds/posts/p1/reaction", {
      reactionType: "love",
    });
  });

  it("reaction 404 → post-not-found (AC-1903.5)", async () => {
    const put = vi.fn().mockRejectedValue(
      new ApiError({
        code: "FEED_POST_NOT_FOUND",
        message: "gone",
        retryable: false,
        status: 404,
      }),
    );
    const repo = new FeedRepository(fakeHttp({ put }));
    const res = await repo.setReaction("p1", "love");
    expect(res).toEqual({ ok: false, error: { type: "post-not-found" } });
  });

  // `addComment` is NOT routed by the hybrid today (US-E18.31 keeps every
  // mutation on the mock), but the real call is kept correct + proven so
  // promoting it is a one-line change in HybridFeedRepository.
  it("addComment POSTs the real `text` body and maps the created Comment", async () => {
    const post = vi.fn().mockResolvedValue({
      id: "c9",
      postId: "p1",
      authorUserId: "me",
      text: "xin chào",
      createdAt: "2026-07-11T10:00:00.000Z",
      authorName: "Lê Văn C",
      authorRole: "TEACHER",
      avatarUrl: null,
    });
    const repo = new FeedRepository(fakeHttp({ post }));
    const res = await repo.addComment("p1", "xin chào");
    if (!res.ok) throw new Error("expected ok");
    expect(post).toHaveBeenCalledWith(
      "/social/api/v1/feeds/posts/p1/comments",
      { text: "xin chào" },
    );
    expect(res.value).toMatchObject({
      commentId: "c9",
      authorName: "Lê Văn C",
      authorRole: "teacher",
    });
  });

  // ── pin/unpin — US-E18.20: this IS a real endpoint (US-101) ───────────────
  it("togglePinMock(true) PUTs the real pin endpoint with no body", async () => {
    const put = vi.fn().mockResolvedValue({});
    const del = vi.fn();
    const repo = new FeedRepository(fakeHttp({ put, delete: del }));
    const res = await repo.togglePinMock("p1", true);
    expect(res).toEqual({ ok: true, value: { postId: "p1", pinned: true } });
    expect(put).toHaveBeenCalledWith("/social/api/v1/feeds/posts/p1/pin");
    expect(del).not.toHaveBeenCalled();
  });

  it("togglePinMock(false) DELETEs the real pin endpoint (idempotent unpin)", async () => {
    const put = vi.fn();
    const del = vi.fn().mockResolvedValue({});
    const repo = new FeedRepository(fakeHttp({ put, delete: del }));
    const res = await repo.togglePinMock("p1", false);
    expect(res).toEqual({ ok: true, value: { postId: "p1", pinned: false } });
    expect(del).toHaveBeenCalledWith("/social/api/v1/feeds/posts/p1/pin");
    expect(put).not.toHaveBeenCalled();
  });

  it("pin 403 maps through the CREATE gate codes → forbidden", async () => {
    const put = vi.fn().mockRejectedValue(
      new ApiError({
        code: "FEED_NOT_SCHOOL_ADMIN",
        message: "retry later",
        retryable: true,
        status: 403,
      }),
    );
    const repo = new FeedRepository(fakeHttp({ put }));
    const res = await repo.togglePinMock("p1", true);
    expect(res).toEqual({ ok: false, error: { type: "forbidden" } });
  });
});
