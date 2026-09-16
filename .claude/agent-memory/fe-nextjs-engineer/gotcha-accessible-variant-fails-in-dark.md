---
name: gotcha-accessible-variant-fails-in-dark
description: A darkened "-accessible" color token fixes light-mode contrast but gets WORSE on the dark override of the same tint — always pair it with a dark:text-... variant
metadata:
  type: feedback
---

Swapping a text/icon color to a darkened `--edu-*-accessible` token to pass AA on a
light tint makes the DARK mode ratio worse, because `.dark` overrides the tint itself
(e.g. `--edu-primary-light` #ecf2ff → #28344e in `globals.css`). Measured on US-E24.19:
on #28344e, `--edu-primary-accessible` #4468e0 = 2.54:1, `--edu-primary-dark` #4570ea =
2.81:1, `--edu-primary` #5d87ff = 3.77:1.

**Why:** the reviewer blocks a fix that lowers an already-failing dark number, even when
it crosses no new threshold. Repo precedent exists: `globals.css`'s `.dark` block already
flips `--accent-foreground`/`--sidebar-accent-foreground` to `var(--edu-primary)`.

**How to apply:** whenever you change a foreground token on a `bg-edu-*-light` surface,
check whether that tint has a `.dark` value; if so ship
`text-edu-<x>-accessible dark:text-edu-<x>` (class-level override, ADR 0077 idiom) — no
new token, no `tokens.css` edit. Prove BOTH modes with two stories; the dark one needs
`withDarkTheme` from `@/test/storybook-dark-decorator` (`globals:{theme:"dark"}` is inert
under the vitest runner). Set the ratio threshold just under the shipped value (4.3 for
4.35:1) so the pre-fix number fails — a bare `>= 3` carries no red→green signal.
See [[gotcha-dual-role-token-dark-override]], [[gotcha-theme-fixed-foreground-token]].
