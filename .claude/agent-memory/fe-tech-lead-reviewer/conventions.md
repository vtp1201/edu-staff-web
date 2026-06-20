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
- **`{ raw: true }` placement trap (api-envelope.ts):** the http interceptor's `isRawCall` reads
  **config-level** `config.raw` (declared on `AxiosRequestConfig`), but repos (roster, teacher-dashboard)
  pass `{ params: { raw: true } }` — `raw` nested in `params` does NOT set `config.raw`, so at RUNTIME
  the interceptor unwraps the envelope before `parseEnvelope` sees it. Unit tests miss this because they
  mock `http.get` to return a full envelope, bypassing the interceptor. Cross-cutting (shared with roster
  precedent) → route to fe-lead, not a single-story block. Correct form is config-level
  `{ params: {...}, raw: true }`. Candidate ADR.
- **Paginated count via roster `.length`:** counting students by `roster.length` on a single `{limit:N}`
  page (teacher-dashboard `getTotalStudents`) silently undercounts when `meta.pagination.hasMore` is true.
  Flag any "sum/count from a list endpoint" that doesn't follow `nextCursor`.
- **`{raw:true}` trap is REPO-WIDE precedent** (confirmed US-E13.1): calendar, subject-catalogue,
  class-management, staffing, admin-roster, teacher-dashboard, teacher-class ALL pass
  `{ params: {..., raw: true } }` (raw nested in params, not config-level). So at runtime the
  interceptor unwraps before parseEnvelope. Since it's universal precedent, do NOT block a single
  new repo that copies it — route to fe-lead as a cross-cutting ADR. A new repo following this
  pattern is CONSISTENT, not a regression.
- **Role boundary via per-route action shadowing** (confirmed US-E13.3 class-log): one shared
  presentation screen (`ClassLogScreen`) takes all 4 actions as props; the teacher route's
  `actions.ts` wires create/submit to real use-cases but stubs approve/reject to
  `{ ok:false, errorKey:"unauthorized" }`, and the principal route does the inverse (stubs
  create/submit, wires approve/reject). This is sound server-side defense-in-depth — the privileged
  use-case is never reachable from the wrong role's route. ACCEPTED pattern; don't flag the "stub"
  actions as dead code — they enforce the boundary.
- **Auth/role guard (US-INFRA.2, decisions 0022/0024):** `bootstrap/auth-guard/` splits a PURE
  `evaluateAccess()` (`access-context.ts`, no `server-only`, unit-testable) from a `server-only`
  `requireRole()` wrapper (`require-role.server.ts`). Layout (RSC) does auth+tenant via
  `evaluateAccess`; Server Actions do role-only via `requireRole` (BEFORE `makeXxx()`), returning
  `{ ok:false, errorKey:"forbidden" }`. Mock-first: `decodeRoleClaim` returns "admin" in
  dev+mock; layout passes `tokenTenantId = urlTenant` in mock to skip tenant-mismatch. Watch:
  the barrel `index.ts` re-exports the server-only wrapper — safe only while no CLIENT component
  imports `evaluateAccess` from `@/bootstrap/auth-guard`; a client importer would break the build.
- **Prod mock build-guard (`next.config.ts`):** throws iff `NODE_ENV==="production" && NEXT_PUBLIC_USE_MOCK==="true"`
  — backstops the dev-only mock admin bypass. Treat as the required safety net for any mock-first auth shortcut.
- `nav-config.ts` (`components/layout/app-shell/sidebar/`) is a PURE data/types module with NO
  `'use client'` — exports `Role`, `NAV_BY_ROLE`, `DEFAULT_ROUTE`, `ROLE_LABEL_KEY`. It imports
  lucide icon components as values but those are isomorphic, so it's safe to import from a server
  module. Still a layer-direction smell (bootstrap→components); the clean fix is to move shared
  routing constants (`DEFAULT_ROUTE`, `Role`) to `bootstrap/tenant` or a domain location.
