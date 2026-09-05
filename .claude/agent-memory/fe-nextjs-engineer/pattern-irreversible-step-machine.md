---
name: pattern-irreversible-step-machine
description: US-E24.5 fix round — a state-swapping step machine for an irreversible mutation needs focus retarget + an effect-fired request; and a "locked" row must behave the same in every list that shows it
metadata:
  type: feedback
---

A `useReducer` step machine whose branches SWAP the DOM subtree (`ready →
confirming → submitting → submitted|error`) has two defects that pass every
`role="status"`/`role="alert"` review and still fail the a11y gate.

**Why:** the pressed control is unmounted by its own click, so focus falls to
`<body>` silently — a screen reader hears the new block, a keyboard user loses
their place mid-way through a mutation that cannot be undone.

**How to apply:**
- One `useRef` per swapped block + `tabIndex={-1}` on its root, and a
  `useEffect` keyed on the reducer STATUS that focuses the block the new status
  renders. Track the previous status in a ref so `idle → ready` (typing) never
  steals focus from the field. Backing out (`confirming → ready`) focuses the
  control that opened the step, not the container.
- The early-return terminal component (e.g. `SubmittedBanner`) takes
  `ref?: Ref<HTMLDivElement>` (React 19 ref-as-prop) — hooks must sit ABOVE the
  early return so the effect still runs on the frame that swaps to it.
- Red proof is cheap and worth it: comment out `target?.focus()` and confirm the
  focus stories fail (3 did) before claiming the fix.

**Fire the request from the effect, not the click handler.** `dispatch(start)`
followed by an unconditional `await onSubmit(...)` sends even when the reducer
REFUSED the transition. Instead: every control only dispatches; a
`useEffect([state.status])` fires the action when the status is `submitting`,
guarded by an `inFlight` ref (StrictMode double-invoke = a duplicate POST on an
irreversible submit). Keep the dep array at `[state.status]` and suppress
`lint/correctness/useExhaustiveDependencies` with the reason — adding the other
deps makes the cleanup cancel an in-flight request. Test it by clicking confirm
with `userEvent`, then a raw `node.click()` (user-event refuses a detached
element) and asserting exactly one recorded call.

**Same item, same interaction contract in every list.** A `locked` row was a
`<Link>` in the player sidebar and a non-interactive `aria-disabled` block in
the timeline (US-E24.3). Pick one and make both match — the visible "Mở dd/MM"
line means removing the link removes no information. See
[[gotcha-locked-row-and-token-gap]].

**Brand ink on its own tint fails AA.** `text-edu-primary-accessible` on
`bg-primary/12` is 4.31:1 — use `text-foreground` for the active row title and
let the accent bar + `aria-current` + sr-only word carry "current".
`--edu-warning-text` on `--edu-warning-light` (4.37:1) is AA only at ≥14px bold,
so a bold 12px warning must go to `text-sm`.

Related: [[pattern-week-grouped-timeline-rebuild]],
[[pattern-destructive-confirm-and-moderation]],
[[gotcha-async-transition-stuck-pending]].
