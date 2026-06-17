import "server-only";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { IMessagingRepository } from "@/features/messaging/domain/repositories/i-messaging.repository";
import { CreateConversationUseCase } from "@/features/messaging/domain/use-cases/create-conversation.use-case";
import { GetContactsUseCase } from "@/features/messaging/domain/use-cases/get-contacts.use-case";
import { GetConversationsUseCase } from "@/features/messaging/domain/use-cases/get-conversations.use-case";
import { GetMessagesUseCase } from "@/features/messaging/domain/use-cases/get-messages.use-case";
import { SendMessageUseCase } from "@/features/messaging/domain/use-cases/send-message.use-case";
import { MessagingRepository } from "@/features/messaging/infrastructure/repositories/messaging.repository";
import { MockMessagingRepository } from "@/features/messaging/infrastructure/repositories/mocks/messaging.mock.repository";

async function makeRepo(): Promise<IMessagingRepository> {
  if (USE_MOCK) return new MockMessagingRepository();
  return new MessagingRepository(await createServerHttpClient());
}

export async function makeGetConversationsUseCase() {
  return new GetConversationsUseCase(await makeRepo());
}

export async function makeGetMessagesUseCase() {
  return new GetMessagesUseCase(await makeRepo());
}

export async function makeSendMessageUseCase() {
  return new SendMessageUseCase(await makeRepo());
}

export async function makeCreateConversationUseCase() {
  return new CreateConversationUseCase(await makeRepo());
}

export async function makeGetContactsUseCase() {
  return new GetContactsUseCase(await makeRepo());
}
