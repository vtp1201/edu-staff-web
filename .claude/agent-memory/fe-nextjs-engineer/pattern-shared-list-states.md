---
name: pattern-shared-list-states
description: Canonical shared ListSkeleton/ListError components + the class-parity test idiom that proves a pure-visual refactor changed nothing
metadata:
  type: project
---

`components/shared/list-skeleton` + `components/shared/list-error` are the canonical
list-state pair (INFRA-shared-list-states, decision 0026). Use them instead of writing a
new feature-local skeleton/error card.

- `ListSkeleton` owns ONLY the wrapper + a11y wiring + the rows loop. `variant="inline"`
  = outer div is `role="status" aria-busy` (`divide-y` card); `variant="bordered"` =
  `rounded-xl border p-2` wrapper + sr-only `role="status"` sibling + `aria-hidden` rows
  block. Row markup stays caller-owned via `renderRow(index)` — that is what lets one
  component serve avatar rows, flat table rows and md-only columns without forking.
- `ListError` is always `role="alert"`. A REQUIRED `shape` preset (`"inline-card"` =
  SD/SA error-tinted `shadow-card`; `"bordered-card"` = plain `rounded-xl` card, retry
  gets `mt-4`) supplies the outer card + retry spacing, so no call site repeats a class
  literal — that residual duplication is exactly what the reviewer rejected in round 1.
  Content is a discriminated union `{ message } | { title; description? }` (`?: never`
  members) so "one or the other" is compiler-enforced. `titleClassName`/
  `descriptionClassName` REPLACE the defaults rather than merging, so parity never
  depends on tailwind-merge resolving a `text-*` conflict. `min-h-11` on the retry
  button is unconditional (44px touch target).

**Why:** four features had shipped near-identical copies; every design tweak meant
editing 4 files and they had already drifted (padding, icon size, button variant).

**How to apply:** when a refactor must be pixel-identical, prove it with a node-env
`renderToStaticMarkup` test that compares the **set** of class tokens (order-insensitive,
filter out lucide's `lucide lucide-*` markers) against the literal class string of the
deleted original, one assertion block per call site. That converts "trust me, same
output" into a failing test if anyone's `cn()` merge drops a class. Verify a
`text-*`-vs-`text-*` override actually wins under tailwind-merge before relying on it
(`text-muted-foreground` + `text-edu-text-secondary` → the override wins; checked).
See [[pattern-node-env-component-test]].

Two process lessons from this story:
- A "grep for the pattern" survey MISSED a 5th copy (`consent-section/consent-error.tsx`)
  because it lived under `features/user/presentation/profile/`, not a `*-screen/` folder.
  When consolidating, also grep for the distinctive CLASS strings (`bg-edu-error-dark-light`,
  `size-13`, `aria-busy`), not just component-name conventions or folder shapes.
- Deleting a component leaves DANGLING doc-comment references in files that cited it
  ("kept feature-local, NOT promoted from `PLError`"). Grep the deleted names across
  comments too and fix or re-justify them in the same commit.
