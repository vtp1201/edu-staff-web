# Integration Map — US-E23.2 (Post-Login Select-Tenant Screen)

Service: **iam**. Same two endpoints as US-E23.1 (`GET /members/me/tenants`,
`POST /members/switch-tenant`) — this doc is the shared reference both
packets point to (per both stories' handoff notes: "resolve once, reference
from both"). This story enhances the EXISTING `(auth)/select-tenant` route
(owner: `US-001-tenant-path-resolver`, E05) in place — no new route, no new
endpoint.

## 1. Integration Overview

- Endpoints consumed: **2**, identical to US-E23.1's INT-001/INT-002.
- Services touched: `iam` only.
- Status: **REAL** — both already wired against the existing
  `(auth)/select-tenant/{page.tsx,select-tenant.tsx,actions.ts}` +
  `src/features/tenant/**`. This story does not need to add or change any
  repository/DI wiring for the endpoint calls themselves — only the DTO/entity
  shape (display fields, §5) and the presentation markup change.
- Risk: identical display-field gap as US-E23.1 (§5 below is the same finding,
  duplicated here per the stories' explicit request not to diverge). The
  additional risk specific to THIS story: it is a **pre-workspace hard gate**
  (NFR-005) — an unhandled error here has no fallback route, unlike the header
  dialog which degrades to "menu item hidden."

## 2. Endpoint Catalogue

```
INT-001  List My Tenant Memberships (screen-load gate)
Service: iam    Method+Path: GET /iam/api/v1/members/me/tenants
Status: REAL — same wiring as US-E23.1 INT-001
  (`TENANT_EP.myTenants` → `TenantRepository.listMyMemberships()` →
  `ListMyMembershipsUseCase`). Currently invoked from the existing
  `select-tenant/page.tsx` (RSC) to build the `memberships` prop passed into
  `SelectTenant` (`select-tenant.tsx`).
Protected: yes   Role required: any authenticated caller, pre-workspace (this
  IS the gate that decides whether a workspace route is reachable at all)
Request (outbound): none
Response payload (inbound): `TenantMembership[]` — tenantId, roles, status
  (see US-E23.1 §5 for the exact display-field gap; identical here)
Pagination: none
Errors → UI behavior:
  - network/5xx/timeout → **NEW for this story** (FR-008, currently undefined
    per DR-018): show an error state with a retry action; do NOT auto-redirect
    to login unless the access token itself is invalid (401 → let existing
    refresh/redirect-to-login flow handle it, do not treat as a membership
    error) | retryable: yes, explicit user-triggered retry button (no auto-loop)
  - 0 ACTIVE memberships (not an HTTP error — an empty/filtered result) →
    FR-007: existing `tenant.select.empty` empty state, must also surface a
    "next action" (contact admin / logout) — currently the empty state has no
    dead-end escape per the requirements; needs at least a logout affordance
Empty / loading expectation:
  - loading: skeleton if fetch exceeds 300ms (NFR-003) — this is server-fetched
    (RSC) today, so "loading" applies if/when this becomes a client fetch
    (state-engineer decision) or via a Suspense boundary if kept server-side
  - empty (0 active memberships): FR-007 explicit empty state + escape action
  - success (≥2 active memberships): card grid, no "current" badge (unlike
    US-E23.1's dialog — this screen is pre-entry, there is no "current tenant"
    yet)
  - exactly 1 active membership: FR-006 — this screen must not render at all;
    routing decision happens upstream (existing guard logic owned by
    US-001-tenant-path-resolver / `(app)/layout.tsx`, unchanged by this story)

INT-002  Switch Active Tenant (select → enter workspace)
Service: iam    Method+Path: POST /iam/api/v1/members/switch-tenant
Status: REAL — same wiring as US-E23.1 INT-002
  (`TENANT_EP.switchTenant` → `TenantRepository.switchTenant()` →
  `SwitchTenantUseCase` → `switchTenantAction`,
  `src/app/[locale]/(auth)/select-tenant/actions.ts`). This story reuses
  `switchTenantAction` UNCHANGED (FR-004) — only the calling UI (card grid vs.
  the old `<ul>` list) changes.
Protected: yes   Role required: caller must hold an ACTIVE membership in the
  selected tenant (BE-enforced 403 otherwise)
Request (outbound, camelCase):
  - tenantId — selected tenant UUID | Internal
  - clientId — `OAUTH_CLIENT_ID` | Internal
Response payload (inbound): `AuthTokens` (accessToken/refreshToken/sessionId)
  — Restricted, never exposed client-side; `switchTenantAction` persists via
  `setAuthCookies()` then redirects to `tenantUrl(tenantId, role)`
  (`/t/{tenantId}/{role}`), matching NFR-005's requirement that the redirect
  target be validated against the caller's own membership list — **confirmed
  by code**: `role` passed to `switchTenantAction` is `m.roles[0] ?? ""` taken
  directly from the SAME membership object the caller selected (sourced from
  the just-fetched `GET /members/me/tenants` response, not client-supplied
  free text), so there is no open-redirect surface — the tenantId/role pair
  always originates from the caller's own membership list, never user input.
Pagination: n/a
Errors → UI behavior:
  - 403 (race: membership revoked between list-fetch and select) → FR-004:
    inline error on card, no navigation, no cookie mutation, caller stays on
    screen | retryable: no (re-fetch membership list instead)
  - network/5xx/timeout → error toast, card returns to idle | retryable: yes
  - 401 mid-flow → existing refresh flow; if it also fails, treat as
    network/5xx path
Empty / loading expectation: per-card loading state within 100ms of
  activation (same NFR pattern as US-E23.1).
```

## 3. Auth & Security

- This screen is the **pre-workspace authorization gate** for multi-tenant
  callers (NFR-005) — token minting stays entirely server-side via the
  existing `switchTenantAction`; no route under `/t/[tenant]/(app)/**` is
  reachable before this gate resolves. This is unchanged from the existing
  US-001-tenant-path-resolver guard logic — this story only redesigns the
  screen's markup/copy, not the gate mechanism.
- Redirect-target validation (no open redirect): confirmed by code inspection
  above — the `tenantId`/`role` pair passed to `switchTenantAction` is always
  read from the membership object the caller clicked, which itself came from
  their own `GET /members/me/tenants` response. There is no code path where a
  client-supplied arbitrary `tenantId` reaches `switchTenantAction`.
- No role gating beyond "authenticated, ≥2 ACTIVE memberships, no tenant
  context yet" — identical across teacher/principal/student/parent.
- PII: none of tenantId/roles/status is personal data; caller's own `name`
  (used in the FR-002 personalized greeting) comes from the existing
  `AuthUser`/`GET /users/me` profile, a different, already-integrated
  endpoint (`AUTH_EP.me`) — not one of the two endpoints in scope here, but
  worth noting for `fe-component-architect`/`fe-state-engineer`: the greeting
  needs BOTH the membership list (this doc) AND the profile name (existing
  `auth` feature), i.e. two data sources composed at the screen level.

## 4. Mock-first plan

Identical to US-E23.1 §4 — same gap, same recommendation (do not diverge, per
both stories' explicit request):
- `tenantName` — attempt DTO/entity widening first (see §5); worth a quick
  check against edu-api's `iam` `openapi.yaml` before falling back to mock.
- `address`/`logoColor` — no evidence on the wire anywhere in this repo;
  mock-first via a `bootstrap/lib/mock.ts`-keyed `tenantId → { address,
  logoColor }` lookup gated by `NEXT_PUBLIC_USE_MOCK` (decision `0014`) is the
  pragmatic default, pending `ba-lead` confirmation.
- Both US-E23.1 and US-E23.2 render the same `TenantCard` concept per
  design-spec.jsonc — the mock/real data shape MUST be identical for both so
  the component contract doesn't fork.

## 5. Gap Finding — tenant display fields (name/address/logo)

Same finding as US-E23.1 integration.md §5, restated here per both stories'
explicit request to reference one resolved answer from both packets (not
re-litigate):

- `features/tenant/infrastructure/dtos/membership-response.dto.ts`
  (the DTO this screen's existing `page.tsx`/`select-tenant.tsx` actually
  consumes) declares only `{ tenantId, roles, status }` — confirmed no field
  is being silently dropped IN THIS DTO/mapper (`mapMembership()` maps exactly
  what the DTO declares).
- A parallel DTO for the identical BE endpoint,
  `features/auth/infrastructure/dtos/iam-member-response.dto.ts`
  (`MembershipSummaryDto`, used by the separate `iam-member` repository/DI
  wiring, US-E06.4), already declares an **optional `tenantName?: string`**
  field — but its own mapper (`mapMembershipSummary()`,
  `iam-member.mapper.ts`) does not read it, dropping it if present.
- **Best-effort conclusion**: circumstantial evidence that `GET
  /members/me/tenants` may already emit `tenantName` on the wire, and it's
  the `features/tenant/*` DTO (this screen's actual dependency) that is
  narrower/stale — not necessarily proof the BE genuinely lacks the field.
  Cannot fully confirm without edu-api `openapi.yaml` access.
- `address`, `logoColor`/`logo` — no trace anywhere in this codebase (no DTO,
  mapper, entity, or the parallel `iam-member` slice references either) —
  more plausibly genuinely absent from the wire; treat as mock-first.
- **Recommended smallest viable fix**: add `tenantName?: string` to
  `features/tenant/infrastructure/dtos/membership-response.dto.ts` +
  `TenantMembership` entity + `mapMembership()`, verified against edu-api's
  `services/iam/docs/openapi.yaml`/`INTEGRATION.md` first. This is additive/
  backward-compatible (optional field). `address`/`logo` stay mock-first
  regardless.
- The `select-tenant.tsx` component today literally renders `m.tenantId` (a
  raw UUID) where a name should go (line 33 of the current file) — confirms
  the requirements' framing that this is a functional gap in the shipped
  slice, not an intentional simpler design, consistent with the ba-lead's
  consolidation decision (enhance in place, not two parallel screens).

## 6. Open Questions

- `[OPEN QUESTION]` Same as US-E23.1: does `GET /members/me/tenants` already
  return `tenantName` on the wire? Check edu-api `services/iam/docs/
  openapi.yaml` for the `MembershipSummary` schema before deciding
  mock-vs-BE-change for this field specifically.
- `[OPEN QUESTION]` Confirm `address`/`logoColor` are genuinely absent from
  the `iam` service (no trace in this repo either way) — if edu-api access is
  available, check the same schema.
- `[OPEN QUESTION]` (carried from requirements, not integration-specific)
  whether US-E01.2 should be marked superseded/extended-by in Harness — a
  `ba-lead` bookkeeping decision, not an integration contract question.
