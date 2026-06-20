import "server-only";
import type { AxiosInstance } from "axios";
import { MESSAGING_EP } from "@/bootstrap/endpoint/messaging.endpoint";
import { errorCodeOf } from "@/bootstrap/lib/api-envelope";
import type { ContactEntity } from "@/features/messaging/domain/entities/contact.entity";
import type { ConversationEntity } from "@/features/messaging/domain/entities/conversation.entity";
import type { GroupEntity } from "@/features/messaging/domain/entities/group.entity";
import type { MessageEntity } from "@/features/messaging/domain/entities/message.entity";
import type { MessagingFailure } from "@/features/messaging/domain/failures/messaging.failure";
import type {
  CreateGroupInput,
  IMessagingRepository,
  MessagePage,
  UpdateGroupInput,
} from "@/features/messaging/domain/repositories/i-messaging.repository";
import {
  fail,
  ok,
  type Result,
} from "@/features/messaging/domain/use-cases/result";
import type { ContactResponseDto } from "../dtos/contact-response.dto";
import type { ConversationResponseDto } from "../dtos/conversation-response.dto";
import type { ConversationsListResponseDto } from "../dtos/conversations-list-response.dto";
import type { GroupResponseDto } from "../dtos/group-response.dto";
import type { MessageResponseDto } from "../dtos/message-response.dto";
import { toGroupEntity } from "../mappers/group.mapper";
import {
  toContactEntity,
  toConversationEntity,
  toMessageEntity,
} from "../mappers/messaging.mapper";

/**
 * Real `social` repository (US-E10.1). The `social` service is not shipped yet
 * (mock-first, decision 0017) — the DI factory selects the mock when USE_MOCK.
 * The HTTP interceptor unwraps the envelope; repos receive the payload directly
 * and map ApiError.code (UPPER_SNAKE) to the failure union, never the message.
 */
export class MessagingRepository implements IMessagingRepository {
  constructor(private readonly http: AxiosInstance) {}

  async getConversations(): Promise<
    Result<ConversationEntity[], MessagingFailure>
  > {
    try {
      const dto = (await this.http.get(
        MESSAGING_EP.conversations,
      )) as unknown as ConversationsListResponseDto;
      return ok(dto.conversations.map(toConversationEntity));
    } catch (err) {
      return fail({
        type: "load-conversations-failed",
        cause: errorCodeOf(err) ?? "social-service-not-available",
      });
    }
  }

  async getMessages(
    conversationId: string,
    cursor?: string,
  ): Promise<Result<MessagePage, MessagingFailure>> {
    try {
      const dtos = (await this.http.get(
        MESSAGING_EP.conversationMessages(conversationId),
        { params: cursor ? { cursor } : undefined },
      )) as unknown as MessageResponseDto[];
      return ok({
        messages: dtos.map(toMessageEntity),
        hasMore: false,
      });
    } catch (err) {
      return fail({
        type: "load-messages-failed",
        conversationId,
        cause: errorCodeOf(err) ?? "social-service-not-available",
      });
    }
  }

  async sendMessage(
    conversationId: string,
    text: string,
  ): Promise<Result<MessageEntity, MessagingFailure>> {
    try {
      const dto = (await this.http.post(
        MESSAGING_EP.conversationMessages(conversationId),
        { text },
      )) as unknown as MessageResponseDto;
      return ok(toMessageEntity(dto));
    } catch (err) {
      return fail({
        type: "send-message-failed",
        cause: errorCodeOf(err) ?? "social-service-not-available",
      });
    }
  }

  async createConversation(
    contactIds: string[],
    name?: string,
  ): Promise<Result<ConversationEntity, MessagingFailure>> {
    try {
      const dto = (await this.http.post(MESSAGING_EP.createConversation, {
        contactIds,
        name,
      })) as unknown as ConversationResponseDto;
      return ok(toConversationEntity(dto));
    } catch (err) {
      return fail({
        type: "create-conversation-failed",
        cause: errorCodeOf(err) ?? "social-service-not-available",
      });
    }
  }

  async getContacts(): Promise<Result<ContactEntity[], MessagingFailure>> {
    try {
      const dtos = (await this.http.get(
        MESSAGING_EP.contacts,
      )) as unknown as ContactResponseDto[];
      return ok(dtos.map(toContactEntity));
    } catch (err) {
      return fail({
        type: "load-conversations-failed",
        cause: errorCodeOf(err) ?? "social-service-not-available",
      });
    }
  }

  // --- US-E10.4 group lifecycle (social service not yet shipped) ---

  private notGroupAdminOr(
    err: unknown,
    fallback: MessagingFailure,
  ): MessagingFailure {
    return errorCodeOf(err) === "NOT_GROUP_ADMIN"
      ? { type: "not-group-admin" }
      : fallback;
  }

  async createGroup(
    input: CreateGroupInput,
  ): Promise<Result<GroupEntity, MessagingFailure>> {
    try {
      const dto = (await this.http.post(
        MESSAGING_EP.groups,
        input,
      )) as unknown as GroupResponseDto;
      return ok(toGroupEntity(dto));
    } catch (err) {
      return fail({
        type: "create-group-failed",
        cause: errorCodeOf(err) ?? "social-service-not-available",
      });
    }
  }

  async getGroup(
    groupId: string,
  ): Promise<Result<GroupEntity, MessagingFailure>> {
    try {
      const dto = (await this.http.get(
        MESSAGING_EP.groupById(groupId),
      )) as unknown as GroupResponseDto;
      return ok(toGroupEntity(dto));
    } catch (err) {
      return fail({
        type: "group-mutation-failed",
        action: "get",
        cause: errorCodeOf(err) ?? "social-service-not-available",
      });
    }
  }

  async updateGroup(
    input: UpdateGroupInput,
  ): Promise<Result<GroupEntity, MessagingFailure>> {
    try {
      const { groupId, ...patch } = input;
      const dto = (await this.http.patch(
        MESSAGING_EP.groupById(groupId),
        patch,
      )) as unknown as GroupResponseDto;
      return ok(toGroupEntity(dto));
    } catch (err) {
      return fail(
        this.notGroupAdminOr(err, {
          type: "group-mutation-failed",
          action: "update",
          cause: errorCodeOf(err) ?? "social-service-not-available",
        }),
      );
    }
  }

  async addGroupMembers(
    groupId: string,
    memberIds: string[],
  ): Promise<Result<GroupEntity, MessagingFailure>> {
    try {
      const dto = (await this.http.post(MESSAGING_EP.groupMembers(groupId), {
        memberIds,
      })) as unknown as GroupResponseDto;
      return ok(toGroupEntity(dto));
    } catch (err) {
      return fail(
        this.notGroupAdminOr(err, {
          type: "group-mutation-failed",
          action: "add-members",
          cause: errorCodeOf(err) ?? "social-service-not-available",
        }),
      );
    }
  }

  async removeGroupMember(
    groupId: string,
    userId: string,
  ): Promise<Result<GroupEntity, MessagingFailure>> {
    try {
      const dto = (await this.http.delete(
        MESSAGING_EP.groupMemberById(groupId, userId),
      )) as unknown as GroupResponseDto;
      return ok(toGroupEntity(dto));
    } catch (err) {
      return fail(
        this.notGroupAdminOr(err, {
          type: "group-mutation-failed",
          action: "remove-member",
          cause: errorCodeOf(err) ?? "social-service-not-available",
        }),
      );
    }
  }

  async leaveGroup(
    conversationId: string,
  ): Promise<Result<boolean, MessagingFailure>> {
    try {
      await this.http.post(MESSAGING_EP.conversationLeave(conversationId));
      return ok(true);
    } catch (err) {
      return fail({
        type: "leave-group-failed",
        cause: errorCodeOf(err) ?? "social-service-not-available",
      });
    }
  }

  async deleteGroup(
    groupId: string,
  ): Promise<Result<boolean, MessagingFailure>> {
    try {
      await this.http.delete(MESSAGING_EP.groupById(groupId));
      return ok(true);
    } catch (err) {
      return fail(
        this.notGroupAdminOr(err, {
          type: "group-mutation-failed",
          action: "delete",
          cause: errorCodeOf(err) ?? "social-service-not-available",
        }),
      );
    }
  }

  // --- US-E10.4 message interactions ---

  async pinMessage(
    conversationId: string,
    messageId: string,
  ): Promise<Result<boolean, MessagingFailure>> {
    try {
      await this.http.post(MESSAGING_EP.messagePin(conversationId, messageId));
      return ok(true);
    } catch (err) {
      return fail(
        this.notGroupAdminOr(err, {
          type: "pin-failed",
          cause: errorCodeOf(err) ?? "social-service-not-available",
        }),
      );
    }
  }

  async unpinMessage(
    conversationId: string,
    messageId: string,
  ): Promise<Result<boolean, MessagingFailure>> {
    try {
      await this.http.delete(
        MESSAGING_EP.messagePin(conversationId, messageId),
      );
      return ok(true);
    } catch (err) {
      return fail(
        this.notGroupAdminOr(err, {
          type: "pin-failed",
          cause: errorCodeOf(err) ?? "social-service-not-available",
        }),
      );
    }
  }

  async deleteMessage(
    conversationId: string,
    messageId: string,
  ): Promise<Result<boolean, MessagingFailure>> {
    try {
      await this.http.delete(
        MESSAGING_EP.messageById(conversationId, messageId),
      );
      return ok(true);
    } catch (err) {
      return fail({
        type: "delete-message-failed",
        cause: errorCodeOf(err) ?? "social-service-not-available",
      });
    }
  }
}
