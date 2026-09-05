---
name: feedback-content-derived-remount-key
description: When a client leaf's useState is seeded from RSC props but the resync trigger is router.refresh() (not a URL param), key it on a content-derived signature, not a copy of the weekParam pattern
metadata:
  type: feedback
---

Extends [[reference-nextjs-server-action-error-boundary]] territory: a client
component whose `useState(initial)` is seeded from RSC props needs a `key` on
its wrapper for the state to reseed after data changes underneath it — this
was already established for `TimetableTab` (US-E24.9, `key={vm.weekParam}`,
fixed after a real bug: prop change alone never resets `useState` without a
key/identity change, since React reconciliation reuses the same component
instance at the same tree position).

**Why this needs its own entry:** `weekParam` works because a URL query param
(`?week=`) is the natural, pre-existing identity signal — it changes exactly
when the underlying dataset changes. Not every screen has one. US-E24.11's
`pending-leave-card.tsx` resyncs via `router.refresh()` after a 403 (no URL
param changes at all — same route, just re-fetched). Keying on something that
never changes (e.g. `?tab=homeroom`) would never force a remount, silently
defeating the "403 → refetch" AC — the exact same failure mode as the E24.9
bug, just reached via a different trigger (in-place refresh instead of
navigation).

**How to apply:** When a client leaf mirrors server-list state (`useState`
seeded once) and the resync mechanism is `router.refresh()` rather than a URL
param change, key the leaf's wrapper on a **content-derived signature** of the
list instead — e.g. `vm.items.map(i => i.id).sort().join(",")` — not a
timestamp (remounts even when nothing changed, discarding sibling UI state
like an open dialog) and not a borrowed URL param that doesn't actually vary
with this data. Content-keying remounts exactly when the id set diverges from
what's mounted, and is a no-op when the refresh returns the same set (the
common case — e.g. the action's own scope-check failed before any mutation,
so server truth never changed). Always place the key on the RSC parent's JSX
for the client child, mirroring `TimetableTab`'s split (RSC computes/owns the
key; the client leaf never references it).
