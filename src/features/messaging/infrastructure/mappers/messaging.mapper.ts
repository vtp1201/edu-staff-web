import type { ContactEntity } from "@/features/messaging/domain/entities/contact.entity";
import type { ConversationEntity } from "@/features/messaging/domain/entities/conversation.entity";
import type { MessageEntity } from "@/features/messaging/domain/entities/message.entity";
import type { ContactResponseDto } from "../dtos/contact-response.dto";
import type { ConversationResponseDto } from "../dtos/conversation-response.dto";
import type { MessageResponseDto } from "../dtos/message-response.dto";

export function toConversationEntity(
  dto: ConversationResponseDto,
): ConversationEntity {
  return {
    id: dto.id,
    type: dto.type === "group" ? "group" : "direct",
    name: dto.name,
    avatarInitials: dto.avatarInitials,
    color: dto.color,
    lastMessage: dto.lastMessage,
    lastMessageTime: dto.lastMessageTime,
    unreadCount: dto.unreadCount,
    isOnline: dto.isOnline,
    memberCount: dto.memberCount,
  };
}

export function toMessageEntity(dto: MessageResponseDto): MessageEntity {
  return {
    id: dto.id,
    conversationId: dto.conversationId,
    from: dto.from,
    text: dto.text,
    time: dto.time,
    date: dto.date,
    senderName: dto.senderName,
    senderInitials: dto.senderInitials,
    senderColor: dto.senderColor,
  };
}

export function toContactEntity(dto: ContactResponseDto): ContactEntity {
  return {
    id: dto.id,
    name: dto.name,
    role: dto.role,
    avatarInitials: dto.avatarInitials,
    color: dto.color,
    isOnline: dto.isOnline,
  };
}
