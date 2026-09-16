---
name: text-primary-resolves-to-primary-dark
description: The Tailwind utility `text-primary` resolves to --edu-primary-dark (#4570ea), NOT --edu-primary (#5d87ff) — tokens.css's `--color-primary` is dead under `@theme inline`
metadata:
  type: project
---

Any contrast claim about `text-primary` that starts from `--edu-primary` (#5d87ff)
is **wrong**. The resolution chain is:

- `globals.css` `@theme inline { --color-primary: var(--primary) }` (line ~23) — with
  `inline`, Tailwind emits `.text-primary { color: var(--primary) }`, so the utility
  follows `--primary`, not `--color-primary`.
- `globals.css` line 128 (light) and line 223 (dark) both set
  `--primary: var(--edu-primary-dark)` → **#4570ea** (ADR 0023, the AA-on-white fix).
- `tokens.css` line ~112 `:root { --color-primary: var(--edu-primary) }` (labelled
  "tenant-overridable primary", decision 0007) is therefore **never consulted by any
  utility** — a dead declaration, and the trap that makes people say `text-primary` = #5d87ff.

Measured (WCAG relative luminance), foreground on `--edu-primary-light` #ecf2ff:
`#5d87ff` 2.94:1 · `#4570ea` (`text-primary`) **3.93:1** · `#4468e0`
(`text-edu-primary-accessible`) **4.35:1**. On white: 3.29 / 4.41 / 4.88.

**Dark-mode caveat:** `--edu-primary-light` IS overridden in dark (#28344e) but
`--edu-primary-dark` and `--edu-primary-accessible` are NOT. So on the dark tint:
`text-primary` 2.81:1, `text-edu-primary-accessible` **2.54:1**, `text-edu-primary`
3.77:1. Swapping to the accessible token is a light-mode win and a small dark-mode
loss; both already fail 3:1 there. The dark-mode-correct pairing is
`dark:text-edu-primary` — same idiom globals.css already uses for
`--accent-foreground`/`--sidebar-accent-foreground` in the dark block, and the same
class-level `dark:` deviation ADR 0077 took for `dark:text-edu-error-text`.

**Why:** US-E24.19 shipped on a backlog premise ("2.94:1, fails 3:1") that was factually
wrong; the real pre-fix value already passed the 3:1 floor. Verified empirically — a
reverted-source Storybook run in real Chromium reported `rgb(69, 112, 234)` = #4570ea.

**How to apply:** on any `text-primary` contrast finding, recompute from #4570ea before
accepting the packet's number, and check the dark `--edu-primary-light` (#28344e) side
too. Related: [[warning-foreground-on-tint-dark]], [[error-dark-dual-role-token]].
