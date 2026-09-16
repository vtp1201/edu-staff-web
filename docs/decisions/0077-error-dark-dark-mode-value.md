# 0077 Dark-mode value for `--edu-error-dark-light`

Date: 2026-09-16

## Status

Accepted

## Context

`--edu-error-dark` / `--edu-error-dark-light` (ADR 0040, US-E21.1) style the
`StatusBadge` `error-dark` tone (`bg-edu-error-dark-light text-edu-error-dark`)
for a heavier/terminal state (e.g. "Đã thu hồi" invitation, `SEVERE` staff
discipline severity, `POOR` grade-distribution). ADR 0049 + US-E24.12
established the pattern of overriding every `--edu-*-light` tonal-chip
background (and its paired text token where needed) inside `.dark` in
`src/app/globals.css`, so chips read as dark tonal chips instead of a light
tint floating on a dark card — this was done for `primary`, `success`, `info`,
`purple`, `teal`, `error`, and `warning`.

`--edu-error-dark-light` was missed. In `.dark` mode it still resolves to its
light-mode value (`#fee2e2`), so the `error-dark` `StatusBadge`/severity chip
renders as a light-pink chip on a dark card — inconsistent with every other
tone and visually reads as a rendering bug (harness backlog item #9,
`docs/product/design-system.md` follow-up note under US-E24.12).

## Decision

Extend the existing dark-mode tonal-pair override pattern (ADR 0049) to the
`error-dark` family: add a `.dark`-scoped override for `--edu-error-dark-light`
(a dark maroon tint consistent with the `T_DARK` tonal-chip values already
used for `error`/`warning`), and — only if contrast measurement shows
`--edu-error-dark` (#b91c1c) text fails AA on the new dark tint — a paired
dark-mode-only text override, following the same
`--edu-error-light`/`--edu-error-text` precedent (US-E21.2 self-audit, kept
"as-is" note in US-E24.12). No new token *name* — same `--edu-error-dark` /
`--edu-error-dark-light` tokens, only their `.dark` value gains a definition.
No change to their light-mode values or to the *solid* usages of
`--edu-error-dark` (delete-confirmation buttons, unread-count badge chrome),
which keep using it as a vivid solid background with
`--edu-error-foreground` (white) and are unaffected by this ADR.

## Alternatives Considered

1. Leave `--edu-error-dark-light` unset in dark mode — rejected, it is the bug
   this ADR closes (confirmed light chip in dark mode).
2. Introduce a brand-new token family (e.g. `--edu-error-dark-dark-light`) —
   rejected, unnecessary token proliferation; `.dark { --edu-error-dark-light:
   ... }` is the exact mechanism ADR 0049 already established for six sibling
   tones.

## Consequences

Positive:

- `error-dark` `StatusBadge`/severity chips render as a consistent dark tonal
  chip in dark mode, matching every other tone (`success`, `warning`, `error`,
  `info`, `purple`, `teal`, `primary`).
- No new token names, no consumer code changes required beyond `tokens.css` /
  `globals.css` (all call sites already reference the existing
  `bg-edu-error-dark-light` / `text-edu-error-dark` classes).

Tradeoffs:

- None identified — this is a pure value-completion fix for an omitted
  dark-mode override, not a new design decision.

## Follow-Up

- `fe-nextjs-engineer` verifies the new `.dark` value(s) against WCAG AA
  (≥4.5:1 for the badge text) with the actual rendered chip, mirroring the
  contrast-ratio comments already present for the sibling dark-mode overrides
  in `src/app/globals.css`.
- Sync `docs/product/design-system.md` (remove the "vẫn chưa có giá trị dark"
  follow-up note under US-E24.12 once implemented).
