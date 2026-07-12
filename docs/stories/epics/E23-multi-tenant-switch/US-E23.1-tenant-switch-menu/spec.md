# Feature Spec — Header Tenant-Switch Menu + Dialog (US-E23.1)

Status: Draft   Lane: high-risk
Sources: `requirements.md` (TR-E23.1), `integration.md` (INT-001/INT-002),
`use-cases.md` (UC-001..UC-006, AC-001.x..AC-006.x) + design-spec entry
`docs/product/design-spec.jsonc` → `screens.tenantSwitch`.

## 1. Scope & Objectives

**Purpose.** Give a caller who belongs to ≥2 ACTIVE tenant memberships a
persistent, discoverable way to switch their active tenant from anywhere in
the app (header user-menu), reusing the already-hardened
`SwitchTenantUseCase`/`switchTenantAction` server-side flow.

**In scope.**
- Header user-menu "Đổi trường" item, gated on ≥2 ACTIVE switchable
  memberships (zero-noise otherwise).
- "Chọn trường" dialog: card list (logo/initial, name, address, role badge,
  "Hiện tại" badge), per-card loading, focus-trap, busy-blocked dismiss.
- Current-tenant header block (logo/initial + role badge), matched via the
  decoded `tenantId` JWT claim.
- Wiring the existing `SwitchTenantUseCase`/`ListMyMembershipsUseCase`/
  `switchTenantAction` into this new presentation (no new use-case).

**Out of scope.**
- New BE endpoints or contract changes (FR-009, Won't).
- Admin role (roles-permissions.md's tenant-role model excludes admin here).
- Remembering a preferred/last-used tenant across sessions.
- Resolving/removing the standalone `RoleSwitcher` — confirmed non-redundant,
  orthogonal control (switches ROLE within tenant, not TENANT).
- Post-login select-tenant screen — that is US-E23.2 (shares the `TenantCard`
  data contract but is a separate route/story).

**Definitions.**
- *ACTIVE switchable membership* — a `TenantMembership` with
  `status === "ACTIVE"`; INACTIVE/SUSPENDED/LEFT never count toward the ≥2
  threshold.
- *Current tenant* — the tenant whose `tenantId` matches the `tenantId` claim
  decoded from the caller's current access token (`decodeTenantId`,
  `src/bootstrap/lib/jwt.ts`), matched against the resolved membership list.
- *Zero-noise* — literally no added DOM node for the menu item/dialog when
  the gating condition is not met; not a disabled/greyed affordance.

## 2. Actors & Roles

| Actor | Type | Visibility / capability |
| --- | --- | --- |
| Teacher | Human, authenticated | Identical to all roles below — view current-tenant badge; open switch dialog if ≥2 ACTIVE memberships; select a target card; switch |
| Principal | Human, authenticated | Same as Teacher |
| Student | Human, authenticated | Same as Teacher |
| Parent | Human, authenticated | Same as Teacher |
| System (header data loader) | Non-human | Fetches membership list (INT-001) on header render |
| System (`SwitchTenantUseCase`/`switchTenantAction`) | Non-human, server-only | Sole path that mints a new tenant-scoped token pair and sets httpOnly cookies |
| BE `iam` | External | Authoritative ACTIVE-membership enforcement on switch (403 if rejected) — UI gating is advisory only |

No role-gated visibility differences beyond membership count — behavior is
identical across teacher/principal/student/parent (confirmed in
requirements.md's Prioritized Requirements Summary).

## 3. Functional Requirements

### FR-001 — Show "Đổi trường" menu item (Must, TR-E23.1/FR-001, UC-002)
The system SHALL render a "Đổi trường" item (`role=menuitem`,
`switchHorizontal` icon) in the header user-menu when the caller has ≥2
ACTIVE switchable tenant memberships.
- AC (Given/When/Then): see use-cases.md AC-002.1, AC-002.2, AC-002.3.
- Dependencies: INT-001 (`GET /members/me/tenants`) resolved.

### FR-002 — Hide menu item (zero-noise) (Must, FR-002/FR-008, UC-003)
The system SHALL NOT render the menu item, dialog, or any switch affordance
when the caller has exactly 1 ACTIVE switchable membership, OR when INT-001
fails (fail-closed).
- AC: AC-003.1 (exactly 1, negative DOM-absence assertion), AC-003.2
  (fetch-fail, same negative assertion + swallow/log), AC-003.3 (no
  regression to existing single-tenant menu item order/count).
- Dependencies: none beyond INT-001 resolution/failure.

### FR-003 — Open "Chọn trường" dialog (Must, FR-003, UC-004)
The system SHALL open a focus-trapped "Chọn trường" dialog on menu-item
activation, listing every ACTIVE switchable membership as a real `<button>`
card (logo/initial, name, address, role badge; "Hiện tại" on the current
match).
- AC: AC-004.1 (open + card list + current badge), AC-004.2 (empty list at
  open-time → `tenant.select.empty` copy, not a blank dialog).
- Dependencies: FR-001 satisfied.

### FR-004 — Switch on card select (Must, FR-004, UC-004/UC-006)
The system SHALL, on selecting a non-current card, invoke
`switchTenantAction` (Server Action, the ONLY path) → `SwitchTenantUseCase`
→ `POST /members/switch-tenant` (INT-002) → `setAuthCookies` (httpOnly,
server-only) → navigate into the target tenant's workspace, showing a
per-card loading state during the call and a success toast on completion.
- AC: AC-004.3 (loading within 100ms), AC-004.4 (success: cookies set,
  toast, navigation, dialog closes), AC-006.1–3 (no client-only state
  mutation before the round-trip, no token exposure).
- Dependencies: dialog open (FR-003); target membership `status === ACTIVE`.

### FR-005 — No-op on current card (Should, FR-005, UC-004)
The system SHALL treat selecting the already-current card as a no-op — no
network call, no re-trigger.
- AC: AC-004.5.
- Dependencies: FR-003.

### FR-006 — Busy-blocked dismiss (Must, FR-006, UC-004/UC-005)
The system SHALL allow dialog dismiss via Escape/backdrop click UNLESS a
card is in its loading state, in which case dismiss is blocked until the
call settles.
- AC: AC-004.9 (blocked while busy), AC-004.10/AC-005.1 (allowed while idle,
  focus returns to trigger).
- Dependencies: FR-004's loading state.

### FR-007 — Current-tenant header block (Must, FR-007, UC-001)
The system SHALL display the caller's current tenant (logo/initial + role
badge) in the header user-menu block, determined by matching the decoded
`tenantId` claim against the resolved membership list.
- AC: AC-001.1 (happy path match), AC-001.2 (stale/foreign tenantId →
  role-only fallback, no crash), AC-001.3 (INT-001 fetch fails → same
  fallback, header still renders).
- Dependencies: valid access token with `tenantId` claim.

### FR-008 — 403 target-membership rejection (Must, AC-004.6, UC-004)
The system SHALL, when `POST /members/switch-tenant` returns 403 (target
membership non-member/suspended/inactive — covers both the revoke-mid-flow
race and any other BE-rejected non-ACTIVE target), render an inline error on
the clicked card, keep the dialog open, and make NO navigation and NO cookie
mutation — distinct handling from generic network/5xx (FR-009).
- AC: AC-004.6 (assert cookies unchanged from pre-click state, not merely
  "no visible navigation"); AC-006.4 (BE rejection cannot be bypassed by
  stale client state).
- Dependencies: FR-004's server round-trip.

### FR-009 — Network/5xx failure (Must, AC-004.7, UC-004)
The system SHALL, on network error or 5xx from the switch call, show an
error toast and return the card to idle (not stuck loading), keeping the
dialog open for retry.
- AC: AC-004.7.
- Dependencies: FR-004.

### FR-010 — 401 mid-flow (Must, AC-004.8, UC-004)
The system SHALL, when the access token expires exactly as the switch call
is made, rely on the existing reactive-refresh interceptor to retry once;
success → FR-004's success path; failure → FR-009's path.
- AC: AC-004.8.
- Dependencies: existing decision-`0018` reactive-refresh interceptor
  (unchanged by this story).

## 4. Non-Functional Requirements

| NFR | Category | Requirement | Measurable target | QA verification |
| --- | --- | --- | --- | --- |
| NFR-001 | Accessibility | `TenantCard` is a real `<button>`; name+address+role+current-state read as one unit via `aria-label`; current-state also conveyed by visible "Hiện tại" text, not color alone | WCAG 2.1 AA — zero critical/serious axe/impeccable violations on the dialog | impeccable audit + axe run on dialog Storybook story |
| NFR-002 | Accessibility | Dialog uses Radix Dialog focus-trap semantics: Tab loop, Escape, visible focus ring | Focus ring visible (`--ring` token); no focus escape while open | keyboard-only manual test + Storybook interaction test |
| NFR-003 | Accessibility | Per-card loading state announced to AT | loading region `aria-busy` + `role=status`/`aria-live=polite`, sr-only "Đang chuyển…" | Storybook interaction assertion on ARIA attributes |
| NFR-004 | Responsive | Dialog/cards do not break at narrow viewports | no horizontal scroll/clipping at 320/375/768/1280px; dialog `maxWidth: 440`; cards stack single-column below 440 | manual + Storybook viewport addon at 4 breakpoints |
| NFR-005 | Performance | Per-card loading affordance appears promptly | loading shown within 100ms of activation; success toast/redirect within design's 900ms simulated budget or actual BE latency | Storybook interaction timing assertion |
| NFR-006 | i18n | All new copy (menu item, dialog title/description/current/switching, aria-label templates, toast) from `tenant.switch.*` (vi+en) | zero hardcoded VI/EN literals; `bunx tsc --noEmit` passes with typed message keys | grep for hardcoded diacritics + tsc build |
| NFR-007 | Security | Tenant switch mints tokens server-side only (`setAuthCookies`); client bundle never reads/holds the token pair | no token value in client component state/props/logs; `infrastructure/`/`bootstrap/di/` server-only boundary unchanged | code review + `bun build` (server-only import guard fails build if violated) |
| NFR-008 | Security | Post-switch reload must not leak prior-tenant-scoped cached data | no previous-tenant data visible/readable at any point after switch, before new tenant's data loads | integration/E2E test asserting workspace shows only target-tenant data after switch |

## 5. UI States & Flows

Required async surfaces and their states:

| Surface | loading | empty | error | success |
| --- | --- | --- | --- | --- |
| Menu item (INT-001) | not rendered optimistically (no flash) | n/a (absence = the "empty" outcome, FR-002) | fetch fails → hidden, fail-closed (FR-002) | ≥2 ACTIVE → shown (FR-001) |
| Dialog card list | n/a (menu item implies data already resolved) | should-not-happen empty list at open-time → `tenant.select.empty` copy (FR-003) | n/a (list itself doesn't independently error once menu item is shown) | N cards render (FR-003) |
| Card switch action | per-card `aria-busy`/spinner within 100ms (FR-004) | n/a | 403 inline card error (FR-008); network/5xx toast + idle (FR-009) | success toast + navigation + dialog close (FR-004) |
| Current-tenant header block | n/a (server-decoded at render) | n/a | stale/foreign tenantId or fetch fail → role-only fallback (FR-007) | logo/initial + role badge (FR-007) |

Key flow (UC-004 main success scenario): activate menu item → dialog opens
(focus-trapped) → caller picks non-current card → card shows loading →
`switchTenantAction` → BE validates + mints tokens → `setAuthCookies` →
success toast → navigate to target workspace → dialog closes. Error
branches (403 / network-5xx / 401-retry) diverge at the "BE validates"
step per FR-008/FR-009/FR-010 — see use-cases.md UC-004 Exception flows
E1–E4 for the full diagram-equivalent narrative.

## 6. Data & Integration

### INT-001 — List My Tenant Memberships
- Service: `iam` (mock-first for display fields only — see below).
- Method+Path: `GET /iam/api/v1/members/me/tenants` (Kong-prefixed; DR-018's
  service-relative `GET /api/v1/members/me/tenants` is the same endpoint).
- Auth/role: Bearer access token (httpOnly cookie), any authenticated caller.
- Request: none (identity from token).
- Response (camelCase, after envelope unwrap) — `MembershipSummaryDto[]` →
  `TenantMembership[]`: `tenantId` (string), `roles` (string[]), `status`
  (`ACTIVE|INACTIVE|SUSPENDED|LEFT`). **Display fields (`tenantName`,
  `address`, `logoColor`) are NOT on the wire** — mock-first (confirmed,
  decision `0014`; `ba-integration-analyst` read edu-api's `openapi.yaml`
  directly).
- Pagination: none (bounded, caller's own memberships).
- Error → UI mapping: network/5xx/timeout → FR-002 fail-closed (hide menu
  item, swallow+log, retryable via next render/query refetch); 401 →
  handled by existing refresh flow, not this story's concern.

### INT-002 — Switch Active Tenant
- Service: `iam`.
- Method+Path: `POST /iam/api/v1/members/switch-tenant`.
- Auth/role: Bearer token; caller must hold an ACTIVE membership in the
  target tenant (BE-enforced, 403 otherwise).
- Request (camelCase): `{ tenantId: string, clientId: string }`
  (`clientId` = static `OAUTH_CLIENT_ID`).
- Response (camelCase) — `TokenResponseDto` → `AuthTokens`
  (`accessToken`, `refreshToken`, `sessionId` — Restricted, never reaches a
  Client Component; `switchTenantAction` calls `setAuthCookies` immediately
  server-side).
- Pagination: n/a.
- Error → UI mapping: 403 → FR-008 (inline card error, no navigation, no
  cookie mutation, not retryable — re-fetch membership list instead of
  blind-retry); network/5xx/timeout → FR-009 (error toast, card idle,
  retryable); 401 mid-flow → FR-010 (reactive-refresh retry-once, else
  FR-009 path).

### Mock-first plan
Both endpoints are REAL (already wired, decision-`0017` service map). The
ONLY mock-first surface is tenant display fields (name/address/logoColor),
confirmed genuinely absent from the wire. Approach: a
`bootstrap/lib/mock.ts`-keyed lookup table `tenantId → { tenantName,
address, logoColor }` gated by `NEXT_PUBLIC_USE_MOCK` (decision `0014`),
swapped for a real field if/when BE ships it. This table's shape MUST be
identical to the one US-E23.2 uses (shared `TenantCard` contract).

## 7. Use Case Summary

| UC ID | Title | FR coverage | AC count |
| --- | --- | --- | --- |
| UC-001 | Render current-tenant header block | FR-007 | 3 (AC-001.1–3) |
| UC-002 | Show menu item (≥2 memberships, positive gating) | FR-001 | 3 (AC-002.1–3) |
| UC-003 | Hide menu item (zero-noise: 1 membership or fetch-fail) | FR-002 | 3 (AC-003.1–3) |
| UC-004 | Open dialog → select → switch (happy path + error paths) | FR-003, FR-004, FR-005, FR-006, FR-008, FR-009, FR-010 | 10 (AC-004.1–10) |
| UC-005 | Dialog dismiss (Escape/backdrop) when idle | FR-006 | 1 (AC-005.1) |
| UC-006 | Server-side-enforcement guarantee (cross-cutting) | FR-004, FR-008 (security dimension) | 5 (AC-006.1–5) |

**Total: 6 UCs, 25 AC.**

## 8. Constraints & Assumptions

- `[ASSUMPTION]` The header re-entry point reuses `switchTenantAction`/
  `SwitchTenantUseCase` as-is; no new use-case for the core switch — only
  new presentation + membership-list threading into the header.
- `[ASSUMPTION]` "Context reload" is satisfied by the existing full route
  redirect across the `[tenant]` dynamic segment; does not mandate a hard
  browser reload, but does mandate no stale cross-tenant data leak
  (NFR-008) — concrete mechanism is `fe-state-engineer`'s call.
- `[ASSUMPTION]` Tenant display fields are mock-first pending BE (resolved
  with certainty per Gap Finding below, no longer open).
- `[GAP]` Two parallel repository implementations of the identical 2 `iam`
  endpoints exist: `src/features/tenant/*` (this story's dependency) vs
  `src/features/auth/*/iam-member*` (US-E06.4). This story correctly uses
  `features/tenant/*` and must NOT be the trigger to consolidate — flagged
  as a follow-up maintenance risk for `fe-lead` (see §10).
- `[GAP]` The `iam-member-response.dto.ts` variant already declares an
  unused optional `tenantName?: string` field on its `MembershipSummaryDto`
  — circumstantial evidence the wire *may* emit `tenantName` even though
  `ba-integration-analyst` confirmed the schema as read has none; treated
  as mock-first regardless per the confirmed `[RESOLVED]` note below, not
  blocking this spec.
- `[RESOLVED]` (2026-07-12) Tenant display fields (name/address/logoColor)
  confirmed absent from `MembershipSummary`'s wire schema via direct
  `openapi.yaml` read — mock-first with certainty, not a pending question.
- `[RESOLVED]` `RoleSwitcher` overlap — confirmed non-redundant (switches
  role within tenant, not tenant itself); no ADR needed, both controls stay.
- `[OPEN QUESTION]` Double-activation guard: is a second click on the SAME
  card while its own call is pending required to be a no-op? Recommend
  treating per-card loading as implicitly disabling further activation
  (standard disabled-while-busy pattern); not an explicit FR line item —
  flagged to `fe-lead` for confirmation during planning.
- `[OPEN QUESTION]` Cross-tab consistency: if the caller has two tabs open
  and switches tenant in one, should the other tab's header reactively
  invalidate (e.g. on next focus/visibility-change)? No AC covers this;
  DR-018 doesn't mention multi-tab. Out of scope unless `fe-lead`/`ba-lead`
  decide otherwise before implementation.

## 9. Traceability Matrix

| Requirement | Source | Use Case(s) | Integration(s) | Priority |
| --- | --- | --- | --- | --- |
| FR-001 Show menu item | TR-E23.1/FR-001 | UC-002 | INT-001 | Must |
| FR-002 Hide menu item (zero-noise) | TR-E23.1/FR-002, FR-008 | UC-003 | INT-001 | Must |
| FR-003 Open dialog + card list | TR-E23.1/FR-003 | UC-004 | INT-001 | Must |
| FR-004 Switch on card select | TR-E23.1/FR-004 | UC-004, UC-006 | INT-002 | Must |
| FR-005 No-op on current card | TR-E23.1/FR-005 | UC-004 | INT-002 (not invoked) | Should |
| FR-006 Busy-blocked dismiss | TR-E23.1/FR-006 | UC-004, UC-005 | n/a (client-only UI state) | Must |
| FR-007 Current-tenant header block | TR-E23.1/FR-007 | UC-001 | INT-001 | Must |
| FR-008 403 rejection handling | AC-004.6 | UC-004, UC-006 | INT-002 | Must |
| FR-009 Network/5xx handling | AC-004.7 | UC-004 | INT-002 | Must |
| FR-010 401 mid-flow handling | AC-004.8 | UC-004 | INT-002 (+ existing refresh, decision `0018`) | Must |
| NFR-001–003 a11y | TR-E23.1 NFRs | UC-004 | n/a | Must |
| NFR-004 responsive | TR-E23.1 NFR-004 | UC-004 | n/a | Must |
| NFR-005 perf | TR-E23.1 NFR-005 | UC-004 | INT-002 | Must |
| NFR-006 i18n | TR-E23.1 NFR-006 | all | n/a | Must |
| NFR-007 security (token handling) | TR-E23.1 NFR-007 | UC-006 | INT-002 | Must |
| NFR-008 security (no stale data leak) | TR-E23.1 NFR-008 | UC-006 | INT-001/INT-002 | Must |

## 10. Handoff to FE

`fe-lead` should build the header menu item + `TenantSwitchDialog` +
`TenantCard`/`TenantLogo` presentational components, wiring them to the
EXISTING `SwitchTenantUseCase`/`ListMyMembershipsUseCase`/
`switchTenantAction` — no new domain/use-case layer is expected for the core
switch. Suggested lane: **high-risk** (authorization hard gate — matches
this packet's lane). Reference:
- `design_src/edu/tenant-switch.jsx` (`TenantSwitchDialog`, `TenantCard`,
  `TenantLogo`) and `design_src/edu/app.jsx` (header menu/dialog wiring
  logic, `handleTenantSwitch`) as the visual/interaction baseline.
- `docs/product/design-spec.jsonc` → `screens.tenantSwitch` for exact token
  values (dialog `maxWidth: 440`, card `minHeight: 80`/`logoSize: 56`,
  hover/focus/current-badge tokens).
- This `spec.md` for FR/AC/NFR/traceability — the proof rows in
  `docs/TEST_MATRIX.md` should map 1:1 to §3 FRs (unit: visibility
  predicate + current-tenant match; integration: existing action reuse +
  403/5xx/401 branches; E2E: the 12 Storybook stories listed in
  `story.md`'s Validation table).
- **Follow-up (not blocking, not this story's scope):** the duplicate
  `iam` repository implementations (`features/tenant/*` vs
  `features/auth/*/iam-member*`) are a latent maintenance risk `fe-lead`
  should consider consolidating in a future story.
- Coordinate the shared `TenantCard` mock/real data contract with
  US-E23.2 so the two stories don't diverge on shape.
