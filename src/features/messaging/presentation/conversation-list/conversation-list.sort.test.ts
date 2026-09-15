import { describe, expect, it } from "vitest";
import type { ConversationEntity } from "@/features/messaging/domain/entities/conversation.entity";
import { sortConversations } from "./conversation-list.sort";

const conv = (
  id: string,
  lastMessageAt?: string,
  type: ConversationEntity["type"] = "direct",
): ConversationEntity => ({
  id,
  type,
  name: `Hội thoại ${id}`,
  avatarInitials: id.toUpperCase(),
  color: "primary",
  lastMessage: "…",
  lastMessageTime: "10:15",
  lastMessageAt,
  unreadCount: 0,
});

const ids = (list: ConversationEntity[]) => list.map((c) => c.id);

describe("sortConversations (US-E24.15)", () => {
  it("sorts by lastMessageAt descending (newest first)", () => {
    const list = [
      conv("a", "2026-09-13T11:00:00.000Z"),
      conv("b", "2026-09-15T14:37:00.000Z"),
      conv("c", "2026-09-14T09:20:00.000Z"),
    ];
    expect(ids(sortConversations(list))).toEqual(["b", "c", "a"]);
  });

  it("interleaves direct and group rows purely by time", () => {
    const list = [
      conv("d1", "2026-09-13T08:00:00.000Z"),
      conv("g1", "2026-09-15T08:00:00.000Z", "group"),
      conv("d2", "2026-09-14T08:00:00.000Z"),
      conv("g2", "2026-09-12T08:00:00.000Z", "group"),
    ];
    expect(ids(sortConversations(list))).toEqual(["g1", "d2", "d1", "g2"]);
  });

  it("ranks a row WITH a timestamp above one without", () => {
    const list = [conv("noTime"), conv("withTime", "2020-01-01T00:00:00.000Z")];
    expect(ids(sortConversations(list))).toEqual(["withTime", "noTime"]);
  });

  it("keeps the original relative order of rows without a timestamp", () => {
    const list = [conv("x"), conv("y"), conv("z")];
    expect(ids(sortConversations(list))).toEqual(["x", "y", "z"]);
  });

  it("keeps the original relative order of rows with identical timestamps", () => {
    const at = "2026-09-15T10:00:00.000Z";
    const list = [conv("p", at), conv("q", at), conv("r", at)];
    expect(ids(sortConversations(list))).toEqual(["p", "q", "r"]);
  });

  it("is deterministic — sorting the same input twice yields the same order", () => {
    const list = [
      conv("a", "2026-09-15T10:00:00.000Z"),
      conv("b"),
      conv("c", "2026-09-15T10:00:00.000Z", "group"),
      conv("d", "2026-09-16T10:00:00.000Z"),
      conv("e"),
    ];
    expect(ids(sortConversations(list))).toEqual(ids(sortConversations(list)));
    expect(ids(sortConversations(list))).toEqual(["d", "a", "c", "b", "e"]);
  });

  it("does not mutate the input array", () => {
    const list = [
      conv("a", "2026-09-13T00:00:00.000Z"),
      conv("b", "2026-09-15T00:00:00.000Z"),
    ];
    sortConversations(list);
    expect(ids(list)).toEqual(["a", "b"]);
  });

  it("treats an unparsable timestamp as missing (no NaN scrambling)", () => {
    const list = [
      conv("bad", "not-a-date"),
      conv("good", "2020-01-01T00:00:00.000Z"),
    ];
    expect(ids(sortConversations(list))).toEqual(["good", "bad"]);
  });
});
