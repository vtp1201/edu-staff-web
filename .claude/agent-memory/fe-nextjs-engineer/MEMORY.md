# Memory Index

- [No-op hygiene verification](pattern-noop-hygiene-verification.md) — E18.45: prove the NEGATIVE by classifying every surviving force-mock reason, not by grepping the fixed phrase (+more in file)

- [Primitive-level focus return](gotcha-primitive-focus-return.md) — E18.32 review: inside a Radix Content use `useAutoFocusReturn()` (snapshot on onOpenAutoFocus) (+more in file)
- [Terminal error ≠ skeleton](gotcha-terminal-error-vs-skeleton.md) — `isLoading || !data → Skeleton` renders forever after a terminal error (+more in file)
- [Composite-key point-read + unbacked read](pattern-composite-key-pointread-and-unbacked-read.md) — E18.32: a clustering-column id needs the whole ReportRef tuple (Sheet (+more in file)
- [Stale-assertion-only un-mock](pattern-stale-assertion-only-unmock.md) — E18.39: a BE fix can close a gap on a screen with NO force-mock branch (403 was a natural error) ⇒ zero production chan (+more in file)
- [Partial gap-closure wiring](pattern-partial-gap-closure-wiring.md) — E18.31 (+review fix): BE closing 1 of N gaps ≠ "repo swap"; mock WRITES behind real READS = fake publish (+more in file)
- [Force-mock vs honest degrade](pattern-force-mock-vs-honest-degrade.md) — E20.5 fix round: force-mock only for harmless seed data; actionable per-subject data must be USE_MOCK-gated + Unavaila (+more in file)
- [Promote with own .i-vm](pattern-promote-with-own-ivm.md) — E20.5: never "move" a type a feature's domain still needs (domain→components/shared = illegal) (+more in file)
- [Promote-on-3rd-use shared component](pattern-promote-shared-identity-header.md) — E20.4 +review-fix: promotion regressions hide in the PRIMITIVE's defaults (+more in file)
- [Read-only second caller](pattern-readonly-variant-second-caller.md) — E13.10: `readOnly` prop on the leaf table + NEW thin screen (not a boolean on the mutation screen) (+more in file)
- [Fan-out partial degrade](pattern-fanout-partial-degrade.md) — E13.9: aggregate `{rows, failedClassCount}` + role=status notice (silent degrade = defect) (+more in file)
- [Client filter becomes a server param](pattern-client-filter-becomes-server-param.md) — E18.29: per-tab infinite query + narrow the client filter helper (+more in file)
- [Diff-sync un-mock of a write path](pattern-diff-sync-unmock.md) — E18.28: multi-call diff-sync stays INSIDE the repo method (assert ORDER via shared calls[] not counts) (+more in file)
- [Entity i18n key+params reshape](pattern-entity-i18n-key-reshape.md) — E18.25: known-key table lives in domain (mock mapper + presentation allow-list + client SSE hook all need it) (+more in file)
- [Forced-mock DI + responsive table↔card](pattern-forced-mock-di-and-responsive-table-card.md) — E13.8: BE-RBAC-gap DI factory returns mock UNCONDITIONALLY (doc "don't make this USE_MOCK-condit (+more in file)
- [cmdk combobox in modal Dialog](gotcha-cmdk-combobox-in-dialog.md) — E20.1 SearchCombobox: `bun ui:add`/`bun add` hang (no TTY) → npm --no-save + declare + bun install reconcile (+more in file)
- [Feature-scoped audit trail](pattern-feature-scoped-audit-trail.md) — E20.3: 2nd mock store independent of rows (survives delete), unshift-only (no read sort, mockup sorts — don't copy) (+more in file)
- [High-risk authCtx re-auth](pattern-high-risk-authctx-reauth.md) — E20.1: mutating repo methods take explicit authCtx{role,tenantId} (decodeTenantId jwt.ts:84, NOT decodeTenantClaim) (+more in file)
- [DialogContent grid min-w-0 overflow](gotcha-dialog-grid-min-w-0.md) — shared DialogContent is CSS grid; children need [&>*]:min-w-0 or they overflow at 320/375px (DEF-E23.1-01) (+more in file)
- [DropdownMenu→Dialog + exit-animation](gotcha-dropdown-to-dialog-and-exit-animation.md) — Radix menu→dialog: (1) FAKE keyboard-trap = asserting dialog absence before motion-safe exit animation (+more in file)
- [No Playwright harness](gotcha-no-playwright-harness.md) — repo has NO standalone Playwright E2E (no config/e2e dir); Playwright is only the Storybook vitest browser provider → interaction sto (+more in file)
- [RSC routing gate E23.2](pattern-rsc-routing-gate-e23-2.md) — post-login select-tenant: test RSC page via returned-element props (mock client child →props) (+more in file)
- [Tenant switch E23.1](pattern-tenant-switch-e23-1.md) — 'use server' CANNOT export type (build breaks); Path A server-action result + isRedirectError rethrow inside try (Risk A) (+more in file)
- [Feed + Storybook portal bleed](pattern-feed-and-storybook-portal-bleed.md) — E19.1: reset body pointer-events + retryDelay:0 in SB decorator (Radix portal lock bleeds between stories) (+more in file)
- [Destructive-confirm errorSlot + moderation high-risk](pattern-destructive-confirm-and-moderation.md) — errorSlot(forbidden force-disables confirm/no-retry); never-optimistic remove (+more in file)
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
- [Storybook baseline failures + dual dialog](gotcha-storybook-baseline-failures-and-dual-dialog.md) — git-stash to baseline before blaming a failing story (+more in file)
- [Responsive aria gate](pattern-responsive-aria-gate.md) — responsive aria-hidden needs JS matchMedia (CSS can't toggle attrs); keep motion guard CSS; node-env tests = pure helpers + Storybook
- [Node-env component test](pattern-node-env-component-test.md) — no @testing-library/react; use renderToStaticMarkup string asserts for shared presentational components (+more in file)
- [Status union extension + nullable fields](pattern-status-union-extension.md) — snake_case union vs camelCase i18n key → explicit switch mapper not dynamic t() (+more in file)
- [DetailPanelHeader shared component](pattern-detail-panel-header.md) — 3-zone back-nav header; icon-only action labels via sr-only md:not-sr-only (NOT md:hidden); sr-only SheetHeader keeps Radix a11y
- [Portal-dialog testing + DestructiveConfirmDialog](pattern-portal-dialog-testing.md) — Radix portals don't render in node static markup; split proof (pure footer Vitest + Storybook play) (+more in file)
- [RSC-seeded infinite query + URL filter](pattern-rsc-seeded-infinite-query.md) — cursor list: RSC prefetch→useInfiniteQuery initialData (no HydrationBoundary) + draft/applied URL filter sync (+more in file)
- [Subscription hook node test](pattern-subscription-hook-node-test.md) — no renderHook in node env; extract framework-free controller + FakeEventSource + fake timers; hook stays thin binding
- [LMS player + media token](pattern-lms-player-and-media-token.md) — media-surface token; tone→literal-class map (mapper does hex→tone) (+more in file)
- [Screenless shared infra module](pattern-shared-infra-feature-module.md) — E18.23: capability used by ≥2 features = full feature module (no presentation) + own DI (+more in file)
- [By-member un-mock + RMW field](pattern-by-member-unmock-and-rmw-field.md) — E18.26: new getByMember (not overloaded getByClass); adding a field to a read-modify-write PUT must preserve it on (+more in file)
- [BE-wiring remap pattern](pattern-be-wiring-remap.md) — E18: flat wire DTO→nested entity via per-parent fan-out; create+activate orchestration outside try (no double-map) (+more in file)
- [Raw-flag interceptor guard](pattern-raw-flag-interceptor-guard.md) — raw:true is a config-level sibling of params (nested → silent UNKNOWN_ERROR); guard test pipes real unwrapResponse
- [Shell context + cooldown](pattern-shell-context-and-cooldown.md) — E22: AppShell can't use TanStack Query (Context instead); framework-free timer + useSyncExternalStore (+more in file)
- [Non-blocking overlay query](pattern-nonblocking-overlay-query.md) — E10.6: secondary presence query merged into host entities (never gates host loading); own DI repo per service (+more in file)
- [Per-tab cold query + nullable RSC seed](pattern-per-tab-cold-query-and-nullable-seed.md) — E11.7: key list region by activeTab for real per-tab refetch (gcTime/staleTime 0) (+more in file)
- [SSE flat wire + notification wiring E18.18](pattern-sse-flat-wire-and-notification-wiring.md) — real notification SSE frames FLAT (no payload/eventId (+more in file)
- [Messaging rooms remap E18.17](pattern-messaging-rooms-remap-e18-17.md) — social=UPPER_SNAKE codes; RoomSummary/Message wire has NO unread/avatar/color→pure room-derive (hash 7-tone (+more in file)
- [Hybrid partial-real wiring](pattern-hybrid-partial-real-wiring.md) — E18.13: one-method-real Hybrid facade(real,mock); reactive-gate (drop client pre-check→server 422) (+more in file)
- [openapi drifts from Go source](gotcha-openapi-drifts-from-go-source.md) — E18: core openapi.yaml can lie vs running server (exam-papers /questions = add-ONE not replace-list (+more in file)
- [Question-bank E11.9](pattern-question-bank-e11-9.md) — call-site forbidden mapper (browse/edit param, not code); mode-conditional disjoint search key (+more in file)
- [Admin invitations E21.1](pattern-invitations-e21-1.md) — 2-collaborator hybrid DI (mutations real, list/resend force-mock via throwing stubs on real class) (+more in file)
- [Async-transition stuck isPending](gotcha-async-transition-stuck-pending.md) — useTransition async action leaves isPending stuck-true after a post-await setState (button freezes, no retry) (+more in file)
- [4-region reports dashboard](pattern-reports-dashboard-4region.md) — E03: thin RSC + N independent useQuery via action refs (no placeholderData) (+more in file)
- [Staff discipline E09.5](pattern-staff-discipline-e09-5.md) — mock-mode authCtx role hint (decodeRoleClaim→"admin" breaks role checks in dev) (+more in file)
- [initialData is observer-scoped](gotcha-initialdata-observer-scoped.md) — RSC seed re-seeds every changed filter key → stale rows + zero refetch; seed only the fetched filter (+more in file)
- [Role-discriminated VM union](pattern-role-discriminated-vm.md) — viewerRole union makes "zero affordance for this role" a compile error; narrowed consts (not booleans) (+more in file)
- [Shared list states](pattern-shared-list-states.md) — canonical components/shared/list-skeleton (inline|bordered, caller-owned renderRow) + list-error (message vs title/desc (+more in file)
- [Sheet→page editor extraction](pattern-sheet-to-page-extraction.md) — hook+fields split w/ zero test edits; no @testing-library/react (node env, no renderHook) (+more in file)
- [Boundary-narrow BE remap](pattern-boundary-narrow-remap.md) — E18.24: un-mocking a feature whose mock invented richer data; internal-rich/boundary-narrow + key-set assertion (toMatchObject hi (+more in file)
- [Role widening a shared view](pattern-role-widening-shared-view.md) — E15.3: 3rd viewerRole = named derivations (not one boolean) + parallel props/state + sibling picker (+more in file)
- [Wire-enrichment un-fan-out](pattern-wire-enrichment-unfanout.md) — E18.30: enrichment is per-ENDPOINT (POST/PATCH unenriched → need a GET read-back) (+more in file)
- [Un-mock an anticipatory DTO](pattern-unmock-anticipatory-dto.md) — E18.34: a DTO only the MOCK ever produced is UNVERIFIED (field names right (+more in file)
- [Two gaps, one force-mock](pattern-two-gaps-one-forcemock.md) — E18.35: a force-mock doc bundles SEVERAL reasons; BE closing one un-mocks only one method (env-matrix test proves the split) (+more in file)
- [Tiered-response widening](pattern-tiered-response-widening.md) — E18.33: field ABSENCE as tier signal ⇒ optional DTO + CONDITIONAL spread (toEqual hides `email: undefined` (+more in file)
- [Dead-endpoint repoint](pattern-dead-endpoint-repoint.md) — E18.40: BE "won't implement" ⇒ the entity is UNAUDITED (classify every field: on-wire / derivable / composable / fiction→DELETE); "don't touch the mutations" still misses a wrong wire FIELD NAME (teacherId vs teacherMemberId = silent 422); bound a fan-out to 2× the BE page size + call-COUNT proof at N and N+1 (+more in file)

- [Distinct null reasons + status-default fan-out](pattern-nullable-reasons-and-status-default-fanout.md) — E18.36: two nullables with DIFFERENT causes need DIFFERENT copy (prove `not.toBe`) (+more in file)

- [Real mode that was never real](pattern-real-mode-that-was-never-real.md) — E18.42/43: a plain USE_MOCK gate ≠ a working real path (mock-era DTO ⇒ silent `id: undefined`); shared VALIDATION_FAILED needs the blamed field; path-scoped endpoint + key-less caller ⇒ failure with zero HTTP; nullable wire timestamp ⇒ Invalid Date (+more in file)

- [FE-composed set difference](pattern-fe-composed-set-difference.md) — E18.41: BE closes a missing-endpoint gap with FE-COMPOSE (directory MINUS ids-only endpoint); one optional collaborator GROUP + fail-closed; delete the anticipatory DTO; un-mocking a DECORATION read creates a new honest-degrade surface (own VM key, not fetchError); Storybook runner works again

- [Un-mock an anticipatory DTO](pattern-unmock-anticipatory-dto.md) — E18.34: a DTO only the MOCK ever produced is UNVERIFIED (field names right, enum CASING wrong — invisible because the fixture matched the bad type); reuse the sibling feature's wire↔domain table; delete an honest-degrade whose premise was false + re-read its i18n copy; resetModules breaks `instanceof`-based isApiError → build ApiError inside the stub (+more in file)

- [Two gaps, one force-mock](pattern-two-gaps-one-forcemock.md) — E18.35: a force-mock doc bundles SEVERAL reasons; BE closing one un-mocks only one method (env-matrix test proves the split); `status` can be a CONSTANT derived from a hard-delete semantic, but a code with no semantic must stay absent (never a uuid in a labelled slot) (+more in file)

- [Tiered-response widening](pattern-tiered-response-widening.md) — E18.33: field ABSENCE as tier signal ⇒ optional DTO + CONDITIONAL spread (toEqual hides `email: undefined`; assert Object.keys); authority+decoration two-source roster; un-mock env-matrix must stub `lib/jwt` too, and it breaks unrelated RSC page tests via cookies() (+more in file)

- [Distinct null reasons + status-default fan-out](pattern-nullable-reasons-and-status-default-fanout.md) — E18.36: two nullables with DIFFERENT causes need DIFFERENT copy (prove `not.toBe`); a `status` param that DEFAULTS to one state forces a per-state fan-out (call-count proof); a MANDATORY `staffMemberId` query param completes the storage key → signature ripples to the screen (+more in file)

- [Structural privacy boundary](pattern-structural-privacy-boundary.md) — E18.44: role-stripped BE fields = SEPARATE staff cell type (not optional on the shared one) + @ts-expect-error compile-time proof; capability-as-presence VM prop AND requireRole in the action; canonical shared reason-dialog (4 forks remain); clicking a disabled button breaks a Storybook play (+more in file)

- [First UI for a stubbed read](pattern-first-ui-for-a-stubbed-read.md) — E18.48: verify the packet's claim about an existing helper (detectConflicts was the MOCK ENGINE, not a client highlighter); delete the always-`[]` fiction field; REPLACE the mock-only surface, don't add a second; two BE kinds with different enforcement (ADR 0128) = union + different tone/copy

- [/admin/* unreachable in real mode](gotcha-admin-namespace-unreachable-real-mode.md) — no BE role enum maps to appRole `admin` (ADMIN+MANAGER→principal), so the whole admin namespace is mock-mode-only; prove role ACs by composing decodeRoleClaim→guard with USE_MOCK stubbed false

- [Affordance unreachable by role](gotcha-affordance-unreachable-by-role.md) — E18.44 review: correct fail-closed RBAC + WRONG MOUNTING ROUTE = an AC that cannot be exercised; strict-equality namespace guards; moving a mount can orphan the old screen's own affordances (+more in file)

- [RSC closure prop = 500](gotcha-rsc-closure-prop-500.md) — E18.44 r2: a local `async () => …` stub prop from an RSC is a runtime HTTP 500 that tsc + build + Storybook ALL pass; bind the real action to a placeholder key; lock it with an awaited-page unit test that INVOKES the prop (+more in file)
