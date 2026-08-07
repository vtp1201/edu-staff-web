# US-E18.51 Message pin/unpin + pinned-messages list real (BE US-192)

## Status

implemented

## Lane

normal

## Dependencies

- Depends on: none (independent of US-E18.50, different endpoints/methods, but same feature module — sequence if both run in the same worktree; safe to parallelize in separate worktrees since they touch disjoint methods on the shared `HybridMessagingRepository`, just avoid both stories editing that facade's SAME lines simultaneously)
- Blocks: none
- Feature module(s) chạm: `src/features/messaging/` (pin slice only)
- Shared contract/file: `HybridMessagingRepository`, `IMessagingRepository`, `GroupEntity.pinnedMessages`

## Ground truth (fe-lead, verified against local `edu-api` checkout, US-192)

`edu-api/services/social/docs/openapi.yaml`:

- **`POST /api/v1/rooms/{roomId}/messages/{messageId}/pin`** (201) — requires
  `moderate_msg` capability (OWNER/ADMIN/MODERATOR per the EXISTING ADR 0065
  capability matrix — reused verbatim, no new capability). Cap **50 pinned
  messages per room** (hard, not configurable) — 51st attempt →
  `409 SOCIAL_PIN_LIMIT_REACHED`. Already-pinned → `409
  SOCIAL_MESSAGE_ALREADY_PINNED`. Deleted/nonexistent message/room →
  `404` (reuses existing `MESSAGE_ALREADY_DELETED`/`MESSAGE_NOT_FOUND`, no new
  code). Response (`PinnedMessageResponse`): `{messageId, pinnedBy, pinnedAt}`
  — **`message` field ABSENT on this response** (only present on the list
  endpoint below).
- **`DELETE /api/v1/rooms/{roomId}/messages/{messageId}/pin`** (204) — SAME
  `moderate_msg` capability (NOT limited to the original pinner — this is a
  moderation action, any OWNER/ADMIN/MODERATOR can unpin anyone's pin).
  Not-currently-pinned → `404 SOCIAL_MESSAGE_NOT_PINNED`.
- **`GET /api/v1/rooms/{roomId}/pinned-messages`** (200) — requires only ROOM
  MEMBERSHIP (read access), NOT `moderate_msg` — any member can VIEW pins,
  only mods can CHANGE them. Returns a **flat, non-paginated array** (bounded
  by the 50-cap, no `meta.pagination`), **newest-pin-first**, each row
  embedding the FULL current message content (`message` field present here,
  unlike the pin-action response). A pin whose message was since soft-deleted
  is SILENTLY SKIPPED (self-healing read) — do not surface a "message
  deleted" placeholder row for it. Shares the message-history read-rate quota
  (120 reads/min, `429 SOCIAL_READ_RATE_LIMITED`, retryable) — map this the
  same way the existing message-history 429 is mapped (reuse, don't
  reinvent).
- **No realtime signal for pin/unpin** — after a successful 201/204, the
  client must REFETCH the pinned list (no SSE/websocket push for this yet,
  unlike message send/typing which DO have realtime via US-E18.18). Don't
  wire a dormant SSE listener for this — it's confirmed absent, not just
  unbuilt.
- **Pin message ≠ pin post (feed)** — these are two completely unrelated
  concepts on two different services (`social` rooms vs `feed`'s post-pin,
  mentioned in `US-E18.31`'s ADR 0067 as a still-open feed capability). Do
  NOT reuse any feed-pin naming/types/components for this story — check
  `INTEGRATION.md`'s contrast table if you want the exact distinctions BE
  drew, but the two features must stay structurally separate in this
  codebase too.

## Current state (read before touching anything)

`GroupEntity.pinnedMessages: PinnedMessage[]` currently lives EMBEDDED inside
the group/conversation detail entity (mock-era design — `getGroup()`'s
response carries the full pinned list inline). The REAL contract is a
SEPARATE, independently-fetchable list (`GET /rooms/{roomId}/pinned-messages`)
— decoupled from room/group detail entirely. You likely need a NEW repository
method (e.g. `getPinnedMessages(conversationId)`) rather than assuming
`getGroup()`'s real branch (if `getGroup` even has one — check US-E18.50's
findings first, it may still be mock) can serve this data. Decide whether
`GroupEntity.pinnedMessages` stays as a convenience field populated by a
SEPARATE fetch composed at the DI/use-case layer, or whether the UI
component (`group-info-panel.tsx`, `pinned-message-row.tsx`) needs a
prop-shape change to receive pins independently of group detail — read
BOTH consumer components before deciding, this is a real architecture choice
not just a repository swap.

`pinMessage(conversationId, messageId)`/`unpinMessage(conversationId,
messageId)` signatures already roughly match the real per-message
action shape (roomId + messageId) — likely just need real HTTP wiring, not a
signature change, but verify.

## Scope

1. Add a repository method for the list read (name it consistently with the
   rest of this repository's conventions — check existing naming, e.g.
   `getMessages`/`getConversations` pattern).
2. Wire `pinMessage`/`unpinMessage` real: exact path, capability-gated 403,
   cap-reached 409, already-pinned/not-pinned 409/404 — all mapped to
   distinct failure types, not generic ones.
3. Wire the pinned-list read real, mapping the EMBEDDED `message` field to
   whatever message-preview shape `pinned-message-row.tsx` already expects
   (check its prop type before assuming 1:1 with the wire `Message` schema).
4. Decide + document the `GroupEntity.pinnedMessages` composition question
   above. Update `HybridMessagingRepository`'s routing + doc-comment (this
   was one of the 3 confirmed-no-real-contract capabilities in ADR 0060 —
   that premise is now false for pin/unpin/list specifically, though
   group-lifecycle and contacts may still be separately blocked per
   US-E18.50/US-E18.52).
5. UI: after a successful pin/unpin, trigger a refetch of the pinned list
   (no realtime signal exists) — use whatever mutation-invalidation pattern
   this repo's TanStack Query usage already follows elsewhere in messaging.
6. Rate-limit 429 handling: reuse the existing message-history 429→failure
   mapping rather than inventing a parallel one.
7. Cap-reached UI: when a 51st pin is attempted, surface a clear "room is
   full of pins, unpin something first" message, not a generic error.

## NOT in scope

- Feed post-pin (unrelated feature, different service, stays whatever state
  ADR 0067 left it in).
- Group lifecycle (create/archive/etc) — US-E18.50.
- Contact picker — US-E18.52.
- Building a realtime pin-signal — confirmed absent from the real contract,
  not this story's job to add client-side polling as a substitute unless
  explicitly asked (a plain refetch-on-action is sufficient per BE's own
  design).

## Acceptance Criteria

- Real mode: a room member with `moderate_msg` capability can pin/unpin a
  message; a member without it sees no pin control (or gets a clear
  forbidden failure if forced).
- Real mode: any room member can VIEW the pinned list.
- Pin cap (50) surfaces a clear, non-generic error.
- A soft-deleted pinned message silently drops from the list (no broken-row
  UI).
- Pin/unpin success triggers a refetch, not a stale UI.
- `USE_MOCK=true` unchanged.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | repository test (exact paths, 201/204/404/409/429 mapping, list-shape mapping, deleted-message-skip behavior assumed from BE — mock fixture should mirror it) |
| Integration | real interceptor pipeline test |
| E2E | Storybook interaction — pin, unpin, cap-reached, forbidden (no capability), deleted-message-not-shown |
| Platform | `bun vitest run` zero-regression, `bun run build` mock+real |
| Release | merged to main, branch deleted |

## Harness Delta

- TEST_MATRIX row for pin/unpin/list real-mode.
- Close ask #32(b) in the FE→BE report.
- EPIC-OVERVIEW.md Wave 8 row.

## Evidence

### The `GroupEntity.pinnedMessages` decision — DELETE the field, not repoint it

**Decision:** `PinnedMessage` moved out of `group.entity.ts` into its own
`domain/entities/pinned-message.entity.ts`; `GroupEntity.pinnedMessages` and
`GroupResponseDto.pinnedMessages` are **deleted**; the board is read through a
new `IMessagingRepository.getPinnedMessages(conversationId)` +
`GetPinnedMessagesUseCase` + `getPinnedMessagesAction`, and rendered from new
`pinnedMessages` / `pinnedLoading` / `pinnedError` props threaded
screen → `ChatWindow` → `GroupInfoPanel` → `PinnedMessageRow`.

**Reasoning (after reading both consumers):**

1. **The two resources have different gates.** Reading the board needs only room
   MEMBERSHIP; pin/unpin need `moderate_msg`. A field on the group entity implies
   one authorization story for both, which is wrong on the real contract.
2. **Keeping it embedded would have shipped a fake.** `getGroup()` is still
   force-mocked (no real group-detail contract — US-E18.50). Populating
   `pinnedMessages` from the mock while pin/unpin write to the REAL service would
   have rendered mock pins next to real writes — the "mock reads behind real
   writes" defect class this epic already paid for once (US-E18.31). Composing a
   real board fetch INTO the mock group entity at the DI/use-case layer would
   have been just as wrong in the other direction: it would couple a real read's
   availability (and its shared 429 quota) to a mock read's lifecycle, and it
   would keep the board unreachable for DM rooms, which the real endpoint
   happily serves.
3. **The pin board has its own async lifecycle.** It loads, empties, fails
   (429/403) and REFETCHES (after every pin/unpin — there is no realtime signal)
   independently of group detail. As an entity field it had no way to express
   loading or error; as its own query it has all four states, and the panel now
   degrades only its pinned section on a board read failure.
4. **Cost was contained.** No consumer read `pinnedMessages` other than
   `group-info-panel.tsx` (via `pinned-message-row.tsx`), so the change is a prop
   reshape plus fixtures/stories — not a UI redesign.

### Ground-truth findings beyond the packet (verified in `edu-api` Go source)

- **`senderName` is always `""` on the pin board.** `list_pinned_messages.go`
  calls `toMessageDTO(msg, "")` — the sender's display name is stamped from the
  SENDER's claims at send time and never persisted. (The Go
  `httpdto.MessageResponse` DOES emit `senderName`; `openapi.yaml`'s `Message`
  schema omits it — a drift.) Consequences: `PinnedMessage.senderName` is
  OPTIONAL, the mapper treats `""` as absent (never a placeholder minted in
  infrastructure), and presentation renders `messaging.groupInfo.unknownSender`.
  Filed as follow-up ask **#32(b′)**.
- **No room capability exists on the wire.** `RoomSummary` carries no caller
  role, so `selfIsGroupAdmin` (a mock-era field) is `undefined` in real mode.
  With the old `pinDisabled = isGroup && !selfIsGroupAdmin`, every real-mode
  group would have shown a permanently DEAD pin control. The gate is now
  tri-state: `undefined` = unknown ⇒ enabled + reactive 403 → `pin-forbidden`;
  only an explicit `false` (mock world) disables. Same rule for the new unpin
  affordance (`canUnpin !== false`).
- **Unpin had no UI at all.** The AC "can pin/unpin" was previously unexercisable,
  so a `PinOff` control (44×44, Vietnamese `aria-label`) was added to each pin-board
  row. Unpin deliberately does not require the message to still exist.
- **Read-403 ≠ pin-403.** A 403 on the board read is a membership problem, not a
  capability problem, so it maps to `load-pinned-failed` (code as `cause`), NOT
  `pin-forbidden`. Asserted by a dedicated test.
- **429 reuse.** The board shares message-history's 120/min quota, so it reuses
  history's mapping shape verbatim (`{type: "load-pinned-failed", cause: CODE}`)
  — no parallel rate-limit failure type was invented.
- **Feed post-pin stayed untouched** (different service, different concept): no
  type, component, endpoint or failure is shared with `features/feed`.

### Implementation notes

- Query key `["messaging","pinned",<roomId>]`, enabled for the active GROUP
  conversation (not only while the panel is open) so the mutation-invalidation
  refetch can actually run — proven by a call-count assertion, not by "the panel
  refetches when reopened".
- The mock repository mirrors the real semantics (own board store, hard cap 50,
  already-pinned / not-pinned failures, membership-only read, self-healing
  skip of soft-deleted pins) so `USE_MOCK=true` behavior is unchanged in spirit
  and the cap/forbidden UI is exercisable without a backend.
- `messaging-error-key.ts` narrows a mutation rejection to a translatable key via
  an exhaustive `Record<MessagingFailure["type"], true>` — adding a failure member
  without i18n coverage is now a compile error.

### Proof (all commands run in this worktree)

| Command | Result |
| --- | --- |
| `bun vitest run` | **503 files / 3888 tests passed** (zero regression) |
| `bunx vitest run --config vitest.storybook.mts` | **157 files / 1247 tests passed** |
| `bunx tsc --noEmit` | clean |
| `bun lint` | 0 errors (1 warning + 1 info are pre-existing baseline, verified by stashing) |
| `bun run build` | clean (real/default env) |
| `NEXT_PUBLIC_USE_MOCK=true bun run build` | clean |

New/updated tests: `pinned-message.mapper.test.ts` (6),
`messaging.repository.test.ts` (+13 pin/unpin/board),
`messaging-pin.integration.test.ts` (6, real `unwrapResponse` + `normalizeError`),
`hybrid-messaging.repository.test.ts` (pin slice real, never mock),
`messaging.mock.repository.test.ts` (+5), `get-pinned-messages.use-case.test.ts` (2),
`unpin-message.use-case.test.ts` (3), `messaging-error-key.test.ts` (3),
and 8 Storybook interaction stories (pin success + refetch, cap-reached copy,
forbidden, unpin, deleted-pin absent, board load error, unknown sender, unpin
hidden for a known non-moderator).
