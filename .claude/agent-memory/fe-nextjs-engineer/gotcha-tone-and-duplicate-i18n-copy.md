---
name: gotcha-tone-and-duplicate-i18n-copy
description: US-E24.1 — a wire with no color means tone belongs in presentation (deterministic id hash); and two i18n keys sharing one string makes getByText ambiguous in a play fn
metadata:
  type: project
---

Two small traps found while re-deriving a feature from its real contract.

**1. `CourseTone` had no wire source.** The mock invented a hex per course and a
domain mapper turned it into a tone. The real contract carries no color at all.
Rather than drop color (grids get unreadable) or fake a data field, the tone type
moved OUT of `domain/entities` into `presentation/tone.ts` with
`toneForId(id: string)` — a deterministic char-code hash into a 6-tone cycle.
**Why:** it is decoration, not information; keeping it in `domain` implied the
server knows about it, and `Math.random`/array-index would break SSR hydration.
**How to apply:** when a mock-era visual attribute has no wire source, keep it but
move it to presentation and derive it from a stable id — and say in the doc
comment that nothing may be inferred from it.

**2. Two i18n keys with identical copy break `getByText`.** `card.daysLeft.noDeadline`
(badge) and `card.noDueDate` (date line) were both "Không có hạn nộp", so the
Storybook `play` fn failed with `getMultipleElementsFoundError` — on the same card.
**How to apply:** if two elements on ONE screen can render the same string, give
them different copy (badge "Không có hạn" vs line "Không có hạn nộp") rather than
scoping the query — the duplicate copy is usually a real UX redundancy too. Same
family as the Select-placeholder-reused-as-prompt trap in
[[gotcha-storybook-vitest-runner-broken]].
