---
name: error-dark-dual-role-token
description: --edu-error-dark is BOTH chip text and a solid button/badge background, so its dark-mode text fix lives at the class level (dark:text-edu-error-text) at every call site
metadata:
  type: project
---

ADR 0077 (US-E24.18). `--edu-error-dark` (#B91C1C) cannot be overridden inside `.dark` like the
other tonal pairs: it doubles as a SOLID background (destructive `Button` variant, notification
count badge) with white foreground, and as TEXT it tops out at 3.25:1 on pure black — it can never
reach AA on any dark bg. So `.dark { --edu-error-dark-light: #7a0011 }` is the only token change;
the text role is fixed per call site with `dark:text-edu-error-text` (#FFDAD6 = 8.85:1 on #7A0011;
light mode stays #B91C1C on #FEE2E2 = 5.30:1).

**Why:** this is the one tonal pair the ADR-0049 variable-level pattern cannot express, so it is
NOT self-enforcing at the token level.
**How to apply:** any NEW code pairing `bg-edu-error-dark-light` with `text-edu-error-dark` must
also carry `dark:text-edu-error-text` (stack the variant for `data-[state=checked]` etc.) — flag a
missing one as a dark-mode contrast regression (~1.77:1). Current call sites: `status-badge.tsx`,
`discipline-tones.ts`, `discipline-screen.tsx`, `tag-chips-input.tsx`, `create-violation-dialog.tsx`
(`otp-input.tsx` already used `text-edu-error-text`). Verified empirically: in the built CSS the
`dark:` rule always emits AFTER its base, so the cascade resolves correctly even for stacked variants.

Related: [[warning-foreground-on-tint-dark]], [[conventions]].
