# US-E18.58 Pin-board `senderName` real + literal-sentinel localization

## Status

in-progress

## Lane

tiny

> Text/copy-mapping fix, no behavior/architecture change, no new RBAC/token
> surface — tiny lane per Feature Intake (`fe-nextjs-engineer` →
> `fe-tech-lead-reviewer` → design-review gate only, no a11y/QA agents
> required, though the reviewer should sanity-check the i18n fallback logic).

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm: `src/features/messaging/` (pin-board slice: mapper, entity doc, `pinned-message-row.tsx`)
- Shared contract/file: none new

## Ground truth (BE response 2026-08-08 §4, edu-api main `b5a13cc1`)

`GET /social/api/v1/rooms/{roomId}/pinned-messages` — `pins[].message.senderName`:

- Now **resolved server-side** from the member projection (memoized per
  sender per request) — a REAL display name, not `""`.
- **Never an empty string anymore.**
- Sender not yet projected (event lag / brand-new user) → the **literal
  sentinel string `"Member"`** (BE's own generic placeholder, same "Variant B"
  convention other directory endpoints already emit) — NOT empty, NOT a name
  to render verbatim in one locale only. FE must localize this sentinel the
  same way it already localizes the "no name" case, not print the English
  word "Member" to a Vietnamese-locale user.
- **Scope is ONLY the pin board.** `get_message_history` / `search_room_
  messages` / `edit_message` still return `senderName: ""` (unchanged
  `toMessageDTO(m, "")` pattern) — do not touch history/search/edit mapping
  in this story; they resolve names from the room directory, a completely
  separate mechanism this US does not change.
- `services/social/docs/openapi.yaml`'s `Message` schema gained a documented
  (additive, non-`required`) `senderName` field — a pre-existing drift fix,
  no FE action needed beyond consuming the field that Go always emitted.

## Current state (read before touching anything)

- `pinned-message.mapper.ts#toPinnedMessages()`:
  ```ts
  const senderName = msg.senderName?.trim();
  rows.push({ ..., ...(senderName ? { senderName } : {}) });
  ```
  This ALREADY treats an empty/whitespace string as "absent" (spreads nothing
  → `senderName` key omitted → entity's `senderName?` stays `undefined`).
  `pinned-message-row.tsx` renders `pinned.senderName ?? t("unknownSender")`.
  **This existing fallback mechanism is exactly what should also catch the
  new `"Member"` sentinel** — no new UI branch is needed, only teaching the
  mapper that `"Member"` (in addition to `""`) means "treat as absent."
- Doc comments in the mapper, the `PinnedMessage` entity, and
  `pinned-message-row.tsx` currently assert "senderName is `\`\`\` on every
  pin-board row (not persisted server-side)" — this is now FALSE and must be
  corrected (stale doc = the next reader ships a regression).

## Scope

1. `pinned-message.mapper.ts`: extend the "treat as absent" check from just
   an empty/whitespace string to ALSO the exact literal `"Member"` sentinel.
   Prefer a small named constant/helper over an inline second condition, e.g.:
   ```ts
   /** BE's generic placeholder for an unresolved sender (US-E18.58, BE US-205) — not a real name, never rendered verbatim. */
   const UNRESOLVED_SENDER_SENTINEL = "Member";
   function isRealSenderName(raw: string | undefined): raw is string {
     const trimmed = raw?.trim();
     return !!trimmed && trimmed !== UNRESOLVED_SENDER_SENTINEL;
   }
   ```
   and use it in place of the current `senderName ? {...} : {}` truthiness
   check. Exact string match only (case-sensitive, no locale folding) — this
   is a BE sentinel contract, not user input to fuzz-match.
2. Update the stale doc comments (mapper, `PinnedMessage.senderName` in
   `pinned-message.entity.ts`, `pinned-message-row.tsx`'s file comment) to
   describe the REAL contract: server-resolved name, OR the `"Member"`
   sentinel for an unprojected sender, both mapped through the SAME "absent →
   i18n fallback" path — never the case anymore that it's unconditionally
   empty.
3. No change needed to `pinned-message-row.tsx` itself (its `?? t("unknownSender")`
   fallback already does the right thing once the mapper normalizes both
   "absent" cases to `undefined`) — confirm this by reading it, don't add a
   redundant second check there.
4. Do NOT touch `get_message_history`/search/edit mapping — grep to confirm
   there is no shared mapper between pin-board messages and history messages
   that this change would accidentally affect (the PR summary above states
   pin-board embeds `RoomMessageResponseDto` — check whether history also
   maps through the SAME dto type but a DIFFERENT mapper function, and if so
   confirm this change only touches the pin-board mapper, not a shared one).

## NOT in scope

- History/search/edit `senderName` resolution (unchanged, out of scope).
- Any visual redesign of the pinned-message row.
- The `openapi.yaml` drift fix (BE-side, already done).

## Acceptance Criteria

- A real, resolved sender name renders verbatim on the pin board.
- An unresolved sender (`"Member"` sentinel from BE) renders the EXISTING
  localized `unknownSender`/`unknownSender` aria-label fallback — never the
  literal English word "Member".
- An (unexpected, defensive) empty string still falls back the same way
  (regression guard for the old contract, cheap to keep).
- History/search/edit rendering is byte-identical to before this story
  (regression guard).

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `pinned-message.mapper.test.ts` — 3 cases: real name passes through, `"Member"` sentinel → `senderName` key absent, empty string → `senderName` key absent (regression) |
| Integration | `messaging-pin.integration.test.ts` — update/extend if it asserts the old empty-string contract |
| E2E | Storybook interaction for `pinned-message-row` (or the group-info-panel story that renders it) — one story with a resolved name, one with the sentinel/fallback |
| Platform | `bun vitest run` zero-regression, `bunx tsc --noEmit`, `bun lint`, `bun run build` |
| Release | merged to main, branch deleted |

## Harness Delta

- `harness-cli story update --id US-E18.58 --status implemented --unit 1 --integration 1 --e2e 1 --platform 1` once proof exists.
- Mark ask #32(b′) answered/closed in the batch consumption report.

## Evidence

### fe-nextjs-engineer — 2026-08-08

**Change (mapper only, no UI branch added).**
`pinned-message.mapper.ts` gained a module-private
`UNRESOLVED_SENDER_SENTINEL = "Member"` + `isRealSenderName()` type guard
(trim → non-empty → `!== sentinel`, exact & case-sensitive) replacing the inline
`senderName ? {…} : {}` truthiness spread. Both "absent" causes (BE sentinel,
defensive blank) now normalise to `senderName: undefined` and flow through the
ONE existing presentation fallback.

`pinned-message-row.tsx` render logic untouched — read it first and confirmed
`pinned.senderName ?? t("unknownSender")` (line ~43) and the `unpinAria` label
(line ~56) already handle `undefined`; no redundant second check added. Only its
file doc comment changed.

**Stale docs corrected** (all asserted "senderName is `""` / has no wire source"):
- `pinned-message.mapper.ts` inline comment
- `pinned-message.entity.ts` → `PinnedMessage.senderName` TSDoc
- `pinned-message-row.tsx` file comment
- `room-message-response.dto.ts` → `senderName` TSDoc, now stating the split
  explicitly: pin board = server-resolved (real name or `"Member"` sentinel);
  history / search / edit = still `toMessageDTO(m, "")` = `""`, unchanged.

**History/search/edit confirmed untouched (scope item 4).** `grep -rn "senderName" src/`:
the pin board and message history share the DTO **type**
(`RoomMessageResponseDto`, embedded as `PinnedMessageResponseDto.message`) but
NOT a mapper. History/search/edit go through
`messaging.mapper.ts#toMessageEntityFromRoom(dto, currentUserId)` — called from
`messaging.repository.ts` L171 (history) and L194 (send/edit) — which does not
map `senderName` at all (the field is simply not read; `MessageEntity.senderName`
stays `undefined` and the chat bubble renders that case). The pin board is the
only caller of `pinned-message.mapper.ts#toPinnedMessages`. So there is NO shared
mapper; this change is structurally incapable of reaching history/search/edit.
Regression also covered by the untouched `messaging.mapper.test.ts` (L293 asserts
`senderName` undefined) staying green.

**Tests (red → green).**
- RED first: 4 new failing assertions —
  `bun vitest run <mapper.test> <pin.integration.test>` →
  `Test Files 2 failed | Tests 4 failed | 12 passed (16)`, e.g.
  `expected [ 'messageId', 'senderId', …(5) ] to not include 'senderName'` at
  `pinned-message.mapper.test.ts:57` (`"Member"` case).
- Unit `pinned-message.mapper.test.ts` (+4 cases, now 9): resolved name passes
  through verbatim; `"Member"` → key absent; `"  Member  "` (padded) → key
  absent; `"Member Nguyễn"` (real name containing the word) → passes through
  (proves exact-match, not `includes`); `""` → key absent (regression guard).
- Integration `messaging-pin.integration.test.ts`: fixture flipped from the dead
  `senderName: ""` contract to `"Member"`; renamed the assertion to
  "never renders the unresolved-sender sentinel as a name"; added a second case
  asserting a resolved `"Cô Lan"` reaches the entity through the real
  interceptor pipeline.
- Storybook `group-info-panel.stories.tsx`: extended the existing
  `GroupInfoPanel_PinnedUnknownSender` (now also asserts the literal "Member" is
  NOT in the DOM) and added `GroupInfoPanel_PinnedResolvedSender` (resolved name
  renders verbatim, no fallback text). The resolved-name story uses a sender NOT
  in the member list ("Cô Lan Anh") because member rows render names too —
  the first attempt failed on `Found multiple elements with the text`.

**Proof commands actually run.**
| Command | Result |
| --- | --- |
| `bun vitest run` (full suite) | **518 files / 4090 tests passed** |
| `bun vitest run --config vitest.storybook.mts src/features/messaging/presentation/group-info-panel/group-info-panel.stories.tsx` | **17 passed** (incl. both pin-sender stories) |
| `bunx tsc --noEmit` | clean |
| `bun lint` | no new findings — 1 warning + 1 info, both pre-existing in `message-context-menu.tsx` (untouched by this story) |
| `bun run build` (real mode) | success |
| `NEXT_PUBLIC_USE_MOCK=true bun run build` | success |

**No decisions flagged** — no new token, no contract gap, no architecture change.
The i18n fallback reuses the existing `messaging.groupInfo.unknownSender` /
`unpinAria` keys; no new i18n keys were needed.
