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
`error-dark` family, with one deviation from the pattern's usual shape,
confirmed necessary by contrast measurement at implementation time:

- `.dark { --edu-error-dark-light: #7a0011 }` — a deeper maroon than
  `--edu-error-light`'s dark override (`#5c0007`), since `error-dark` is the
  more severe of the two states. No new token *name*.
- `--edu-error-dark` (`#b91c1c`) is **deliberately NOT overridden** inside
  `.dark`. Its relative luminance gives it a hard ceiling of 3.25:1 against
  pure black — it can never reach AA (4.5:1) as TEXT on any dark background,
  so the "only if it fails" branch originally written here always fires. It
  also can't be repointed to a lighter red instead, because the same token is
  reused as a *solid* background elsewhere (destructive button, notification
  count badge) with white foreground — a lighter value would drop those below
  AA (e.g. white on `#ff6b6b` ≈ 2.78:1). No single `--edu-error-dark` value
  can serve both the text role and the solid-background role in dark mode.
- The text role is therefore overridden at the **class level, not the token
  level**: every consumer pairs `bg-edu-error-dark-light` with
  `dark:text-edu-error-text` (the existing `--edu-error-text` token, `#ffdad6`
  — already defined for the regular `error` tone's dark override) instead of
  `text-edu-error-dark`. Measured: `#ffdad6` on `#7a0011` = 8.85:1. Light mode
  is untouched (`#b91c1c` on `#fee2e2` = 5.30:1).
- This text-role fix had to land in **five** consumers, not just
  `StatusBadge` — every place in the codebase already pairing
  `bg-edu-error-dark-light` with `text-edu-error-dark` shares the same failure
  mode, and fixing only one would have left the other four regressed to
  ~1.77:1: `status-badge.tsx`, `discipline-tones.ts` +
  `discipline-screen.tsx`, `tag-chips-input.tsx`,
  `create-violation-dialog.tsx`. `otp-input.tsx` already paired the tint with
  `text-edu-error-text` and needed no change.
- No change to `--edu-error-dark`'s `:root` (light-mode) value or to its
  *solid*-background usages (delete-confirmation buttons, unread-count badge
  chrome), which keep `--edu-error-foreground` (white) and are unaffected.

## Alternatives Considered

1. Leave `--edu-error-dark-light` unset in dark mode — rejected, it is the bug
   this ADR closes (confirmed light chip in dark mode).
2. Introduce a brand-new token family (e.g. `--edu-error-dark-dark-light`) —
   rejected, unnecessary token proliferation; `.dark { --edu-error-dark-light:
   ... }` is the exact mechanism ADR 0049 already established for six sibling
   tones.
3. Override `--edu-error-dark` itself inside `.dark` to a lighter, AA-safe red
   — rejected, mathematically incompatible with its second life as a solid
   background with white foreground (see Decision above); would trade a chip
   bug for a button/badge contrast regression.

## Consequences

Positive:

- `error-dark` `StatusBadge`/severity chips render as a consistent dark tonal
  chip in dark mode, matching every other tone (`success`, `warning`, `error`,
  `info`, `purple`, `teal`, `primary`), at 8.85:1 text contrast.
- No new token names; the *variable* side of the fix is confined to
  `globals.css`'s `.dark` block.

Tradeoffs:

- Unlike the other tonal pairs (a pure variable-level fix), this one also
  required a class-level `dark:` override at every one of the five call
  sites, because `--edu-error-dark` cannot itself carry a dark-mode text
  value without breaking its solid-background role. Any FUTURE consumer that
  pairs `bg-edu-error-dark-light` with `text-edu-error-dark` must remember to
  add `dark:text-edu-error-text` too — this is not self-enforcing at the
  token level the way the other tonal pairs are.

## Follow-Up

- Implemented in commit `fd48d8d3` (US-E24.18): `.dark` override for
  `--edu-error-dark-light` + `dark:text-edu-error-text` at all 5 call sites +
  `status-badge.test.ts`/`status-badge.stories.tsx` proof. WCAG AA verified
  (8.85:1).
- `docs/product/design-system.md` follow-up note under US-E24.12 resolved.
- Consider, in a later design-system pass, whether `error-dark` chips should
  become a small shared class/util (e.g. a `errorDarkChip` helper) so the
  `dark:text-edu-error-text` pairing is enforced once instead of per call
  site — not required now, flagged for awareness only.
