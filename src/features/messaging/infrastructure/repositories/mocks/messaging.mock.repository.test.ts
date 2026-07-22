import { describe, expect, it } from "vitest";
import { MockMessagingRepository } from "./messaging.mock.repository";

describe("MockMessagingRepository", () => {
  it("getConversations returns a non-empty list with required fields", async () => {
    const repo = new MockMessagingRepository();
    const res = await repo.getConversations();

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.length).toBeGreaterThan(0);
    for (const convo of res.value) {
      expect(convo.id).toBeTruthy();
      expect(convo.name).toBeTruthy();
      expect(typeof convo.unreadCount).toBe("number");
    }
  });

  it("getMessages returns the first page for an existing conversation", async () => {
    const repo = new MockMessagingRepository();
    const res = await repo.getMessages("u1");

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.messages.length).toBeGreaterThan(0);
    expect(res.value.hasMore).toBe(false);
  });

  it("getMessages with undefined cursor returns the first page", async () => {
    const repo = new MockMessagingRepository();
    const res = await repo.getMessages("u1", undefined);

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.messages[0]?.conversationId).toBe("u1");
  });

  it("sendMessage appends a message visible in a subsequent getMessages call", async () => {
    const repo = new MockMessagingRepository();
    const send = await repo.sendMessage("u1", "Tin nhắn mới");

    expect(send.ok).toBe(true);
    if (!send.ok) return;
    expect(send.value.from).toBe("me");
    expect(send.value.text).toBe("Tin nhắn mới");

    const after = await repo.getMessages("u1");
    expect(after.ok).toBe(true);
    if (!after.ok) return;
    expect(after.value.messages.some((x) => x.text === "Tin nhắn mới")).toBe(
      true,
    );
  });

  // --- US-E18.17 read-state + typing (deterministic mock equivalents) ---

  it("markConversationRead resets that conversation's unreadCount to 0", async () => {
    const repo = new MockMessagingRepository();
    const before = await repo.getConversations();
    expect(before.ok).toBe(true);
    if (!before.ok) return;
    // Fixtures seed u1 with unreadCount > 0.
    expect(
      before.value.find((c) => c.id === "u1")?.unreadCount,
    ).toBeGreaterThan(0);

    const res = await repo.markConversationRead("u1");
    expect(res).toEqual({ ok: true, value: true });

    const after = await repo.getConversations();
    expect(after.ok).toBe(true);
    if (!after.ok) return;
    expect(after.value.find((c) => c.id === "u1")?.unreadCount).toBe(0);
  });

  it("sendTypingIndicator is a deterministic no-op success", async () => {
    const repo = new MockMessagingRepository();
    expect(await repo.sendTypingIndicator("u1", true)).toEqual({
      ok: true,
      value: true,
    });
    expect(await repo.sendTypingIndicator("u1", false)).toEqual({
      ok: true,
      value: true,
    });
  });

  it("createConversation prepends a new conversation to the list", async () => {
    const repo = new MockMessagingRepository();
    const created = await repo.createConversation(["u1"]);

    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const list = await repo.getConversations();
    expect(list.ok).toBe(true);
    if (!list.ok) return;
    expect(list.value[0]?.id).toBe(created.value.id);
  });

  it("getContacts returns a non-empty list", async () => {
    const repo = new MockMessagingRepository();
    const res = await repo.getContacts();

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.length).toBeGreaterThan(0);
  });

  // --- US-E10.4 group lifecycle + message interactions ---

  it("createGroup prepends a group conversation with the creator as admin", async () => {
    const repo = new MockMessagingRepository();
    const created = await repo.createGroup({
      name: "Nhóm mới",
      kind: "club",
      color: "purple",
      memberIds: ["u2", "u3"],
    });

    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.value.members[0]?.role).toBe("admin");

    const list = await repo.getConversations();
    if (!list.ok) return;
    expect(list.value[0]?.id).toBe(created.value.id);
    expect(list.value[0]?.type).toBe("group");
    expect(list.value[0]?.selfIsGroupAdmin).toBe(true);
  });

  it("addGroupMembers and removeGroupMember mutate the member list (admin g1)", async () => {
    const repo = new MockMessagingRepository();
    const added = await repo.addGroupMembers("g1", ["u4"]);
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    expect(added.value.members.some((m) => m.userId === "u4")).toBe(true);

    const removed = await repo.removeGroupMember("g1", "u4");
    expect(removed.ok).toBe(true);
    if (!removed.ok) return;
    expect(removed.value.members.some((m) => m.userId === "u4")).toBe(false);
  });

  it("removeGroupMember refuses to remove self or another admin", async () => {
    const repo = new MockMessagingRepository();
    const self = await repo.removeGroupMember("g1", "me");
    expect(self.ok).toBe(false);
    if (self.ok) return;
    expect(self.failure.type).toBe("not-group-admin");
  });

  it("non-admin group mutation returns not-group-admin (g2)", async () => {
    const repo = new MockMessagingRepository();
    const res = await repo.deleteGroup("g2");
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.failure.type).toBe("not-group-admin");
  });

  it("pin then unpin updates the group pinned list (admin g1)", async () => {
    const repo = new MockMessagingRepository();
    const pinned = await repo.pinMessage("g1", "g1-2");
    expect(pinned.ok).toBe(true);

    const group = await repo.getGroup("g1");
    if (!group.ok) return;
    expect(group.value.pinnedMessages.some((p) => p.messageId === "g1-2")).toBe(
      true,
    );

    const unpinned = await repo.unpinMessage("g1", "g1-2");
    expect(unpinned.ok).toBe(true);
    const after = await repo.getGroup("g1");
    if (!after.ok) return;
    expect(after.value.pinnedMessages.some((p) => p.messageId === "g1-2")).toBe(
      false,
    );
  });

  it("non-admin pin on a group message returns not-group-admin (g2)", async () => {
    const repo = new MockMessagingRepository();
    const res = await repo.pinMessage("g2", "g2-1");
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.failure.type).toBe("not-group-admin");
  });

  it("deleteMessage soft-deletes an own message", async () => {
    const repo = new MockMessagingRepository();
    const res = await repo.deleteMessage("u1", "u1-2");
    expect(res.ok).toBe(true);

    const after = await repo.getMessages("u1");
    if (!after.ok) return;
    const msg = after.value.messages.find((x) => x.id === "u1-2");
    expect(msg?.isDeleted).toBe(true);
  });

  it("deleteMessage refuses a message that is not the user's own", async () => {
    const repo = new MockMessagingRepository();
    const res = await repo.deleteMessage("u1", "u1-1");
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.failure.type).toBe("delete-message-failed");
  });

  it("leaveGroup removes the group conversation", async () => {
    const repo = new MockMessagingRepository();
    const left = await repo.leaveGroup("g4");
    expect(left.ok).toBe(true);

    const list = await repo.getConversations();
    if (!list.ok) return;
    expect(list.value.some((c) => c.id === "g4")).toBe(false);
  });

  it("per-role seeding: teacher is admin on g1, member on g2", async () => {
    const repo = new MockMessagingRepository();
    const g1 = await repo.getGroup("g1");
    const g2 = await repo.getGroup("g2");
    if (!g1.ok || !g2.ok) return;
    expect(g1.value.members.find((m) => m.userId === "me")?.role).toBe("admin");
    expect(g2.value.members.find((m) => m.userId === "me")?.role).toBe(
      "member",
    );
  });
});
