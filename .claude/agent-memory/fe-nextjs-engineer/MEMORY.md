# Memory Index

- [Use-case Result pattern](pattern-usecase-result.md) — domain use-cases return discriminated Result<T> + CalendarFailure, not throw
- [Mock-first feature wiring](pattern-mock-first-wiring.md) — USE_MOCK toggle in DI factory; module-level mutable seed in mock repo
- [Role union record ripple](gotcha-role-record-ripple.md) — extending Role breaks every Record<Role,…>; no edu-role-admin token (reuse primary)
- [Route role guard](pattern-route-role-guard.md) — admin/* guard: jwt decodeRoleClaim + pure evaluateAdminAccess + server-only RSC layout redirect
- [Storybook vitest runner broken](gotcha-storybook-vitest-runner-broken.md) — vitest:storybook fails env-wide (ERR_REQUIRE_ESM); use plain vitest, author play fns honestly
- [Client searchParams nav](pattern-client-searchparams-nav.md) — selector screen drives RSC re-fetch via searchParams; optional onSelect override props for Storybook; pure build-*-vm.ts
- [Result shape + dynamic i18n errors](gotcha-result-shape-and-dynamic-i18n.md) — Result is {ok,value}/{ok,failure} not .error; dynamic t(`errors.${key}`) needs ALL union keys in every namespace
- [Throwing-repo failure idiom](pattern-throwing-repo-failure.md) — when packet repo returns Promise<Entity> (throws Failure), action is catch boundary→errorKey; role-boundary guard actions
- [RSC-props + local-state screen](pattern-rsc-props-local-state-screen.md) — mock-first multi-tab action screens: RSC prefetch→VM props→useState+useTransition, NOT client TanStack Query
- [Biome role-prop + impeccable cache](gotcha-biome-role-prop-and-impeccable-cache.md) — `role=` prop flagged as ARIA (use viewerRole); .impeccable cache breaks lint (add !.impeccable to biome.json)
- [Result-repo vs throwing-repo](pattern-result-repo-vs-throwing.md) — two repo error conventions coexist; follow the packet's IXxxRepository signature
- [Filter pills a11y](gotcha-filter-pills-a11y.md) — Biome rejects role=radio/group on div/button + ignored noAutofocus suppression; use aria-pressed buttons in fieldset/legend + ref+useEffect focus
- [Server-action-as-prop step machine](pattern-server-action-as-prop-step-machine.md) — [id] route: RSC page imports action + passes as prop to client step-machine container (not client-imported)
- [Storybook TanStack decorator](pattern-storybook-tanstack-decorator.md) — screen owning query hooks needs per-story QueryClientProvider; portal content via within(document.body); no rounded-card/button token
- [Storybook baseline failures + dual dialog](gotcha-storybook-baseline-failures-and-dual-dialog.md) — git-stash to baseline before blaming a failing story; scope getByRole(dialog) by name when Sheet+Dialog coexist
- [Status union extension + nullable fields](pattern-status-union-extension.md) — snake_case union vs camelCase i18n key → explicit switch mapper not dynamic t(); nullable score/passed → re-check field after isResultFinal guard, never ?? 0
