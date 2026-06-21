---
name: dr-010-pattern
description: DR-010 cross-cutting pattern — responsive + empty states; no JSX file needed for patterns; all i18n keys existed; tmp-handoff downloads synced A-E
metadata:
  type: project
---

DR-010 was a cross-cutting UX concern (responsive breakpoints + empty states) affecting 5+ screens.

**Key decisions:**
- No `design_src/edu/<slug>.jsx` created — cross-cutting patterns live in `design-spec.jsonc` sections only (`responsiveGrid`, `emptyStatePattern`, `emptyStates`). FE team applies the pattern to existing feature components. This is correct for platform-level patterns.
- All i18n keys already existed. Grep `messages/vi.json` for `empty`/`emptyState` before assuming keys are missing — they almost always exist for implemented screens.
- tmp-handoff audit confirmed: all 5 fixes A-E (side-stripe, error-dark, a11y, GPU transition, bounce easing) are present in the downloaded `edu/` folder. Design project is in sync.
- design-spec.jsonc badge `var(--edu-error)` → `var(--edu-error-dark)` was a missed gap from Fix B/ADR-0040; always check both tokens.js and design-spec.jsonc when applying token changes.

**Why:** tmp-handoff was a temporary audit artifact in `/tmp-handoff/`. Added to `.gitignore` and deleted before merge to prevent accidental commit of large downloaded assets.

**How to apply:** For any future DR covering a cross-cutting pattern (responsive system, motion, empty-state, loading-state) — write the spec in design-spec.jsonc, skip the JSX file, document per-screen application in the DR packet. The `/fe` team uses design-spec as law.
