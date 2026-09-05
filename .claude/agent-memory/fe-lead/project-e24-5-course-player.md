---
name: project-e24-5-course-player
description: US-E24.5 course player (high-risk lane) implementation — allowlist security, one-way submit state machine, focus-management lesson
metadata:
  type: project
---

US-E24.5 (course player, 4 item types + locked, one-way assignment submit) implemented and
merged (`03cac7e7`, worktree `us-e24.5`). Third US in the student sequence (E24.2→E24.3→E24.5
done → E24.4 last). This was the epic's only **high-risk lane** story (irreversible mutation +
BE-sourced content/link rendering).

**Why record this** — patterns/lessons for any future high-risk-lane story in this repo:

- **High-risk lane worked as designed**: planner was briefed to design security controls
  layer-by-layer (not just restate AC); component-architect + state-engineer BOTH dispatched
  (planner recommended both — component tree was genuinely 10 files AND the submit flow was
  the first non-trivial async state machine with a race condition in this feature); reviewer
  was briefed to author independent adversarial bypass cases, not just re-read the engineer's
  tests (found 48, all held); QA was briefed to add MORE independent bypass cases on top (found
  4 more, all held — including an IDNA homograph normalization case). Three independent rounds
  of adversarial verification on the same allowlist function, zero holes found. This layered
  independent-verification pattern is worth repeating verbatim for any future security-critical
  US, not just a generic "review round".
- **A11y failure mode unique to mutation flows**: `submit-box.tsx`'s reducer swapped entire DOM
  subtrees per state (ternary) with zero focus retargeting — keyboard focus silently reverted to
  `<body>` on every step of an *irreversible* action. Screen-reader users were fine (`role=status`/
  `alert` on the swapped content), but keyboard-only sighted users lost their place entirely.
  This is NOT the same class of a11y bug as E24.2/E24.3's contrast/colour-only findings — it's
  specific to "component swaps subtree based on async state machine transitions." Any future
  multi-step confirm/submit/result flow in this repo should get an explicit a11y brief on focus
  retargeting via `useEffect` keyed on the reducer status, not just contrast/colour-only checks.
- **"No optimistic update" was the right call, confirmed 3x** (planner → state-engineer →
  reviewer/QA all independently agreed): a one-way, non-revertible mutation should never flip
  UI state before the server confirms, especially when the realistic failure modes (409 race,
  network) both require showing something DIFFERENT from what an optimistic state would show.
  Precedent for any future single-attempt/no-undo submit flow in this repo.
- **409 race handling pattern**: on conflict, re-fetch the REAL resource server-side and return
  it embedded in the Server Action result — never let the client's in-flight input become the
  displayed "success" state. Reusable pattern name in memory: "server-truth-on-conflict."
- **Consistency debt caught cross-US**: locked rows were interactive in the player's sidebar but
  non-interactive in US-E24.3's timeline (which had its own `LockedRowRejectsActivation` test).
  Reviewer caught this by remembering the sibling US's precedent, not from the AC text itself —
  worth explicitly cross-referencing prior US's established patterns in review briefs for a
  feature module under active multi-US development.
- **TEMP-code discipline from E24.3 paid off**: `grep "TEMP (US-E24.3)"` → 0 hits confirmed full
  removal in one pass, exactly as planned when E24.3 marked it.
- **`docs/product/design-spec.jsonc` status field must be synced same-branch, not deferred** —
  reviewer flagged this as a MUST FIX (not should-fix) both times (E24.3 and E24.5): a normative
  doc claiming "planned — not implemented" after merge is an active falsehood, not just staleness.
