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
});
