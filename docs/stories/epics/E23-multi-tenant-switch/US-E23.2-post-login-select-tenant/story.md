# US-E23.2 Post-Login Select-Tenant Screen (Enhance Existing Route)

## Status

planned

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
