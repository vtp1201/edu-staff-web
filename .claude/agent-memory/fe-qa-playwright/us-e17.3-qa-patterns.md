---
name: us-e17.3-qa-patterns
description: messaging mobile pane toggle QA — Tailwind v4 transition-transform computed CSSOM value, real-browser runner used successfully for gap-closing stories
metadata:
  type: project
---

US-E17.3 (messaging single-pane mobile slide toggle, DR-011 UX polish).

**Tailwind v4 `transition-transform` computed CSSOM finding:** unlike the
`-webkit-*` vendor-prefix drop in [[us-e17.2-qa-patterns]], `transition-property`
IS a standard property Chromium reports faithfully — but Tailwind v4's
`transition-transform` utility expands to the literal computed value
`"transform, translate, scale, rotate"` (v4 treats translate/scale/rotate as
independent CSS properties), NOT the bare string `"transform"`. Any assertion
on `getComputedStyle(el).transitionProperty` for a `transition-transform`
element must match the 4-token string, not `.toBe("transform")`.

**`transitionDuration`/`transitionTimingFunction` are safe to assert exactly**
(`"0.25s"` for `duration-[250ms]`); Tailwind's `ease-in-out` utility compiles
to a `cubic-bezier(...)` token, not the literal `ease` keyword — don't assert
the AC's prose wording ("0.25s ease") literally if the design system's utility
doesn't emit that keyword; assert duration + non-empty timing-function instead.

**Real browser runner (`vitest.storybook.mts`) reliably used to close AC gaps**
this session: added 8 new interaction stories (desktop-1280 unchanged,
320px-no-overflow across loaded/empty/error, mobile empty/error pane-hidden,
computed-transition-style) alongside the 3 existing E17.3 stories — all 11
pass in real Chromium. Two long-standing US-E10.4 stories
(`Create Group Optimistic Prepend`, `Reply Strip Active`) fail on `main` too
(confirmed via `git checkout main -- <stories file>` + rerun) — pre-existing
flake unrelated to any E17.3 change, safe to ignore when gating this story.
Full-suite `bun vitest run --config vitest.storybook.mts` (no path filter) is
NOT stable — 65/421 fail across unrelated screens; always scope the browser
runner to the target story file for a QA gate, don't rely on the aggregate run.

**AC coverage pattern for pane-toggle stories:** ACs about touch-target size
class names (`min-h-[44px]`) are adequately proven by className assertions in
jsdom/Storybook without needing `getComputedStyle` — but transform/transition
*values* need the real browser runner. AC-04/AC-13 (keyboard-inaccessible
off-screen pane) via `inert` attribute presence is acceptable proxy proof;
a full `Tab`-key walk to a specific focusable descendant is optional hardening
(A11Y-002 pattern), not a blocker.
