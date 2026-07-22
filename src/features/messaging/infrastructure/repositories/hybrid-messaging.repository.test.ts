import { describe, expect, it, vi } from "vitest";
import { makeMessagingRepo } from "@/features/messaging/domain/use-cases/group-test-utils";
import { ok } from "@/features/messaging/domain/use-cases/result";
import { HybridMessagingRepository } from "./hybrid-messaging.repository";

describe("HybridMessagingRepository (ADR 0060 partial-real wiring)", () => {
  it("routes the wired slice to the REAL repo", async () => {
    const realFns = {
      getConversations: vi.fn().mockResolvedValue(ok([])),
      getMessages: vi
        .fn()
        .mockResolvedValue(ok({ messages: [], hasMore: false })),
      sendMessage: vi.fn().mockResolvedValue(ok({})),
      deleteMessage: vi.fn().mockResolvedValue(ok(true)),
      createConversation: vi.fn().mockResolvedValue(ok({})),
      markConversationRead: vi.fn().mockResolvedValue(ok(true)),
      sendTypingIndicator: vi.fn().mockResolvedValue(ok(true)),
    };
    const real = makeMessagingRepo(realFns);
    const mock = makeMessagingRepo();
    const hybrid = new HybridMessagingRepository(real, mock);

    await hybrid.getConversations();
    await hybrid.getMessages("r1");
    await hybrid.sendMessage("r1", "hi");
    await hybrid.deleteMessage("r1", "m1");
    await hybrid.createConversation(["t1"]);
    await hybrid.markConversationRead("r1");
    await hybrid.sendTypingIndicator("r1", true);

    expect(realFns.getConversations).toHaveBeenCalled();
    expect(realFns.getMessages).toHaveBeenCalledWith("r1", undefined);
    expect(realFns.sendMessage).toHaveBeenCalledWith("r1", "hi");
    expect(realFns.deleteMessage).toHaveBeenCalledWith("r1", "m1");
    expect(realFns.createConversation).toHaveBeenCalledWith(["t1"], undefined);
    expect(realFns.markConversationRead).toHaveBeenCalledWith("r1");
    expect(realFns.sendTypingIndicator).toHaveBeenCalledWith("r1", true);
  });

  it("routes the permanently-mock slice to the MOCK repo (never the real one)", async () => {
    const mockFns = {
      getContacts: vi.fn().mockResolvedValue(ok([])),
      createGroup: vi.fn().mockResolvedValue(ok({})),
      getGroup: vi.fn().mockResolvedValue(ok({})),
      updateGroup: vi.fn().mockResolvedValue(ok({})),
      addGroupMembers: vi.fn().mockResolvedValue(ok({})),
      removeGroupMember: vi.fn().mockResolvedValue(ok({})),
      leaveGroup: vi.fn().mockResolvedValue(ok(true)),
      deleteGroup: vi.fn().mockResolvedValue(ok(true)),
      pinMessage: vi.fn().mockResolvedValue(ok(true)),
      unpinMessage: vi.fn().mockResolvedValue(ok(true)),
    };
    const realFns = {
      getContacts: vi.fn(),
      createGroup: vi.fn(),
      getGroup: vi.fn(),
      updateGroup: vi.fn(),
      addGroupMembers: vi.fn(),
      removeGroupMember: vi.fn(),
      leaveGroup: vi.fn(),
      deleteGroup: vi.fn(),
      pinMessage: vi.fn(),
      unpinMessage: vi.fn(),
    };
    const hybrid = new HybridMessagingRepository(
      makeMessagingRepo(realFns),
      makeMessagingRepo(mockFns),
    );

    await hybrid.getContacts();
    await hybrid.createGroup({
      name: "n",
      kind: "class",
      color: "primary",
      memberIds: [],
    });
    await hybrid.getGroup("g1");
    await hybrid.updateGroup({ groupId: "g1" });
    await hybrid.addGroupMembers("g1", ["u"]);
    await hybrid.removeGroupMember("g1", "u");
    await hybrid.leaveGroup("g1");
    await hybrid.deleteGroup("g1");
    await hybrid.pinMessage("g1", "m1");
    await hybrid.unpinMessage("g1", "m1");

    for (const fn of Object.values(mockFns)) expect(fn).toHaveBeenCalled();
    for (const fn of Object.values(realFns)) expect(fn).not.toHaveBeenCalled();
  });
});
