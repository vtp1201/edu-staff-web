---
name: feedback-concurrent-agent-file-collision
description: A resumed background subagent can keep working on files after fe-lead also starts self-fixing the same finding — check git status/diff before editing, and don't assume "waiting" means idle
metadata:
  type: feedback
---

When a spawned agent (e.g. `fe-nextjs-engineer`) is resumed via `SendMessage`
with a fix request, it may continue editing files in the shared working tree
in the background WHILE `fe-lead` is also independently trying to fix the
same finding directly (via its own Edit tool). This happened twice in one
session (US-E21.1): once on `tag-chips-input.tsx` (duplicate `invalidDescribedBy`
prop from both edits landing), once on `send-invitation-dialog.tsx`/
`invitation-expiry-select.tsx` (DEF-1 fix — saw a live mid-edit placeholder
`onEscapeKeyDown={() => {}}` appear while investigating).

**Why:** there is no file-locking between an active background agent and the
main session's own tool calls — both operate on the same checkout. A "waiting
for agent" turn is not necessarily idle; the coordinator (main session) may
also nudge fe-lead not to wait, creating two writers on the same file at once.

**How to apply:**
1. Before editing a file to fix a finding you already delegated to a
   subagent, run `git status --short` / re-`Read` the file first — if it's
   already modified in a way that suggests active work (partial/placeholder
   code), STOP editing that file yourself; send a message describing exactly
   what you were about to do and let the agent finish, or wait for its
   completion notification instead.
2. If a collision already happened (duplicate props, half-applied fix), fix
   the merge conflict directly by reading the actual current file content
   (not from memory of what you last wrote) and removing the duplicate —
   don't just re-apply your own version on top.
3. When genuinely unsure whether a "waiting" subagent is stalled or still
   working, the fastest ground truth is `git log --oneline <branch>` — a
   fresh commit means it finished a step; no new commit + a mid-edit file
   diff means it's actively still working, not stalled.
4. For a real production bug (not just lint/contrast), a naive fix (e.g.
   `event.preventDefault()` on an outer Dialog's `onEscapeKeyDown` to guard
   against a nested Radix `Select`/`Popover` closing it) can silently break
   the INNER component's own close behavior too, if both rely on checking
   the same native event's `defaultPrevented` flag with no coordination. The
   robust fix for "nested Radix overlay Escape should close only the inner
   one" is: make the inner overlay's `open` state fully controlled by the
   parent, and intercept `Escape` via a `document`-level CAPTURE-phase
   listener (added in a `useEffect` gated on the inner overlay's open state)
   that does `stopPropagation()` + `preventDefault()` + closes the inner
   overlay manually — this runs before either component's own bubble-phase
   handler, sidestepping the event-ordering ambiguity entirely. See
   `send-invitation-dialog.tsx`/`invitation-expiry-select.tsx` (US-E21.1,
   DEF-1) for the applied pattern.
