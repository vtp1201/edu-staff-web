---
name: us-e24.1-qa-patterns
description: QA patterns from US-E24.1 (LMS real-contract repoint) — RSC "build never executes dynamic pages" trap, sibling edu-api ground-truth check, race-condition story gap pattern
metadata:
  type: project
---

US-E24.1 (edu-staff-web) re-pointed `src/features/lms/**` from mock/aspirational
contract to the real BE `services/lms` contract. Self-report was of very high
quality (tech-lead + a11y fix rounds both genuinely verified on re-read), but one
systemic gap category recurred:

1. **"Renders without crash (mock/real)" AC evidenced only by `bun build` succeeding
   in both `NEXT_PUBLIC_USE_MOCK` modes is NOT proof for any RSC page that calls
   `requireRole()`/reads cookies.** Cookie reads force dynamic rendering, so
   `next build` only compiles the page — it never executes the function body for
   either env value. All 3 LMS student RSC pages (`courses/page.tsx`,
   `courses/[courseId]/page.tsx`, `assignments/page.tsx`) had zero test actually
   invoking `Page()` with a real entity shape end-to-end (guard→DI→mapper→VM).
   Closed with 3 `page.test.ts` files using the established recipe: `vi.mock`
   `@/bootstrap/auth-guard` + `@/bootstrap/di/<feature>.di` at module boundary,
   `await import("./page")`, call `Page({params: Promise.resolve(...)})`, read
   `.props` off the returned React element. For `notFound()`-throwing paths,
   `await expect(renderPage()).rejects.toThrow()` — no need to mock
   `next/navigation`, the real `notFound()` throws unconditionally in node env.
   **General rule for any story with cookie-gated RSC pages: grep for
   `page.test.ts` next to `page.tsx` before trusting a "build is green" claim as
   render proof.**

2. **Ground-truth `LMS_EP`/endpoint-path ACs against the SIBLING `edu-api` checkout
   directly** (`../edu-api` relative to `edu-staff-web`) — `grep -n "^  /"
   services/<svc>/docs/openapi.yaml` lists every real path in seconds. Don't just
   re-read the feature's own endpoint-snapshot test; that test can drift from the
   BE contract just as easily as the endpoint file can, if nobody diffs against
   the actual source.

3. **Race-condition story gap pattern**: when a screen has BOTH a "detail read
   already reveals prior state" story (e.g. `OpenSheet_AlreadySubmitted` — sheet
   opens read-only) AND a separate mutation action that can ALSO fail with the
   same domain error via a race (e.g. `submitAssignmentAction` returning
   `already-submitted` when the client's own state said `null`), teams commonly
   write only the first and treat it as covering the AC. The two are different
   code paths with different i18n copy — check the domain failure union / i18n
   catalogue for entries with zero story mentions before accepting "covered."

4. **"Documented as legal but rare" enum/null values need their own fixture.**
   BE explicitly documented `examUrl: null` as legal ("when the deployment has
   not configured one"). Every fixture across `lms.fixtures.ts`, the mock repo,
   and all Storybook stories for this feature happened to always supply a link.
   The code handled the null case correctly (informational div, no `href="#"`)
   but zero test proved it. Grep entity/DTO doc comments for "null when..." /
   "legal value" phrasing and cross-check against every fixture array in the
   feature for at least one row hitting that branch.

Result: PASS (GO) — 14 new unit tests (3 page.test.ts files) + 2 new Storybook
interaction tests, zero production code changed, full gate green
(523 files/4210 tests, tsc clean, lint clean, storybook-vitest 16/16 on touched
files).
