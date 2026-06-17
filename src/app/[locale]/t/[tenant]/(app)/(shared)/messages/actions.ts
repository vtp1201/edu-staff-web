"use server";

import {
  makeCreateConversationUseCase,
  makeGetMessagesUseCase,
  makeSendMessageUseCase,
} from "@/bootstrap/di";
import type {
  CreateConversationResult,
  GetMessagesResult,
  SendMessageResult,
} from "@/features/messaging/presentation/messaging-screen";

export async function sendMessageAction(
  conversationId: string,
  text: string,
): Promise<SendMessageResult> {
  const useCase = await makeSendMessageUseCase();
  const result = await useCase.execute(conversationId, text);
  return result.ok
    ? { ok: true, value: result.value }
    : { ok: false, errorKey: result.failure.type };
}

export async function createConversationAction(
  contactIds: string[],
  name?: string,
): Promise<CreateConversationResult> {
  const useCase = await makeCreateConversationUseCase();
  const result = await useCase.execute(contactIds, name);
  return result.ok
    ? { ok: true, value: result.value }
    : { ok: false, errorKey: result.failure.type };
}

export async function getMessagesAction(
  conversationId: string,
): Promise<GetMessagesResult> {
  const useCase = await makeGetMessagesUseCase();
  const result = await useCase.execute(conversationId);
  return result.ok
    ? { ok: true, value: result.value.messages }
    : { ok: false, errorKey: result.failure.type };
}
