# US-E08.4 `<html lang>` derived from `[locale]` route param

## Status

implemented

## Lane

tiny

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm: `src/app/layout.tsx`, `src/app/[locale]/layout.tsx`
- Shared contract/file: none

## Product Contract

Finding A11Y-012: root `src/app/layout.tsx` hardcodes `lang="en"`, so Vietnamese
users receive incorrect screen-reader language announcements.

The `<html lang>` attribute must match the `[locale]` route segment (`vi` or `en`)
so assistive technologies use the correct language rules.

## Acceptance Criteria

- [ ] `src/app/[locale]/layout.tsx` renders `<html lang={locale}>` dynamically
- [ ] `src/app/layout.tsx` no longer renders the `<html>` element (or keeps it as a pass-through without lang)
- [ ] `<body>` and font/theme providers remain correctly wired
- [ ] `bun vitest run` passes
- [ ] `bun build` + `tsc --noEmit` clean

## Implementation Approach

In Next.js 16 App Router the correct pattern for locale-aware `<html lang>` with
next-intl is to move `<html>` + `<body>` into `src/app/[locale]/layout.tsx` (which
already has access to `params.locale`) and make `src/app/layout.tsx` a minimal
pass-through that exports only `metadata`. This is the documented next-intl approach.

## Test Matrix Row

| US-E08.4 | html lang derived from [locale]: vi routes → lang="vi", en routes → lang="en"; no hardcoded lang="en" | no | no | no | yes | planned | none |
