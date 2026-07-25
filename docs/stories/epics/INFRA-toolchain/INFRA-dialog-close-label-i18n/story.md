# INFRA-dialog-close-label-i18n: Dialog/Sheet close-button label must respect locale

## Status

implemented

## Lane

tiny (surgical primitive fix, no behavior change, no new screens, no auth/RBAC/token/PII surface)

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) touched: `src/components/ui/dialog/`, `src/components/ui/sheet/` (primitives
  used app-wide — no feature code changed)
- Shared contract/file: `src/bootstrap/i18n/messages/{vi,en}.json` — new `Common.close` key
  (reused, not a new namespace)

## Escalation this resolves

`fe-accessibility-auditor` flagged during US-E09.6 (`student-absences`) that the `Dialog`
primitive's icon-only close button hardcoded the Vietnamese literal `"Đóng"` as its
`sr-only` accessible name, regardless of the active `next-intl` locale — an English-locale
user would hear/read a Vietnamese label. Violates `.claude/rules/i18n.md` (all UI strings
through the message catalogue) and `.claude/rules/accessibility.md` (icon-only button
`aria-label`/accessible name must be meaningful and locale-correct).

## Investigation (ground truth)

Grepped `src/components/ui/*` for the same class of defect (hardcoded close-button label
ignoring locale):

- `src/components/ui/dialog/dialog.tsx` — `DialogContent`'s close button: hardcoded
  `"Đóng"` (Vietnamese, ignores `en` locale). Also `DialogFooter`'s optional
  `showCloseButton` renders a `<Button>Close</Button>` hardcoded to English (dead code
  today — no consumer passes `showCloseButton` on `DialogFooter` — but same defect class,
  fixed in the same commit since it's the same file/primitive).
- `src/components/ui/sheet/sheet.tsx` — `SheetContent`'s close button: `closeLabel` prop
  defaulted to the hardcoded English literal `"Close"` (ignores `vi` locale). No consumer
  currently overrides `closeLabel`, so every Sheet in the app showed "Close" even under the
  Vietnamese-default locale.
- `alert-dialog.tsx`, `command.tsx`, `popover.tsx`, `drawer` (no separate primitive — Sheet
  covers it): no icon-only close button with a hardcoded label — `AlertDialog` only has
  `Action`/`Cancel` buttons whose text is always supplied by the consumer (already
  i18n'd per-callsite). Out of scope — no defect found there.
- `pagination.tsx` has separate hardcoded English `aria-label`s ("Go to previous page",
  etc.) — a related but distinct defect (not a close-button label); left OUT of this
  surgical fix, flagged as a follow-up candidate.

## Fix

- Added `Common.close` ("Đóng" / "Close") to `src/bootstrap/i18n/messages/{vi,en}.json`
  (reused the existing `Common` namespace already used by `confirmDialog`/`skeleton`; typed
  via `messages.d.ts` augmentation — a wrong key fails the build).
- `dialog.tsx`: `DialogContent`'s close button now reads `useTranslations("Common")` →
  `t("close")`. `DialogFooter`'s close button now uses the same `t("close")`.
- `sheet.tsx`: `SheetContent`'s `closeLabel` prop no longer defaults to a hardcoded
  literal — it now resolves to `useTranslations("Common")` → `t("close")` when the
  consumer doesn't explicitly override it (`closeLabel` prop still works as an escape
  hatch, verified by a dedicated story).
- Rewrote the stale `dialog.stories.tsx` / `sheet.stories.tsx` (previously
  `@storybook/react` imports with no `NextIntlClientProvider`, broken JSX composition) to
  the repo's current `@storybook/nextjs-vite` + `NextIntlClientProvider` pattern, with
  interaction tests asserting the close button's accessible name for both `vi` and `en`
  locales, and that clicking it dismisses the dialog/sheet.

## Relevant Product Docs

- `.claude/rules/i18n.md`, `.claude/rules/accessibility.md`,
  `.claude/rules/component-organization.md`

## Acceptance Criteria

- `grep -rn '"Đóng"' src/components/ui/` returns nothing.
- Dialog and Sheet close buttons render an accessible name sourced from
  `messages/{vi,en}.json` for the active locale (not a hardcoded literal).
- `Sheet`'s `closeLabel` prop override still works when a consumer explicitly passes one.
- No behavior/visual change for any existing consumer (Dialog/Sheet visual output
  unchanged; only the close button's accessible name source changed).

## Design Notes

- Commands: none (no domain/use-case layer — pure UI primitive fix)
- Queries: none
- API: none
- Tables: none
- Domain rules: none
- UI surfaces: `Dialog`, `Sheet` primitives (used across ~20+ feature screens; not visually
  changed, only the close button's accessible name is now locale-correct)

## Validation

`scripts/bin/harness-cli story update --id INFRA-dialog-close-label-i18n --status implemented --unit 1 --integration 0 --e2e 1 --platform 1`

| Layer | Expected proof |
| --- | --- |
| Unit | `bun vitest run` — 419 test files / 2801 tests passed |
| Integration | n/a (no repository/HTTP boundary touched) |
| E2E / Story | `bun run vitest:storybook run` — 149 test files / 1042 tests passed, incl. 9 new Dialog/Sheet close-button locale + dismiss interaction tests |
| Platform | `bunx tsc --noEmit` clean; `bun run build` (with `NEXT_PUBLIC_USE_MOCK=`) succeeded |
| Release | Auto-merged to `main` per decision `0025`, branch deleted |

## Harness Delta

- New story `INFRA-dialog-close-label-i18n` registered (tiny lane, INFRA-toolchain epic —
  follows the precedent of `INFRA-storybook-suite-green` / `INFRA-shared-list-states` for
  cross-cutting primitive fixes with no single owning feature).
- `docs/TEST_MATRIX.md` row added.

## Evidence

- `grep -rn '"Đóng"' src/components/ui/` → empty (post-fix).
- `bunx tsc --noEmit` → clean.
- `bun vitest run` → 419 passed / 419 (2801 tests).
- `bun run vitest:storybook run` → 149 passed / 149 (1042 tests), including new
  `UI/Dialog` (`CloseButtonLocaleVi`, `CloseButtonLocaleEn`, `CloseButtonDismissesDialog`)
  and `UI/Sheet` (`CloseButtonLocaleVi`, `CloseButtonLocaleEn`, `CloseButtonDismissesSheet`,
  `CloseButtonExplicitLabelOverride`) stories.
- `NEXT_PUBLIC_USE_MOCK= bun run build` → succeeded.
