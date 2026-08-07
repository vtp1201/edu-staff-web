import { describe, expect, it } from "vitest";
import type { CreateGroupRoomResponseDto } from "../dtos/create-group-room-response.dto";
import type { GroupMemberResponseDto } from "../dtos/group-member-response.dto";
import { toGroupEntityFromCreatedRoom, toGroupMember } from "./group.mapper";

describe("group.mapper — toGroupEntityFromCreatedRoom (US-E18.50 / BE US-193)", () => {
  const dto: CreateGroupRoomResponseDto = {
    roomId: "room-abc",
    scope: "SCHOOL",
    tenantId: "t-1",
    roomType: "custom",
    name: "Tổ Toán",
    status: "active",
    createdAt: "2026-08-03T02:00:00.000Z",
  };

  it("maps the room id onto BOTH the group id and the conversation id", () => {
    const group = toGroupEntityFromCreatedRoom(dto);
    expect(group.id).toBe("room-abc");
    expect(group.conversationId).toBe("room-abc");
  });

  it("leaves members EMPTY — the 201 does not echo membership", () => {
    expect(toGroupEntityFromCreatedRoom(dto).members).toEqual([]);
  });

  it("does not invent a description or a kind the wire has no column for", () => {
    const group = toGroupEntityFromCreatedRoom(dto);
    expect(group.description).toBe("");
    expect(group.kind).toBe("other");
  });

  it("derives a stable semantic colour tone from the room id (never a raw colour)", () => {
    const a = toGroupEntityFromCreatedRoom(dto).color;
    const b = toGroupEntityFromCreatedRoom(dto).color;
    expect(a).toBe(b);
    expect(a).toMatch(/^(primary|success|warning|error|info|purple|teal)$/);
  });
});

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
