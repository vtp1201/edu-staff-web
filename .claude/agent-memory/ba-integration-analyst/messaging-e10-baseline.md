---
name: messaging-e10-baseline
description: US-E10.1 existing messaging contracts — entities, DTOs, repo interface, endpoint constants, mock repository
metadata:
  type: reference
---

## Endpoint file
`src/bootstrap/endpoint/messaging.endpoint.ts` — MESSAGING_EP constant with:
- conversations, conversationMessages(id), createConversation, contacts

## Domain entities (as of E10.1)
- ConversationEntity: id, type (direct|group), name, avatarInitials, color, lastMessage, lastMessageTime, unreadCount, isOnline?, memberCount?
- MessageEntity: id, conversationId, from (me|other|system), text, time, date, senderName?, senderInitials?, senderColor?, isPending?
- ContactEntity: id, name, role, avatarInitials, color, isOnline

## Repository interface
IMessagingRepository: getConversations, getMessages(cursor), sendMessage, createConversation, getContacts
All methods return Result<T, MessagingFailure> — never throw.

## Failure union (E10.1)
load-conversations-failed | load-messages-failed | send-message-failed | create-conversation-failed

## Mock pattern
MockMessagingRepository clones fixtures per-instance; DI factory selects mock vs real.
Fixtures: MOCK_CONVERSATIONS, MOCK_MESSAGES, MOCK_CONTACTS in mocks/fixtures.ts.

## Key patterns
- errorCodeOf(err) maps ApiError.code (UPPER_SNAKE) to failure
- List endpoints: { raw: true } + parseEnvelope() for meta.pagination
- camelCase on the wire — DTOs must match
