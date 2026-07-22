---
name: pattern-messaging-rooms-remap-e18-17
description: E18.17 messaging→social rooms/DMs remap — hybrid facade, wire-gap client derivation, social UPPER_SNAKE codes, mark-read/typing wiring
metadata:
  type: project
---

US-E18.17 remapped `messaging` real repo onto the real `social` rooms contract
(edu-api/services/social openapi). Extends [[pattern-hybrid-partial-real-wiring]]
+ [[pattern-be-wiring-remap]].

**Why:** contract-first (ADR 0060) — Kong doesn't route `/social` yet, so no live
smoke; proof = unit+integration at the HTTP boundary + full regression + build.

**How to apply (next social/messaging wiring):**
- social error codes ARE UPPER_SNAKE (`ROOM_NOT_MEMBER`, `DELETE_WINDOW_EXPIRED`,
  `FORBIDDEN_ACTION`, `ROOM_DM_ROLE_PAIR_NOT_ALLOWED`) — confirms decision 0008
  holds for social like core (NOT raw-lowercase like IAM). Branch on `errorCodeOf`.
- `RoomSummary`/`Message` wire has **NO unreadCount, NO avatar initials, NO color**
  (genuine gaps, cross-repo ask #32) → derive client-side: `roomInitials(name)` +
  `roomColorKey(roomId)` hash into the 7 tone keys (primary/success/warning/error/
  info/purple/teal, shared with avatar-tone.ts) in a pure `room-derive.ts`. Message
  has only ISO `createdAt` → format HH:MM + dd/mm/yyyy (NOT "Hôm nay" — Vietnamese
  in an infra mapper trips the i18n scan; relative labels are presentation-only).
  unreadCount defaults 0; mark-read path resets it locally.
- `GET /rooms` REQUIRES `?userId=<self>` (or tenantId) — resolve self server-side
  via `decodeSubClaim(token)` in DI (attendance.di precedent), pass currentUserId
  to repo ctor; null token → fail fast, never call with empty userId
  (ROOM_LIST_FILTER_REQUIRED). `raw:true` top-level + parseEnvelope for the list.
- Hybrid: `HybridMessagingRepository(real, mock)` — rooms/messages/read/typing/
  1:1-DM → real; group lifecycle/pin/contacts (no real contract) → force-mock.
  DI builds `new Hybrid(new MessagingRepository(http,uid), new MockRepo())` in the
  non-USE_MOCK branch. `createConversation`: 1:1 → POST /rooms/school-dms
  {targetUserId} (synthesize ConversationEntity from {roomId}); length!==1 → fail
  `group-not-supported-by-real-contract` with NO HTTP.
- delete window is **5 min** not 1 hr; reactive 403 `DELETE_WINDOW_EXPIRED` → new
  `delete-window-expired` failure. Adding ANY new MessagingFailure["type"] means
  adding its key to messaging.errors in vi+en (conversation-list feeds the whole
  union to `tErrors()` — see [[gotcha-result-shape-and-dynamic-i18n]]).
- typing: optional `onTyping` prop on ChatWindow (composer onChange, non-empty) →
  screen's leading-edge `createTypingThrottle` (~2s, injectable clock, pure+tested)
  → `sendTypingIndicatorAction` best-effort (swallow all incl 429).
- Git hygiene: a lefthook pre-commit can fail SILENTLY (truncated output) and leave
  changes staged → they get swept into the NEXT `git add -A` commit under the wrong
  message. ALWAYS `git log --oneline main..HEAD` after each commit; re-split with
  `git reset --soft <sha> && git reset` if a commit vanished (pre-commit tsc checks
  the full on-disk tree, so an infra-only commit passes once presentation exists).
