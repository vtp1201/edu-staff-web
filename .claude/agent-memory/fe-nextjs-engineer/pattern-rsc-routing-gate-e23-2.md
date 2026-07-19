---
name: pattern-rsc-routing-gate-e23-2
description: E23.2 post-login select-tenant — RSC four-way routing gate, testing an RSC page by inspecting returned-element props, storybook router.refresh mock, server-action direct-import works in storybook runner
metadata:
  type: project
---

# US-E23.2 post-login select-tenant (RSC routing gate) patterns

**RSC page test WITHOUT rendering** — an async RSC page returns a React element;
call `await mod.default()` and read `el.props.screenState` directly (mock the
`"use client"` child via `vi.mock("./select-tenant", () => ({ SelectTenant: (p)=>p }))`
so the returned element's props are inspectable). Cleanest way to prove
four-way branch wiring (fetch-fail→error / single→redirect / empty / cards)
without a browser. Redirect branch: `await expect(runPage()).rejects.toMatchObject({digest: /NEXT_REDIRECT/})`.

**Storybook router.refresh assertion** — `import { getRouter } from
"@storybook/nextjs-vite/navigation.mock"` + `parameters:{nextjs:{appDirectory:true}}`;
then `expect(getRouter().refresh).toHaveBeenCalled()`. next-intl's `useRouter`
(from `@/bootstrap/i18n/routing`) passes `.refresh` straight through to the
mocked `next/navigation`, so the spy fires. Used for the retry-button proof.

**Server action direct-import in a client component is Storybook-safe here** —
`select-tenant.tsx` (`"use client"`) imports `logoutAction` from `../login/actions`
(which transitively imports server-only DI). The storybook vitest runner does NOT
choke because `vitest.config.mts` aliases `server-only`→stub and the addon-vitest
project inherits it. So `<form action={logoutAction}>` works in stories. (Decision
D "direct import" confirmed viable — no need to prop-drill the action.)

**Stale storybook deps cache** — `Failed to fetch dynamically imported module …
react-18-*.js` on `vitest:storybook` = stale cache, NOT a real failure. Fix:
`rm -rf node_modules/.cache/storybook node_modules/.vite` then rerun.

**Loading skeleton for a story** — an async RSC `loading.tsx` using
`getTranslations` can't render in a browser story (no request context). Extract a
pure presentational `SelectTenantSkeleton({loadingLabel})` (no directive) that
`loading.tsx` feeds the translated label; the story renders the skeleton directly.

**Correctness note** — the "multiple" cards branch filters `memberships.filter(isSwitchable)`
BEFORE `enrichMemberships`, so count + cards reflect only ACTIVE (FR-003 one-card-per-ACTIVE);
plan.md's `enrichMemberships(memberships, null)` on the full list would have shown
non-ACTIVE rows. `classifyMembershipCount` (added to tenant-membership.entity.ts)
already counts only ACTIVE.

See also [[pattern-tenant-switch-e23-1]] (shared TenantCard/runSwitchActivation/switchTenantAction).
