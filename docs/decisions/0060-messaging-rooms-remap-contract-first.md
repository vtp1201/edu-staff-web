# 0060 Messaging remodel — rooms/dms remap, contract-first with deferred verification

Date: 2026-07-22

## Status

Accepted

## Context

US-E18.17 (epic `E18-be-wiring`, Wave 4) asked to remodel the `messaging`
feature's vocabulary from the web's own mock-first invention
(`conversations`/`groups`) onto the real `social` service contract
(`edu-api/services/social/docs/openapi.yaml`): `rooms`/`dms`, plus newly
ground-truthed capabilities (read-state, typing, mute, moderation).

The epic table originally marked this Wave "blocked" because
`edu-api/gateway/kong/kong.yml` does not yet route `/social` — there is no
ingress to smoke-test against. Ground-truthing confirms the `social` service
itself is real and actively developed (recent merges for media attachments,
club chat, member-profile directory), so the CORRECT read is: the CONTRACT
exists and can be wired now; only LIVE gateway verification is blocked. This
mirrors the cross-repo Kong-route ask already on file (#1) — waiting for it
before writing any code would leave the repository/DTO/mapper/error-taxonomy
work undone even after the route ships. Per the epic playbook (step 1:
ground-truth Go source over openapi prose) and decision `0014` (mock-first),
this US proceeds **contract-first**: real repository wired against the
ground-truthed contract, mock repository kept as the `NEXT_PUBLIC_USE_MOCK`
fallback, and live-gateway proof explicitly deferred.

Ground-truthing the real contract also surfaced a structural mismatch: the
web's `IMessagingRepository` models an end-user-authored, ad hoc "group"
(arbitrary member picker + name + color + kind) as a first-class create/update/
member-management aggregate. The real `social` contract has no such thing —
`POST /api/v1/rooms` only accepts `roomType ∈ {class_chat, announcement,
parent_group, dm}` with a **mandatory** `sourceRefId`/`sourceRefType: class|
system` pair (i.e. a room is *provisioned from a system source*, never
user-authored from a blank member-picker), and no self-service endpoint edits
membership/name/color on a room the caller didn't provision this way. `custom`/
`club_chat`/`staff_internal` room types exist in `RoomSummary`'s enum but are
reachable only via the separate Club endpoints (already out of scope — clubs
are a distinct product surface) or worker-side auto-provisioning, never via a
generic "create a group" user action. Likewise, messages have no `pin`
endpoint at all (only feed POSTS do, via `/feeds/posts/{id}/pin` — an
unrelated, already-wired feature, US-E19.1).

## Decision

1. **Wire real** the slice of `IMessagingRepository` that has a 1:1 real
   mapping, no UI/behavior change required:
   - `getConversations()` → `GET /social/api/v1/rooms?userId={self}` (rooms,
     both `dm` and provisioned-group room types, unified into the existing
     `ConversationEntity` list).
   - `getMessages()` → `GET /social/api/v1/rooms/{roomId}/messages`
     (real cursor pagination — the prior stub hardcoded `hasMore: false`).
   - `sendMessage()` → `POST /social/api/v1/rooms/{roomId}/messages`.
   - `deleteMessage()` (self, within mutation window) →
     `DELETE /social/api/v1/rooms/{roomId}/messages/{messageId}`. The real
     window is **5 minutes** (`DELETE_WINDOW_EXPIRED`), not the web's
     previously-invented 1 hour — the local pre-check constant is corrected
     to match (`FIVE_MINUTE_MS`), and a new `delete-window-expired` failure
     surfaces the reactive 403 if a race lets a stale client state through.
   - `createConversation()` for the **1:1 case only** (`contactIds.length ===
     1`) → `POST /social/api/v1/rooms/school-dms` (same-tenant
     find-or-create, US-118/ADR-0089 semantics: may return `requestStatus:
     pending`).

2. **Wire two new, additive capabilities** the real contract has and the mock
   never modeled (no new UI surface — both slot into already-present, inert
   hooks): `markConversationRead()` → `POST /social/api/v1/rooms/{roomId}/read`
   (fires on opening a conversation, replacing the local-only `unreadCount`
   decrement) and `sendTypingIndicator()` → `POST
   /social/api/v1/rooms/{roomId}/typing` (fires best-effort on compose input;
   the room's own rate limit, ~3s cooldown/429, is respected client-side by a
   debounce). Inbound "the other party is typing" ( `isTyping` prop on
   `ChatWindow`) still has no real signal — the SSE fan-out is owned by the
   `notification` service, itself Kong-blocked (US-E18.18) — so it stays
   exactly as-is (`isTyping` prop wired from nothing real yet, pre-existing
   condition, not solved by this US).

3. **Stay mock-first permanently** (documented modeling gap, not a transient
   Kong block — flagged as a cross-repo/product finding, `EPIC-OVERVIEW.md`
   ask #32):
   - The entire ad hoc group lifecycle:  `createGroup`/`getGroup`/
     `updateGroup`/`addGroupMembers`/`removeGroupMember`/`leaveGroup`/
     `deleteGroup`. No wire concept of a user-authored, blank-member-picker
     group exists (see Context above).
   - `pinMessage`/`unpinMessage`. No message-pin endpoint exists on the real
     contract at all.
   - `getContacts()` (the "start a new chat" people-picker). The closest real
     endpoint, `GET /social/api/v1/social/tenants/{tenantId}/members/
     directory`, is gated to callers holding an `ADMIN`/`TEACHER` tenant-wide
     staff fact (Should-Have, PRIVACY-001-filtered) — a `STUDENT`/`PARENT`
     caller gets `PROFILE_NOT_FOUND` (404) unconditionally. The current
     contact picker has no role fork to serve only staff callers a real list
     and everyone else a permanently-empty one, so the whole picker stays
     mock rather than silently degrading for non-staff roles.
   - Moderator-side room capabilities (mute a member, moderator-delete a
     message, room role change, moderation-audit timeline) exist on the real
     contract (US-086/US-098) but the messaging screen has **no admin-
     moderation UI at all** today — building it is a net-new screen/flow
     (member management panel, mute control, audit timeline), a product/
     design-scope gap requiring `/uiux` → `/ba` before `/fe` can wire it, not
     a transport swap this US executes (same precedent as US-E18.16's
     lesson-plan/question-bank finding #27).

4. **Runtime verification is explicitly deferred.** No `make stack-up` /
   live-gateway smoke test is claimed as proof for this US (unlike US-E18.0's
   school-config proof-of-pattern) — Kong has no `/social` route yet
   (cross-repo ask #1). Proof standard for this US is unit + integration
   tests at the HTTP-contract boundary (mocked transport, envelope/error
   mapping per `.claude/rules/api-integration.md`) + full regression +
   `bun run build`, identical to every other US in this epic that could not
   run a live smoke.

## Alternatives Considered

1. Wait for the Kong route before touching any code. Rejected — leaves the
   repository/DTO/mapper/error-taxonomy work (the bulk of the effort) undone
   even after the route ships; every other Wave in this epic ground-truths
   the Go source directly rather than waiting for gateway ingress.
2. Force-mock the entire feature (like US-E18.8/US-E18.9/US-E18.14) since the
   epic table called it "blocked". Rejected — unlike those stories, the
   1:1/room/message/read/typing slice has a clean, lossless real mapping;
   force-mocking all of it would throw away real, ready-to-wire work for the
   sake of the (unrelated) group/pin/contacts gaps.
3. Attempt to shoehorn the ad hoc group feature onto `POST /rooms` by
   inventing a synthetic `sourceRefType`/`sourceRefId`. Rejected — the real
   contract's `sourceRefType` enum (`class`, `system`) has no slot for an
   arbitrary user-picked member set, and doing so would silently misrepresent
   a fictitious `class`/`system` source to the BE audit trail.

## Consequences

Positive:

- The inbox, chat window, send/read/delete flows move onto the real contract
  with zero behavior change and two small, real UX upgrades (server-tracked
  read state, real typing broadcast) with no new screens.
- The group/pin/contacts gaps are documented precisely enough for a future
  `/uiux`→`/ba` pass (or a BE ask) to start from, instead of being silently
  swallowed by "the whole feature is blocked."

Tradeoffs:

- The feature ships with a **hybrid** DI factory (some real, some
  permanently-mocked methods) — same shape as US-E18.4/US-E18.5/US-E18.11's
  hybrid repositories, not the fully-real or fully-blocked binary the epic
  table implied.
- No live-gateway proof exists for this US; if the real contract has an
  undiscovered drift only visible at runtime (header shape, auth claim
  propagation), it surfaces only once Kong routes `/social` and a follow-up
  smoke test runs.

## Follow-Up

- Cross-repo ask: Kong route for `/social` (already tracked, ask #1).
- Cross-repo/product ask (new, #32): either (a) BE ships a self-service
  "create a custom group room" capability compatible with an arbitrary member
  picker, or (b) product accepts the group-chat feature is redesigned around
  the real `class_chat`/`parent_group`/club model — route to `/uiux`+`/ba`.
- Once Kong routes `/social`, run the same live-smoke pattern as US-E18.0
  against this feature and append the result to this US's Evidence section.
