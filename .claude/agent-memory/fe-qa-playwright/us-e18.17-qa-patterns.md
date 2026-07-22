---
name: us-e18.17-qa-patterns
description: QA patterns for messaging rooms/DMs contract-first remap (real repo test recipe, delete-window boundary testing, wiring-not-just-render spy pattern)
metadata:
  type: project
---

US-E18.17 (messaging real `social` contract remap, ADR 0060) — engineer's self-report of
"covered" was accurate at the repository/use-case layer this time (rare clean baseline), but
still had two real gaps at the boundary/wiring layer:

1. **Boundary-only tests, not the boundary itself.** `delete-message.use-case.test.ts` tested
   4min-inside / 6min-outside of the 5-minute `DELETE_WINDOW_EXPIRED` window but never asserted
   the actual boundary (exactly 5:00 allowed, 5:00:01 expired). The use-case's `> FIVE_MINUTES_MS`
   comparison is easy to get off-by-one on later refactors — always add exact-boundary tests
   (299999ms/300000ms/300001ms style), not just "clearly inside/outside" fixtures.

2. **Story args citing a callback ≠ proof it's invoked with the right data.** Both new
   `IMessagingRepository` methods this US added (`markConversationRead`, `sendTypingIndicator`)
   were wired into `messaging-screen.tsx` (mark-read on conversation-select useEffect,
   throttled typing on composer onChange) but the existing Storybook stories only passed
   `async () => ({ ok: true })` as the action prop — zero assertion that it's called, and with
   what argument. Added `MarkConversationRead_OnSelect` (selects a 2nd conversation, asserts
   `fn` called with the NEW conversation id, not just the initial mount's id) and
   `SendTypingIndicator_OnCompose` (types 3 chars, asserts throttled to exactly 1 call with
   `(roomId, true)`) using `fn()` from `storybook/test` as the action prop + `args.actionProp`
   read back in `play()`. See [story-play-gap-pattern](story-play-gap-pattern.md) — this is the
   same "renders" vs "invoked correctly" gap that recurs across most stories in this repo.

Gotcha: `fn(async () => ({ ok: true }))` as an arg default fails `tsc` because TS narrows the
inline object literal's `ok: boolean` against the `ActionResult` discriminated union (needs
`errorKey` on the `false` branch) — must annotate the arrow's return type explicitly
(`async (): Promise<ActionResult> => ({ ok: true })`) to get literal-type narrowing.

Other checks that were clean (no gap): hybrid-repository test asserts BOTH directions (real
slice → real repo, permanently-mock slice → mock repo, never crossing) in one file — good
template for future "partial real wiring" hybrid repos; repository-level error-code→failure
mapping test covers every AC'd code (DELETE_WINDOW_EXPIRED, ROOM_DM_ROLE_PAIR_NOT_ALLOWED, 429
typing-rate-limit-as-Result-not-throw, multi-party createConversation rejected with zero HTTP
call). `bun vitest run` was 2490/2490 before my additions, 2492/2492 after (my 2 new
delete-window boundary tests) — matches the reported headline exactly, good sign the reported
number wasn't stale.

Pre-existing baseline failures in this file's Storybook suite (unrelated to this US, confirmed
via `git stash`): `Create Group Optimistic Prepend` and `Reply Strip Active` — matches
[US-E17.3 pattern](us-e17.3-qa-patterns.md), still true as of this US.
