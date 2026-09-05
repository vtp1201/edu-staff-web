---
name: feedback-optimistic-update-no-usestate-mirror
description: For RSC+Server-Action screens (no TanStack), this repo's established "optimistic" pattern is await-then-upsert into local useState, not React 19 useOptimistic
metadata:
  type: feedback
---

For screens using the RSC + Server Action + `revalidatePath` model (no
TanStack Query), the established, repo-wide convention for instant post-save
UI feedback is: **await the Server Action, then on `{ok:true}` merge the
returned entity into a local `useState` map/list** (`ClassLogScreen`'s
`localEntries` + `upsert()`; `LeaveRequestSheet`'s `onSubmitted?(input)`
callback consumed by `StudentConductScreen`). This is NOT true optimism (no
client-guessed value shown before the response), but it is the pattern this
codebase actually uses and is sufficient because the round trip is a single
PUT/DELETE.

**Why:** Designed state architecture for US-E24.9 (timetable tab: period-log/
period-prep/homeroom-entries) and had to choose between React 19
`useOptimistic` (available — React 19.2.7, Next 16.2.7 — but zero precedent
anywhere in this codebase) vs. the plain-`useState`-upsert pattern already
proven in `class-log` and `discipline` features. `useOptimistic`'s
rollback-on-mismatch semantics solve "show a guessed value, revert if the
server disagrees" — a problem this repo's screens don't have, since the
"optimistic" value is always the real awaited response, never a pre-request
guess.

**How to apply:** When a story's Design Notes say "no TanStack" for a
mutation-heavy screen, default to the `useState`-mirror-seeded-from-server-
props + `onSubmitted`-callback-upsert shape, NOT `useOptimistic`, unless the
UX genuinely needs to show a value BEFORE the request resolves (e.g. a
reaction toggle with sub-100ms perceived-latency requirements — that class of
UI in this repo actually uses TanStack `useMutation` with real `onMutate`
optimism instead, see `docs/stories/epics/E19-social/US-E19.1-social-feed/state-design.md`
§6). Also: when a single client subtree renders TWO surfaces derived from the
same server data (e.g. a day-grid AND a summary/aside panel), lift the
mirrored map ONE level above both — don't let each surface hold its own
disconnected local copy, or the sibling not directly under the saving form
goes stale until next navigation.
