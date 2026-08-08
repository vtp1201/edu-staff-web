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

(fe-nextjs-engineer / fe-tech-lead-reviewer fill in below as work proceeds.)
