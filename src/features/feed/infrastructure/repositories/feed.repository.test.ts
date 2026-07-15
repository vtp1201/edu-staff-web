import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/bootstrap/lib/api-envelope";
import { FeedRepository, toFeedFailure } from "./feed.repository";

// ── toFeedFailure — code-only branching (never message) ─────────────────────
describe("toFeedFailure — code/status branching, never message", () => {
  it("FORBIDDEN → forbidden even with a retryable-sounding message", () => {
    const err = new ApiError({
      code: "FORBIDDEN",
      message: "please retry",
      retryable: true,
      status: 403,
    });
    expect(toFeedFailure(err)).toEqual({ type: "forbidden" });
  });

  it("422 VALIDATION_ERROR → validation, carrying field errors", () => {
    const err = new ApiError({
      code: "VALIDATION_ERROR",
      message: "ok",
      retryable: false,
      status: 422,
      fields: [{ field: "content", message: "required" }],
    });
    expect(toFeedFailure(err)).toEqual({
      type: "validation",
      fields: [{ field: "content", message: "required" }],
    });
  });

  it("class-scope 404 → scope-not-found (conflictKind=scope)", () => {
    const err = new ApiError({
      code: "CLASS_NOT_FOUND",
      message: "gone",
      retryable: false,
      status: 404,
    });
    expect(toFeedFailure(err, "scope")).toEqual({ type: "scope-not-found" });
  });

  it("post 404 → post-not-found (conflictKind=post)", () => {
    const err = new ApiError({
      code: "POST_NOT_FOUND",
      message: "gone",
      retryable: false,
      status: 404,
    });
    expect(toFeedFailure(err, "post")).toEqual({ type: "post-not-found" });
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

describe("FeedRepository — envelope + error mapping", () => {
  it("getFeed unwraps the raw envelope + meta.pagination", async () => {
    const get = vi.fn().mockResolvedValue({
      success: true,
      data: [
        {
          postId: "p1",
          authorId: "a",
          authorName: "Trần Minh Quân",
          authorRole: "PRINCIPAL",
          scope: "school",
          content: "hello",
          createdAt: "2026-07-11T09:15:00.000Z",
          pinned: true,
          reactions: { counts: { like: 3 }, myReaction: "like" },
          commentCount: 2,
        },
      ],
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
      authorRole: "principal",
      pinned: true,
      commentCount: 2,
    });
    // counts normalized to all four keys.
    expect(res.value.posts[0].reactions.counts).toEqual({
      like: 3,
      love: 0,
      celebrate: 0,
      clap: 0,
    });
  });

  it("getFeed on a class-scope 403 maps to forbidden", async () => {
    const get = vi.fn().mockRejectedValue(
      new ApiError({
        code: "FORBIDDEN",
        message: "no",
        retryable: false,
        status: 403,
      }),
    );
    const repo = new FeedRepository(fakeHttp({ get }));
    const res = await repo.getFeed({ scope: "class", classId: "11A2" }, null);
    expect(res).toEqual({ ok: false, error: { type: "forbidden" } });
  });

  it("getFeed on a class-scope 404 maps to scope-not-found", async () => {
    const get = vi.fn().mockRejectedValue(
      new ApiError({
        code: "CLASS_NOT_FOUND",
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
        code: "POST_NOT_FOUND",
        message: "gone",
        retryable: false,
        status: 404,
      }),
    );
    const repo = new FeedRepository(fakeHttp({ put }));
    const res = await repo.setReaction("p1", "love");
    expect(res).toEqual({ ok: false, error: { type: "post-not-found" } });
  });

  it("togglePinMock never issues an HTTP call (INT-190-07 / AC-1909.1)", async () => {
    const get = vi.fn();
    const post = vi.fn();
    const put = vi.fn();
    const del = vi.fn();
    const repo = new FeedRepository(fakeHttp({ get, post, put, delete: del }));
    const res = await repo.togglePinMock("p1", true);
    expect(res).toEqual({ ok: true, value: { postId: "p1", pinned: true } });
    expect(get).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
  });
});
