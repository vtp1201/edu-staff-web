import { describe, expect, it, vi } from "vitest";
import type { MessageEntity } from "../entities/message.entity";
import type { IMessagingRepository } from "../repositories/i-messaging.repository";
import { ok } from "./result";
import { SendMessageUseCase } from "./send-message.use-case";

const message: MessageEntity = {
  id: "m-1",
  conversationId: "u1",
  from: "me",
  text: "Xin chào",
  time: "08:30",
  date: "Hôm nay",
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

describe("SendMessageUseCase", () => {
  it("delegates to the repo and returns the sent message for valid text", async () => {
    const sendMessage = vi.fn().mockResolvedValue(ok(message));
    const useCase = new SendMessageUseCase(makeRepo({ sendMessage }));

    const res = await useCase.execute("u1", "Xin chào");

    expect(sendMessage).toHaveBeenCalledWith("u1", "Xin chào");
    expect(res).toEqual({ ok: true, value: message });
  });

  it("fails with send-message-failed for empty text without calling the repo", async () => {
    const sendMessage = vi.fn();
    const useCase = new SendMessageUseCase(makeRepo({ sendMessage }));

    const res = await useCase.execute("u1", "   ");

    expect(res).toEqual({
      ok: false,
      failure: { type: "send-message-failed" },
    });
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("fails with send-message-failed when text exceeds 2000 chars without calling the repo", async () => {
    const sendMessage = vi.fn();
    const useCase = new SendMessageUseCase(makeRepo({ sendMessage }));

    const res = await useCase.execute("u1", "a".repeat(2001));

    expect(res).toEqual({
      ok: false,
      failure: { type: "send-message-failed" },
    });
    expect(sendMessage).not.toHaveBeenCalled();
  });
});
