# US-E23.1 Header Tenant-Switch Menu + Dialog

## Status

in-progress

## Lane

high-risk

## Dependencies

- Depends on: existing `src/features/tenant/domain/*` (`SwitchTenantUseCase`,
  `ListMyMembershipsUseCase`), existing `switchTenantAction`
  (`src/app/[locale]/(auth)/select-tenant/actions.ts`), existing header
  (`src/components/layout/app-shell/header/{header.tsx,role-switcher.tsx}`).
- Related (not a dependency, shares data contract): US-E23.2 (post-login
  select-tenant screen) — both stories render the same `TenantCard` concept
  and MUST use an identical mock/real display-field data shape; do not diverge.
- Blocks: none.
- Feature module(s) touched: `src/components/layout/app-shell/header/` (new
  menu item + dialog), `src/features/tenant/**` (read-only reuse; possible
  additive `tenantName?` field per Gap Finding below — confirm against
  edu-api `iam` `openapi.yaml` before deciding mock-vs-DTO-widen).
- Shared contract/file: `bootstrap/endpoint/tenant.endpoint.ts`
  (`TENANT_EP.myTenants`, `TENANT_EP.switchTenant` — unchanged, reused
  as-is), `TenantMembership` entity.

## Product Contract

Add a persistent "Đổi trường" re-entry point to the header user-menu, visible
ONLY when the caller (teacher/principal/student/parent) holds ≥2 ACTIVE
switchable tenant memberships (zero-noise for the single-tenant majority).
Activating it opens a "Chọn trường" dialog: a card grid (logo/initial, name,
address, role badge, "Hiện tại" badge on the caller's current tenant) built
from `GET /members/me/tenants` (INT-001, already wired). Selecting a
non-current card invokes the EXISTING `SwitchTenantUseCase` →
`POST /members/switch-tenant` (INT-002, already wired) → mints a
tenant-scoped token pair → `setAuthCookies` (httpOnly, server-only) →
navigates into the target tenant's workspace. This story is almost entirely
ADDITIVE presentation: no new BE endpoint, no new use-case for the core
switch — only the header menu item, the dialog, and threading the
membership list + current-tenant match into the header.

Authorization is a hard gate (high-risk lane): switching tenant changes the
caller's effective role/permission scope. The UI never mutates a "current
tenant" representation itself — it only shows a pending/loading state and
waits for the server round-trip. See `spec.md` §Authorization Enforcement.

The existing `RoleSwitcher` header popover is NOT redundant and is untouched
by this story: it switches ROLE within the current tenant
(`TenantMembership.roles` is an array); "Đổi trường" switches TENANT. Both
stay in the header as orthogonal controls (ba-lead decision, no ADR needed).

## Acceptance Criteria (condensed — full Given/When/Then in `use-cases.md`)

- AC-1 (positive gating, UC-002/AC-002.1–3): ≥2 ACTIVE switchable
  memberships → "Đổi trường" `role=menuitem` renders with `switchHorizontal`
  icon; not rendered optimistically while INT-001 is in flight; keyboard
  (Enter/Space) opens the dialog same as click.
- AC-2 (negative/zero-noise gating, UC-003/AC-003.1–3): exactly 1 ACTIVE
  membership OR INT-001 fetch fails → NO menu item node anywhere in the DOM
  (negative assertion, not "untested"); fail-closed on fetch failure (swallow
  + log, no broken trigger); no regression to existing single-tenant menu.
- AC-3 (current-tenant header block, UC-001/AC-001.1–3): header shows the
  matching membership's logo/initial + role badge by decoding the `tenantId`
  JWT claim and matching against the membership list; stale/foreign tenantId
  or fetch failure → fall back to role-only display, never crash.
- AC-4 (dialog open + card list, UC-004/AC-004.1–2): activation opens a
  focus-trapped dialog, focus moves to first focusable element; every ACTIVE
  switchable membership renders as a real `<button>` card (logo/initial,
  name, address, role badge) with "Hiện tại" on the current match; empty
  list at open-time (should-not-happen) shows `tenant.select.empty` copy,
  not a blank dialog.
- AC-5 (switch success, UC-004/AC-004.3–4): non-current card activation
  shows a per-card loading state (`aria-busy`, `role=status`, sr-only "Đang
  chuyển…") within 100ms; on success, new auth cookies are set server-side,
  success toast "Đã chuyển sang {school}" shown, caller navigated to the
  target tenant workspace, dialog closes.
- AC-6 (no-op on current card, UC-004/AC-004.5): activating the "Hiện tại"
  card makes no network call and shows no toast.
- AC-7 (**403 — target membership non-member/suspended/inactive**,
  UC-004/AC-004.6, distinct from generic 5xx): `POST /members/switch-tenant`
  returns 403 → inline error on the clicked card, dialog stays open, NO
  navigation, NO cookie mutation (assert cookies unchanged from pre-click
  state) — covers both the revoke-mid-flow race and any other BE-rejected
  non-ACTIVE target.
- AC-8 (network/5xx, UC-004/AC-004.7): error toast, card returns to idle
  (not stuck loading), dialog stays open for retry.
- AC-9 (401 mid-flow, UC-004/AC-004.8): reactive-refresh interceptor retries
  once; success → AC-5 path; failure → AC-8 path.
- AC-10 (dismiss gating, UC-004/UC-005/AC-004.9–10, AC-005.1): Escape/backdrop
  dismiss is BLOCKED while any card is loading; allowed when idle (focus
  returns to the trigger).
- AC-11 (server-side-enforcement guarantee, UC-006/AC-006.1–5): no
  client-only write to a "current tenant/role" representation before the
  server round-trip resolves; the displayed current-tenant badge is
  traceable only to a re-render driven by a new access-token `tenantId`
  claim minted via `setAuthCookies`; no token value is ever client-reachable;
  BE 403 cannot be bypassed by stale client state; no stale cross-tenant
  data is visible after a switch.

## Design Notes

- Design file: `design_src/edu/tenant-switch.jsx` — `TenantSwitchDialog`,
  `TenantCard`, `TenantLogo`; header wiring pattern:
  `design_src/edu/app.jsx` (`handleTenantSwitch`) + `design_src/edu/ui.jsx`
  `Header` (menu item before role-switch radio items).
- Design-spec entry: `docs/product/design-spec.jsonc` → `screens.tenantSwitch`
  (dialog `maxWidth: 440`, card `minHeight: 80`, `logoSize: 56`, hover/focus
  tokens, `currentBadge` = success-color check + "Hiện tại" text).
- Reuse existing Radix `Dialog` primitive (focus-trap semantics come free);
  do not reinvent.
- Mock-first (confirmed, decision `0014`): tenant display name/address/logo
  are NOT on the `MembershipSummary` wire schema (`ba-integration-analyst`
  read edu-api's `openapi.yaml` directly and confirmed absence) — sourced
  from a `bootstrap/lib/mock.ts`-keyed lookup table, identical shape/contract
  to US-E23.2's `TenantCard` data.

## Validation (planned)

| Layer | Expected proof |
| --- | --- |
| Unit | menu-item visibility predicate (≥2 ACTIVE / exactly 1 / fetch-fail → hidden); current-tenant matching (tenantId claim vs membership list, incl. stale/foreign fallback) |
| Integration | dialog invokes existing `switchTenantAction`/`SwitchTenantUseCase` unchanged; 403 path asserts no cookie mutation; network/5xx path; 401-retry-once path |
| E2E | Storybook: MenuItem_Hidden(1-tenant) / MenuItem_Hidden(fetch-fail) / MenuItem_Shown / DialogOpen_CardList / DialogOpen_Empty / SwitchSuccess / Switch403 / SwitchNetworkError / DismissBlockedWhileBusy / DismissIdle / CurrentTenantHeaderBlock / CurrentTenantFallback |
| Platform | `bun build` + `bunx tsc --noEmit` |
| Release | design-review gate pass; a11y audit (focus-trap, aria-busy/live, contrast) |

## fe-lead Decision (2026-07-17) — AC-9/FR-010 descope

Verified `src/bootstrap/lib/http.ts` still marks the reactive 401→refresh→retry
interceptor as deferred (decision `0018` follow-up, not yet built — same status
`.claude/rules/api-integration.md` documents). This story will NOT build a
one-off retry-once shim inside `switchTenantAction`/the dialog (would diverge
from the real cross-cutting single-flight design). **Decision**: AC-9/FR-010
is descoped to today's actual behavior — a 401 mid-flow falls into the
generic FR-009 (network/5xx) branch: error toast, card returns to idle,
dialog stays open for retry. Test proof for AC-9 asserts THIS behavior
(401 → FR-009 path), not the aspirational retry-once path. Revisit AC-9 when
the reactive interceptor ships (tracked as a pre-existing repo-wide gap, not
new debt from this story).

## fe-lead Decision (2026-07-18) — TenantSwitchOverlay descoped

`fe-component-architect` flagged that `docs/product/design-spec.jsonc` describes
a full-screen `TenantSwitchOverlay` ("Đang tải dữ liệu {name}…", blurred
backdrop) shown between card-loading and landing in the target workspace —
but no FR/AC in `spec.md`/`use-cases.md`/`plan.md` backs this surface.
**Decision**: descope it from this story. The per-card loading state
(`aria-busy`, sr-only "Đang chuyển…", AC-5) plus the existing full-route
navigation on success is sufficient to satisfy AC-5/NFR-008 without a new
full-screen overlay component. Treat `design-spec.jsonc`'s `tenantSwitch`
entry as over-specified relative to the finalized BA spec for this narrow
slice — not a design-review blocker, since design-review checks a11y/tokens/
states against what's BUILT, and this story's AC set doesn't include the
overlay. Flagged for `uiux-docs-manager`/a future story to reconcile
`design-spec.jsonc` (either add the overlay as an explicit follow-up AC in a
later US, or trim the entry) — not blocking this story's close.

## fe-lead Decision (2026-07-18) — Path A approved: `switchTenantAction` returns a discriminated result

`fe-state-engineer` (`state-design.md` §0) found `switchTenantAction` currently
lets a raw `ApiError` throw uncaught across the Server Action boundary — the
opposite of this repo's own convention (`loginAction` returns `{errorKey?}`,
never raw-throws, per `.claude/rules/i18n.md` §Nơi dịch) — and that Next.js
redacts custom thrown-error properties (`.status`/`.code`) across the
server→client boundary in production builds, so a client `try/catch` reading
`err.status === 403` would silently misclassify FR-008 vs FR-009 in prod even
though it works in dev.

**Decision: approve Path A.** Add `src/features/tenant/domain/failures/
tenant.failure.ts` (`TenantFailure` union, mirroring `AnnouncementRepository
.toFailure()`'s `errorCodeOf`/`statusOf` pattern) + a `toFailure()` mapper in
`TenantRepository`. Change `switchTenantAction`'s contract from `Promise<void>`
(throws) to:

```ts
type SwitchTenantResult =
  | { ok: true }
  | { ok: false; errorKey: "forbidden" | "network" };
```

`redirect()` still fires unconditionally on the success path (inside the try,
after `setAuthCookies`) — its throw is NEVER caught/converted, only the
`useCase.execute()` failure path is wrapped and mapped to `{ok:false,
errorKey}`. This is additive/non-breaking to the existing `select-tenant.tsx`
caller (it has no try/catch today and can simply ignore the return value —
verify with a regression test that `select-tenant.tsx`'s existing behavior/
tests are unaffected). Engineer implements this as part of Phase 2/4; tech-lead
reviewer must confirm no other caller of `switchTenantAction` breaks.

## fe-lead Decision (2026-07-18) — Success-toast sequencing via one-shot `?switched=1`

Per `state-design.md` §5: `switchTenantAction` calls `redirect()` before ever
returning `{ok:true}` to the client, so a client-side `toast.success(...)`
after `await onSwitchTenant(...)` is unreachable on the success path. **Decision:
`switchTenantAction` appends `?switched=1` to its `redirect()` target URL**
(via `tenantUrl(...)`, already computed); `AppShell` (already the natural
shell-level home for cross-cutting UI concerns per the `EmailVerifyProvider`
precedent) reads it ONCE on mount via `useSearchParams` in a `useEffect`, fires
`toast.success(t("tenant.switch.switched"))`, then strips the param via
`router.replace(...)` (no full reload) so a page refresh doesn't re-fire the
toast. Engineer implements this in Phase 4; a11y auditor should confirm the
toast is announced via `sonner`'s existing `aria-live` region (already used
elsewhere in this repo, not a new pattern).

## Harness Delta

- `docs/TEST_MATRIX.md`: add row US-E23.1 (planned, high-risk)
- `docs/product/screens.md`: `tenantSwitch` header dialog already listed via
  DR-018 — confirm row references this US-E23.1 packet
- [FOLLOW-UP for `fe-lead`]: two parallel repository implementations of the
  identical 2 `iam` endpoints exist (`src/features/tenant/*` — used by this
  story — vs `src/features/auth/*/iam-member*`, US-E06.4). Not this story's
  job to fix; flagged as a latent maintenance-risk (a future BE contract
  change could land on one and not the other) for `fe-lead` to consider
  consolidating.
- Full consolidated spec + traceability matrix: `spec.md` in this packet.
