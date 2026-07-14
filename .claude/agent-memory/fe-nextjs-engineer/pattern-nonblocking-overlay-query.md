---
name: pattern-nonblocking-overlay-query
description: Additive presence/overlay data (US-E10.6) — separate non-blocking TanStack query merged into primary entities; shared query-key prefix enables SSE prefix-invalidation; separate DI repo per service
metadata:
  type: project
---

**Non-blocking overlay-query pattern** (US-E10.6 messaging presence): to layer
secondary data (presence) onto an already-implemented screen WITHOUT gating its
existing loading states:

- Give it its OWN small domain repo/use-case/DI factory when it belongs to a
  DIFFERENT service (presence = `noti`, messaging = `social`). Do NOT bolt onto
  the existing feature's repo interface. Reuse the feature's `Failure` union with
  one additive generic member (`load-presence-failed`) — the UI treats all
  overlay failures identically.
- Run a SEPARATE `useQuery` (no `initialData` coupling to the host query),
  `enabled` on id-set length, failure → resolve `[]` (safe default). Merge the
  records into the host entities via a pure `merge*(entities, records)` helper
  (skip merge when `records.length === 0`, return input). Derive `activeX` from
  the MERGED list so the header/detail view also gets the overlay.
- **Additive entity fields:** `presence?`/`lastActiveAt?` alongside legacy
  `isOnline` (never remove). Single derivation fn `msgPresence(x) = x.presence ||
  (x.isOnline ? 'online':'offline')` in `domain/entities/` — used by mock repo AND
  presentation, never re-implemented per site. Widening a `Failure` union forces a
  new `errors.<key>` in BOTH message files (typed t()), even if the UI never shows it.

**SSE prefix-invalidation:** put related queries under a shared key prefix
(`["messaging","presence","list"]` + `["messaging","presence","group",id]`); the
realtime event's `queryKeysFor()` returns the PREFIX `["messaging","presence"]` —
`invalidateQueries({queryKey: prefix})` in `use-realtime-events.ts` matches both.
Prove the live path with a node-env test: real `queryKeysFor()` → real QueryClient
→ assert `getQueryState(key).isInvalidated` (no DOM needed).

**Regression-guard discipline:** when a spec'd behavior change breaks an existing
story assertion (e.g. old "Đang online" subtitle → new presence caption), UPDATE
that assertion — but first `git worktree add <tmp> main` + run the story there to
confirm any OTHER failures are pre-existing baseline (messaging-screen had 2
unrelated SB failures on main: focus + create-group). Only own the delta you cause.
