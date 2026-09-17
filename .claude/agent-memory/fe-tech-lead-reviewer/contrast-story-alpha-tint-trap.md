---
name: contrast-story-alpha-tint-trap
description: Storybook contrast assertions go silently vacuous when the background is an alpha tint (bg-primary/10) — Chromium returns an oklab(... / 0.1) string the repo's contrastRatio helper mis-parses
metadata:
  type: feedback
---

The repo's copy-pasted Storybook contrast helper

```ts
const [r, g, bl] = (rgb.match(/\d+/g) ?? []).map(Number);
```

is only valid when the sampled background is an **opaque** token
(`bg-edu-primary-light` → `rgb(236, 242, 255)`). It was introduced that way in
`timetable-tab.stories.tsx` (US-E24.19 #3) and is correct there.

**Trap:** for an alpha tint (`bg-primary/10`, `bg-primary/15` → Tailwind v4
`color-mix(in oklab, var(--color-primary) 10%, transparent)`) Chromium's
`getComputedStyle(el).backgroundColor` returns
`"oklab(0.582024 -0.0132959 -0.190103 / 0.1)"`. The `/\d+/g` parse yields
`[0, 582024, 0]` → luminance ≈ 2e8 → **every** `contrastRatio(...)` assertion
returns ~3e8 and passes for ANY text colour, including the failing pre-fix one.
Verified empirically (headless chromium) during the batch-7 review.

Two independent defects when this shape appears:
1. the string is not `rgb()` so the regex is garbage; and
2. even parsed correctly, an alpha colour is not the *rendered* background —
   a real check must composite the tint over the surface underneath.

**Why:** a false-green a11y proof is worse than no proof, and this helper gets
pasted into each new contrast story.

**How to apply:** in any contrast story, check what the sampled background class
is. If it contains `/<number>` (alpha tint) → require either (a) an
`expect(bg).toBe("rgb(...)")` format pin plus a composited expected colour, or
(b) dropping the ratio assertion and keeping only the exact `color` equality
assertion (which IS a genuine regression guard) with the offline measurement
recorded in the packet. See [[warning-foreground-on-tint-dark]],
[[text-primary-resolves-to-primary-dark]].

Measured reference (primary tint over light page `#f5f7fa` / card `#fff`;
`--primary` = `--edu-primary-dark` #4570ea in BOTH themes):
- `bg-primary/10` tab: old `text-primary` 3.61–3.88:1 · `text-edu-primary-accessible` 3.99–4.29:1 · dark `text-edu-primary` 4.19–4.77:1.
- `bg-primary/15` badge nested in that tab: old `text-primary` 3.04–3.25:1 light / 2.67–3.04:1 dark (**fails the 4.5:1 small-text floor**) · `text-edu-text-primary` 8.5–9.1:1 light, 10.2–11.6:1 dark (theme-aware, no `dark:` needed) — the `status-badge.tsx` tone="primary" idiom is the right fix; `text-edu-primary-accessible` only reaches ~3.4–3.6:1 there and is NOT.
