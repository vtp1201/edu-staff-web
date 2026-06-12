---
name: pattern-mock-first-wiring
description: Mock-first DI wiring shape for a feature whose BE service (core/lms/social) doesn't exist yet
metadata:
  type: project
---

For features hitting a not-yet-existing BE service (core/lms/social), wire
mock-first: DI factory `makeRepo()` returns `USE_MOCK ? new MockXRepository() :
new XRepository(await createServerHttpClient())`.

**Why:** decision 0014; core service not up yet.

**How to apply:**
- Mock repo lives at `infrastructure/repositories/mocks/x.mock.repository.ts`, `import 'server-only'`.
- Seed data in sibling `mocks/fixtures.ts` (data, NOT i18n).
- For mutating mocks, hold a **module-level mutable** `structuredClone(SEED)` and
  return `structuredClone(...)` from each method so mutations persist within the
  server process without leaking the seed reference.
- Real repo casts unwrapped envelope: `(await this.http.post(...)) as unknown as Dto`.
- Date picking: shadcn `Popover` + `Calendar` (mode="single"), format ISO with a
  LOCAL-date helper (getFullYear/getMonth/getDate) — `toISOString()` causes TZ
  off-by-one.
