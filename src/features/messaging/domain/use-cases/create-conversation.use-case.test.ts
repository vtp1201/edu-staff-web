import { describe, expect, it, vi } from "vitest";
import type { ConversationEntity } from "../entities/conversation.entity";
import type { IMessagingRepository } from "../repositories/i-messaging.repository";
import { CreateConversationUseCase } from "./create-conversation.use-case";
import { ok } from "./result";

const conversation: ConversationEntity = {
  id: "c-new",
  type: "direct",
  name: "Trần Minh Quân",
  avatarInitials: "TQ",
  color: "success",
  lastMessage: "",
  lastMessageTime: "",
  unreadCount: 0,
  isOnline: true,
};

function makeRepo(
  over: Partial<IMessagingRepository> = {},
): IMessagingRepository {
  return {
    getConversations: vi.fn(),
    getMessages: vi.fn(),
    sendMessage: vi.fn(),
    createConversation: vi.fn(),
    getContacts: vi.fn(),
    ...over,
  };
}

describe("CreateConversationUseCase", () => {
  it("delegates to the repo and returns the new conversation for a valid contact", async () => {
    const createConversation = vi.fn().mockResolvedValue(ok(conversation));
    const useCase = new CreateConversationUseCase(
      makeRepo({ createConversation }),
    );

    const res = await useCase.execute(["u1"]);

    expect(createConversation).toHaveBeenCalledWith(["u1"], undefined);
    expect(res).toEqual({ ok: true, value: conversation });
  });

  it("fails with create-conversation-failed for empty contactIds without calling the repo", async () => {
    const createConversation = vi.fn();
    const useCase = new CreateConversationUseCase(
      makeRepo({ createConversation }),
    );

    const res = await useCase.execute([]);

    expect(res).toEqual({
      ok: false,
      failure: { type: "create-conversation-failed" },
    });
    expect(createConversation).not.toHaveBeenCalled();
  });
});
