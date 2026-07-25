---
name: design-src-jsx-conventions
description: Conventions for editing design_src/edu/*.jsx reference mockups (tokens, icons, shared components, state-demo pattern, JSONC validation trick)
metadata:
  type: project
---

`design_src/edu/*.jsx` files are NOT compiled/type-checked by the app build —
they're plain-object-injected reference mockups (`Object.assign(window, {...})`
at file end) sharing a common runtime (`tokens.js`, `icons.jsx`, `ui.jsx` define
`T`, `Icon`, `Badge`, `Avatar`, `Button`, `Card` used across every screen file).

## Conventions observed (parent-links.jsx, DR-023 extension)

- Inline `t(vi, en)` closure per component for demo copy — NOT wired to real
  next-intl. Real i18n keys are owned by `uiux-ux-writer` in
  `messages/{vi,en}.json`; the designer just writes literal strings matching
  the DR's exact copy, does not touch message files.
- Colors: only `T.*` object members (`T.teal`, `T.errorDark`, `T.errorDarkLight`,
  `T.warningText`, `T.textMuted`, etc.) — defined in `design_src/edu/tokens.js`,
  1:1 with `src/app/tokens.css`. Never raw hex outside that file.
- Icons: `icons.jsx` has a fixed icon set (grep it first — no `history` or
  `unlink` icon exists; reuse `clock` for history/time, `link`/`x` for
  created/removed action pairs, matching the existing `PL_CONSENT` badge icon
  choices in the same file).
- **Demo-state pattern**: screens expose a `PLStateChips`-style 3-way toggle
  (loading/ready/error, sometimes named `status`) at screen level for design
  review. When adding a NEW scoped sub-section with its own states, reuse/derive
  from the EXISTING screen-level toggle (e.g. pass `auditState={status ===
  'ready' ? 'success' : status}` into a sub-dialog) rather than forking a
  second chips component. Sub-components use `'loading'|'error'|'success'`
  (compare screen-level which is often `'loading'|'ready'|'error'`) — map
  explicitly, don't assume same vocabulary.
- **Sub-section-within-dialog pattern** (mirrors real code
  `pl-consent-detail-section.tsx` / moderation's `audit-timeline-tab.tsx`):
  own loading (skeleton via `.pl-shimmer` CSS class already defined in a
  trailing `<style>` block in the file)/error (`role="alert"`, compact banner,
  `T.errorDarkLight` bg + `T.errorDark` icon+text, retry button)/empty (icon +
  title + body, NO CTA if genuinely nothing-to-do)/success (list) — NEVER
  blocks sibling content already rendered in the parent dialog.
- Mock seed data: when a "history/trail" feature is added to an
  already-delivered screen, the DOMINANT seed state is usually EMPTY (the trail
  didn't exist when older seed rows were created) — only give 1-2 records a
  populated seed to demonstrate the success state honestly.

## Validating design-spec.jsonc after edits

No `jsonc-parser` devDependency in this repo. To sanity-check JSONC after an
edit without it, run a small inline Node script: strip `//` line-comments with
a string-aware scanner (skip `//` found inside `"..."` strings), then
`.replace(/,(\s*[}\]])/g, '$1')` to drop trailing commas, then `JSON.parse`.
A naive "strip any line starting with //" fails on this file because some
comments are inline after values on the same line as content.

## Related
- `.claude/rules/uiux-workflow.md`, `.claude/rules/design-system.md`,
  `.claude/rules/component-organization.md`.
