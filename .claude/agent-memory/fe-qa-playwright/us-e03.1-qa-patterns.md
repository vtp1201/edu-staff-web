---
name: us-e03.1-qa-patterns
description: principal reports dashboard QA — RSC layout-guard node test recipe (redirect() throws w/o request context), no-jsdom/no-Playwright confirmed constraint, TanStack query-key-based race proof
metadata:
  type: project
---

US-E03.1 (principal reports dashboard) confirmed a repo-wide test-infra fact and gave a
reusable recipe:

- **This repo has NO standalone Playwright harness and NO jsdom/RTL.** `@vitest/browser-playwright`
  is only wired into `vitest.storybook.mts`'s `storybookTest` project — real Chromium via
  Storybook stories is the ONLY way to render a React component in a browser here. "E2E tier"
  = Storybook interaction `play()` in browser mode. Confirmed again by grepping for
  `*.spec.ts`/`*e2e*`/testing-library/jsdom in package.json — none found (re-confirms
  [[us-e17-2-qa-patterns]]-era finding, still true 2026-07).

- **RSC layout-guard route tests DON'T need a browser or a next/navigation mock.** Next's
  `redirect()` (from `next/dist/client/components/redirect.js`) just throws a
  `NEXT_REDIRECT;<type>;<url>;<status>;` digest synchronously — no request-scoped storage
  dependency. You can `await import("./layout")` in a plain node-env vitest test, call the
  async layout function directly with a hand-built `params` Promise, and catch the thrown
  error to assert the redirect target via `err.digest.split(";")[2]`. Mock only the leaf
  dependency (`@/bootstrap/lib/auth-token.server`'s `getAccessToken`) with `vi.mock`; use REAL
  JWTs via a `makeJwt(payload)` helper (base64url-encode header+payload) exercised through the
  real `decodeRoleClaim`/`decodeTenantId`. Remember to `vi.stubEnv("NEXT_PUBLIC_USE_MOCK",
  "false")` — `decodeRoleClaim` has a mock-first special case that forces role="admin" for
  ANY non-empty token when `NEXT_PUBLIC_USE_MOCK==="true"`, which would defeat a role-specific
  guard test. This pattern generalizes to any `(app)/<role>/<x>/layout.tsx` guard in this repo —
  no prior layout.test.ts existed anywhere before this story; consider it the template.

- **AC-01.4 (stale-response race on rapid filter/term switch) is provable by architecture, not
  simulation**, when query keys embed the filter value (e.g. `principalReportsKeys.list(termId)`)
  and no `keepPreviousData`/`placeholderData` is used: TanStack Query's cache-key identity means
  a late response for the old key structurally cannot overwrite the new key's cache entry —
  "nothing to discard." Cheap regression guard: a plain unit test asserting every region's key
  factory embeds the filter value uniquely (no QueryClient, no timers, no browser needed). Don't
  invent a fake-timer + live-QueryClient race test for this — the repo's own state-design doc
  explicitly avoids that combo for flake risk; a `getComputedStyle`-based real-browser viewport
  story is a fine substitute for other proofs, but a race needs the key-identity argument, not
  simulation.

- **Viewport-matrix stories**: `parameters.viewport.viewports.custom.styles = { width, height }`
  + `defaultViewport: "custom"` actually resizes the real Chromium page in
  `@vitest/browser-playwright` mode (confirmed working, not just cosmetic for the Storybook
  manager UI) — `getComputedStyle(gridEl).gridTemplateColumns` correctly reflects the Tailwind
  `lg:` breakpoint transition. Prefer this over asserting on the raw className string (a
  className match is vacuous — it's always present regardless of viewport; only computed style
  proves the breakpoint actually took effect).

- Found 2 real, closeable gaps in an otherwise very clean packet (tech-lead + a11y already
  approved): a sibling chart region (`attendance-trend-chart-region`) was missing Loading/
  ErrorState stories that its sibling (`subject-average-chart-region`) had — always diff
  sibling region files for state-story parity, don't assume symmetry.
