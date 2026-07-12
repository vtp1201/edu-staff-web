---
name: messaging-e10-baseline
description: US-E10.1/E10.4/E10.6 existing messaging + SSE contracts — entities, DTOs, repo interface, endpoint constants, mock repository, realtime event union
metadata:
  type: reference
---

## Endpoint file
`src/bootstrap/endpoint/messaging.endpoint.ts` — MESSAGING_EP constant with:
- conversations, conversationMessages(id), createConversation, contacts,
  groups, groupById, groupMembers, groupMemberById, conversationLeave,
  messagePin, messageById (all `/social/api/v1/*`, mock-first per decision 0017)

## Domain entities (as of E10.1/E10.4)
- ConversationEntity: id, type (direct|group), name, avatarInitials, color, lastMessage, lastMessageTime, unreadCount, isOnline?, memberCount?, lastSenderName?, selfIsGroupAdmin?
- MessageEntity: id, conversationId, from (me|other|system), text, time, date, senderName?, senderInitials?, senderColor?, isPending?
- ContactEntity: id, name, role, avatarInitials, color, isOnline
- GroupEntity: id, name, description, kind, color, conversationId, members (GroupMember[]), pinnedMessages
- GroupMember: userId, name, initials, color, role (admin|member), isOnline

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

## Realtime/SSE infra (decision 0009/0041, US-E06.2/E08.6/E10.2/E10.6)
- Transport is REAL and already fully wired — reuse, never invent a second SSE mechanism:
  - Proxy route: `src/app/[locale]/api/stream/route.ts` (cookie auth → mock upstream when
    `USE_MOCK`/no `NOTI_SERVICE_URL`, else Bearer proxy + `Last-Event-ID`).
  - Typed event union + parser: `src/bootstrap/realtime/event.ts` — `RealtimeEvent`,
    `REALTIME_EVENT_TYPES`, `parseEvent()` (returns null on malformed/unknown type),
    `shouldHandle()` (tenant drop — client-side defense-in-depth, not the primary control).
  - Invalidation map: `src/bootstrap/realtime/event-invalidation.ts` — `queryKeysFor(event)`
    switch per event type → TanStack Query keys to invalidate (never hand-patch cache).
  - Global hook (mounted in AppShell): `src/bootstrap/realtime/use-realtime-events.ts` —
    `useRealtimeEvents({tenantId, onSessionRevoked, enabled})`, owns EventSource lifecycle,
    exposes `sseStatus`/`showBanner`/`pendingMsgCount`/`reconnect`.
  - Screen-local subscribe pattern (US-E10.2 precedent, decision 0041): a second `'use client'`
    hook opens its own `EventSource` at the SAME URL (`/${locale}/api/stream?tenant=...`,
    `withCredentials: true`) for a component that needs to react to one event type directly
    (e.g. optimistic prepend + toast) without waiting for the global invalidation refetch —
    see `src/features/notification/presentation/notifications-center/use-notification-new-event.ts`.
    Browser dedupes the underlying connection. Reuse this exact pattern for any new
    screen-local realtime need (e.g. US-E10.6 presence) instead of a new mechanism.
  - Mock upstream: `src/bootstrap/realtime/mock-upstream.server.ts` — `createMockUpstream(tenantId)`
    emits a small seeded `samples: RealtimeEvent[]` array once then heartbeats; extend this
    array to add a new mock frame type (e.g. `presence.changed`) for dev/Storybook exercise.
  - SSE client logic lives in **presentation**, not infrastructure (decision 0041) — `EventSource`
    is browser-only, `infrastructure/` has `import 'server-only'`; adding it there would conflict.

## noti service HTTP surface status (as of US-E10.6, 2026-07-12)
- `noti` background worker has **no confirmed REST route through Kong** (ADR 0030) beyond the
  SSE stream itself. `ANNOUNCEMENTS_EP` (US-E10.3, `/noti/api/v1/announcements`) is defined but
  still mock-first pending real wiring — same status expected for any new `noti` REST endpoint
  (e.g. presence snapshot `GET /noti/api/v1/presence`) until BE confirms via openapi.yaml.
- No sibling `edu-api` checkout was reachable from this workspace to verify directly — always
  re-check for a reachable edu-api path before asserting REAL vs MOCK-FIRST for `noti` REST routes.
