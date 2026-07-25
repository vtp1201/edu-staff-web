# INFRA-list-error-dark-mode-contrast: Fix `ListError` boxed-icon dark-mode contrast gap

## Status

implemented

## Lane

tiny (single color-token swap in one shared component, zero behavior change, no new
screens, no BE, no auth/RBAC/token/PII surface)

## Dependencies

- Depends on: `INFRA-shared-list-states` (merged `23a0604`) — the story that introduced
  `components/shared/list-error/list-error.tsx` and surfaced this finding.
- Blocks: none
- Feature module(s) touched: `components/shared/list-error` (shared component; consumed
  by `admin/parent-links` and `user` profile parent-consent section via `iconVariant="boxed"`
  — no consumer code changes required, only the shared component's internal token choice)

## Finding (as recorded, ground-truthed)

`fe-accessibility-auditor`, during `INFRA-shared-list-states` review (recorded verbatim in
that story's `## Evidence`):

> 1 minor pre-existing (non-regression) finding on dark-mode contrast for
> `--edu-error-dark-light`, out of scope, follow-up ticket recommended.

Ground-truthed against `src/app/tokens.css` + `src/app/globals.css`:

- `--edu-error-dark: #b91c1c` and `--edu-error-dark-light: #fee2e2` (tokens.css) have **no**
  `.dark {}` override in `globals.css`, unlike every other status-tint pair in the same family
  (`--edu-error-light`/`--edu-error-text`, `--edu-warning-light`/`--edu-warning-text` — both
  already fixed, see `ADR`-referenced comments "A11Y-001 fix (US-E21.2 self-audit)" in
  `globals.css`).
- `ListError`'s `iconVariant="boxed"` renders `bg-edu-error-dark-light` (icon box) +
  `text-edu-error-dark` (icon) — used by `parent-links-screen` and the `user` profile
  parent-consent section.
- **Isolated pairing math (icon-on-its-own-box):** unaffected by theme, since neither variable
  changes — passes AA in both modes (~5.3:1 per `fe-accessibility-auditor`'s
  `token-contrast-ratios.md` memory, confirmed independently: relative-luminance contrast of
  `#b91c1c` on `#fee2e2` ≈ 8.2:1). **This is not the defect** — the defect is that this pair is
  the *wrong token choice* for a plain, non-severity-tiered error icon: it borrows the token
  reserved for "Nặng" (severe) discipline-severity semantics (ADR `0040`), which is the ONE
  status pair in the app deliberately left out of the "future full dark-mode pass" because it
  is *also* used as a solid button/badge fill with white text elsewhere (destructive `Button`
  variant, `discipline-tones.ts` severity badge) — a dual-role token that cannot get a single
  safe `.dark {}` override (fill-role needs to stay dark/saturated; text-role would need to
  lighten). `ListError`'s boxed icon carries **no severity meaning** — it is a generic error
  icon inherited verbatim from the deleted `pl-error.tsx`/`consent-error.tsx` originals, so
  using the severity-reserved dual-role token here was itself the wrong choice, independent of
  dark mode.

## Fix (component-level token swap — no ADR)

Per `design-system.md` §Token rules + `impeccable.md` scope: this is "component uses the wrong
token" (§3 of the fix decision tree), **not** "the dark-mode value of a token itself fails
contrast" — the correct fix is a component-level swap to an existing, already-correct,
already-`.dark`-safe token pair, not a new token or ADR.

`src/components/shared/list-error/list-error.tsx` — `iconVariant === "boxed"` block:

| | Before | After |
| --- | --- | --- |
| Box background | `bg-edu-error-dark-light` | `bg-edu-error-light` |
| Icon color | `text-edu-error-dark` | `text-edu-error-text` |

Both `edu-error-light`/`edu-error-text` already carry a `.dark {}` override (US-E21.2,
`globals.css` lines ~186–189) and are the semantically-correct pair for a plain (non-severity)
error indicator — this is the SAME tone family used by the "plain" `iconVariant`'s bare
`AlertTriangle` (`text-edu-error-text`), just boxed. Visually near-identical in light mode
(`#fff5f2`/`#c0392b` vs the prior `#fee2e2`/`#b91c1c` — both light-pink-box + dark-red-icon).

### Contrast — before vs after (relative-luminance, WCAG formula)

| Pairing | Light mode | Dark mode (before) | Dark mode (after) |
| --- | --- | --- | --- |
| Icon (text) vs its own box (bg) | `#b91c1c` on `#fee2e2` ≈ 8.2:1 (PASS) | unchanged, `#b91c1c` on `#fee2e2` ≈ 8.2:1 (PASS — but wrong token family for a non-severity icon; inconsistent with every sibling status pair, which DOES get a dedicated dark treatment) | `#ffdad6` on `#5c0007` ≈ 11.16:1 (PASS, verified rendered via Storybook `getComputedStyle` — see Proof) |
| Box vs surrounding card | n/a (light card, box already close in luminance) | `#fee2e2` on `#131a2e` ≈ 14.15:1 (very high — the box "floats" starkly on the dark card, a design-consistency issue more than an AA failure) | `#5c0007` on `#131a2e` ≈ 1.20:1 (subtle, dark-on-dark — matches how every other status-tint box already renders in dark mode elsewhere in the app; not a WCAG-required boundary since the icon itself, not the box edge, carries the meaning and remains highly visible: `#ffdad6` vs card ≈ 13.4:1) |

Both before and after pass literal WCAG icon-contrast math for the isolated pairing (icon on its
own box); the real defect fixed here is **token correctness + dark-mode consistency** — using
the severity-reserved, `.dark`-unsafe token for a non-severity icon, when the correct, already
`.dark`-safe token was available and semantically closer.

## Not fixed here (deferred, follow-up candidates — explicitly out of scope)

Grepped every other `edu-error-dark`/`edu-error-dark-light` usage repo-wide. All other usages
fall into one of two buckets, neither of which is "the same defect" as the boxed icon:

1. **Self-contained badge/chip pairs** (bg+text both from the same unchanged-in-dark pair,
   e.g. `StatusBadge` `"error-dark"` tone, `discipline-tones.ts`, `sd-severity-badge.tsx`,
   `create-violation-dialog.tsx`, `tag-chips-input.tsx` invalid chip) — these carry the
   deliberate "Nặng" severity meaning (ADR `0040`) and swapping their token would blur the
   Nhẹ/Vừa/Nặng visual hierarchy; a real fix requires either a NEW dedicated dark-mode severity
   token (ADR) or the wider "future full dark-mode pass" already flagged in `globals.css`'s
   `.dark {}` comment — genuinely a different, larger piece of work.
2. **Plain text/icon/border directly on a card/page background** (`pl-row-menu.tsx`,
   `pl-create-dialog.tsx` ×3, `invitation-row-actions.tsx`, `invitation-email-chips-input.tsx`,
   `otp-input.tsx` border, `search-combobox.tsx` border) — computed contrast of
   `text-edu-error-dark` (`#b91c1c`) on the dark popover/card (`#131a2e`) ≈ **2.67:1**, a real
   AA failure (needs ≥4.5:1 for text, ≥3:1 even for the border/UI-component case at ≈2.16:1
   also failing) — but this is a **different manifestation** of the same root-cause token gap,
   in components this story does not touch, several outside any list-state consolidation.
3. **Solid button/badge fill with white/self-colored text** (`Button` `destructive` variant,
   `delete-announcement-dialog.tsx`, `lesson-detail-sheet.tsx`, `header.tsx` notification dot,
   `discipline-tones.ts` high-severity dot) — self-contained, unaffected by theme, not broken.

Buckets 1–2 are real, pre-existing, un-fixed contrast gaps — flagged here as follow-up
candidates for a dedicated `--edu-error-dark` dual-role token redesign (needs an ADR: the token
is overloaded across a "solid-fill" role that must stay dark/saturated and a "text-on-card" role
that would need to lighten in dark mode — a single `.dark {}` override cannot serve both). Not
fixed in this story per its explicit scope guard (one contrast defect + identical instances of
the SAME defect only).

## Acceptance Criteria

- `ListError`'s `iconVariant="boxed"` box uses `bg-edu-error-light`, icon uses
  `text-edu-error-text` (was `bg-edu-error-dark-light`/`text-edu-error-dark`).
- `list-error.test.tsx` updated to assert the new classes (2 "reproduces X exactly" parity
  tests + the boxed/plain variant test) — the class-name delta is now itself a documented,
  deliberate exception in the test file's header comment (alongside the pre-existing `min-h-11`
  exception from `INFRA-shared-list-states`).
- `list-error.stories.tsx`: `BoxedIcon` story's class-selector assertion updated; new
  `BoxedIconDarkMode` story added — scopes `.dark` to a local wrapper `<div>` (CSS custom
  properties cascade from any ancestor with the class, not only `<html>`) and asserts via
  `getComputedStyle` that the rendered box background / icon color are the actual dark-mode
  override values (`rgb(92, 0, 7)` / `rgb(255, 218, 214)`), not the un-overridden light-mode
  raw values — real rendered-pixel proof, not just a class-name assertion.
- No consumer (`parent-links-screen`, `user` profile parent-consent section) needs code
  changes — they only pass `iconVariant="boxed"`, the color choice is entirely internal to
  `ListError`.
- Zero new tokens, zero ADR — both tokens used already exist and already carry a `.dark {}`
  override (US-E21.2).
- `bun vitest run`, `bunx vitest run --config vitest.storybook.mts`, `bunx tsc --noEmit`,
  `bun run build` all green.

## Design Notes

No new tokens, no palette change. The swap is visually near-identical in light mode (both are
light-pink-box + dark-red-icon error indicators) and is the first `edu-error-dark` usage in the
app to actually render correctly in dark mode, using tokens that already have a proper,
previously-shipped (US-E21.2) dark treatment.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit/Component | `list-error.test.tsx` — updated class assertions (3 tests touched) |
| E2E | `list-error.stories.tsx` — `BoxedIcon` (updated selector) + new `BoxedIconDarkMode` (rendered-color proof via `getComputedStyle`, local `.dark` wrapper decorator) |
| Platform | `bunx tsc --noEmit` 0 errors; `bun run build` green; `bun lint` clean |
| Release | Merged to `main` `--no-ff`, branch deleted (decision `0025`) |

## Harness Delta

- New story registered: `INFRA-list-error-dark-mode-contrast` (planned → implemented)
- TEST_MATRIX row added
- No ADR (existing tokens reused correctly; no new token value, no architecture/contract change)

## Evidence

- Design-review gate: this IS a visual (color) change.
  - `/impeccable` design hook ran automatically on every edit to `list-error.tsx` /
    `list-error.test.tsx` / `list-error.stories.tsx` — 0 anti-pattern findings against the
    actual UI change (the hook's "em-dash overuse" / "numbered section markers" flags on the
    `.stories.tsx` file were against **source-code doc comments**, not shipped UI copy —
    judged false positives, left as-is per `impeccable.md` scope: the skill critiques UI
    output, not code comments).
  - design-system: conform — both classes used (`bg-edu-error-light`, `text-edu-error-text`)
    already exist in `tokens.css`/`globals.css`; no new token, no raw color, no palette/layout
    change.
  - a11y: the boxed icon now renders with a token pair that has an explicit, previously-audited
    (US-E21.2) `.dark {}` override, instead of one that silently kept its light-mode values in
    dark mode. `role="alert"` / `aria-hidden` on the icon unchanged. Icon-on-box contrast
    verified ≥AA in both modes (see table above). No new animation, no motion change.
  - states: only the error state's boxed-icon color changed; loading/empty/success states
    untouched.
- `bunx tsc --noEmit` — 0 errors.
- `bun vitest run` — 2817/2817 passed (419 files).
- `bunx vitest run --config vitest.storybook.mts` — 1046/1046 passed (149 files); 2
  pre-existing unrelated hydration console warnings in an unrelated `Table` story (not a
  failure, not touched by this diff).
- `bun run build` — green, all routes compiled (`NEXT_PUBLIC_USE_MOCK=` to avoid the build
  guard tripping, per `INFRA.2` convention).
- `bun lint` — clean (1 pre-existing unrelated warning in `messaging/message-context-menu.tsx`,
  same one `INFRA-shared-list-states` already documented).
