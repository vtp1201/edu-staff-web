---
name: gotcha-theme-fixed-foreground-token
description: --edu-warning-foreground is a THEME-FIXED tone (text on solid yellow) with no dark value — using it on a tinted chip gives 1.10:1 in dark mode; also, absent dark tints let LIGHT values leak through
metadata:
  type: feedback
---

Two traps when a repo's dark mode is only partially declared (hit on US-E24.12):

1. **A `-foreground` token can be theme-FIXED on purpose.** `--edu-warning-foreground`
   (#2A3547) exists because white-on-yellow fails AA — solid yellow stays yellow in dark
   mode, so the token must NOT get a dark value (even though `T_DARK` proposes #EAEFF5;
   ~4 call sites paint it on solid `bg-edu-warning`). But it was ALSO used as the text of
   the tinted `bg-edu-warning/15` chip, which over a dark card composites to #403A2D →
   **1.10:1, invisible**. Fix = use the theme-aware `text-edu-text-primary` on the tint
   (identical #2A3547 in light ⇒ zero light-mode diff), which is what info/purple/teal
   already do in `StatusBadge`. Rule of thumb: on a *tinted* chip use a theme-aware text
   token; a `-foreground` token belongs on its own SOLID background.

2. **A `--edu-*-light` tint with no `.dark` override silently leaks the LIGHT value** —
   `bg-edu-success-light` chips rendered near-white on a dark card. Adding a dark tint fixes
   the look but re-checks contrast against its text tone: if the design source (`T_DARK`)
   ships the tint but NOT the matching text tone (error/warning, error-dark), adopting the
   tint alone RE-OPENS a previously fixed a11y bug — keep the existing verified pair instead.

**Why:** both were found only by screenshotting real dark mode, not by any test.
**How to apply:** when touching `.dark` values, enumerate every `bg-edu-*-light` /
`*-foreground` pair actually used in `src/` and compute the composite
(`0.15*hue + 0.85*card`) contrast before shipping. See
[[gotcha-storybook-dark-globals-and-visual-audit]].
