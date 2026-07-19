# US-E23.2 Post-Login Select-Tenant Screen (Enhance Existing Route)

## Status

implemented

## Lane

high-risk

## Dependencies

- Depends on / extends: **`US-001-tenant-path-resolver`**
  (`docs/stories/epics/E05-multi-tenancy/US-001-tenant-path-resolver/`,
  E05, status `implemented`). US-E23.2 is an **in-place enhancement** of the
  screen that story already shipped at `(auth)/select-tenant`
  (`page.tsx`/`select-tenant.tsx`/`actions.ts`) — same route, same trigger
  condition (≥2 ACTIVE memberships, no tenant context yet), same underlying
  routing guard (`resolveTenant`/membership-check, unchanged by this story).
  `US-001-tenant-path-resolver` stays `implemented`; this story's Harness
  Delta notes "extends `US-001-tenant-path-resolver`'s UI," not "supersedes."
- Related (shares data contract, not a dependency): US-E23.1 (header
  tenant-switch dialog) — both render the same `TenantCard` concept; the
  mock/real display-field shape MUST be identical across both stories.
  FR-005's footnote ("Bạn có thể đổi trường...từ menu tài khoản") is only
  accurate once US-E23.1 ships — see Constraints in `spec.md`.
- Blocks: none.
- Feature module(s) touched: `src/app/[locale]/(auth)/select-tenant/**`
  (existing route, enhanced in place), `src/features/tenant/domain/*`
  (read-only reuse; possible additive `tenantName?` field, shared decision
  with US-E23.1).
- Shared contract/file: `bootstrap/endpoint/tenant.endpoint.ts`,
  `TenantMembership` entity, `switchTenantAction`.

## Product Contract

After login, when the authenticated caller belongs to ≥2 ACTIVE switchable
tenant memberships and has not yet entered a tenant workspace, the EXISTING
`(auth)/select-tenant` screen must be enhanced in place: heading "Chọn
trường để tiếp tục", personalized subheading ("Xin chào {name} — tài khoản
của bạn thuộc {count} trường."), and a card grid (logo/initial, name,
address, role badge — no "current" badge, this is pre-entry) replacing
today's raw `<ul>` list that literally renders `tenantId` as the name.
Selecting a card mints a tenant-scoped token pair (reuse
`SwitchTenantUseCase`/`switchTenantAction` unchanged) and redirects into
`/t/{tenantId}/{role}`. Single-tenant callers continue to skip this screen
entirely (existing zero-noise behavior, unchanged, owned by the E05 guard).
This screen is the sole pre-workspace authorization gate for multi-tenant
callers — no `/t/[tenant]/(app)/**` route is reachable before it resolves,
so unlike US-E23.1's header (which degrades to "menu item hidden" on
fetch failure), this screen requires an explicit error+retry state (new,
FR-008 — DR-018 left this undefined).

## Acceptance Criteria (condensed — full Given/When/Then in `use-cases.md`)

- AC-1 (≥2 memberships → screen shown, UC-001/AC-001.1–4): heading +
  personalized subheading render; one real `<button>` card per ACTIVE
  membership (logo/initial, name, address, role badge), NO "Hiện tại" badge
  on any card; name-unavailable → name-less subheading fallback (no
  "undefined"); fetch exceeding 300ms shows a skeleton, not a blank screen;
  the "you can switch later" footnote is conditional on US-E23.1 having
  shipped (omitted otherwise).
- AC-2 (exactly 1 membership → skipped, UC-002/AC-002.1–2, NEGATIVE
  assertion): caller routed directly into the sole tenant's workspace;
  select-tenant screen/markup is NEVER rendered (assert absence, not
  "untested"); same target route/redirect mechanism as pre-existing
  behavior — no regression.
- AC-3 (0 ACTIVE memberships → empty state + next action, UC-003/AC-003.1–3):
  "Bạn chưa thuộc tổ chức nào" shown; at least one keyboard-operable
  next-action control (logout/contact-admin) is visible — this closes a
  real gap in the shipped E05 slice, which had no escape action; all-INACTIVE/
  SUSPENDED/LEFT memberships count as empty, not a partial/broken grid.
- AC-4 (membership fetch fails → error + retry, UC-004/AC-004.1–4, NEW
  state): explicit error message + retry button (not blank/broken); retry
  success → transitions to AC-1 rendering; retry failure → stays in error
  state, no auto-redirect loop; a 401 (token itself invalid) is NOT treated
  as this screen's error — routed through the existing refresh/redirect-to-
  login flow instead.
- AC-5 (select → mint → redirect happy path, UC-005/AC-005.1–2): card
  activation shows per-card loading within 100ms; on success, new auth
  cookies set server-side, caller redirected to `/t/{tenantId}/{role}`
  matching the selected membership.
- AC-6 (**403 — target membership non-member/suspended/inactive**,
  UC-005/AC-005.3, distinct from generic 5xx, mirrors US-E23.1 AC-7): BE
  rejects the target as non-ACTIVE (race or already-non-ACTIVE) → inline
  error on the clicked card, caller remains on THIS screen (no navigation
  into any workspace), NO cookie mutation.
- AC-7 (network/5xx, UC-005/AC-005.4): error toast, card returns to idle.
- AC-8 (401 mid-flow, UC-005/AC-005.5): reactive-refresh retries once;
  success → AC-5; failure → AC-7.
- AC-9 (redirect-target validation / server-enforcement, UC-005/AC-005.6–8):
  `tenantId`/`role` passed to `switchTenantAction` is read directly from the
  selected membership object sourced from the caller's own
  `GET /members/me/tenants` response — no client-supplied/arbitrary
  `tenantId` can reach it (no open-redirect surface); no client-only write
  to an "entered tenant" representation before `setAuthCookies` persists
  server-side; no stale cross-tenant data visible on screen re-entry
  (deep-link-back case).

## Design Notes

- Design file: `design_src/edu/tenant-switch.jsx` — `TenantSelectScreen`
  (reuses `TenantCard`/`TenantLogo` from the same file as US-E23.1).
- Design-spec entry: `docs/product/design-spec.jsonc` → `screens.selectTenant`
  — layout reuses `screens.login`'s centered single-column auth-shell tokens
  (logo icon box 60px + heading, centered column `maxWidth: 480`); card grid
  `gap: 12`; `cardComponent` explicitly `isCurrent: false` always (pre-entry,
  no "Hiện tại" badge, unlike US-E23.1's dialog).
- This is a **reconcile/enhance-in-place** job, not net-new: `page.tsx`,
  `select-tenant.tsx`, `actions.ts` all already exist and are correct at the
  routing/guard level (owned by `US-001-tenant-path-resolver`) — only the
  presentation markup (raw `<ul>` → card grid) and the entity/DTO display
  fields change.
- Mock-first (confirmed, decision `0014`): identical to US-E23.1 — tenant
  name/address/logo are not on the wire; shared mock lookup table, same
  `TenantCard` data contract as US-E23.1 (do not fork the shape).

## Validation (planned)

| Layer | Expected proof |
| --- | --- |
| Unit | routing-branch outcomes (≥2/1/0/fetch-fail) as pure predicates; redirect-target derivation (tenantId/role sourced only from the selected membership object, never free text) |
| Integration | reuse of `switchTenantAction`/`SwitchTenantUseCase` unchanged; 403 path asserts no cookie mutation + caller stays on screen; network/5xx path; 401-retry-once path; error+retry state (new) |
| E2E | Storybook: ScreenShown_CardGrid / NameUnavailableFallback / Loading_Skeleton / Skip_SingleTenant(negative) / Empty_ZeroActive / Error_FetchFail / Error_RetrySuccess / Error_RetryFailAgain / SelectSuccess / Select403 / SelectNetworkError / Select401Retry |
| Platform | `bun build` + `bunx tsc --noEmit` |
| Release | design-review gate pass; a11y audit (identical `TenantCard` contract as US-E23.1); confirm no regression to `US-001-tenant-path-resolver`'s guard tests |

## Harness Delta

- `docs/TEST_MATRIX.md`: add row US-E23.2 (planned, high-risk)
- `docs/product/screens.md`: `selectTenant` row — note this US-E23.2 packet
  as the enhancement owner of the existing screen
- **`US-001-tenant-path-resolver` (E05) stays `implemented` in Harness,
  unchanged** — its routing/guard logic is correct and untouched. This
  story's delta is additive UI enhancement of that story's screen, not a
  supersession. [ba-lead bookkeeping note, not a technical change: whether
  `US-001-tenant-path-resolver`'s own packet should gain a cross-reference
  annotation is a decision for `ba-lead`, deferred here.]
- [FOLLOW-UP for `fe-lead`]: same duplicate-repository maintenance-risk
  finding as US-E23.1 (`features/tenant/*` vs `features/auth/*/iam-member*`)
  — not this story's job to fix, flagged for future consolidation.
- Full consolidated spec + traceability matrix: `spec.md` in this packet.

## Evidence

```text
Design review: pass
- design-system: conform (tokens-only — bg-edu-error/15, text-edu-error-text,
  bg-primary/text-primary-foreground, bg-muted, rounded via CSS vars; heading
  22px/800 via text-2xl per design-system.md's page-title mapping; card grid
  gap-3 (12px) matches design-spec.jsonc; TenantCard/TenantLogo/Button reused
  verbatim from US-E23.1, no re-invention; matches screens.md `selectTenant`)
- a11y: fe-accessibility-auditor FAIL-with-findings (A11Y-001 Blocking,
  A11Y-002 Critical, A11Y-003 Major, A11Y-004 Minor) → all 4 fixed (heading
  semantics on error/empty states, focus-on-mount to heading on branch
  transition, <main> landmark, textual retry-pending label) → re-verified by
  fe-lead reading the final diff; WCAG AA contrast OK (text-edu-error-text
  per ADR 0049); keyboard-operable throughout; reduced-motion gated
  (motion-safe: on shimmer/spinner)
- impeccable audit: 0 findings requiring action (manual fe-lead pass over the
  final diff — tokens-only, consistent spacing/hierarchy, no generic-AI-slop
  patterns); 1 minor non-blocking observation: `loading.tsx`'s Suspense
  fallback wrapper is a plain <div> (not <main>, unlike the resolved Shell) —
  acceptable since it's a transient state with its own aria-live status, not
  worth a re-fix round
- states: loading (route-level `loading.tsx` skeleton, Decision A) / empty
  (FR-007, logout escape action) / error (FR-008, retry via router.refresh())
  / success (card grid) all present and covered by 11 Storybook interaction
  stories + `page.test.tsx` integration tests; responsive 320px OK (no
  overflow, single-column reflow); dark mode inherited via semantic tokens
```

- `fe-tech-lead-reviewer`: **Approved** (all 9 high-risk-lane items verified
  against the actual diff, incl. the load-bearing single-membership skip
  branch correctly minting via `switchTenantAction` rather than a bare
  redirect). One non-blocking follow-up logged: a 401 at `GET
  /members/me/tenants` list-time currently folds into this screen's generic
  error+retry state rather than AC-004.4's literal "redirect to login" wording
  — pre-authorized by the repo's documented deferred reactive-refresh posture
  (decision `0018`), tracked as a cross-story follow-up, not a defect in this
  story.
- `fe-accessibility-auditor`: FAIL-with-findings → fixed → re-verified (see
  above).
- Proof: `bun vitest run` 2343/2343 pass (full suite, no regression);
  `bunx tsc --noEmit` clean; `NEXT_PUBLIC_USE_MOCK=true bun run build` clean
  (`/select-tenant` route builds); 11/11 Storybook interaction stories pass.

- `fe-qa-playwright`: **CONDITIONAL PASS** (21/21 AC traceable to a real
  test/story). Found 2 new MAJOR defects by writing genuinely new tests
  (not just re-reading existing coverage) — both fixed by `fe-lead` before
  merge:
  - **DEF-QA-01**: card grid overflow at 320/375px with a realistic
    long tenant name/address (the happy-path story's short curated mock
    names masked it) — CSS Grid's default `min-width:auto` on `TenantCard`
    as a direct grid item defeated the internal `truncate` class. Fixed:
    `[&>*]:min-w-0` added to `CardsState`'s grid container
    (`select-tenant.tsx`), same bug class/fix as `dialog.tsx`'s existing
    precedent. Proven by new story `Viewport_CardGrid_NoOverflow`
    (was red, now green).
  - **DEF-QA-02**: `role="alert"` placed directly on the error state's
    `<h1>` overrode its implicit heading role, silently defeating the
    A11Y-001 heading-nav fix (`getByRole("heading")` found nothing where
    `getByRole("alert")` did — the two are mutually exclusive for a single
    element/role attribute). Fixed: moved `role="alert"` to a wrapping
    `<div>` around the plain `<h1>` — both the heading-nav and the
    live-region announcement now hold simultaneously. `Error_FetchFail`
    story's assertion updated to assert the heading IS present (previously
    documented the broken state on purpose as a QA regression guard).
  - QA also added `Viewport_Error_320` (44px touch-target proof) and
    verified mock-first curated tenant names/addresses render (not raw
    `tenantId`) via `resolveTenantDelay`'s table.
  - Post-fix re-run: `bunx vitest run --config vitest.storybook.mts
    "select-tenant.stories"` → **14/14 pass** (11 original + 3 QA-added,
    all green, no red tests remaining); `bunx tsc --noEmit` clean.
