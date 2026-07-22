"use server";

import {
  makeAddGroupMembersUseCase,
  makeCreateConversationUseCase,
  makeCreateGroupUseCase,
  makeDeleteGroupUseCase,
  makeDeleteMessageUseCase,
  makeGetGroupUseCase,
  makeGetMessagesUseCase,
  makeGetPresenceUseCase,
  makeLeaveGroupUseCase,
  makeMarkConversationReadUseCase,
  makePinMessageUseCase,
  makeRemoveGroupMemberUseCase,
  makeSendMessageUseCase,
  makeSendTypingIndicatorUseCase,
  makeUpdateGroupUseCase,
} from "@/bootstrap/di";
import type { CreateGroupFormValues } from "@/features/messaging/presentation/create-group-modal";
import type {
  ActionResult,
  CreateConversationResult,
  CreateGroupResult,
  GetGroupResult,
  GetMessagesResult,
  GetPresenceResult,
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

// --- US-E10.6 presence (INT-401, noti — mock-first) ---

export async function getPresenceAction(
  memberIds: string[],
): Promise<GetPresenceResult> {
  const useCase = await makeGetPresenceUseCase();
  const result = await useCase.execute(memberIds);
  return result.ok
    ? { ok: true, value: result.value }
    : { ok: false, errorKey: result.failure.type };
}

// --- US-E10.4 group lifecycle + message interactions ---

export async function createGroupAction(
  values: CreateGroupFormValues,
): Promise<CreateGroupResult> {
  const useCase = await makeCreateGroupUseCase();
  const result = await useCase.execute(values);
  return result.ok
    ? { ok: true, value: result.value }
    : { ok: false, errorKey: result.failure.type };
}

export async function getGroupAction(groupId: string): Promise<GetGroupResult> {
  const useCase = await makeGetGroupUseCase();
  const result = await useCase.execute(groupId);
  return result.ok
    ? { ok: true, value: result.value }
    : { ok: false, errorKey: result.failure.type };
}

export async function updateGroupAction(
  groupId: string,
  name: string,
  description: string,
): Promise<GetGroupResult> {
  const useCase = await makeUpdateGroupUseCase();
  const result = await useCase.execute({ groupId, name, description });
  return result.ok
    ? { ok: true, value: result.value }
    : { ok: false, errorKey: result.failure.type };
}

export async function addGroupMembersAction(
  groupId: string,
  memberIds: string[],
): Promise<GetGroupResult> {
  const useCase = await makeAddGroupMembersUseCase();
  const result = await useCase.execute(groupId, memberIds);
  return result.ok
    ? { ok: true, value: result.value }
    : { ok: false, errorKey: result.failure.type };
}

export async function removeGroupMemberAction(
  groupId: string,
  userId: string,
): Promise<GetGroupResult> {
  const useCase = await makeRemoveGroupMemberUseCase();
  const result = await useCase.execute(groupId, userId);
  return result.ok
    ? { ok: true, value: result.value }
    : { ok: false, errorKey: result.failure.type };
}

export async function pinMessageAction(
  conversationId: string,
  messageId: string,
): Promise<ActionResult> {
  const useCase = await makePinMessageUseCase();
  const result = await useCase.execute(conversationId, messageId);
  return result.ok
    ? { ok: true }
    : { ok: false, errorKey: result.failure.type };
}

export async function deleteMessageAction(
  conversationId: string,
  messageId: string,
  sentAt: string,
): Promise<ActionResult> {
  const useCase = await makeDeleteMessageUseCase();
  const result = await useCase.execute({
    conversationId,
    messageId,
    isMine: true,
    sentAt,
  });
  return result.ok
    ? { ok: true }
    : { ok: false, errorKey: result.failure.type };
}

// --- US-E18.17 read-state + typing (real `social` rooms) ---

export async function markConversationReadAction(
  conversationId: string,
): Promise<ActionResult> {
  const useCase = await makeMarkConversationReadUseCase();
  const result = await useCase.execute(conversationId);
  return result.ok
    ? { ok: true }
    : { ok: false, errorKey: result.failure.type };
}

export async function sendTypingIndicatorAction(
  conversationId: string,
  typing: boolean,
): Promise<ActionResult> {
  // Best-effort: the client throttles + swallows any failure (incl. 429). The
  // action still returns a stable Result shape for consistency.
  const useCase = await makeSendTypingIndicatorUseCase();
  const result = await useCase.execute(conversationId, typing);
  return result.ok
    ? { ok: true }
    : { ok: false, errorKey: result.failure.type };
}

export async function leaveGroupAction(
  conversationId: string,
): Promise<ActionResult> {
  const useCase = await makeLeaveGroupUseCase();
  const result = await useCase.execute(conversationId);
  return result.ok
    ? { ok: true }
    : { ok: false, errorKey: result.failure.type };
}

export async function deleteGroupAction(
  groupId: string,
): Promise<ActionResult> {
  const useCase = await makeDeleteGroupUseCase();
  const result = await useCase.execute(groupId);
  return result.ok
    ? { ok: true }
    : { ok: false, errorKey: result.failure.type };
}
