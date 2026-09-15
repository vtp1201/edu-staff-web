---
name: child-switcher-consumer-contract
description: ChildSwitcher's tablist/tabpanel contract, the repo-wide dangling aria-controls, and where the "hide when single child" gate legitimately lives
metadata:
  type: project
---

`components/shared/child-switcher/child-switcher.tsx` (canonical parent child selector).

- It emits `aria-controls={"tabpanel-"+childId}` on **every** tab, but consumers only ever own
  ONE panel (the active child's). So inactive tabs always reference a non-existent id — repo-wide
  in `grade-book-screen`, `parent-attendance-screen`, `academic-record-screen`. Cross-cutting
  a11y nit → route to fe-lead, never block a single story for it.
- **Consumer owns the panel**: `panelProps = active ? { role:"tabpanel", id:"tabpanel-<id>",
  "aria-labelledby":"tab-<id>" } : {}`. When reviewing a new consumer, check the panel props are
  applied in EVERY render branch that also renders the switcher (error/empty/success) — an
  error branch with `role="alert"` can't double as the tabpanel, wrap it instead.
- **"Hide when single child" is NOT a component prop** (`hideWhenSingle` does not exist). The two
  shipped callers disagree: `grade-book-screen` gates at `>= 2` before mounting;
  `parent-attendance-screen` renders for any non-empty list. Gating in a caller-side VM builder is
  the accepted shape — don't ask for a shared-component edit.
- `ChildSummary` (grades domain) is structurally identical to `ChildSwitcherChild`; typing a
  feature-local builder against the UI type avoids a cross-feature domain import.

**Why:** these three points come up on every parent-facing screen that adds the selector.
**How to apply:** verify the switcher slot appears in all early-return branches, the panel pairing
matches, and no diff lands in `components/shared/child-switcher/`.

Related: [[conventions]] (no RTL → Storybook is the only DOM proof; no container tests exist
anywhere, so nav wiring is proved by a screen story spy + the pure href unit test).
