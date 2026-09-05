---
name: reference-one-way-mutation-reducer-pattern
description: Local useReducer state machine pattern for irreversible/one-shot Server Action mutations (submit-once flows) with 409-race and revalidatePath handling
metadata:
  type: reference
---

For a one-way, non-retractable mutation (e.g. assignment submission, "submit once")
gated behind a confirm step, model client state as a local `useReducer` in the owning
leaf component — NOT lifted to a parent, NOT a global store, NOT TanStack Query (no
mutation cache needed since there's nothing to invalidate/refetch client-side; server
state sync happens via RSC).

States: `idle → ready → confirming → submitting → submitted | error:<kind>`. Only the
`confirming → submitting` transition (plus retry from `error:network`) may call the
Server Action — the initial CTA in `ready` only flips to `confirming`, never touches
the network. This is the actual safety boundary, distinct from BE's own idempotency
enforcement (BE 409 is the real source of truth; client confirm step is UX only).

**409 race (two tabs / stale confirm) pattern**: the Server Action, on receiving
`already-submitted`, must NOT just return the error key — it re-fetches the real
resource (reusing whatever composed read use-case the page already uses) and returns
it embedded in the result (`{ ok: false, errorKey: 'already-submitted', submission }`).
Client reducer auto-transitions this branch straight to `submitted` using the
server-returned data, never the client's in-progress input — prevents a "fabricated
timestamp/content" banner. Found first in US-E24.5 (course player assignment submit).

**Optimistic update: reject it for this class of mutation.** Recommend "loading state,
not optimistic" (disabled button + inline "đang nộp…" text) — an irreversible mutation's
two realistic failures (race 409, network fail) both need a UI DIFFERENT from what an
optimistic "done" state would show, and rolling back a "you're done!" state to "not
done" is worse UX than a brief spinner.

**Cross-route staleness**: if the same submitted/done status is displayed on a
DIFFERENT route the user can navigate back to (not just the current page's own
sidebar/header, which the current page's own re-render already covers), call
`revalidatePath` for BOTH the current item route AND the other route (e.g. a course
timeline page showing per-item status chips) from inside the one Server Action — one
`revalidatePath` call does not implicitly cover a sibling route's RSC cache.

See also [[reference-nextjs-server-action-error-boundary]] for the discriminated-result
contract this pattern's Server Action return type follows.
