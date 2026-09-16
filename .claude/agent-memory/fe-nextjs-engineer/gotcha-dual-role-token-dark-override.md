---
name: gotcha-dual-role-token-dark-override
description: A token used BOTH as chip text and as a solid background cannot get a .dark override — fix it with a class-level dark: variant on every pairing site; check the math before assuming a dark tint works
metadata:
  type: feedback
---

**A `--edu-*` token that is BOTH a text tone and a solid background cannot be
overridden inside `.dark`.** Adding the missing dark tint is only half the fix.

**Why:** US-E24.18 / ADR 0077 (`--edu-error-dark-light`). ADR 0049's pattern is
"override the `--edu-*-light` tint in `.dark`, and its paired `*-text` token if
contrast fails". That works for `error`/`warning` because `--edu-error-text` is
a text-only token. `--edu-error-dark` is NOT: it is the chip text AND the solid
background of the destructive button + notification count badge (white
foreground). A `.dark { --edu-error-dark: <lighter red> }` would fix the chips
and break every solid usage in dark mode.

**Also run the contrast math BEFORE picking the tint.** `#b91c1c` has
L = 0.112, so its ceiling against pure black is 3.25:1 — it can never reach AA
on ANY dark background. No choice of tint could have saved it; the paired text
override was mandatory, not conditional.

**How to apply:**
1. Grep the token. If it appears as both `text-edu-X` and `bg-edu-X`, a `.dark`
   variable override is off the table.
2. Instead put the dark-mode text on the CHIP PAIRINGS at class level:
   `bg-edu-X-light text-edu-X dark:text-edu-<existing-text-token>`. Light mode
   stays byte-identical; no new token name, so no extra ADR.
3. Do it at EVERY pairing site in the same commit — changing only the one the
   story names (StatusBadge) leaves the others (discipline-tones,
   tag-chips-input, severity radio) with 1.7:1 text, i.e. you introduced the
   regression. `grep -rn "bg-edu-X-light"` first.
4. `@custom-variant dark (&:is(.dark *))` exists in `globals.css`, so `dark:`
   utilities work. Using them with a SEMANTIC token is fine — the rule only
   bans hardcoded raw colors (`dark:bg-slate-900`).
5. Prove it with a story on `withDarkTheme` asserting `getComputedStyle(...)`
   background AND color (see [[gotcha-storybook-dark-globals-and-visual-audit]]);
   then perturb the expected rgb once to confirm the assertion really runs.
