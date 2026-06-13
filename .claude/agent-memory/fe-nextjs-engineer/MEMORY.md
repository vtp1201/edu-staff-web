# Memory Index

- [Use-case Result pattern](pattern-usecase-result.md) — domain use-cases return discriminated Result<T> + CalendarFailure, not throw
- [Mock-first feature wiring](pattern-mock-first-wiring.md) — USE_MOCK toggle in DI factory; module-level mutable seed in mock repo
- [Role union record ripple](gotcha-role-record-ripple.md) — extending Role breaks every Record<Role,…>; no edu-role-admin token (reuse primary)
- [Route role guard](pattern-route-role-guard.md) — admin/* guard: jwt decodeRoleClaim + pure evaluateAdminAccess + server-only RSC layout redirect
- [Storybook vitest runner broken](gotcha-storybook-vitest-runner-broken.md) — vitest:storybook fails env-wide (ERR_REQUIRE_ESM); use plain vitest, author play fns honestly
- [Client searchParams nav](pattern-client-searchparams-nav.md) — selector screen drives RSC re-fetch via searchParams; optional onSelect override props for Storybook; pure build-*-vm.ts
