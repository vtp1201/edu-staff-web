---
name: gotcha-biome-role-prop-and-impeccable-cache
description: Biome flags any role= attr (even component props) as ARIA role; .impeccable cache JSON breaks lint formatter
metadata:
  type: feedback
---

Two Biome surprises hit during US-E09.1:

1. **`role` as a component prop fails `useValidAriaRole`.** A VM prop named
   `role` rendered as `<DisciplineScreen role="teacher" />` is flagged as an
   invalid ARIA role even though it's a plain prop. **Fix:** name viewer-role
   props `viewerRole` (or use a boolean like class-log's `isPrincipal`), never
   bare `role`. Same for `aria-label` on a `<span>` badge — not a supported
   element/attr combo; drop it or move the count into visually-hidden text.

2. **`.impeccable/hook.cache.json` breaks `bun lint`.** The impeccable design
   hook writes a minified cache that Biome's formatter rejects (and `bun lint`
   exits non-zero, which would fail pre-push). It's git-ignored but Biome's
   `useIgnoreFile` didn't exclude it. **Fix applied:** added `"!.impeccable"` to
   `biome.json` `files.includes`. If lint suddenly fails repo-wide with a
   "Formatter would have printed" on a giant JSON, this is why.
