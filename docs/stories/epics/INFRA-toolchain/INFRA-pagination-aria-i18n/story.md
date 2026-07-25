# INFRA-pagination-aria-i18n: Pagination accessible names must respect locale

## Status

implemented

## Lane

tiny (surgical primitive fix, no behavior change, no new screens, no auth/RBAC/token/PII surface)

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) touched: `src/components/ui/pagination/` (primitive, no current
  feature consumers)
- Shared contract/file: `src/bootstrap/i18n/messages/{vi,en}.json` — new `Common.pagination`
  key group (reused `Common` namespace, not a new namespace)

## Escalation this resolves

Flagged as a follow-up during `INFRA-dialog-close-label-i18n`: `pagination.tsx` hardcoded
English `aria-label`/sr-only strings ("pagination", "Go to previous page", "Go to next
page", "More pages") and hardcoded visible "Previous"/"Next" text, ignoring the active
`next-intl` locale. Same defect class as the Dialog/Sheet close-button bug fixed in that
story — violates `.claude/rules/i18n.md` (all UI strings through the message catalogue)
and `.claude/rules/accessibility.md` (accessible name must be locale-correct).

## Investigation (ground truth)

- `grep -rEn 'aria-label="[A-Za-z]|sr-only">[A-Z]|title="[A-Z]' src/components/ui/*/*.tsx`
  found hardcoded strings ONLY in `pagination.tsx` (4 occurrences: nav `aria-label`,
  previous/next `aria-label`, ellipsis sr-only text).
- Swept the rest of `src/components/ui/*` for the same defect class (dropdown-menu,
  popover, select, tooltip, dialog, sheet) — the only "Previous"/"Next"/"Close"/"slide"
  hits there are Tailwind animation class fragments (`data-[state=closed]:...`,
  `slide-in-from-*`), not user-facing text. No carousel/breadcrumb primitive exists in
  this repo (`ls src/components/ui/` confirmed). Checked clean.
- No current consumer imports `@/components/ui/pagination` in `src/features/` or
  `src/app/` (`grep -rln "ui/pagination" src` returns nothing outside the primitive
  itself) — safe, isolated fix with zero risk of breaking a feature screen's existing
  translated `aria-label` override, but the default-to-translated + explicit-override
  pattern was still preserved for forward compatibility (mirrors `SheetContent`'s
  `closeLabel` escape hatch).
- `pagination.stories.tsx` was stale (`@storybook/react` import, `PaginationItem` used
  with a nonexistent `value` prop/string children that doesn't match the real
  `React.ComponentProps<"li">` API) — rewritten to the current
  `@storybook/nextjs-vite` + `NextIntlClientProvider` pattern with a real
  Previous/Link/Ellipsis/Next composition.

## Fix

- Added `Common.pagination` key group (`nav`, `previous`, `next`, `previousAriaLabel`,
  `nextAriaLabel`, `morePages`) to `src/bootstrap/i18n/messages/{vi,en}.json` (typed via
  `messages.d.ts` augmentation — a wrong key fails the build).
- `pagination.tsx` → added `"use client"` (required for `useTranslations`); `Pagination`,
  `PaginationPrevious`, `PaginationNext`, `PaginationEllipsis` now resolve their
  accessible name/text via `useTranslations("Common")`, with an explicit `aria-label`
  prop (when supplied by a consumer) taking precedence — default-to-translated, override
  preserved.
- Rewrote `pagination.stories.tsx`: `Default`, `LocaleVi`/`LocaleEn` (assert nav
  role name, previous/next link accessible names, ellipsis sr-only text per locale, and
  that no Vietnamese literal leaks into the English locale), `AriaLabelOverride`
  (explicit `aria-label` wins over the translated default).

## Relevant Product Docs

- `.claude/rules/i18n.md`, `.claude/rules/accessibility.md`,
  `.claude/rules/component-organization.md`

## Acceptance Criteria

- `grep -rEn 'aria-label="(pagination|Go to (previous|next) page)"|sr-only">More pages<|>Previous<|>Next<' src/components/ui/pagination/pagination.tsx`
  returns nothing.
- `Pagination` nav landmark, `PaginationPrevious`/`PaginationNext` accessible names +
  visible text, and `PaginationEllipsis` sr-only text render from
  `messages/{vi,en}.json` for the active locale (not a hardcoded literal).
- An explicit `aria-label` prop passed by a consumer still overrides the translated
  default.
- No behavior/visual change for any existing consumer (there are none yet; verified via
  repo-wide grep) — only the accessible-name/text source changed.

## Design Notes

- Commands: none (no domain/use-case layer — pure UI primitive fix)
- Queries: none
- API: none
- Tables: none
- Domain rules: none
- UI surfaces: `Pagination` primitive (not yet consumed by any feature screen; fixed
  proactively before first use to avoid drift)

## Validation

`scripts/bin/harness-cli story update --id INFRA-pagination-aria-i18n --status implemented --unit 1 --integration 0 --e2e 1 --platform 1`

| Layer | Expected proof |
| --- | --- |
| Unit | `bun vitest run` — 419 test files / 2801 tests passed |
| Integration | n/a (no repository/HTTP boundary touched) |
| E2E / Story | `bun run vitest:storybook run` — 149 test files / 1045 tests passed, incl. 3 new Pagination locale/override interaction stories |
| Platform | `bunx tsc --noEmit` clean; `NEXT_PUBLIC_USE_MOCK= bun run build` succeeded |
| Release | Auto-merged to `main` per decision `0025`, branch deleted |

## Harness Delta

- New story `INFRA-pagination-aria-i18n` registered (tiny lane, INFRA-toolchain epic —
  follows the precedent of `INFRA-dialog-close-label-i18n` for cross-cutting primitive
  fixes with no single owning feature).
- `docs/TEST_MATRIX.md` row added.

## Evidence

- `grep -rEn 'aria-label="(pagination|Go to (previous|next) page)"|sr-only">More pages<|>Previous<|>Next<' src/components/ui/pagination/pagination.tsx`
  → empty (post-fix).
- `bunx tsc --noEmit` → clean.
- `bun vitest run` → 419 passed / 419 (2801 tests).
- `bun run vitest:storybook run` → 149 passed / 149 (1045 tests), including new
  `UI/Pagination` (`LocaleVi`, `LocaleEn`, `AriaLabelOverride`) stories.
- `NEXT_PUBLIC_USE_MOCK= bun run build` → succeeded.
