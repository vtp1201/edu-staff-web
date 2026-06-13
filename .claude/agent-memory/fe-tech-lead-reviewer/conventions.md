---
name: conventions
description: Verified repo conventions I rely on when reviewing (tokens, mock lib, route guard status)
metadata:
  type: project
---

Confirmed facts (verify before citing if stale):

- `--edu-error-foreground: #ffffff` token EXISTS in `src/app/tokens.css` and is mapped in
  `globals.css` `@theme` as `--color-edu-error-foreground`. So `text-white` on an `bg-edu-error`
  surface is a token violation with a real fix (`text-edu-error-foreground`), not a missing-token case.
- `bootstrap/lib/mock.ts` exports `USE_MOCK` (env `NEXT_PUBLIC_USE_MOCK==="true"`) + `mockDelay(ms)`
  (no-op in production). Mock repos must `import "server-only"`, seed via module-level
  `structuredClone(SEED)`, and call `mockDelay()` per op. This is the established pattern.
- Route role-guard in `(app)/layout.tsx` is a deferred TODO — role is HARDCODED pending a separate
  story. Do NOT block an admin story for missing role gate; flag as known platform gap, not a regression.
- DI factory-per-request pattern: `makeRepo()` switches mock vs real via `USE_MOCK`; each use-case
  factory is `async` and awaits a fresh repo. Matches auth/attendance.
- Server actions return stable `errorKey: Failure["type"]`; presentation translates via
  `t.errors.<type>`. Failure union doubles as the i18n error catalogue (keys `errors.<type>` in both
  vi+en). When reviewing: every failure `type` MUST have a matching `errors.<type>` key in both files.
- Next.js App Router nested `layout`/`page` `params` include ALL dynamic segments above them in the
  URL path (accumulated), not just their own segment. So a layout at `[locale]/t/[tenant]/(app)/admin/`
  legitimately receives `{ locale, tenant }`. Route groups `(app)`/`(auth)` add NO param segment.
  Don't flag a nested layout reading parent `[locale]`/`[tenant]` params as wrong — it's correct.
- No `@testing-library/react` is installed. DOM/render coverage for components is done via Storybook
  interaction stories (browser mode), and pure logic is unit-tested as exported helpers in node env.
  So extracting a pure helper (e.g. `compactToneClass`) + Vitest on it, plus stories covering each
  variant/state, is the ACCEPTED proof shape — don't demand an RTL render test that the toolchain
  can't run. Composed components in `components/shared/<name>/` need an `index.ts` re-export + stories.
- `nav-config.ts` (`components/layout/app-shell/sidebar/`) is a PURE data/types module with NO
  `'use client'` — exports `Role`, `NAV_BY_ROLE`, `DEFAULT_ROUTE`, `ROLE_LABEL_KEY`. It imports
  lucide icon components as values but those are isomorphic, so it's safe to import from a server
  module. Still a layer-direction smell (bootstrap→components); the clean fix is to move shared
  routing constants (`DEFAULT_ROUTE`, `Role`) to `bootstrap/tenant` or a domain location.
