# Feature Spec — Post-Login Select-Tenant Screen (US-E23.2)

Status: Draft   Lane: high-risk
Sources: `requirements.md` (TR-E23.2), `integration.md` (INT-001/INT-002,
shared with US-E23.1), `use-cases.md` (UC-001..UC-005, AC-001.x..AC-005.x),
`docs/stories/epics/E05-multi-tenancy/US-001-tenant-path-resolver/` (design.md
— existing routing/guard owner) + design-spec entry
`docs/product/design-spec.jsonc` → `screens.selectTenant`.

## 1. Scope & Objectives

**Purpose.** Enhance the EXISTING `(auth)/select-tenant` screen (shipped by
`US-001-tenant-path-resolver`, E05) from its current raw-`<ul>`-of-tenantId
rendering to the DR-018 card-grid design, so multi-tenant callers get a
personalized, informative pre-workspace tenant-selection experience
immediately post-login.

**Consolidation framing (explicit, load-bearing for this spec).** This is
**NOT** a new parallel screen. Same route, same trigger (≥2 ACTIVE
memberships, no tenant context yet, immediately post-login), same
`page.tsx`/`select-tenant.tsx`/`actions.ts`, same underlying routing guard
(`resolveTenant`, membership-check — owned by `US-001-tenant-path-resolver`,
E05, unchanged by this story). `US-001-tenant-path-resolver` stays
`implemented` in Harness; this story **extends** its UI, it does not
supersede the story itself. The existing implementation's raw-`tenantId`-as-
name rendering is a genuine functional gap in that shipped slice (no display
name/address/logo ever existed in `TenantMembership`), not an intentional
simpler design — closing that gap is this story's core job.

**In scope.**
- Card-grid redesign of the existing screen (heading, personalized
  subheading, card grid, footnote, per-card loading, existing empty state +
  NEW error state).
- Entity/DTO extension for display fields (shared decision with US-E23.1,
  flagged to `ba-integration-analyst`).

**Out of scope.**
- Header re-entry point / "Đổi trường" dialog — that is US-E23.1.
- New BE endpoints beyond a possible `MembershipSummary` field extension.
- Remembering a preferred tenant across sessions / auto-skip on subsequent
  logins.
- Admin role (not part of the tenant-role model per roles-permissions.md).
- The routing GATE decision itself (whether the caller lands on this route
  at all) — owned by `US-001-tenant-path-resolver`'s guard, unchanged here.

**Definitions.** Same as US-E23.1: *ACTIVE switchable membership*, *current
tenant* (not applicable on THIS screen — pre-entry, no card is ever marked
current), *zero-noise* (single-tenant callers never see this screen, existing
preserved behavior).

## 2. Actors & Roles

| Actor | Type | Visibility / capability |
| --- | --- | --- |
| Teacher | Human, authenticated, post-login, no tenant context yet | View own switchable memberships; select a tenant to enter its workspace |
| Principal | Human, authenticated, post-login | Same as Teacher |
| Student | Human, authenticated, post-login | Same as Teacher |
| Parent | Human, authenticated, post-login | Same as Teacher |
| System (existing routing guard, `US-001-tenant-path-resolver`) | Non-human | Decides whether the caller reaches this route at all — UNCHANGED by this story |
| System (screen data loader) | Non-human | Fetches membership list (INT-001) + caller profile name (existing `AUTH_EP.me`) to compose the greeting |
| System (`SwitchTenantUseCase`/`switchTenantAction`) | Non-human, server-only | Mints tenant-scoped token pair (INT-002); the ONLY path that grants workspace entry |
| BE `iam` | External | Authoritative membership/ACTIVE-status check on switch (403 if rejected) |

No role-gated visibility differences beyond membership count — identical
across teacher/principal/student/parent.

## 3. Functional Requirements

### FR-001 — Redirect gate to select-tenant (Must, TR-E23.2/FR-001, UC-001)
The system SHALL redirect an authenticated caller with ≥2 ACTIVE switchable
memberships and no yet-selected tenant to `(auth)/select-tenant` before
allowing entry to any `/t/[tenant]/(app)/**` route. **This is EXISTING
behavior owned by `US-001-tenant-path-resolver`'s guard — unchanged by this
story**; listed here for completeness of the screen's precondition chain.
- AC: AC-001.1 (screen reached with heading+subheading+cards).
- Dependencies: `US-001-tenant-path-resolver` guard (unchanged).

### FR-002 — Heading + personalized subheading (Must, FR-002, UC-001)
The system SHALL render heading "Chọn trường để tiếp tục" and subheading
"Xin chào {name} — tài khoản của bạn thuộc {count} trường.", falling back to
a name-less variant if the display name is unavailable.
- AC: AC-001.1 (happy path text), AC-001.2 (name-unavailable fallback, no
  literal "undefined"/blank interpolation).
- Dependencies: FR-001; caller profile name from existing `AUTH_EP.me`
  (separate, already-integrated endpoint — composed at screen level).

### FR-003 — Card grid, no current badge (Must, FR-003, UC-001)
The system SHALL render one real `<button>` card per ACTIVE switchable
membership (logo/initial, name, address, role badge); NO "current" badge on
any card (caller has not yet entered any tenant).
- AC: AC-001.1 (N cards, no "Hiện tại" anywhere).
- Dependencies: memberships.length >= 2 (FR-001's precondition).

### FR-004 — Select → mint → redirect (Must, FR-004, UC-005)
The system SHALL, on card selection, show a per-card loading state, then
invoke `switchTenantAction`/`SwitchTenantUseCase` (reused unchanged) →
`POST /members/switch-tenant` (INT-002) → `setAuthCookies` (httpOnly,
server-only) → redirect the caller to `/t/{tenantId}/{role}` (the selected
membership's role).
- AC: AC-005.1 (happy path), AC-005.2 (loading within 100ms).
- Dependencies: FR-003 (card list rendered); target membership
  `status === ACTIVE`.

### FR-005 — Footnote (Should, FR-005, UC-001)
The system SHALL show a footnote ("Bạn có thể đổi trường bất kỳ lúc nào từ
menu tài khoản.") — CONDITIONAL on US-E23.1's header re-entry point having
shipped; omitted otherwise (see §8 sequencing constraint).
- AC: AC-001.4.
- Dependencies: US-E23.1 shipped (sequencing, not a hard code dependency).

### FR-006 — Zero-noise skip (Must, FR-006, UC-002)
The system SHALL skip this screen entirely and route directly into the sole
tenant's workspace when the caller has exactly 1 ACTIVE switchable
membership — preserving existing (E05) behavior, no regression.
- AC: AC-002.1 (negative DOM/route-visit assertion), AC-002.2 (no
  regression to target route/redirect mechanism).
- Dependencies: existing `US-001-tenant-path-resolver` guard, unchanged.

### FR-007 — Empty state with next action (Must, FR-007, UC-003)
The system SHALL show an explicit empty state ("Bạn chưa thuộc tổ chức
nào") when the caller has 0 ACTIVE memberships, with at least one
actionable, keyboard-operable next action (e.g. logout) — closing a gap in
the existing shipped slice, which had no escape action.
- AC: AC-003.1 (message shown), AC-003.2 (next-action control present and
  keyboard-operable — explicit presence assertion, since prior
  implementation had none), AC-003.3 (all-INACTIVE/SUSPENDED/LEFT counts as
  empty, not a partial/broken grid).
- Dependencies: membership list resolves successfully but is empty of
  ACTIVE entries.

### FR-008 — Error state with retry (Should/functionally-required, FR-008,
UC-004, NEW)
The system SHALL show an error state with an explicit retry action when
`GET /members/me/tenants` fails on this screen. This is a hard-gate screen
(no fallback route) — unlike US-E23.1's header, which degrades to "menu item
hidden" on the same failure, a silent/blank failure here is not acceptable.
- AC: AC-004.1 (error+retry shown, not blank/broken), AC-004.2 (retry
  success → transitions to FR-002/003 rendering), AC-004.3 (retry failure →
  stays in error state, no auto-redirect loop), AC-004.4 (401 is NOT
  conflated with this error path — routed through existing refresh/redirect-
  to-login flow instead).
- Dependencies: none beyond INT-001 failing on screen load.

### FR-009 — 403 target-membership rejection (Must, AC-005.3, UC-005)
The system SHALL, when `POST /members/switch-tenant` returns 403 (target
membership non-member/suspended/inactive — race or already-non-ACTIVE),
render an inline error on the clicked card, keep the caller on THIS screen
(no navigation into any workspace), and make NO cookie mutation.
- AC: AC-005.3 (mirrors US-E23.1's AC-004.6 assertion pattern exactly —
  same underlying mint mechanism).
- Dependencies: FR-004's server round-trip.

### FR-010 — Network/5xx failure (Must, AC-005.4, UC-005)
The system SHALL, on network error or 5xx from the switch call, show an
error toast and return the card to idle.
- AC: AC-005.4.
- Dependencies: FR-004.

### FR-011 — 401 mid-flow (Must, AC-005.5, UC-005)
The system SHALL, when the token expires exactly as the switch call is
made, rely on the existing reactive-refresh interceptor to retry once;
success → FR-004's path; failure → FR-010's path.
- AC: AC-005.5.
- Dependencies: existing decision-`0018` reactive-refresh interceptor.

## 4. Non-Functional Requirements

| NFR | Category | Requirement | Measurable target | QA verification |
| --- | --- | --- | --- | --- |
| NFR-001 | Accessibility | Cards are real `<button>`s; name+address+role read as one accessible unit via `aria-label` (no "current" clause, unlike US-E23.1's dialog) | WCAG 2.1 AA, zero critical/serious axe/impeccable violations | impeccable audit + axe run on screen Storybook story |
| NFR-002 | Responsive | Layout reuses `screens.login`'s centered auth-shell tokens | no layout break at 320px; grid reflows to single column below ~440px column width | manual + Storybook viewport addon |
| NFR-003 | Performance | Membership list must not leave the caller on a blank screen while loading | skeleton shown if fetch exceeds 300ms; per-card switch loading shown within 100ms of activation | Storybook interaction timing assertion |
| NFR-004 | i18n | All copy from `tenant.switch.postLogin.*` (new namespace) — do not silently repurpose `tenant.select.*` (which reads differently) | typed message keys compile-check clean; no hardcoded VI/EN literals | tsc build + grep for hardcoded diacritics |
| NFR-005 | Security | This screen is the sole pre-workspace authorization gate; token minting stays server-side only; redirect target must be validated against the caller's own membership list (no client-influenced open redirect) | target route only reachable for a `tenantId` present in the caller's own membership list; token pair never exposed to client JS | code review confirming `tenantId`/`role` are read from the selected membership object, never free text; `bun build` server-only guard |
| NFR-006 | Performance/Security | No stale data from a previously-selected tenant visible on screen re-entry (e.g. deep-linking back) | same cross-tenant cache-leak guard as US-E23.1 NFR-008 | integration/E2E test asserting no prior-tenant data visible on re-render |

## 5. UI States & Flows

| Surface | loading | empty | error | success |
| --- | --- | --- | --- | --- |
| Screen (routing branch) | skeleton if fetch >300ms (FR-002/NFR-003) | 0 ACTIVE memberships → FR-007 empty state + next action | INT-001 fails → FR-008 error+retry (NEW) | ≥2 ACTIVE → card grid (FR-002/003); exactly 1 → skipped entirely (FR-006) |
| Card switch action | per-card loading within 100ms (FR-004) | n/a (grid only renders with ≥2 cards) | 403 inline card error (FR-009); network/5xx toast + idle (FR-010) | redirect to `/t/{tenantId}/{role}` (FR-004) |

Key flow (UC-001 → UC-005): caller reaches screen (existing guard) → screen
loads membership list + profile name → renders heading/subheading/card grid
→ caller picks a card → per-card loading → `switchTenantAction` → BE
validates + mints tokens → `setAuthCookies` → redirect into workspace. Branch
outcomes at the routing-decision layer (UC-002/UC-003/UC-004) are evaluated
BEFORE the card grid ever renders — see use-cases.md UC-001..UC-004 for the
four-way branch narrative.

## 6. Data & Integration

Identical two endpoints as US-E23.1 (shared `integration.md` reference —
both packets deliberately point to one resolved answer, not re-litigated).

### INT-001 — List My Tenant Memberships (screen-load gate)
- Service: `iam`. `GET /iam/api/v1/members/me/tenants`.
- Same wiring as US-E23.1: `TENANT_EP.myTenants` →
  `TenantRepository.listMyMemberships()` → `ListMyMembershipsUseCase`.
  Currently invoked from `select-tenant/page.tsx` (RSC).
- Auth/role: any authenticated caller, pre-workspace — this IS the gate
  deciding whether a workspace route is reachable at all.
- Response: `TenantMembership[]` (`tenantId`, `roles`, `status`) — display
  fields (name/address/logo) NOT on the wire, mock-first (confirmed).
- Error → UI mapping: network/5xx/timeout → **NEW for this story** (FR-008)
  error+retry state, explicit user-triggered retry, no auto-loop; 0 ACTIVE
  memberships (not an HTTP error, a filtered-empty result) → FR-007 empty
  state + escape action.

### INT-002 — Switch Active Tenant (select → enter workspace)
- Service: `iam`. `POST /iam/api/v1/members/switch-tenant`.
- Same wiring as US-E23.1: `TENANT_EP.switchTenant` →
  `TenantRepository.switchTenant()` → `SwitchTenantUseCase` →
  `switchTenantAction` (`select-tenant/actions.ts`, reused UNCHANGED).
- Request (camelCase): `{ tenantId, clientId }` — `tenantId` read directly
  from the selected membership object (sourced from the caller's own
  INT-001 response, never client-supplied free text — confirmed by code
  inspection: `role` passed is `m.roles[0] ?? ""` from the same object).
- Response: `AuthTokens` (Restricted, never exposed client-side);
  `setAuthCookies()` then `redirect()` to `tenantUrl(tenantId, role)`.
- Error → UI mapping: 403 → FR-009 (inline card error, caller stays on
  screen, no cookie mutation, not retryable — re-fetch membership list
  instead); network/5xx/timeout → FR-010 (error toast, card idle,
  retryable); 401 mid-flow → FR-011 (existing refresh flow, else FR-010).

### Mock-first plan
Identical to US-E23.1 — same gap, same recommendation, explicitly must NOT
diverge: `tenantName`/`address`/`logoColor` sourced from a shared
`bootstrap/lib/mock.ts`-keyed lookup table gated by `NEXT_PUBLIC_USE_MOCK`
(decision `0014`). Both US-E23.1 and US-E23.2 render the same `TenantCard`
concept per design-spec.jsonc — the data shape must be identical so the
component contract does not fork.

## 7. Use Case Summary

| UC ID | Title | FR coverage | AC count |
| --- | --- | --- | --- |
| UC-001 | Routing branch — ≥2 ACTIVE memberships → screen shown | FR-001 (upstream), FR-002, FR-003, FR-005 | 4 (AC-001.1–4) |
| UC-002 | Routing branch — exactly 1 ACTIVE membership → screen skipped | FR-006 | 2 (AC-002.1–2) |
| UC-003 | Routing branch — 0 ACTIVE memberships → empty state + next action | FR-007 | 3 (AC-003.1–3) |
| UC-004 | Routing branch — membership fetch fails → error + retry (NEW) | FR-008 | 4 (AC-004.1–4) |
| UC-005 | Select → mint → redirect (happy path + 403-race error path) | FR-004, FR-009, FR-010, FR-011 | 8 (AC-005.1–8) |

**Total: 5 UCs, 21 AC.**

## 8. Constraints & Assumptions

- `[ASSUMPTION]` (confirmed by `ba-lead`, 2026-07-12) US-E23.2 is scoped as
  an in-place enhancement of the existing `(auth)/select-tenant` screen, not
  a second parallel screen — see §1 Consolidation framing.
- `[ASSUMPTION]` FR-005's footnote is only truthful once US-E23.1 ships; if
  US-E23.2 ships first, the footnote is conditionally omitted (AC-001.4)
  rather than blocking this story on US-E23.1's delivery — a sequencing
  note, not a hard dependency.
- `[ASSUMPTION]` Tenant display fields are sourced identically to US-E23.1
  (shared entity/mock extension) — the two stories must NOT diverge on this
  data shape since both render the same `TenantCard` concept.
- `[RESOLVED]` (2026-07-12) Tenant displayName/address/logo confirmed
  absent from the `MembershipSummary` wire schema via direct `openapi.yaml`
  read — mock-first with certainty, shared identical contract with
  US-E23.1, not a pending DTO-widening question.
- `[GAP]` Same duplicate-repository finding as US-E23.1
  (`features/tenant/*` vs `features/auth/*/iam-member*`) — this story must
  keep using `features/tenant/*` (matches the existing screen's actual
  dependency); not this story's job to consolidate, flagged as a follow-up.
- `[OPEN QUESTION]` (bookkeeping only, not technical) whether
  `US-001-tenant-path-resolver`'s own Harness packet should gain an
  annotation cross-referencing this story's UI enhancement — `ba-lead`
  decision, does not change any AC/FR above; this story keeps
  `US-001-tenant-path-resolver` as-is (`implemented`, unchanged).
- `[OPEN QUESTION]` Double-activation guard on a single card during its own
  pending state — same gap as US-E23.1's packet; recommend disabling the
  card during its own loading state (not an explicit FR line item);
  flagged once for both stories, resolved identically.
- `[OPEN QUESTION]` Request de-dupe if the caller rapidly re-navigates to
  `(auth)/select-tenant` while a membership fetch is already in flight
  (back/forward navigation) — not specified in FR-001/FR-008; recommend
  standard single-flight fetch behavior, flagged since this screen is
  server-fetched (RSC) today (loading state applies if/when this becomes a
  client fetch, a state-engineer decision).

## 9. Traceability Matrix

| Requirement | Source | Use Case(s) | Integration(s) | Priority |
| --- | --- | --- | --- | --- |
| FR-001 Redirect gate (existing, unchanged) | TR-E23.2/FR-001, `US-001-tenant-path-resolver` guard | UC-001 (precondition) | n/a (routing layer, not this story's endpoint call) | Must |
| FR-002 Heading + personalized subheading | TR-E23.2/FR-002 | UC-001 | existing `AUTH_EP.me` (not INT-001/002) | Must |
| FR-003 Card grid, no current badge | TR-E23.2/FR-003 | UC-001 | INT-001 | Must |
| FR-004 Select → mint → redirect | TR-E23.2/FR-004 | UC-005 | INT-002 | Must |
| FR-005 Footnote (conditional) | TR-E23.2/FR-005 | UC-001 | n/a | Should |
| FR-006 Zero-noise skip | TR-E23.2/FR-006 | UC-002 | n/a (existing guard) | Must |
| FR-007 Empty state + next action | TR-E23.2/FR-007 | UC-003 | INT-001 | Must |
| FR-008 Error state + retry (NEW) | TR-E23.2/FR-008 | UC-004 | INT-001 | Should (functionally required) |
| FR-009 403 rejection handling | AC-005.3 | UC-005 | INT-002 | Must |
| FR-010 Network/5xx handling | AC-005.4 | UC-005 | INT-002 | Must |
| FR-011 401 mid-flow handling | AC-005.5 | UC-005 | INT-002 (+ existing refresh, decision `0018`) | Must |
| NFR-001 a11y | TR-E23.2 NFR-001 | UC-001 | n/a | Must |
| NFR-002 responsive | TR-E23.2 NFR-002 | UC-001 | n/a | Must/Should |
| NFR-003 perf | TR-E23.2 NFR-003 | UC-001, UC-005 | INT-001, INT-002 | Should |
| NFR-004 i18n | TR-E23.2 NFR-004 | all | n/a | Must |
| NFR-005 security (no open redirect, server-only mint) | TR-E23.2 NFR-005 | UC-005 | INT-002 | Must |
| NFR-006 security (no stale cross-tenant data) | TR-E23.2 NFR-006 | UC-005 | INT-001, INT-002 | Should |

## 10. Handoff to FE

`fe-lead` should treat this as an **enhance-in-place** job on the existing
`(auth)/select-tenant` route — `page.tsx`, `select-tenant.tsx`, `actions.ts`
already exist and are correct at the routing/guard level; only the
presentation (raw `<ul>` → card grid) and entity/DTO display fields change.
Suggested lane: **high-risk** (pre-workspace authorization gate — matches
this packet's lane). Reference:
- `design_src/edu/tenant-switch.jsx` (`TenantSelectScreen`, reusing
  `TenantCard`/`TenantLogo` from the same file as US-E23.1).
- `design_src/edu/app.jsx` for the header menu/dialog logic context (not
  directly used by this screen, but the shared `TenantCard` interaction
  pattern lives there too — coordinate against US-E23.1's implementation).
- `docs/product/design-spec.jsonc` → `screens.selectTenant` for exact token
  values (layout reuse of `screens.login`'s centered auth-shell, card grid
  `gap: 12`, `cardComponent` always `isCurrent: false`).
- This `spec.md` for FR/AC/NFR/traceability — proof rows in
  `docs/TEST_MATRIX.md` should map 1:1 to §3 FRs (unit: routing-branch
  predicates + redirect-target derivation; integration: existing action
  reuse + error/403/5xx/401 branches; E2E: the 12 Storybook stories listed
  in `story.md`'s Validation table).
- **Coordinate with US-E23.1**: the `TenantCard` mock/real data contract
  MUST be identical across both stories — do not implement two shapes.
- **Do not touch `US-001-tenant-path-resolver`'s guard logic** — this story
  is presentation-only on top of that existing, correct routing/guard code.
- **Follow-up (not blocking, not this story's scope):** the duplicate `iam`
  repository implementations (`features/tenant/*` vs
  `features/auth/*/iam-member*`) are a latent maintenance risk `fe-lead`
  should consider consolidating in a future story (same finding as
  US-E23.1's handoff note).
