import { vi } from "vitest";
import type { IMessagingRepository } from "../repositories/i-messaging.repository";

/** Builds a fully-stubbed messaging repository for use-case unit tests. */
export function makeMessagingRepo(
  over: Partial<IMessagingRepository> = {},
): IMessagingRepository {
  return {
    getConversations: vi.fn(),
    getMessages: vi.fn(),
    sendMessage: vi.fn(),
    createConversation: vi.fn(),
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
    deleteMessage: vi.fn(),
    ...over,
  };
}
