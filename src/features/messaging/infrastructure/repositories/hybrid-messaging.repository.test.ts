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
      // US-E18.52 — contacts MOVED to the real slice: IAM's directory list now
      // serves a narrowed tier to STUDENT/PARENT callers (ADR 0129), so the
      // ADR 0060 force-mock is retired for this method only.
      getContacts: vi.fn().mockResolvedValue(ok([])),
      // US-E18.51 — the pin slice moved from force-mock to real (BE US-192).
      pinMessage: vi.fn().mockResolvedValue(ok(true)),
      unpinMessage: vi.fn().mockResolvedValue(ok(true)),
      getPinnedMessages: vi.fn().mockResolvedValue(ok([])),
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
    await hybrid.pinMessage("r1", "m1");
    await hybrid.unpinMessage("r1", "m1");
    await hybrid.getPinnedMessages("r1");
    await hybrid.getContacts();

    expect(realFns.getConversations).toHaveBeenCalled();
    expect(realFns.getContacts).toHaveBeenCalled();
    expect(realFns.getMessages).toHaveBeenCalledWith("r1", undefined);
    expect(realFns.sendMessage).toHaveBeenCalledWith("r1", "hi");
    expect(realFns.deleteMessage).toHaveBeenCalledWith("r1", "m1");
    expect(realFns.createConversation).toHaveBeenCalledWith(["t1"], undefined);
    expect(realFns.markConversationRead).toHaveBeenCalledWith("r1");
    expect(realFns.sendTypingIndicator).toHaveBeenCalledWith("r1", true);
    expect(realFns.pinMessage).toHaveBeenCalledWith("r1", "m1");
    expect(realFns.unpinMessage).toHaveBeenCalledWith("r1", "m1");
    expect(realFns.getPinnedMessages).toHaveBeenCalledWith("r1");
  });

  it("never routes the pin slice to the mock once it is real (US-E18.51)", async () => {
    const mockFns = {
      pinMessage: vi.fn(),
      unpinMessage: vi.fn(),
      getPinnedMessages: vi.fn(),
    };
    const hybrid = new HybridMessagingRepository(
      makeMessagingRepo({
        pinMessage: vi.fn().mockResolvedValue(ok(true)),
        unpinMessage: vi.fn().mockResolvedValue(ok(true)),
        getPinnedMessages: vi.fn().mockResolvedValue(ok([])),
      }),
      makeMessagingRepo(mockFns),
    );

    await hybrid.pinMessage("r1", "m1");
    await hybrid.unpinMessage("r1", "m1");
    await hybrid.getPinnedMessages("r1");

    for (const fn of Object.values(mockFns)) expect(fn).not.toHaveBeenCalled();
  });

  // US-E18.50 — BE US-193 (ADR 0132) shipped create + archive ONLY. The split
  // inside the 7-method group-lifecycle slice is the whole point of this story,
  // so it is asserted method by method, in both directions.
  it("routes the two US-193 group methods (create + archive) to the REAL repo", async () => {
    const realFns = {
      createGroup: vi.fn().mockResolvedValue(ok({})),
      deleteGroup: vi.fn().mockResolvedValue(ok(true)),
    };
    const mockFns = { createGroup: vi.fn(), deleteGroup: vi.fn() };
    const hybrid = new HybridMessagingRepository(
      makeMessagingRepo(realFns),
      makeMessagingRepo(mockFns),
    );

    await hybrid.createGroup({ name: "Tổ Toán" });
    await hybrid.deleteGroup("g1");

    expect(realFns.createGroup).toHaveBeenCalledWith({ name: "Tổ Toán" });
    expect(realFns.deleteGroup).toHaveBeenCalledWith("g1");
    expect(mockFns.createGroup).not.toHaveBeenCalled();
    expect(mockFns.deleteGroup).not.toHaveBeenCalled();
  });

  it("routes the permanently-mock slice to the MOCK repo (never the real one)", async () => {
    const mockFns = {
      getGroup: vi.fn().mockResolvedValue(ok({})),
      updateGroup: vi.fn().mockResolvedValue(ok({})),
      addGroupMembers: vi.fn().mockResolvedValue(ok({})),
      removeGroupMember: vi.fn().mockResolvedValue(ok({})),
      leaveGroup: vi.fn().mockResolvedValue(ok(true)),
    };
    const realFns = {
      getGroup: vi.fn(),
      updateGroup: vi.fn(),
      addGroupMembers: vi.fn(),
      removeGroupMember: vi.fn(),
      leaveGroup: vi.fn(),
    };
    const hybrid = new HybridMessagingRepository(
      makeMessagingRepo(realFns),
      makeMessagingRepo(mockFns),
    );

    await hybrid.getGroup("g1");
    await hybrid.updateGroup({ groupId: "g1" });
    await hybrid.addGroupMembers("g1", ["u"]);
    await hybrid.removeGroupMember("g1", "u");
    await hybrid.leaveGroup("g1");

    for (const fn of Object.values(mockFns)) expect(fn).toHaveBeenCalled();
    for (const fn of Object.values(realFns)) expect(fn).not.toHaveBeenCalled();
  });
});
