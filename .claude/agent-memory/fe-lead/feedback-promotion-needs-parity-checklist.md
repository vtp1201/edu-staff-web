---
name: feedback-promotion-needs-parity-checklist
description: always brief fe-component-architect with an explicit parity checklist when promoting a component to shared, not just architects/engineers "make it work"
metadata:
  type: feedback
---

When a component is being promoted from feature-local to `components/shared/`
(decision 0026's "promote on 2nd/3rd use" trigger), always spawn
`fe-component-architect` first with an EXPLICIT instruction to write a
verifiable parity checklist (exact classes/props/behaviors that must survive
the move for the EXISTING caller(s)) — not just "confirm it's generic enough
and move it."

**Why:** US-E20.4's `ChildIdentityHeader` promotion (avatar+initials+name, 3rd
near-duplicate) was done with a general "make it a shared component" brief and
introduced a REAL regression (a hardcoded `text-xs` shrunk one caller's avatar
text from 14px→12px) plus 2 REAL WCAG 1.4.3 contrast failures baked into the
shared component — all caught downstream by `fe-tech-lead-reviewer`/
`fe-accessibility-auditor`, costing a full extra fix round. US-E20.5's
`ChildSwitcher` promotion (2nd use) was briefed with an explicit
component-architect pass that produced a written checklist (card wrapper
classes, tablist ARIA wiring, tab sizing/active-state color-mix, avatar size +
color-tone maps, keyboard/roving-tabindex model) BEFORE the engineer touched
code — the resulting `git diff` on the moved file was 2 lines (import path +
i18n namespace), byte-clean, zero regression, zero review findings on it.

**How to apply:** any time a story's brief mentions "promote X" or "this
crosses the 2nd/3rd-use trigger" — dispatch `fe-component-architect` first (even
for a seemingly-simple move), and require it to enumerate the CURRENT visual/
behavioral traits of every existing caller as a literal checklist in its
`## Component Architecture` output, not just a promote/don't-promote verdict.
Then instruct the implementing engineer to verify against that checklist
explicitly, not just "confirm tests still pass" (tests can miss a visual-only
regression that has no assertion written for it).
