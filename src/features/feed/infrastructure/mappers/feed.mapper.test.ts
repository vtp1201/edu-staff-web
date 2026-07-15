import { describe, expect, it } from "vitest";
import type { FeedPostResponseDto } from "../dtos/feed-post-response.dto";
import { FeedMapper } from "./feed.mapper";

describe("FeedMapper.toPostEntity", () => {
  const base: FeedPostResponseDto = {
    postId: "p1",
    authorId: "a1",
    authorName: "Nguyễn Thị Hương",
    authorRole: "TEACHER",
    scope: "school",
    content: "hi",
    createdAt: "2026-07-11T09:15:00.000Z",
  };

  it("defaults pinned=false, myReaction=null, zeroed counts, commentCount=0", () => {
    const e = FeedMapper.toPostEntity(base);
    expect(e.pinned).toBe(false);
    expect(e.reactions.myReaction).toBeNull();
    expect(e.reactions.counts).toEqual({
      like: 0,
      love: 0,
      celebrate: 0,
      clap: 0,
    });
    expect(e.commentCount).toBe(0);
    expect(e.classId).toBeUndefined();
  });

  it("derives avatar initials from the display name when omitted", () => {
    expect(FeedMapper.toPostEntity(base).authorAvatarInitials).toBe("NH");
  });

  it("keeps classId only for class scope", () => {
    const e = FeedMapper.toPostEntity({
      ...base,
      scope: "class",
      classId: "11A2",
    });
    expect(e.scope).toBe("class");
    expect(e.classId).toBe("11A2");
  });

  it("maps a single attachmentUrl into the attachments array", () => {
    const e = FeedMapper.toPostEntity({
      ...base,
      attachmentUrl: "mock://x",
    });
    expect(e.attachments).toHaveLength(1);
    expect(e.attachments[0].label).toBe("mock://x");
  });

  it("normalizes reaction counts to all four keys", () => {
    const e = FeedMapper.toPostEntity({
      ...base,
      reactions: { counts: { like: 5, celebrate: 2 }, myReaction: "like" },
    });
    expect(e.reactions).toEqual({
      counts: { like: 5, love: 0, celebrate: 2, clap: 0 },
      myReaction: "like",
    });
  });

  it("maps unknown BE roles to teacher (safe default)", () => {
    expect(
      FeedMapper.toPostEntity({ ...base, authorRole: "ADMIN" }).authorRole,
    ).toBe("teacher");
    expect(
      FeedMapper.toPostEntity({ ...base, authorRole: "parent" }).authorRole,
    ).toBe("parent");
  });
});
