import { describe, expect, it } from "vitest";
import type { GroupMemberResponseDto } from "../dtos/group-member-response.dto";
import { toGroupMember } from "./group.mapper";

describe("group.mapper — toGroupMember", () => {
  const base: GroupMemberResponseDto = {
    userId: "u-b1",
    name: "Trần Văn Bình",
    initials: "TB",
    color: "teal",
    role: "member",
    isOnline: true,
  };

  it("maps the core member fields", () => {
    expect(toGroupMember(base)).toEqual({
      userId: "u-b1",
      name: "Trần Văn Bình",
      initials: "TB",
      color: "teal",
      role: "member",
      isOnline: true,
    });
  });

  // US-E10.6 — additive presence passthrough.
  it("carries presence/lastActiveAt when present on the DTO", () => {
    const member = toGroupMember({
      ...base,
      presence: "recent",
      lastActiveAt: "2026-07-14T09:57:00Z",
    });
    expect(member.presence).toBe("recent");
    expect(member.lastActiveAt).toBe("2026-07-14T09:57:00Z");
  });

  it("leaves presence/lastActiveAt undefined when absent (never defaults)", () => {
    const member = toGroupMember(base);
    expect(member.presence).toBeUndefined();
    expect(member.lastActiveAt).toBeUndefined();
  });
});
