# 0061 Notification/SSE contract remap — real wire vocabulary, unread-counts ownership, presence fix

Date: 2026-07-23

## Status

Accepted

## Context

US-E18.18 (epic `E18-be-wiring`, Wave 4) asked to wire the `notification`
service's real SSE `/stream` + `unread-counts` + `presence` surface. The epic
table originally marked this "Blocked: Kong chưa route notification" —
ground-truthing `edu-api/services/notification/docs/INTEGRATION.md` confirms
the CONTRACT is real and richer than `gateway/kong/kong.yml`'s stale top
comment ("notification is a worker (no HTTP) and is not routed here") implies:
the service has grown a second process (`cmd/server`) with a full `/api/v1/*`
HTTP+SSE surface. Per the same reasoning as ADR `0060` (contract exists, only
live routing is blocked), this US proceeds contract-first.

Four additional ground-truthed findings forced scope decisions beyond the
literal "fix the SSE path" ask:

1. **`docs/decisions/0047-kong-auth-trust-model-review.md` (edu-api, dated
   AFTER this repo's original SSE proxy design, ADR `0009`/`0030`) retired
   per-service Bearer-JWT verification.** `notification`'s `cmd/server` trusts
   ONLY the Kong-injected `X-Edu-Claims`/`X-Edu-Claims-Sig` headers. ADR
   0047's own Consequences section states a direct call "carries no
   HMAC-signed `X-Edu-Claims` header, so the service returns 401 regardless
   of the bearer token" — a **closed** bypass path, not merely unrouted. Our
   `app/[locale]/api/stream/route.ts` proxy's real branch calls
   `NOTI_SERVICE_URL` directly with a Bearer token (bypassing Kong entirely,
   per the original ADR 0009/0030 design) — this will structurally 401 in
   any deployment that has adopted ADR 0047, independent of the Kong-routing
   gap (cross-repo ask #1). Re-architecting the proxy to route through Kong
   is out of scope until Kong actually routes `notification` (chicken/egg) —
   the path fix is applied, the incompatibility documented, live
   verification deferred for BOTH reasons.
2. **`GET /notifications/unread-counts` is per-ROOM (messaging), not a
   generic multi-category notification concept.** The epic table filed it
   under "Notification wiring" by service ownership, but its shape
   (`{roomId, unreadCount}[]`) only maps to messaging's conversation list.
   There is no generic grade/attendance/discipline/announcement/system
   unread concept anywhere on the real wire.
3. **The web's own `RealtimeEvent` SSE contract (`bootstrap/realtime/event.ts`,
   speculative per ADR `0009`: "web defines this contract first; BE
   follows") has zero overlap with the real wire's frame vocabulary.** Real
   frames are entirely messaging-scoped (`message.new`, `message.edited`,
   `message.deleted`, `unread.updated`, `typing`), are flat (no `payload`
   wrapper), and omit `eventId` entirely; `typing` also omits `tenantId` and
   has no embedded `type` field (the SSE `event:` line is the sole type
   signal). There is no real `notification.new`/`attendance.updated`/
   `presence.changed`/`session.revoked` frame anywhere in the service.
4. **Presence's real contract diverges from the web's invented 3-state
   model.** `GET /presence` takes `userIds` (not `memberIds`), returns
   `{items: [{userId, online: boolean, lastSeen: string|null}]}` — a flat
   2-state model, not the web's `{memberId, status: 'online'|'recent'|
   'offline', lastActiveAt}` guess.

## Decision

- **SSE path**: fix `NOTI_EP.stream` to `/api/v1/stream`. Proxy architecture
  (direct-bypass to `NOTI_SERVICE_URL`, decision `0009`/`0030`) is otherwise
  unchanged; the ADR-0047 incompatibility is documented in-code and here,
  not solved (needs Kong routing first — cross-repo ask).
- **`unread-counts` wired into the `messaging` feature**, not the generic
  `notification` feature: `MessagingRepository.getConversations()` best-effort
  enriches each room's `unreadCount` via this endpoint after the room list
  loads (closes ADR `0060` cross-repo ask #32(a): "real `RoomSummary` has no
  unread-count field on the wire"); failure degrades to `0`, never fails the
  whole list.
- **`notification.getUnreadCount()` is repurposed** to call the same real
  endpoint (no `roomIds` filter) and SUM across all rooms — a real, if
  narrower, meaning than the mock's synthetic multi-category count. This is
  a deliberate behavior nuance (mirrors the epic's repeated "real diverges
  from mock's invented semantics" pattern — US-E18.7 `count`, US-E18.11
  `room`) and is documented here rather than silently changed.
- **`listNotifications`/`markRead`/`markAllRead` stay force-mocked
  permanently** via a new `HybridNotificationRepository` (same pattern as
  `HybridMessagingRepository`, US-E18.17) — zero real backing exists for
  these at all (no list/mark-read route on the service, confirmed).
- **`RealtimeEvent` union remapped** to the real flat wire shapes for the 5
  messaging frames; `eventId` made optional across the union (absent on
  every real frame); `tenantId` made optional specifically for `typing`
  (absent on that frame only — tenant-scoping stays strict for every other
  event type, verified by review). Legacy mock-only types
  (`notification.created`/`notification.new`/`attendance.updated`/
  `presence.changed`/`session.revoked`) are KEPT, clearly commented as
  mock-only-forever — no real BE equivalent exists, removing them would
  regress the notification-center demo/Storybook for no contract gain.
  `createMockUpstream` now also emits sample real-shaped frames so the new
  inbound wiring (conversation-list refresh, chat-window typing indicator)
  is demoable in mock mode.
- **Presence fixed to the real 2-state contract** (`userIds` param,
  `{items:[...]}` envelope unwrap, `{userId, online, lastSeen}` DTO) while
  KEEPING the domain's existing 3-state `PresenceState`/`PresenceRecord`
  shape unchanged (zero VM/UI impact): the mapper derives `recent` from
  `lastSeen` age using an injected-clock 5-minute threshold. **No
  product/design-spec value exists for this threshold** — 5 minutes is an
  engineering default, not a confirmed product decision; flagged as an open
  question, not a blocker (see Follow-Up).

## Alternatives Considered

1. Wire `unread-counts` into the generic `notification` feature only (as the
   epic table's literal service-ownership grouping implies) and leave
   messaging's `unreadCount: 0` gap open. Rejected: this discards real, usable
   data for the one feature that actually needs it (messaging) in favor of a
   feature (notification bell) that has no real endpoint to receive it from
   at all under this name.
2. Attempt to re-architect the SSE proxy to route through Kong now, ahead of
   the Kong-routing cross-repo ask, using a synthetic claims header signed
   with a placeholder secret. Rejected: `GATEWAY_CLAIMS_SECRET` is a
   cluster-internal shared secret (ADR 0047) not exposed to this repo, and
   fabricating claims client-side would defeat the entire trust model this
   ADR protects — not this team's call to make.
3. Drop the legacy mock-only `RealtimeEvent` types entirely since they have
   no real backing. Rejected: they still power a working, tested,
   BE-agnostic notification-center demo/Storybook surface; removing them is
   a net loss with zero contract gain, and nothing in the real wire conflicts
   with keeping them.

## Consequences

Positive:

- Messaging conversation list now shows real per-room unread counts in real
  mode (was hardcoded `0`), closing a long-standing ADR `0060` gap.
- Chat window's dormant `isTyping` prop is now genuinely live-data-driven
  (closes US-E18.17's explicitly deferred inbound-typing item).
- The SSE contract module (`bootstrap/realtime/*`) now matches ground truth
  instead of a pre-BE guess, removing a latent "will silently do nothing
  useful once BE ships" landmine.
- Presence is correct against the real contract for the day Kong routes
  `notification`.

Tradeoffs / residual risks:

- Live end-to-end verification remains deferred for TWO independent reasons
  (Kong routing gap #1 AND the ADR-0047 direct-bypass incompatibility) —
  this US cannot be marked with `e2e` proof.
- The 5-minute "recent" presence threshold is an unconfirmed engineering
  default, not a design-spec value.
- `notification.getUnreadCount()`'s real meaning (messaging-room-unread sum)
  is narrower than what a user might expect from a "notification bell" —
  flagged, not solved, since no generic notification count exists on the
  real wire at all.
- PRIVACY-001 (edu-api INTEGRATION.md): `PARENT` role never receives
  `message.new` SSE frames for `class_chat`/`dm` rooms (unread still
  accumulates server-side) — parent users get no live pending-message pill,
  only a refetch-driven badge update. Not a regression (parents had no live
  signal before either), but worth tracking if a future US builds a
  parent-facing live-message feature.

## Follow-Up

- Cross-repo ask (append to `EPIC-OVERVIEW.md`): once Kong routes
  `notification` (ask #1), the SSE proxy's real branch must ALSO change from
  direct-bypass-to-`NOTI_SERVICE_URL` to routing through Kong (so Kong injects
  `X-Edu-Claims`), per ADR `0047` — this is a second, separate unblock beyond
  routing alone.
- Product question: confirm (or override) the 5-minute "recent" presence
  threshold with `/uiux`/`/ba` — no current design-spec value exists.
- If a future US wants the notification bell to reflect the FULL
  grade/attendance/discipline/announcement/system category set in real mode,
  that requires new BE surface (no such endpoint exists today) — track as a
  cross-repo ask, not solvable by remapping existing capabilities.
