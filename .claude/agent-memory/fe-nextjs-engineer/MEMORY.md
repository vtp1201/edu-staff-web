# Memory Index

- [URL view+sub, zero client](pattern-url-view-sub-zero-client.md) — US-E24.4: merging 2 screens into `?view=`+`?sub=` needs no Client Component; extract a fan-out by leaving the old test file untouched
- [aria-label on a span + tab-order](gotcha-aria-label-on-span-and-tab-order.md) — Biome rejects it (move the phrase to the parent link); a new pill row breaks every `userEvent.tab()` story
- [URL-as-state tab shell](pattern-url-tab-shell-rsc.md) — US-E24.8: role-gated `?tab=` RSC shell (one panel, Link tabs); notFound/permanentRedirect digest strings for node route tests
- [Capped count + badge accname](pattern-capped-count-and-badge-accname.md) — E24.7 review: cap an unbounded drain to a "N+" lower bound (not a fake 99+); StatusBadge aria-label ≠ accname; auto-fill grid breaks at 320px
- [Browser-direct BE call](pattern-browser-direct-be-call.md) — E18.59/ADR 0072: public IP-rate-limited endpoint moves to a client fetch; one ApiError adapter reuses the whole mapper
- [Import allowlist + success live region](pattern-import-allowlist-and-success-live-region.md) — E18.59 fix: "no HTTP call" guard must be an exact import ALLOWLIST (axios bypassed the denylist); loading→success needs a persistent sr-only role=status
- [BE sentinel string = absent](pattern-be-sentinel-as-absent.md) — E18.58: normalize a placeholder name ("Member") to undefined in the MAPPER, not a 2nd UI check; exact match, shared DTO ≠ shared mapper
- [RBAC widening = zero code delta](pattern-rbac-widening-zero-code-delta.md) — E18.57: 403→filtered-200 needs no repo change; payload is honest role-aware empty copy + stale in-code RBAC claims (+file)
- [Denorm field kills a collaborator](pattern-denorm-field-kills-collaborator.md) — E18.56: BE denormalizing a field deletes the whole fan-out collaborator; call-COUNT=1 proof + keep… (+file)
- [Nth widening of a shared entity](pattern-nth-widening-shared-entity.md) — E18.52: confirm WHICH entity the endpoint owns (LIST vs BATCH); the compile fallout is the real… (+file)
- [No-op hygiene verification](pattern-noop-hygiene-verification.md) — E18.45: prove the NEGATIVE by classifying every surviving force-mock reason, not by grepping the… (+file)

- [Placeholder twin of a mounted-gate](gotcha-mounted-gate-placeholder-twin.md) — E08.8: deleting a control behind `mounted ?` must also delete its aria-hidden SSR twin (invisible to all tests)
- [Primitive-level focus return](gotcha-primitive-focus-return.md) — E18.32 review: inside a Radix Content use `useAutoFocusReturn()` (snapshot on onOpenAutoFocus) (+file)
- [decodeMemberId falls back to sub](gotcha-decode-member-id-sub-fallback.md) — ADR 0074 needs `decodeMemberIdClaim()`; bootstrap/lib helpers take a feature mock seed as a PARAM, never import fixtures
- [Terminal error ≠ skeleton](gotcha-terminal-error-vs-skeleton.md) — `isLoading || !data → Skeleton` renders forever after a terminal error (+file)
- [Composite-key point-read + unbacked read](pattern-composite-key-pointread-and-unbacked-read.md) — E18.32: a clustering-column id needs the whole ReportRef tuple (Sheet (+file)
- [Stale-assertion-only un-mock](pattern-stale-assertion-only-unmock.md) — E18.39: a BE fix can close a gap on a screen with NO force-mock branch (403 was a natural error) ⇒… (+file)
- [Partial gap-closure wiring](pattern-partial-gap-closure-wiring.md) — E18.31 (+review fix): BE closing 1 of N gaps ≠ "repo swap"; mock WRITES behind real READS = fake… (+file)
- [Force-mock vs honest degrade](pattern-force-mock-vs-honest-degrade.md) — E20.5 fix round: force-mock only for harmless seed data; actionable per-subject data must be… (+file)
- [Promote with own .i-vm](pattern-promote-with-own-ivm.md) — E20.5: never "move" a type a feature's domain still needs (domain→components/shared = illegal) (+file)
- [Promote-on-3rd-use shared component](pattern-promote-shared-identity-header.md) — E20.4 +review-fix: promotion regressions hide in the PRIMITIVE's defaults (+file)
- [Read-only second caller](pattern-readonly-variant-second-caller.md) — E13.10: `readOnly` prop on the leaf table + NEW thin screen (not a boolean on the mutation screen) (+file)
- [Fan-out partial degrade](pattern-fanout-partial-degrade.md) — E13.9: aggregate `{rows, failedClassCount}` + role=status notice (silent degrade = defect) (+file)
- [Client filter becomes a server param](pattern-client-filter-becomes-server-param.md) — E18.29: per-tab infinite query + narrow the client filter helper (+file)
- [Diff-sync un-mock of a write path](pattern-diff-sync-unmock.md) — E18.28: multi-call diff-sync stays INSIDE the repo method (assert ORDER via shared calls[] not… (+file)
- [Entity i18n key+params reshape](pattern-entity-i18n-key-reshape.md) — E18.25: known-key table lives in domain (mock mapper + presentation allow-list + client SSE hook… (+file)
- [Forced-mock DI + responsive table↔card](pattern-forced-mock-di-and-responsive-table-card.md) — E13.8: BE-RBAC-gap DI factory returns mock UNCONDITIONALLY (doc "don't make this USE_MOCK-condit (+file)
- [cmdk combobox in modal Dialog](gotcha-cmdk-combobox-in-dialog.md) — E20.1 SearchCombobox: `bun ui:add`/`bun add` hang (no TTY) → npm --no-save + declare + bun install… (+file)
- [Feature-scoped audit trail](pattern-feature-scoped-audit-trail.md) — E20.3: 2nd mock store independent of rows (survives delete), unshift-only (no read sort, mockup… (+file)
- [High-risk authCtx re-auth](pattern-high-risk-authctx-reauth.md) — E20.1: mutating repo methods take explicit authCtx{role,tenantId} (decodeTenantId jwt.ts:84, NOT… (+file)
- [DialogContent grid min-w-0 overflow](gotcha-dialog-grid-min-w-0.md) — shared DialogContent is CSS grid; children need [&>*]:min-w-0 or they overflow at 320/375px… (+file)
- [DropdownMenu→Dialog + exit-animation](gotcha-dropdown-to-dialog-and-exit-animation.md) — Radix menu→dialog: (1) FAKE keyboard-trap = asserting dialog absence before motion-safe exit… (+file)
- [No Playwright harness](gotcha-no-playwright-harness.md) — repo has NO standalone Playwright E2E (no config/e2e dir); Playwright is only the Storybook vitest… (+file)
- [RSC routing gate E23.2](pattern-rsc-routing-gate-e23-2.md) — post-login select-tenant: test RSC page via returned-element props (mock client child →props) (+file)
- [Tenant switch E23.1](pattern-tenant-switch-e23-1.md) — 'use server' CANNOT export type (build breaks); Path A server-action result + isRedirectError… (+file)
- [Feed + Storybook portal bleed](pattern-feed-and-storybook-portal-bleed.md) — E19.1: reset body pointer-events + retryDelay:0 in SB decorator (Radix portal lock bleeds between… (+file)
- [Destructive-confirm errorSlot + moderation high-risk](pattern-destructive-confirm-and-moderation.md) — errorSlot(forbidden force-disables confirm/no-retry); never-optimistic remove (+file)
- [Use-case Result pattern](pattern-usecase-result.md) — domain use-cases return discriminated Result<T> + CalendarFailure, not throw (+file)
- [Mock-first feature wiring](pattern-mock-first-wiring.md) — USE_MOCK toggle in DI factory; module-level mutable seed in mock repo (+file)
- [Role union record ripple](gotcha-role-record-ripple.md) — extending Role breaks every Record<Role,…>; no edu-role-admin token (reuse primary) (+file)
- [Route role guard](pattern-route-role-guard.md) — admin/* guard: jwt decodeRoleClaim + pure evaluateAdminAccess + server-only RSC layout redirect (+file)
- [Storybook vitest runner](gotcha-storybook-vitest-runner-broken.md) — runner WORKS (162 files/1269 tests, reconfirmed 2026-09-02); stories only run via `--config vitest.storybook.mts` (+Radix Select play idioms)
- [Client searchParams nav](pattern-client-searchparams-nav.md) — selector screen drives RSC re-fetch via searchParams; optional onSelect override props for… (+file)
- [Result shape + dynamic i18n errors](gotcha-result-shape-and-dynamic-i18n.md) — Result is {ok,value}/{ok,failure} not .error; dynamic t(`errors.${key}`) needs ALL union keys in… (+file)
- [Throwing-repo failure idiom](pattern-throwing-repo-failure.md) — when packet repo returns Promise<Entity> (throws Failure), action is catch boundary→errorKey;… (+file)
- [RSC-props + local-state screen](pattern-rsc-props-local-state-screen.md) — mock-first multi-tab action screens: RSC prefetch→VM props→useState+useTransition, NOT client… (+file)
- [Biome role-prop + impeccable cache](gotcha-biome-role-prop-and-impeccable-cache.md) — `role=` prop flagged as ARIA (use viewerRole); .impeccable cache breaks lint (add !.impeccable to… (+file)
- [Result-repo vs throwing-repo](pattern-result-repo-vs-throwing.md) — two repo error conventions coexist; follow the packet's IXxxRepository signature (+file)
- [Filter pills a11y](gotcha-filter-pills-a11y.md) — Biome rejects role=radio/group on div/button + ignored noAutofocus suppression; use aria-pressed… (+file)
- [Server-action-as-prop step machine](pattern-server-action-as-prop-step-machine.md) — [id] route: RSC page imports action + passes as prop to client step-machine container (not… (+file)
- [Storybook TanStack decorator](pattern-storybook-tanstack-decorator.md) — screen owning query hooks needs per-story QueryClientProvider; portal content via… (+file)
- [Storybook baseline failures + dual dialog](gotcha-storybook-baseline-failures-and-dual-dialog.md) — git-stash to baseline before blaming a failing story (+file)
- [Responsive aria gate](pattern-responsive-aria-gate.md) — responsive aria-hidden needs JS matchMedia (CSS can't toggle attrs); keep motion guard CSS;… (+file)
- [Node-env component test](pattern-node-env-component-test.md) — no @testing-library/react; use renderToStaticMarkup string asserts for shared presentational… (+file)
- [Status union extension + nullable fields](pattern-status-union-extension.md) — snake_case union vs camelCase i18n key → explicit switch mapper not dynamic t() (+file)
- [DetailPanelHeader shared component](pattern-detail-panel-header.md) — 3-zone back-nav header; icon-only action labels via sr-only md:not-sr-only (NOT md:hidden); sr-only… (+file)
- [Portal-dialog testing + DestructiveConfirmDialog](pattern-portal-dialog-testing.md) — Radix portals don't render in node static markup; split proof (pure footer Vitest + Storybook play) (+file)
- [RSC-seeded infinite query + URL filter](pattern-rsc-seeded-infinite-query.md) — cursor list: RSC prefetch→useInfiniteQuery initialData (no HydrationBoundary) + draft/applied URL… (+file)
- [Subscription hook node test](pattern-subscription-hook-node-test.md) — no renderHook in node env; extract framework-free controller + FakeEventSource + fake timers; hook… (+file)
- [LMS player + media token](pattern-lms-player-and-media-token.md) — media-surface token; tone→literal-class map (mapper does hex→tone) (+file)
- [Screenless shared infra module](pattern-shared-infra-feature-module.md) — E18.23: capability used by ≥2 features = full feature module (no presentation) + own DI (+file)
- [By-member un-mock + RMW field](pattern-by-member-unmock-and-rmw-field.md) — E18.26: new getByMember (not overloaded getByClass); adding a field to a read-modify-write PUT must… (+file)
- [BE-wiring remap pattern](pattern-be-wiring-remap.md) — E18: flat wire DTO→nested entity via per-parent fan-out; create+activate orchestration outside try… (+file)
- [Raw-flag interceptor guard](pattern-raw-flag-interceptor-guard.md) — raw:true is a config-level sibling of params (nested → silent UNKNOWN_ERROR); guard test pipes real… (+file)
- [Shell context + cooldown](pattern-shell-context-and-cooldown.md) — E22: AppShell can't use TanStack Query (Context instead); framework-free timer +… (+file)
- [Non-blocking overlay query](pattern-nonblocking-overlay-query.md) — E10.6: secondary presence query merged into host entities (never gates host loading); own DI repo… (+file)
- [Per-tab cold query + nullable RSC seed](pattern-per-tab-cold-query-and-nullable-seed.md) — E11.7: key list region by activeTab for real per-tab refetch (gcTime/staleTime 0) (+file)
- [SSE flat wire + notification wiring E18.18](pattern-sse-flat-wire-and-notification-wiring.md) — real notification SSE frames FLAT (no payload/eventId (+file)
- [Messaging rooms remap E18.17](pattern-messaging-rooms-remap-e18-17.md) — social=UPPER_SNAKE codes; RoomSummary/Message wire has NO unread/avatar/color→pure room-derive… (+file)
- [Hybrid partial-real wiring](pattern-hybrid-partial-real-wiring.md) — E18.13: one-method-real Hybrid facade(real,mock); reactive-gate (drop client pre-check→server 422) (+file)
- [openapi drifts from Go source](gotcha-openapi-drifts-from-go-source.md) — E18: core openapi.yaml can lie vs running server (exam-papers /questions = add-ONE not replace-list (+file)
- [Question-bank E11.9](pattern-question-bank-e11-9.md) — call-site forbidden mapper (browse/edit param, not code); mode-conditional disjoint search key (+file)
- [Admin invitations E21.1](pattern-invitations-e21-1.md) — 2-collaborator hybrid DI (mutations real, list/resend force-mock via throwing stubs on real class) (+file)
- [Async-transition stuck isPending](gotcha-async-transition-stuck-pending.md) — useTransition async action leaves isPending stuck-true after a post-await setState (button freezes,… (+file)
- [4-region reports dashboard](pattern-reports-dashboard-4region.md) — E03: thin RSC + N independent useQuery via action refs (no placeholderData) (+file)
- [Staff discipline E09.5](pattern-staff-discipline-e09-5.md) — mock-mode authCtx role hint (decodeRoleClaim→"admin" breaks role checks in dev) (+file)
- [initialData is observer-scoped](gotcha-initialdata-observer-scoped.md) — RSC seed re-seeds every changed filter key → stale rows + zero refetch; seed only the fetched filter (+file)
- [Role-discriminated VM union](pattern-role-discriminated-vm.md) — viewerRole union makes "zero affordance for this role" a compile error; narrowed consts (not… (+file)
- [Shared list states](pattern-shared-list-states.md) — canonical components/shared/list-skeleton (inline|bordered, caller-owned renderRow) + list-error… (+file)
- [Sheet→page editor extraction](pattern-sheet-to-page-extraction.md) — hook+fields split w/ zero test edits; no @testing-library/react (node env, no renderHook) (+file)
- [Boundary-narrow BE remap](pattern-boundary-narrow-remap.md) — E18.24: un-mocking a feature whose mock invented richer data; internal-rich/boundary-narrow +… (+file)
- [Role widening a shared view](pattern-role-widening-shared-view.md) — E15.3: 3rd viewerRole = named derivations (not one boolean) + parallel props/state + sibling picker (+file)
- [Wire-enrichment un-fan-out](pattern-wire-enrichment-unfanout.md) — E18.30: enrichment is per-ENDPOINT (POST/PATCH unenriched → need a GET read-back) (+file)
- [Un-mock an anticipatory DTO](pattern-unmock-anticipatory-dto.md) — E18.34: a DTO only the MOCK ever produced is UNVERIFIED (field names right (+file)
- [Two gaps, one force-mock](pattern-two-gaps-one-forcemock.md) — E18.35: a force-mock doc bundles SEVERAL reasons; BE closing one un-mocks only one method… (+file)
- [Tiered-response widening](pattern-tiered-response-widening.md) — E18.33: field ABSENCE as tier signal ⇒ optional DTO + CONDITIONAL spread (toEqual hides `email:… (+file)
- [Un-fan-out to a range call](pattern-unfanout-to-range-call.md) — E18.47: N-per-day fan-out → 1 BE range call on the SAME route; call-COUNT is the only proof,… (+file)
- [Dead-endpoint repoint](pattern-dead-endpoint-repoint.md) — E18.40: BE "won't implement" ⇒ the entity is UNAUDITED (classify every field: on-wire / derivable /… (+file)

- [Distinct null reasons + status-default fan-out](pattern-nullable-reasons-and-status-default-fanout.md) — E18.36: two nullables with DIFFERENT causes need DIFFERENT copy (prove `not.toBe`) (+file)

- [Real mode that was never real](pattern-real-mode-that-was-never-real.md) — E18.42/43: a plain USE_MOCK gate ≠ a working real path (mock-era DTO ⇒ silent `id: undefined`);… (+file)

- [FE-composed set difference](pattern-fe-composed-set-difference.md) — E18.41: BE closes a missing-endpoint gap with FE-COMPOSE (directory MINUS ids-only endpoint); one… (+file)

- [Structural privacy boundary](pattern-structural-privacy-boundary.md) — E18.44: role-stripped BE fields = SEPARATE staff cell type (not optional on the shared one) +… (+file)

- [First UI for a stubbed read](pattern-first-ui-for-a-stubbed-read.md) — E18.48: verify the packet's claim about an existing helper (detectConflicts was the MOCK ENGINE,… (+file)

- [/admin/* unreachable in real mode](gotcha-admin-namespace-unreachable-real-mode.md) — no BE role enum maps to appRole `admin` (ADMIN+MANAGER→principal), so the whole admin namespace is… (+file)

- [Affordance unreachable by role](gotcha-affordance-unreachable-by-role.md) — E18.44 review: correct fail-closed RBAC + WRONG MOUNTING ROUTE = an AC that cannot be exercised;… (+file)

- [RSC closure prop = 500](gotcha-rsc-closure-prop-500.md) — E18.44 r2: a local `async () => …` stub prop from an RSC is a runtime HTTP 500 that tsc + build +… (+file)

- [Un-fake a "non-persistent" field](pattern-unfake-non-persistent-field.md) — E18.49: an unconditional preset fallback + a hardcoded `count: 1` are the two default-shaped bugs;… (+file)

- [Seed re-sync + live region](pattern-seed-resync-and-live-region.md) — E18.46 review: useState(seedProp) is stale forever; explicit first|append page mode; a 2nd… (+file)

- [Discovery rollup + dormant endpoint](pattern-discovery-rollup-and-dormant-endpoint.md) — E18.46: split ports on addressing/kind/construction (else RENAME and join); gate the READ too; no… (+file)

- [Return-type blocker on partial un-mock](pattern-partial-unmock-return-type-blocker.md) — E18.50: endpoint exists ≠ method is wirable (rich entity return needs a fan-out + reshape); a real… (+file)

- [Public unauthenticated flow](pattern-public-unauth-flow.md) — E18.53: bare-client DI (no cookie/refresh) for `security: []` endpoints; real-axios adapter test… (+file)

- [Embedded field → own resource](pattern-embedded-field-to-own-resource.md) — E18.51: real contract exposes a mock-era embedded array as its OWN gated endpoint ⇒ DELETE the… (+file)

- [RBAC-blocked client-side join](pattern-rbac-blocked-clientside-join.md) — E18.54: "resolve it client-side" dies on RBAC not N+1; pick the widest allow-list endpoint, degrade… (+file)
- [Per-card fan-out + server urgency](pattern-per-card-fanout-and-server-urgency.md) — E24.2: allSettled per-CARD degrade (null≠0) + dueSoon flag decided server-side
- [Testing axios interceptors](pattern-testing-axios-interceptors.md) — E01.3: stub `client.defaults.adapter` to capture config (no network, no mock lib); AxiosHeaders dot-access works
- [Cold-cache 5s timeouts](gotcha-cold-cache-5s-timeouts.md) — editing i18n/endpoint files invalidates the vitest transform cache → fake RSC page-test timeouts;… (+file)

- [Selective design bundle sync](pattern-selective-design-bundle-sync.md) — US-E24.0: never cp -r a designer bundle; EduPortal.html is gitignored; re-validate design-spec.jsonc as JSON

- [Scaffold→live service repoint](pattern-service-scaffold-to-live-repoint.md) — US-E24.1: un-force-mocking a SERVICE = the mock-era domain was fiction; verify the double-segment gateway path first, delete contract-less UI
- [Tone with no wire source + duplicate i18n copy](gotcha-tone-and-duplicate-i18n-copy.md) — move an invented visual attribute to presentation (deterministic id hash); two keys sharing one string breaks getByText
- [Week-grouped timeline rebuild](pattern-week-grouped-timeline-rebuild.md) — US-E24.3: domain returns a window RESULT with an injected formatter; ISO week inline; `vi` CLDR = `08-05` + time first; feature-shared tier
- [Locked row + info token gap](gotcha-locked-row-and-token-gap.md) — an aria-disabled row's reason must be VISIBLE text (title is unreachable); no AA-safe --edu-info text token
- [Irreversible step machine](pattern-irreversible-step-machine.md) — US-E24.5: swapped-subtree states need focus retarget + tabIndex={-1}; fire the action from an effect on the reducer status (not the click); one locked-row contract per item

- [Small bold text is not large text](gotcha-small-bold-text-not-large-text.md) — a <14px extrabold pill on `bg-edu-primary-light` needs `text-foreground`; `text-edu-primary-accessible` is 4.35:1 (fails)

- [Use-case-level authCtx + shared-map body](pattern-usecase-level-authctx-and-shared-map-body.md) — US-E24.9: 0063 guard at the USE-CASE when BE re-derives the key; delete a hybrid composite when its last force-mock goes; revalidatePath ≠ new props
- [Seeded client body + create-only resource](pattern-seeded-client-body-and-create-only-resource.md) — E24.9 review: key={urlParam} on a useState-seeded body; no UPDATE verb ⇒ "Sửa" is a 409 dead end
