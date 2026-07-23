---
name: pattern-sse-flat-wire-and-notification-wiring
description: E18.18 — real notification SSE wire is FLAT (no payload/eventId; typing no type/tenantId); parseEvent dual-path; vitest:storybook IS the gate & usePathname null there; unread-counts/presence envelope shapes
metadata:
  type: project
---

US-E18.18 wired the real `notification` cmd/server (`edu-api/services/notification/docs/INTEGRATION.md`).

**Real SSE wire ≠ internal RealtimeEvent shape.** Real messaging frames arrive
FLAT (fields at JSON top level, NO `payload` wrapper, NO `eventId`): `message.new`
`{roomId,messageId,senderId,senderName,preview,createdAt,roomType}`, `message.edited`,
`message.deleted`, `unread.updated` `{roomId,unreadCount}`, `typing`
`{roomId,userId,typing}` — `typing` has **no `type`** (the SSE `event:` line is the
type) and **no `tenantId`**. Kept `payload`-wrapped internally: `parseEvent(raw,
knownType?)` has TWO paths — flat real frames → lift fields into payload; else
payload-wrapped (legacy/mock + toSseFrame round-trip). `eventId` optional across
union; `shouldHandle` keeps frames with absent tenantId (typing). Per-listener
`addEventListener(type, listenerFor(type))` supplies knownType. Legacy frames
(`notification.*`/`attendance.updated`/`presence.changed`/`session.revoked`) have NO
real equivalent — mock-only forever; `createMockUpstream` emits BOTH (legacy via
toSseFrame + raw flat real frames). **Why:** BE shipped a messaging-only vocabulary;
`event.payload.roomId` invalidation code stays uniform despite flat wire.

**`bun vitest run` uses `vitest.config.mts` (node, NO stories).** Storybook
interaction tests run via `bun vitest --config vitest.storybook.mts` (chromium
browser) — this DOES run and IS the E2E gate (no standalone Playwright). In that env
`usePathname()` returns **null** → guard `pathname?.endsWith(...)`. Baseline has ~2
pre-existing messaging-screen story failures ("Create Group Optimistic Prepend",
"Reply Strip Active" — focus/label timing); verify against a worktree at origin/main
before blaming your change.

**Envelope shapes (both enveloped → interceptor unwraps, NEITHER needs raw:true):**
`GET /notifications/unread-counts?roomIds=` → `data: [{roomId,unreadCount}]` (repo
gets the array); `GET /presence?userIds=` (1–50) → `data: {items:[{userId,online,
lastSeen}]}` (repo gets `{items}`). `notification.getUnreadCount` repurposed to sum
unread-counts (messaging-only real meaning; mock keeps richer count).
`HybridNotificationRepository` force-mocks list/markRead/markAllRead (zero real
endpoint), getUnreadCount real — same pattern as HybridMessagingRepository.

**Presence 2-state→3-state in the MAPPER with injected clock** (`toPresenceRecord(dto,
nowMs)`): online→"online"; else lastSeen within 5min→"recent" else "offline". Keeps
IPresenceRepository/PresenceRecord shape (zero VM change). Query param `userIds` (not
memberIds). MockPresenceRepository builds PresenceRecord directly → unaffected by DTO
change. See also [[pattern-messaging-rooms-remap-e18-17]], [[pattern-hybrid-partial-real-wiring]].

**Inbound typing consumption:** thread `onTyping` through openSseConnection →
useRealtimeEvents; messaging-screen mounts its own useRealtimeEvents (2nd EventSource
OK — matches useNotificationNewEvent precedent), gated `enabled: Boolean(tenantId)`
(absent in stories → no connection). Pure `nextInboundTyping` reducer ignores frames
for non-open rooms; drives ChatWindow's dormant `isTyping` prop.
