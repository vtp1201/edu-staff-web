---
name: us-e24.15-qa-patterns
description: US-E24.15 messaging merged-list QA — 6th accurate self-report; independent fixture-based sort re-verification pattern
metadata:
  type: project
---

US-E24.15 (Messaging: merge Direct+Group into one sorted list, header "Tạo nhóm mới"
icon button) — engineer's self-report was **fully accurate**: tsc clean, lint clean
(same pre-existing `message-context-menu.tsx` warning/info), `bun vitest run` 594→595
files (+1 mine)/5029→5033 tests (+4 mine), `vitest --config vitest.storybook.mts run`
173/1429→1430 (+1 mine), build compiled. Last US in the E24.12→13→15 chain.

**Independent re-verification pattern worth reusing**: the engineer's
`conversation-list.sort.test.ts` only exercises a synthetic `conv()` fixture helper —
it never sorts the REAL `MOCK_CONVERSATIONS` demo data. Wrote a fresh test importing
`MOCK_CONVERSATIONS` directly and asserting the exact sorted id order (computed by
hand from the 8 fixtures' `lastMessageAt` values) — this is what actually proves the
review-round `u5`/`g3` fixture fix (they'd been missing `lastMessageAt`, making the
default demo inbox look like a sort bug) lands in a sensible position, not just that
the comparator is correct in the abstract. Also added a Storybook story asserting
`role="status" aria-live="polite"` DOM attributes directly (not just the visible
`search.noResults` text) and that the node is NOT remounted across a state
transition (same node reference before/after typing a no-match query) — a remount
would silently defeat the SR announcement despite the attribute being "present".

Other things verified directly rather than trusting the packet: the optimistic
new-group-prepend story's positional guard (`ul > li > button` index 0, not
`getAllByText().length > 0`); `messaging-screen.tsx`'s default `activeId` now reads
`sortConversations(initialConversations)[0]?.id` (not raw array order); i18n dead-key
grep for `messaging.tabs.*`/`group.emptyTitle`/`group.emptyCreateCta`/
`search.noGroups` returned zero hits outside the JSON files themselves; design-spec
`groupChat.groupList.createCTA: null` with an inline comment documents the
supersession (no prior `supersededBy` convention existed in the file, engineer chose
`null` + comment — reasonable, no repeat pattern to enforce yet).

See also: [[us-e24-13-qa-patterns]], [[us-e24.3-qa-patterns]] for the sibling US-E24.x
DI/story conventions this chain reuses.
