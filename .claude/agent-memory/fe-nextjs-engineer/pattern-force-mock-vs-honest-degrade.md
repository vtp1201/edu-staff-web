---
name: pattern-force-mock-vs-honest-degrade
description: When a BE authorization gap blocks a screen, force-mock (unconditional) vs USE_MOCK-gated honest-degrade — the deciding factor is whether the fabricated data is actionable per-subject data
metadata:
  type: project
---

Confirmed on US-E20.5 fix round (parent child-attendance), a tech-lead
Revision-Required.

**Force-mock is NOT the default for "BE won't authorize this role".** Two
postures exist and choosing wrong ships fabricated data:

- **Force-mock, unconditional** (`makePrincipalClassesRepository` US-E13.8,
  `makeGetChildListUseCase` ADR 0054, `staff-leave`/`teaching-plan`): fine when
  the mock serves *harmless, roster-shaped* seed data — a wrong-but-plausible
  class list annoys, it doesn't mislead.
- **`USE_MOCK`-gated + honest degrade**: required when the mock fabricates
  **per-subject data a user could act on** (a parent's real child's
  present/late/absent record). Real mode gets an
  `Unavailable<X>Repository` that rejects a typed `forbidden` with **no HTTP
  attempted** — cheaper and more honest than a real repo that round-trips to a
  guaranteed 403. **Why:** `forbidden` (not `not-implemented`) is accurate when
  the role is permanently absent from the endpoint's ACL, and the screen already
  omits (never disables) retry for it.

**How to apply:** ask "would a user make a decision on this fabricated row?" If
yes → gate it. Note the reversal in the DI doc comment naming the precedent you
are NOT following, or the next reviewer re-applies it.

**Proof shape (both postures):** the 3-state env matrix DI test
(`"true"`/`"false"`/unset via `vi.resetModules()` + dynamic import;
`constructor.name`, not `instanceof`) **plus** a `page.test.ts` that awaits the
RSC and reads `element.props.vm` with the REAL DI behind it — that one proves
page→di→repo→use-case end to end, which the factory test alone does not. Assert
`createServerHttpClient` is `vi.doMock`-ed and never called, exercising both the
factory AND `execute()`. Mutation-check by flipping the ternary to `true`.

**Locale-aware dates:** never hand-format `DD/MM/YYYY`. Keep a pure
`parseIsoDate(iso): Date | null` (noon-UTC so the calendar day can't slip; null
on rollover like `2026-02-30`) and format in the component with next-intl
`useFormatter().dateTime(d, {day:"2-digit",month:"2-digit",year:"numeric",
timeZone:"UTC"})`. A second story under an `en` `NextIntlClientProvider`
(story-level decorator beats the meta-level `vi` one) asserting the flipped
ordering is the proof. Same story proves a `{label} {count}` chip key — give vi
and en *different punctuation* so the test would fail if JSX concatenation crept
back.

Baselines after this fix round: **462 files / 3317 vitest**, **157 files / 1185
Storybook**. The pre-push `test-storybook` job failed once and passed on an
immediate re-run with zero changes — re-run before investigating.
