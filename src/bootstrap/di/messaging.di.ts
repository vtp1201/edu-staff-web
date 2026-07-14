import "server-only";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { IMessagingRepository } from "@/features/messaging/domain/repositories/i-messaging.repository";
import type { IPresenceRepository } from "@/features/messaging/domain/repositories/i-presence.repository";
import { AddGroupMembersUseCase } from "@/features/messaging/domain/use-cases/add-group-members.use-case";
import { CreateConversationUseCase } from "@/features/messaging/domain/use-cases/create-conversation.use-case";
import { CreateGroupUseCase } from "@/features/messaging/domain/use-cases/create-group.use-case";
import { DeleteGroupUseCase } from "@/features/messaging/domain/use-cases/delete-group.use-case";
import { DeleteMessageUseCase } from "@/features/messaging/domain/use-cases/delete-message.use-case";
import { GetContactsUseCase } from "@/features/messaging/domain/use-cases/get-contacts.use-case";
import { GetConversationsUseCase } from "@/features/messaging/domain/use-cases/get-conversations.use-case";
import { GetGroupUseCase } from "@/features/messaging/domain/use-cases/get-group.use-case";
import { GetMessagesUseCase } from "@/features/messaging/domain/use-cases/get-messages.use-case";
import { GetPresenceUseCase } from "@/features/messaging/domain/use-cases/get-presence.use-case";
import { LeaveGroupUseCase } from "@/features/messaging/domain/use-cases/leave-group.use-case";
import { PinMessageUseCase } from "@/features/messaging/domain/use-cases/pin-message.use-case";
import { RemoveGroupMemberUseCase } from "@/features/messaging/domain/use-cases/remove-group-member.use-case";
import { SendMessageUseCase } from "@/features/messaging/domain/use-cases/send-message.use-case";
import { UpdateGroupUseCase } from "@/features/messaging/domain/use-cases/update-group.use-case";
import { MessagingRepository } from "@/features/messaging/infrastructure/repositories/messaging.repository";
import { MockMessagingRepository } from "@/features/messaging/infrastructure/repositories/mocks/messaging.mock.repository";
import { MockPresenceRepository } from "@/features/messaging/infrastructure/repositories/mocks/presence.mock.repository";
import { PresenceRepository } from "@/features/messaging/infrastructure/repositories/presence.repository";

async function makeRepo(): Promise<IMessagingRepository> {
  if (USE_MOCK) return new MockMessagingRepository();
  return new MessagingRepository(await createServerHttpClient());
}

/**
 * INT-401 presence — a separate small factory (`noti`, not `social`); does not
 * touch the `makeRepo()` used by the 12 IMessagingRepository methods.
 */
async function makePresenceRepo(): Promise<IPresenceRepository> {
  if (USE_MOCK) return new MockPresenceRepository();
  return new PresenceRepository(await createServerHttpClient());
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

// --- US-E10.6 presence (INT-401, noti service — mock-first) ---

export async function makeGetPresenceUseCase() {
  return new GetPresenceUseCase(await makePresenceRepo());
}

// --- US-E10.4 group lifecycle + message interactions ---

export async function makeCreateGroupUseCase() {
  return new CreateGroupUseCase(await makeRepo());
}

export async function makeGetGroupUseCase() {
  return new GetGroupUseCase(await makeRepo());
}

export async function makeUpdateGroupUseCase() {
  return new UpdateGroupUseCase(await makeRepo());
}

export async function makeAddGroupMembersUseCase() {
  return new AddGroupMembersUseCase(await makeRepo());
}

export async function makeRemoveGroupMemberUseCase() {
  return new RemoveGroupMemberUseCase(await makeRepo());
}

export async function makeLeaveGroupUseCase() {
  return new LeaveGroupUseCase(await makeRepo());
}

export async function makeDeleteGroupUseCase() {
  return new DeleteGroupUseCase(await makeRepo());
}

export async function makePinMessageUseCase() {
  return new PinMessageUseCase(await makeRepo());
}

export async function makeDeleteMessageUseCase() {
  return new DeleteMessageUseCase(await makeRepo());
}
