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
