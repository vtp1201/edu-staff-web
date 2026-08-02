import { describe, expect, it } from "vitest";
import type { FeedCommentResponseDto } from "../dtos/feed-comment-response.dto";
import type {
  FeedPageResponseDto,
  FeedPostResponseDto,
} from "../dtos/feed-post-response.dto";
import { FeedMapper } from "./feed.mapper";

/**
 * US-E18.31 — the DTOs below are the REAL `social` wire shapes, read verbatim
 * from `edu-api/services/social/docs/openapi.yaml` (`Post`, `Comment`,
 * `FeedPage`, `Media`), NOT the invented INT-190 shapes US-E19.1 mocked
 * against. `authorName`/`authorRole`/`avatarUrl` are the US-165 additions.
 */
describe("FeedMapper.toPostEntity — real `Post` wire shape", () => {
  const base: FeedPostResponseDto = {
    id: "p1",
    authorUserId: "a1",
    scope: "SCHOOL",
    tenantId: "t1",
    classId: null,
    clubId: null,
    textBody: "hi",
    linkUrl: null,
    reactionCount: 0,
    callerReaction: null,
    commentCount: 0,
    isPinned: false,
    createdAt: "2026-07-11T09:15:00.000Z",
    authorName: "Nguyễn Thị Hương",
    authorRole: "TEACHER",
    avatarUrl: null,
  };

  it("maps the real field names (id/textBody/isPinned/authorUserId)", () => {
    const e = FeedMapper.toPostEntity(base);
    expect(e.postId).toBe("p1");
    expect(e.authorId).toBe("a1");
    expect(e.content).toBe("hi");
    expect(e.pinned).toBe(false);
    expect(e.scope).toBe("school");
    expect(e.classId).toBeUndefined();
  });

  it("maps the US-165 denormalized author identity", () => {
    const e = FeedMapper.toPostEntity(base);
    expect(e.authorName).toBe("Nguyễn Thị Hương");
    expect(e.authorRole).toBe("teacher");
    expect(e.authorAvatarInitials).toBe("NH");
  });

  it("keeps identity NULL for a pre-migration-035 post (no invented name)", () => {
    const e = FeedMapper.toPostEntity({
      ...base,
      authorName: null,
      authorRole: null,
    });
    expect(e.authorName).toBeNull();
    expect(e.authorRole).toBeNull();
    // Initials fall back to "?" — presentation renders the i18n unknown-author
    // label next to it; never an empty avatar.
    expect(e.authorAvatarInitials).toBe("?");
  });

  it("maps an absent authorName/authorRole (field omitted entirely) to null", () => {
    const { authorName, authorRole, ...withoutIdentity } = base;
    void authorName;
    void authorRole;
    const e = FeedMapper.toPostEntity(withoutIdentity);
    expect(e.authorName).toBeNull();
    expect(e.authorRole).toBeNull();
  });

  it("maps IAM member roles the feed can display, and NULLs the ones it cannot", () => {
    const roleOf = (raw: string | null) =>
      FeedMapper.toPostEntity({ ...base, authorRole: raw }).authorRole;
    expect(roleOf("TEACHER")).toBe("teacher");
    expect(roleOf("STUDENT")).toBe("student");
    expect(roleOf("PARENT")).toBe("parent");
    // ADMIN/MANAGER/STAFF have no feed badge — the feed's display vocabulary
    // (teacher/principal/student/parent) is NOT IAM's member-role vocabulary.
    // Null = "no badge", never a wrong badge (US-E18.31 finding, flagged).
    expect(roleOf("ADMIN")).toBeNull();
    expect(roleOf("MANAGER")).toBeNull();
    expect(roleOf("STAFF")).toBeNull();
    expect(roleOf("something-else")).toBeNull();
  });

  it("NEVER reads avatarUrl (US-165 reserves it but it is always null)", () => {
    const e = FeedMapper.toPostEntity({
      ...base,
      avatarUrl: "https://example.test/a.png",
    });
    expect(e).not.toHaveProperty("authorAvatarUrl");
    expect(e.authorAvatarInitials).toBe("NH");
  });

  it("keeps classId only for CLASS scope (wire scope is UPPERCASE)", () => {
    const e = FeedMapper.toPostEntity({
      ...base,
      scope: "CLASS",
      classId: "11A2",
    });
    expect(e.scope).toBe("class");
    expect(e.classId).toBe("11A2");
  });

  it("maps CLUB scope onto school (the feed screen has no club surface)", () => {
    expect(FeedMapper.toPostEntity({ ...base, scope: "CLUB" }).scope).toBe(
      "school",
    );
  });

  it("appends linkUrl to the body rather than dropping it", () => {
    const e = FeedMapper.toPostEntity({
      ...base,
      linkUrl: "https://truong.example/thongbao",
    });
    expect(e.content).toBe("hi\nhttps://truong.example/thongbao");
  });

  it("zeroes reactions — the real emoji taxonomy is NOT remapped (gap #2)", () => {
    const e = FeedMapper.toPostEntity({
      ...base,
      reactionCount: 12,
      callerReaction: "haha",
    });
    expect(e.reactions).toEqual({
      counts: { like: 0, love: 0, celebrate: 0, clap: 0 },
      myReaction: null,
    });
  });

  it("does not surface a real media attachment (gap #3, no render pipeline)", () => {
    const e = FeedMapper.toPostEntity({
      ...base,
      media: {
        mediaId: "m1",
        url: "https://s3.example/presigned",
        expiresAt: "2026-07-11T09:30:00.000Z",
      },
    });
    expect(e.attachments).toEqual([]);
  });

  it("maps isPinned + commentCount", () => {
    const e = FeedMapper.toPostEntity({
      ...base,
      isPinned: true,
      commentCount: 4,
    });
    expect(e.pinned).toBe(true);
    expect(e.commentCount).toBe(4);
  });
});

describe("FeedMapper.toPosts — FeedPage (`{posts, pinnedPost}`) assembly", () => {
  const post = (id: string, isPinned = false): FeedPostResponseDto => ({
    id,
    authorUserId: "a1",
    scope: "SCHOOL",
    tenantId: "t1",
    classId: null,
    clubId: null,
    textBody: id,
    linkUrl: null,
    reactionCount: 0,
    callerReaction: null,
    commentCount: 0,
    isPinned,
    createdAt: "2026-07-11T09:15:00.000Z",
    authorName: "A B",
    authorRole: "TEACHER",
    avatarUrl: null,
  });

  it("returns the chronological page when nothing is pinned", () => {
    const page: FeedPageResponseDto = {
      posts: [post("p1"), post("p2")],
      pinnedPost: null,
    };
    expect(FeedMapper.toPosts(page).map((p) => p.postId)).toEqual(["p1", "p2"]);
  });

  it("prepends a pinnedPost that is NOT in the chronological page", () => {
    const page: FeedPageResponseDto = {
      posts: [post("p1"), post("p2")],
      pinnedPost: post("p9", true),
    };
    expect(FeedMapper.toPosts(page).map((p) => p.postId)).toEqual([
      "p9",
      "p1",
      "p2",
    ]);
  });

  it("dedupes a pinnedPost that already appears in the page", () => {
    const page: FeedPageResponseDto = {
      posts: [post("p1", true), post("p2")],
      pinnedPost: post("p1", true),
    };
    expect(FeedMapper.toPosts(page).map((p) => p.postId)).toEqual(["p1", "p2"]);
  });

  it("tolerates a null/absent data payload", () => {
    expect(FeedMapper.toPosts(null)).toEqual([]);
    expect(FeedMapper.toPosts({ posts: [] })).toEqual([]);
  });
});

describe("FeedMapper.toCommentEntity — real `Comment` wire shape", () => {
  const base: FeedCommentResponseDto = {
    id: "c1",
    postId: "p1",
    authorUserId: "a1",
    text: "hay quá",
    createdAt: "2026-07-11T09:20:00.000Z",
    authorName: "Trần Minh Quân",
    authorRole: "PARENT",
    avatarUrl: null,
  };

  it("maps id/text/authorUserId + the US-165 identity", () => {
    const e = FeedMapper.toCommentEntity(base);
    expect(e).toEqual({
      commentId: "c1",
      postId: "p1",
      authorId: "a1",
      authorName: "Trần Minh Quân",
      authorRole: "parent",
      authorAvatarInitials: "TQ",
      content: "hay quá",
      createdAt: "2026-07-11T09:20:00.000Z",
    });
  });

  it("keeps identity null for a pre-migration-035 comment", () => {
    const e = FeedMapper.toCommentEntity({
      ...base,
      authorName: null,
      authorRole: null,
    });
    expect(e.authorName).toBeNull();
    expect(e.authorRole).toBeNull();
    expect(e.authorAvatarInitials).toBe("?");
  });
});
