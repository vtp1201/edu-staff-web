import { describe, expect, it, vi } from "vitest";
import type {
  FeedPostEntity,
  FeedRole,
  FeedScope,
} from "./entities/feed-post.entity";
import { emptyReactionCounts } from "./entities/reaction.entity";
import { type FeedFailure, isRetryableFailure } from "./failures/feed.failure";
import { canPost } from "./policies/can-post";
import { isMenuEmpty, menuVisibility } from "./policies/menu-visibility";
import { sortPosts } from "./policies/sort-posts";
import type {
  FeedResult,
  IFeedRepository,
} from "./repositories/i-feed.repository";
import { AddCommentUseCase } from "./use-cases/add-comment.use-case";
import { CreatePostUseCase } from "./use-cases/create-post.use-case";
import { ReactToPostUseCase } from "./use-cases/react-to-post.use-case";
import { TogglePinMockUseCase } from "./use-cases/toggle-pin-mock.use-case";

// ── Fake repo ────────────────────────────────────────────────────────────────
function makeRepo(overrides: Partial<IFeedRepository> = {}): IFeedRepository {
  const ok = <T>(value: T): Promise<FeedResult<T>> =>
    Promise.resolve({ ok: true, value });
  return {
    getFeed: vi.fn(() => ok({ posts: [], nextCursor: null, hasMore: false })),
    createPost: vi.fn((input) =>
      ok(makePost({ postId: "new", content: input.content })),
    ),
    setReaction: vi.fn(() =>
      ok({ counts: emptyReactionCounts(), myReaction: "love" as const }),
    ),
    removeReaction: vi.fn(() =>
      ok({ counts: emptyReactionCounts(), myReaction: null }),
    ),
    listComments: vi.fn(() =>
      ok({ comments: [], nextCursor: null, hasMore: false }),
    ),
    addComment: vi.fn((postId, content) =>
      ok({
        commentId: "c1",
        postId,
        authorId: "me",
        authorName: "Me",
        authorRole: "teacher" as FeedRole,
        authorAvatarInitials: "ME",
        content,
        createdAt: "2026-07-11T10:00:00.000Z",
      }),
    ),
    togglePinMock: vi.fn((postId, pinned) => ok({ postId, pinned })),
    ...overrides,
  };
}

function makePost(p: Partial<FeedPostEntity>): FeedPostEntity {
  return {
    postId: "p",
    authorId: "a",
    authorName: "A",
    authorRole: "teacher",
    authorAvatarInitials: "A",
    scope: "school",
    content: "x",
    attachments: [],
    createdAt: "2026-07-01T00:00:00.000Z",
    pinned: false,
    reactions: { counts: emptyReactionCounts(), myReaction: null },
    commentCount: 0,
    ...p,
  };
}

// ── can-post policy (AC-1902.1/.2) ──────────────────────────────────────────
describe("canPost", () => {
  const cases: [FeedRole, FeedScope, boolean][] = [
    ["teacher", "school", true],
    ["principal", "school", true],
    ["student", "school", false],
    ["parent", "school", false],
    ["teacher", "class", true],
    ["principal", "class", true],
    ["student", "class", true],
    ["parent", "class", false],
  ];
  for (const [role, scope, expected] of cases) {
    it(`${role} in ${scope} → ${expected}`, () => {
      expect(canPost(role, scope)).toBe(expected);
    });
  }
});

// ── menu-visibility policy (AC-1905.1–.5) ───────────────────────────────────
describe("menuVisibility", () => {
  it("AC-1905.1 teacher, own-class post, not author → all three", () => {
    const v = menuVisibility({
      viewerRole: "teacher",
      viewerId: "t1",
      authorId: "other",
      scope: "class",
      classId: "11A2",
      teacherClassIds: ["11A2"],
    });
    expect(v).toEqual({ canReport: true, canPin: true, canRemove: true });
  });

  it("AC-1905.2 teacher, own post → pin+remove, no report", () => {
    const v = menuVisibility({
      viewerRole: "teacher",
      viewerId: "t1",
      authorId: "t1",
      scope: "class",
      classId: "11A2",
      teacherClassIds: ["11A2"],
    });
    expect(v).toEqual({ canReport: false, canPin: true, canRemove: true });
  });

  it("teacher on a class they do NOT teach → report only", () => {
    const v = menuVisibility({
      viewerRole: "teacher",
      viewerId: "t1",
      authorId: "other",
      scope: "class",
      classId: "12C3",
      teacherClassIds: ["11A2"],
    });
    expect(v).toEqual({ canReport: true, canPin: false, canRemove: false });
  });

  it("teacher on a school-scope post → report only (never moderates school)", () => {
    const v = menuVisibility({
      viewerRole: "teacher",
      viewerId: "t1",
      authorId: "other",
      scope: "school",
      teacherClassIds: ["11A2"],
    });
    expect(v).toEqual({ canReport: true, canPin: false, canRemove: false });
  });

  it("AC-1905.3 principal, any post not own → all three", () => {
    const v = menuVisibility({
      viewerRole: "principal",
      viewerId: "p1",
      authorId: "other",
      scope: "school",
    });
    expect(v).toEqual({ canReport: true, canPin: true, canRemove: true });
  });

  it("AC-1905.4 student, others' post → report only", () => {
    const v = menuVisibility({
      viewerRole: "student",
      viewerId: "s1",
      authorId: "other",
      scope: "class",
      classId: "11A2",
    });
    expect(v).toEqual({ canReport: true, canPin: false, canRemove: false });
    expect(isMenuEmpty(v)).toBe(false);
  });

  it("AC-1905.5 student, own post → nothing entitled (trigger hidden)", () => {
    const v = menuVisibility({
      viewerRole: "student",
      viewerId: "s1",
      authorId: "s1",
      scope: "class",
      classId: "11A2",
    });
    expect(v).toEqual({ canReport: false, canPin: false, canRemove: false });
    expect(isMenuEmpty(v)).toBe(true);
  });

  it("parent, own post → nothing entitled", () => {
    const v = menuVisibility({
      viewerRole: "parent",
      viewerId: "pa1",
      authorId: "pa1",
      scope: "class",
      classId: "11A2",
    });
    expect(isMenuEmpty(v)).toBe(true);
  });
});

// ── sort-posts policy (AC-1907.1/.2) ────────────────────────────────────────
describe("sortPosts", () => {
  it("AC-1907.1 pinned floats above older non-pinned, ignoring createdAt", () => {
    const older = makePost({
      postId: "pin",
      pinned: true,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    const newer = makePost({
      postId: "fresh",
      pinned: false,
      createdAt: "2026-07-01T00:00:00.000Z",
    });
    expect(sortPosts([newer, older]).map((p) => p.postId)).toEqual([
      "pin",
      "fresh",
    ]);
  });

  it("AC-1907.2 multiple pinned ordered by createdAt desc among themselves", () => {
    const pinOld = makePost({
      postId: "pinOld",
      pinned: true,
      createdAt: "2026-02-01T00:00:00.000Z",
    });
    const pinNew = makePost({
      postId: "pinNew",
      pinned: true,
      createdAt: "2026-06-01T00:00:00.000Z",
    });
    const plain = makePost({
      postId: "plain",
      pinned: false,
      createdAt: "2026-07-01T00:00:00.000Z",
    });
    expect(sortPosts([pinOld, plain, pinNew]).map((p) => p.postId)).toEqual([
      "pinNew",
      "pinOld",
      "plain",
    ]);
  });

  it("does not mutate its input", () => {
    const input = [
      makePost({ postId: "a", pinned: false }),
      makePost({ postId: "b", pinned: true }),
    ];
    const snapshot = input.map((p) => p.postId);
    sortPosts(input);
    expect(input.map((p) => p.postId)).toEqual(snapshot);
  });
});

// ── failure mapping ─────────────────────────────────────────────────────────
describe("isRetryableFailure", () => {
  const table: [FeedFailure["type"], boolean][] = [
    ["fetch-failed", true],
    ["network-error", true],
    ["forbidden", false],
    ["scope-not-found", false],
    ["validation", false],
    ["post-not-found", false],
  ];
  for (const [type, expected] of table) {
    it(`${type} → retryable ${expected}`, () => {
      expect(isRetryableFailure({ type } as FeedFailure)).toBe(expected);
    });
  }
});

// ── create-post use-case ────────────────────────────────────────────────────
describe("CreatePostUseCase", () => {
  it("empty content → validation failure WITHOUT calling repo", async () => {
    const repo = makeRepo();
    const uc = new CreatePostUseCase(repo);
    const res = await uc.execute({
      scope: { scope: "school" },
      content: "   ",
      hasAttachment: false,
    });
    expect(res).toEqual({ ok: false, error: { type: "validation" } });
    expect(repo.createPost).not.toHaveBeenCalled();
  });

  it("trims content and delegates on success", async () => {
    const repo = makeRepo();
    const uc = new CreatePostUseCase(repo);
    const res = await uc.execute({
      scope: { scope: "class", classId: "11A2" },
      content: "  hello  ",
      hasAttachment: true,
    });
    expect(res.ok).toBe(true);
    expect(repo.createPost).toHaveBeenCalledWith(
      expect.objectContaining({ content: "hello", hasAttachment: true }),
    );
  });
});

// ── react-to-post use-case (AC-1903.1/.2/.3) ────────────────────────────────
describe("ReactToPostUseCase", () => {
  it("a reaction type → setReaction (add/replace)", async () => {
    const repo = makeRepo();
    await new ReactToPostUseCase(repo).execute("p1", "love");
    expect(repo.setReaction).toHaveBeenCalledWith("p1", "love");
    expect(repo.removeReaction).not.toHaveBeenCalled();
  });

  it("null → removeReaction (toggle off)", async () => {
    const repo = makeRepo();
    await new ReactToPostUseCase(repo).execute("p1", null);
    expect(repo.removeReaction).toHaveBeenCalledWith("p1");
    expect(repo.setReaction).not.toHaveBeenCalled();
  });
});

// ── add-comment use-case ────────────────────────────────────────────────────
describe("AddCommentUseCase", () => {
  it("empty → validation, no repo call", async () => {
    const repo = makeRepo();
    const res = await new AddCommentUseCase(repo).execute("p1", "  ");
    expect(res).toEqual({ ok: false, error: { type: "validation" } });
    expect(repo.addComment).not.toHaveBeenCalled();
  });

  it("trims + delegates", async () => {
    const repo = makeRepo();
    await new AddCommentUseCase(repo).execute("p1", " hi ");
    expect(repo.addComment).toHaveBeenCalledWith("p1", "hi");
  });
});

// ── toggle-pin-mock use-case (AC-1909.1) ────────────────────────────────────
describe("TogglePinMockUseCase", () => {
  it("calls togglePinMock, never any HTTP-shaped method", async () => {
    const repo = makeRepo();
    await new TogglePinMockUseCase(repo).execute("p1", true);
    expect(repo.togglePinMock).toHaveBeenCalledWith("p1", true);
    expect(repo.getFeed).not.toHaveBeenCalled();
    expect(repo.createPost).not.toHaveBeenCalled();
    expect(repo.setReaction).not.toHaveBeenCalled();
  });
});
