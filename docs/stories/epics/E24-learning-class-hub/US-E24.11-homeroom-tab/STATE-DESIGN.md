# US-E24.11 State Design — remount-key question (fe-state-engineer)

Owner: fe-state-engineer. Answers the open question raised by
`COMPONENT-ARCHITECTURE.md` §4 / "Open items" #1: does `router.refresh()`
after a 403 on approve/reject reliably reseed `pending-leave-card.tsx`'s local
`useState<LeaveRequestEntity[]>` list, or does `homeroom-tab.tsx` need a
`key` analogous to `TimetableTab`'s `key={vm.weekParam}` (fixed in US-E24.9)?

No code written here — this is a design decision + rationale only.

## 1. Answer

**Yes, `homeroom-tab.tsx` needs an explicit remount key on `PendingLeaveCard`.
`router.refresh()` alone is NOT sufficient** — same root cause as the US-E24.9
bug, just triggered a different way. **Fix: key `PendingLeaveCard` on a
content-derived signature of `vm.leave.data.requests` (sorted joined ids), NOT
`vm.weekParam`-style — there is no URL param to borrow here.**

## 2. Why `router.refresh()` does not reseed by itself

`router.refresh()` re-runs the current route's RSC tree on the server and
merges the new payload into the existing client tree via React reconciliation.
Reconciliation preserves a component instance (and therefore its internal
`useState`) whenever the **same component type sits at the same position** in
the **same parent** across the two renders — it does not matter that the
*props* passed to that instance changed. `useState(initial)` (or
`useState<LeaveRequestEntity[]>(vm.requests)`) only evaluates its initializer
on the very first mount; a prop change on an already-mounted instance is
silently ignored by `useState`.

In the homeroom tab: `page.tsx` → `<HomeroomTab vm actions>` (RSC) →
`<PendingLeaveCard vm={vm.leave.data} .../>` (client) sits at a **fixed
position** in the tree (assuming `vm.leave.ok` stays `true` across the
refresh, i.e. no card-level error toggling). A `router.refresh()` re-fetches
`page.tsx`'s `Promise.allSettled` server-side, produces a **new**
`vm.leave.data.requests` array, but React sees "same component type, same
slot" and reuses the mounted `PendingLeaveCard` instance — it patches props,
it does **not** remount, so the internal `list` state (last written by the
optimistic `setList` calls) stays exactly as it was **before** the refresh.
The refresh becomes a no-op from the user's point of view.

This is the identical mechanism `PLAN`/architect flagged for `TimetableTab` in
US-E24.9 (fixed with `key={vm.weekParam}`) — the trigger differs (there, a
`?week=` URL change; here, an in-place `router.refresh()` with no URL change),
but the underlying React behavior ("prop change alone never resets `useState`
without a key/identity change") is the same, and this codebase already has a
documented precedent (the E24.9 fix + its code comment in
`timetable-tab.tsx`) for exactly this failure class.

## 3. Why this is worse than "no-op" in one case, harmless in another

Split the 403 path into the two situations the task asked to analyze:

### 3a. No concurrent divergence (the common case)

The GVCN's own approve/reject call gets a `403 forbidden` (e.g. their
`homeroomClassIds` no longer includes this `classId` — a mid-session role/
assignment change). **No mutation happened** on the server (decision `0063`'s
whole point: the use-case returns `forbidden` before ever calling
`repo.approveLeave`/`.rejectLeave`, OR the real endpoint 403s before writing).
So the server's list is **identical** to what was already fetched and is
already sitting in `list` (nothing was removed locally either, since removal
only happens in the `res.ok` branch). In this sub-case, "refresh does nothing"
is **invisible** — stale state and true state are equal, so the missing
remount causes no observable bug. This is why `leave-tab.tsx`'s existing
pattern (toast-only, no refresh at all, confirmed by reading the file) has
never surfaced this — its error path never depended on a resync.

### 3b. Concurrent divergence (the case that actually matters)

Something else changed the server's leave-request set between this card's
initial mount and the failed action — e.g. another GVCN/co-teacher approved
or rejected the *same* item from a different tab/device, or the teacher's
homeroom assignment changed mid-session (which is precisely the scenario that
*causes* a 403 here — a scope check failing implies the teacher/class
relationship the client cached is now wrong, i.e. the client's picture of
"what I can act on" is already known-stale at the moment of the 403). In this
case the local `list` **actively diverges** from server truth: it may still
show an item that was already resolved elsewhere, or be missing context about
why the action failed. The AC's own contract — "403 → toast lỗi + refetch" —
exists specifically to cover this divergence, not the no-op case. Without a
remount, "refetch" silently does not happen: the fetch runs, the data comes
back, and then gets discarded by React's reconciliation because nothing forced
a new component instance to consume it. This is a **silent-data-staleness**
bug of the same shape flagged as a real bug in US-E24.9 (there: silent
overwrite risk on a full-replace PUT; here: silent staleness on a read-list
after a failed write) — same root cause, different blast radius (read-staleness
here, not a write-clobber, since there's no PUT in this flow).

## 4. Why `key={vm.weekParam}`'s exact shape does not transfer

`TimetableTab` has a natural, pre-existing identity signal that changes
exactly when the underlying data set changes: the `?week=` URL param. Keying
on it is cheap and precise — `?week=` changes if and only if a new week's data
is being shown, one key value per distinct dataset, no extra computation.

The homeroom tab has **no such param**. `?tab=homeroom` does not change
between the initial load and a post-mutation `router.refresh()` (it's the same
navigation target, not a new one) — using it as a key would never change,
i.e. it would never force a remount, defeating the purpose. There is no other
URL-carried identity (no `date=`, no `week=`) for this tab's data.

**Resolution: key on the data itself**, not a URL param:

```
key={vm.leave.ok ? vm.leave.data.requests.map(r => r.id).sort().join(",") : "error"}
```

placed on `<PendingLeaveCard>` in `homeroom-tab.tsx`, i.e. the exact same
placement pattern as `TimetableTab`'s `key={vm.weekParam}` on
`<TimetableTabBody>` — a key on the **client boundary's** wrapper, supplied by
the **RSC parent** that already recomputes fresh data on every render/refresh.

Why a content-derived key is the correct substitute for a URL param here:

- It changes if and only if the **set of pending-leave-request ids** the
  server currently reports differs from what was last rendered — which is
  exactly the condition under which the mounted `list` state could be stale
  relative to truth. This covers §3b (id set changed → new key → remount →
  fresh `useState` seed from the new `vm.requests`) while leaving §3a alone
  (id set unchanged → same key → no remount → no wasted work, and no risk,
  since state and truth already agree).
- It does not fire on every `router.refresh()` unconditionally (a
  `Date.now()`-based key would) — an unconditional key would also remount on
  a same-data refresh, needlessly discarding in-flight UI state (e.g. an open
  `RejectLeaveDialog` on a *different* row than the one just resolved) for no
  correctness benefit. Content-keying only remounts when it must.
- Sorting the ids before joining makes the key order-independent, so a
  server-side re-ordering of the same set (not expected here, but the API
  makes no ordering guarantee) doesn't cause a spurious remount.

## 5. Scope of the fix (contract-level, no code)

- `homeroom-tab.tsx` (RSC, already the file that switches `vm.leave.ok`) is
  the correct owner of the key — same responsibility split as `TimetableTab`:
  the **RSC container computes the key from data it already has**, the client
  leaf (`PendingLeaveCard`) stays unaware of remount mechanics, identical to
  how `TimetableTabBody` never references `weekParam` itself.
- No prop-contract change to `PendingLeaveCardVm`/`PendingLeaveCardProps` is
  needed — the key is a JSX attribute on the call site, not a prop threaded
  into the component.
- Add one line to `homeroom-tab.tsx`'s file doc-comment (mirrors
  `timetable-tab.tsx`'s existing comment block) explaining the key's purpose,
  so a future edit doesn't "clean it up" as dead code — this is the exact
  failure mode that shipped once already (US-E24.9's bug was found at review,
  not before).
- **Test to add** (Storybook interaction, extends the plan's existing
  `homeroom-tab.stories.tsx` list): a `reject-then-forbidden-resync` (or
  similar) story/interaction that (a) renders with an initial leave list, (b)
  simulates a 403 action result via a mocked action that also returns a
  *different* `requests` set on the subsequent server read (i.e. two renders
  of `HomeroomTab` with different `vm.leave.data.requests` id sets), (c)
  asserts the second render's list reflects the NEW ids, not the stale local
  ones. This is the regression test the E24.9 bug did not have until after
  review — worth writing test-first here per `tdd.md`.

## 6. One-line summary for the packet

`router.refresh()` re-renders `PendingLeaveCard` with new props but does not
remount it (same component type/position ⇒ React preserves `useState`) —
identical mechanism to the US-E24.9 bug. Fix: `homeroom-tab.tsx` must key
`<PendingLeaveCard>` on a content-derived signature of
`vm.leave.data.requests` ids (not `vm.weekParam` — no equivalent URL param
exists here), so a genuine server-side divergence (concurrent
approve/reject, or the scope change that produced the 403 itself) forces a
fresh `useState` seed, while a same-data refresh (the common 403 case) causes
no unnecessary remount.
