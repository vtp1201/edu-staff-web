---
name: pattern-seed-resync-and-live-region
description: RSC-seeded client list goes stale forever without a render-phase seed-key sync; a 2nd always-on role=status region breaks sibling getByRole("status") stories
metadata:
  type: feedback
---

**A client list seeded from an RSC prop with plain `useState` is stale for the whole session** —
no remount happens when a Server Action revalidates and the page re-renders with a new seed.
Fix with the repo's render-phase key-sync idiom (`grade-entry-screen.tsx` sheet sync):
`const k = key(seed); const [syncKey, setSyncKey] = useState(k); if (syncKey !== k) { setSyncKey(k); setItems(seed.items); … }`.

- **Why:** US-E18.46 review — approving the last pending cell of a tuple left that tuple in the
  "waiting on you" queue permanently. The seed IS how the list learns the mutation landed.
- **How to apply:** any `useState(seedProp)` in a component whose parent revalidates. Put the key
  in its OWN pure framework-free module (`*-seed-key.ts`) so "what counts as a different seed" is
  unit-testable; hash the FIELDS that a partial mutation changes (e.g. `pendingCount`), not just
  ids/length — a partial approve only shrinks a count. Re-render proof needs a Storybook story
  with a small stateful harness (`render: () => <ReseedHarness/>`) that swaps the seed of the
  MOUNTED component; there is no `@testing-library/react` in this repo.

**Pagination:** never infer "first page" from `cursor === null` inside `fetchPage`. A
`hasMore: true` + null `nextCursor` response then silently REPLACES every accumulated page. Take
an explicit `"first" | "append"` mode, no-op an append with a null cursor, and render
`LoadMoreButton` with `hasMore && cursor !== null`.

**Gotcha — a second `role="status"`:** adding an always-mounted `sr-only`
`role="status" aria-live="polite"` announcer (correct: the region must exist EMPTY before the
update to be announced) makes every sibling story's `canvas.getByRole("status")` throw
"Found multiple elements". Expect to narrow those queries
(`getAllByRole("status").find(el => el.textContent?.includes(…))`) — the unit suite stays green,
only the Storybook suite catches it, so run `bunx vitest run --config vitest.storybook.mts` FULL
(not just the new file) after adding a live region.

**Gotcha — `aria-label` hides the row body:** a row button whose `aria-label` restates the row
drops anything not in the template. Any triage signal shown visibly (relative wait time, badge
count) must be a param of that i18n key too, and computed ONCE into a local const so the label
and the visible text cannot drift.

Related: [[pattern-shared-list-states]], [[pattern-rsc-seeded-infinite-query]],
[[gotcha-initialdata-observer-scoped]].
