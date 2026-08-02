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
    togglePinMock: vi
      .fn()
      .mockResolvedValue(ok({ postId: "p1", pinned: true })),
  } as unknown as IFeedRepository & Record<string, ReturnType<typeof vi.fn>>;
}

describe("HybridFeedRepository (US-E18.31 partial-real wiring)", () => {
  it("routes the READ slice to the REAL repo, arguments intact", async () => {
    const real = spyRepo();
    const mock = spyRepo();
    const hybrid = new HybridFeedRepository(real, mock);

    await hybrid.getFeed({ scope: "class", classId: "c-1" }, "cur");
    await hybrid.listComments("p1", null);

    expect(real.getFeed).toHaveBeenCalledWith(
      { scope: "class", classId: "c-1" },
      "cur",
    );
    expect(real.listComments).toHaveBeenCalledWith("p1", null);
    expect(mock.getFeed).not.toHaveBeenCalled();
    expect(mock.listComments).not.toHaveBeenCalled();
  });

  it("routes every MUTATION to the MOCK repo — never the real one (gaps #2/#3)", async () => {
    const real = spyRepo();
    const mock = spyRepo();
    const hybrid = new HybridFeedRepository(real, mock);

    await hybrid.createPost({
      scope: { scope: "school" },
      content: "hi",
      hasAttachment: false,
    });
    await hybrid.setReaction("p1", "like");
    await hybrid.removeReaction("p1");
    await hybrid.addComment("p1", "hay quá");
    await hybrid.togglePinMock("p1", true);

    for (const name of [
      "createPost",
      "setReaction",
      "removeReaction",
      "addComment",
      "togglePinMock",
    ] as const) {
      expect(mock[name], `${name} must hit the mock`).toHaveBeenCalled();
      expect(
        real[name],
        `${name} must NOT hit the real repo`,
      ).not.toHaveBeenCalled();
    }
  });

  it("passes mutation arguments through unchanged", async () => {
    const real = spyRepo();
    const mock = spyRepo();
    const hybrid = new HybridFeedRepository(real, mock);

    await hybrid.setReaction("p2", "celebrate");
    await hybrid.addComment("p2", "ok");
    await hybrid.togglePinMock("p2", false);

    expect(mock.setReaction).toHaveBeenCalledWith("p2", "celebrate");
    expect(mock.addComment).toHaveBeenCalledWith("p2", "ok");
    expect(mock.togglePinMock).toHaveBeenCalledWith("p2", false);
  });
});
