---
name: us-e10.6-qa-patterns
description: US-E10.6 messaging presence indicator — QA verification patterns and the real gaps found (no-motion untested, AC-10.6.3.2 header-fetch spec violation)
metadata:
  type: project
---

US-E10.6 (messaging presence dot/caption/sort/count) — verified against `spec.md`
§9 + `use-cases.md` §4 (38 AC). CONDITIONAL PASS: 34/38 AC covered by real,
independently-verified tests (browser-run Storybook play() + vitest unit), 4
gaps found.

**Real gaps found (not self-reported by engineer):**
1. No-motion ACs (AC-10.6.1.9 / AC-10.6.2.7 / AC-10.6.4.10) have ZERO test
   assertion anywhere — not even a static-grep check, just a code *comment*
   ("No transition/animation..."). This is the exact "self-reported ≠ proof"
   trap the task brief warned about. Add: `expect(dot.className).not.toMatch(/transition|animate/)`.
2. AC-10.6.3.2 ("no presence-specific network call attributable to the group
   HEADER render itself; panel's own fetch is independent, only occurs if/when
   the panel is opened") is actually **violated by the implementation**:
   `messaging-screen.tsx`'s `groupPresence` query is `enabled: isGroup &&
   groupMemberIds.length > 0` — gated on the conversation being selected
   (header render), NOT on the info panel being opened. So opening ANY group
   chat triggers a presence fetch for the whole membership before the panel
   ever opens. This is a real spec/implementation mismatch, not just an
   "untestable-as-stated" edge case — flag it, don't wave it through.
3. AC-10.6.2.4 (presence UNAVAILABLE, i.e. `presence` field itself absent —
   INT-401 fetch failure/no record) has no dedicated chat-window story; only
   the offline-with-known-state variants (`HeaderOfflineWithBucket` /
   `HeaderOfflineNoCaption`) exist. Functionally the derivation collapses
   `undefined` to the same "offline, no caption" render path, but the AC names
   a distinct precondition (fetch failure) that was never independently
   exercised.
4. AC-10.6.4.4 (offline dimmed treatment, opacity-60/grayscale) and
   AC-10.6.4.6/.7 (atomic re-sort/re-count on refetch, loading progressive)
   have no dedicated presence-driven assertion in `group-info-panel.stories.tsx`
   — code review confirms the classes exist (`opacity-60 grayscale` conditional
   on `presence === "offline"`), but no test asserts them.

**What WAS solid:** `msgPresence()`/`presenceRank()`/`sortByPresence()`/
`isPresenceCountable()` pure-function unit tests are excellent (stable-sort
tiebreak, non-mutation, all 3 fallback paths). AC-10.6.2.3's OQ-1 resolution
(offline-with-bucket → "Hoạt động hôm qua" vs offline-no-bucket → null) is
properly split into TWO tests in `presence-caption.test.ts`, not conflated.
`event.test.ts` + `presence-invalidation.test.ts` gave real proof for
AC-10.6.6.1/.3/.4 via a real `QueryClient` + real `queryKeysFor()` (not mocked).

**Verification techniques used:**
- `git diff main..HEAD --stat -- <file>` on each of the 10 use-case tests +
  `conversation-item.test.ts` + `typing-indicator.test.ts` +
  `pane-visibility.test.ts` + `highlight-timer.test.ts` +
  `messaging.mock.repository.test.ts` → 9 files zero-diff, `conversation-item`
  additive-only (verified via full diff, not just stat) = real regression-guard
  proof for UC-10.6.5, cheaper than re-running everything.
- `bun vitest --config vitest.storybook.mts run --project=storybook <file...>`
  DOES work in this environment (contradicts an older memory note that said
  local Storybook browser runner fails — that was fixed by US-E17.2). Pass
  explicit file paths, not a `-t` regex filter (regex against test names, not
  paths, returns 0 files silently "skipped").
- Two pre-existing failures in `messaging-screen.stories.tsx`
  (`CreateGroup_Optimistic_Prepend`, `Reply_Strip_Active`) reproduced
  identically on a `git worktree add ... main` checkout with `bun install` —
  confirms baseline, not a regression from this US. Clean up the worktree after
  (`git worktree remove --force`).
