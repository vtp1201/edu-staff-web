import { describe, expect, it, vi } from "vitest";
import type { IFeedRepository } from "../../domain/repositories/i-feed.repository";
import { HybridFeedRepository } from "./hybrid-feed.repository";

/** Every IFeedRepository method as a spy, so "not called" is provable. */
function spyRepo(): IFeedRepository & Record<string, ReturnType<typeof vi.fn>> {
  const ok = (value: unknown) => ({ ok: true, value });
  return {
    getFeed: vi
      .fn()
      .mockResolvedValue(ok({ posts: [], nextCursor: null, hasMore: false })),
    listComments: vi
      .fn()
      .mockResolvedValue(
        ok({ comments: [], nextCursor: null, hasMore: false }),
      ),
    createPost: vi.fn().mockResolvedValue(ok({})),
    setReaction: vi.fn().mockResolvedValue(ok({})),
    removeReaction: vi.fn().mockResolvedValue(ok({})),
    addComment: vi.fn().mockResolvedValue(ok({})),
    togglePin: vi.fn().mockResolvedValue(ok({ postId: "p1", pinned: true })),
  } as unknown as IFeedRepository & Record<string, ReturnType<typeof vi.fn>>;
}

describe("HybridFeedRepository (US-E18.31 partial-real wiring)", () => {
  it("routes the READ slice to the REAL repo, arguments intact", async () => {
    const real = spyRepo();
    const hybrid = new HybridFeedRepository(real);

    await hybrid.getFeed({ scope: "class", classId: "c-1" }, "cur");
    await hybrid.listComments("p1", null);

    expect(real.getFeed).toHaveBeenCalledWith(
      { scope: "class", classId: "c-1" },
      "cur",
    );
    expect(real.listComments).toHaveBeenCalledWith("p1", null);
  });

  it("degrades EVERY mutation to a typed forbidden failure — never a fake success", async () => {
    const real = spyRepo();
    const hybrid = new HybridFeedRepository(real);

    const results = [
      await hybrid.createPost({
        scope: { scope: "school" },
        content: "hi",
        hasAttachment: false,
      }),
      await hybrid.setReaction("p1", "like"),
      await hybrid.removeReaction("p1"),
      await hybrid.addComment("p1", "hay quá"),
      await hybrid.togglePin("p1", true),
    ];

    for (const result of results) {
      expect(result).toEqual({ ok: false, error: { type: "forbidden" } });
    }
  });

  it("issues NO write request against the real service while degraded", async () => {
    const real = spyRepo();
    const hybrid = new HybridFeedRepository(real);

    await hybrid.createPost({
      scope: { scope: "school" },
      content: "hi",
      hasAttachment: false,
    });
    await hybrid.setReaction("p1", "like");
    await hybrid.removeReaction("p1");
    await hybrid.addComment("p1", "ok");
    await hybrid.togglePin("p1", false);

    for (const name of [
      "createPost",
      "setReaction",
      "removeReaction",
      "addComment",
      "togglePin",
    ] as const) {
      expect(
        real[name],
        `${name} must NOT reach the real service`,
      ).not.toHaveBeenCalled();
    }
  });
});
