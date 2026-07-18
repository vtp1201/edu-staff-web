---
name: us-e21.2-qa-patterns
description: QA patterns for US-E21.2 invite-accept (ADR 0059 ground-truth correction) — RSC/action-layer gap despite passed security-diff, RSC node-test recipe for searchParams pages
metadata:
  type: project
---

US-E21.2 public invitation-accept: story.md/spec.md/use-cases.md all have
"Ground-Truth Correction" sections that DROP the original BA-spec use cases
(UC-101 preview, UC-102 guest signup, UC-104 account-conflict) per ADR 0059 —
must audit against the LATEST superseding section (use-cases.md §7, spec.md
§11), not the historical §3/§4 AC list, or you'll write tests for dead code
paths.

**Real gap found despite a PASSED tech-lead security-diff**: the reviewer's
5-point manual trace ("switchTenant uses ONLY server-returned tenantId",
"switchAccountAction fully signs out before redirect") was CORRECT but had
**zero automated regression-guard test** — `page.tsx` (RSC vm-derivation:
missing-token/auth-gate/signed-in/stale-session branches) and `actions.ts`
(`joinAction`/`switchAccountAction` — the actual redirect-URL construction
from `roles[0]`, the `switchTenant(tenantId)` call, "logout failure leaves
session intact") had NO test file at all before this QA pass. Manual code
review by a reviewer is not a substitute for a test that fails on regression.
Always check: does a `page.test.ts`/`actions.test.ts` exist for the Server
Actions/RSC page a security-diff traced by hand? If not, write it even when
the diff passed.

**RSC search-params page node-test recipe** (reusable, extends the
`fe-nextjs-engineer`/redirect-guard recipe from US-E11.6/US-E11.8/US-E17.3):
mock `next-intl/server` (`getLocale`), mock the sibling `./actions` module
entirely (stub `joinAction`/`switchAccountAction` as bare `vi.fn()` — the page
test only needs to assert they're wired as props, not exercise them; those
get their own `actions.test.ts`), mock DI factories
(`makeGetProfileUseCase`)/`getAccessToken`, then `await Page({ searchParams:
Promise.resolve({token}) })` and assert on `el.props.vm`/`el.props.loginHref`
directly — no need to mount the client component. This is the CORRECT way to
prove server-side branching (missing-token short-circuit, auth-gate vs
signed-in derivation) that a Storybook `.stories.tsx` test literally cannot
reach (Storybook mounts the presentational component with a hand-authored
`vm` prop, it never runs the RSC's own derivation logic).

**Server Action test recipe** for redirect + cookie + DI wiring: mock
`next/navigation` redirect to throw `{digest: "NEXT_REDIRECT;<url>"}`,
`.catch((e) => e)` the action call, parse the digest for the URL — same
pattern as `login/actions.test.ts`. Assert BOTH the redirect URL (built from
role/tenantId path helpers) AND that side-effecting calls (`setAuthCookies`/
`clearAuthCookies`/downstream use-case `.execute`) did or didn't fire on each
branch (success vs each error type) — this is where the actual security
invariant (no partial session clear, no session mint on failure) lives, not
in the use-case/repository layer alone (those only prove the accept payload
shape, not the action's redirect/cookie sequencing).

Dark-mode contrast regression guard pattern: toggle `.dark` class on
`canvasElement.ownerDocument.documentElement` inside a Storybook `play()`
(wrap in try/finally to remove it after), then assert
`getComputedStyle(el).backgroundColor`/`.color` equals the EXACT expected
`rgb(...)` computed from the fixed hex token values in `globals.css`'s
`.dark {}` block. Cheap way to lock in an a11y contrast fix so a future
`globals.css` edit can't silently regress it (this repo had exactly that bug:
A11Y-001, `--edu-error-text` collapsing to the light-mode value in dark mode,
found by a self-audit with no test backing it before this pass).

Viewport 320/768 Storybook pattern (reused from `exam-result.stories.tsx`
precedent): `parameters: { viewport: { viewports: { mobile320: { styles: {
width: "320px", ... } } }, defaultViewport: "mobile320" } }`, then assert
`element.getBoundingClientRect().right <= 320` — do NOT query by visible text
for a `hidden lg:flex` panel with `queryByText(..., {exact:false})` (matches
multiple nodes if the tagline also contains the brand name substring); query
the container by `[class*="lg:flex"]` and assert `getComputedStyle().display
=== "none"` instead.
