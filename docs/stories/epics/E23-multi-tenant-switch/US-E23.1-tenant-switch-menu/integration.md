# Integration Map — US-E23.1 (Header Tenant-Switch Menu + Dialog)

Service: **iam**. Both endpoints already integrated (decision `0017` service
map) — this story adds NO new BE endpoint (FR-009). Read against actual code
in `src/features/tenant/**`, `src/bootstrap/endpoint/tenant.endpoint.ts`,
`src/bootstrap/endpoint/iam-member.endpoint.ts`, and the parallel
`src/features/auth/**/iam-member*` slice (US-E06.4).

## 1. Integration Overview

- Endpoints consumed: **2** (`GET /members/me/tenants`, `POST /members/switch-tenant`).
- Services touched: `iam` only.
- Status: **REAL** — both endpoints are live and already wired in this repo
  (two separate implementations exist, see §5 finding — this story must use
  the `features/tenant/*` one, not the parallel `iam-member` one).
- Risk: the **tenant display-field gap** (name/address/logo) is the only
  blocker for the DR-018 card design; see §5. Everything else (auth flow,
  paths, error envelope) is already hardened by US-E05.1/US-E06.4.

## 2. Endpoint Catalogue

```
INT-001  List My Tenant Memberships
Service: iam    Method+Path: GET /iam/api/v1/members/me/tenants
  (Kong-gateway-prefixed `/iam/...`; ADR 0030/US-E06.3. DR-018 quotes the
  service-relative `GET /api/v1/members/me/tenants` — same endpoint, no
  mismatch, gateway prefix is additive.)
Status: REAL — already implemented (`TENANT_EP.myTenants`,
  `src/bootstrap/endpoint/tenant.endpoint.ts`), consumed by
  `TenantRepository.listMyMemberships()` →
  `ListMyMembershipsUseCase` (`src/features/tenant/domain/use-cases/list-my-memberships.use-case.ts`).
Protected: yes   Role required: any authenticated caller (teacher/principal/student/parent)
Request (outbound): none (caller identity from Bearer token / httpOnly cookie — no query params)
Response payload (inbound, after envelope unwrap) — `MembershipSummaryDto[]`
  mapped to `TenantMembership[]`:
  - tenantId — BE tenant UUID | Internal (not PII, but tenant-scoping data)
  - roles — string[], raw BE role enum per this tenant | Internal
  - status — ACTIVE|INACTIVE|SUSPENDED|LEFT | Internal
  - **NOT present on the wire DTO used by this flow**: tenant display name,
    address, logo/color — see §5 gap finding.
Pagination: none (bounded list — a caller's own memberships)
Errors → UI behavior:
  - network/5xx/timeout → FR-008: fail closed — hide "Đổi trường" menu item,
    swallow + log, do not block header render | retryable: yes (silent retry
    on next header render/query refetch, no user-facing retry control needed
    for this entry-point-only usage)
  - 401 → handled by existing reactive/proactive refresh (decision 0018), not
    this story's concern
Empty / loading expectation: while loading, treat as "not yet decided" — do
  NOT render the menu item optimistically; only render once membership count
  is known and ≥2 (avoids a flash of the item for single-tenant callers).

INT-002  Switch Active Tenant
Service: iam    Method+Path: POST /iam/api/v1/members/switch-tenant
  (DR-018 quotes `POST /api/v1/members/switch-tenant` — same match as INT-001.)
Status: REAL — already implemented (`TENANT_EP.switchTenant`), consumed by
  `TenantRepository.switchTenant()` → `SwitchTenantUseCase` →
  `switchTenantAction` (`src/app/[locale]/(auth)/select-tenant/actions.ts`,
  reused as-is per this story's scope).
Protected: yes   Role required: caller must hold an ACTIVE membership in the
  target tenant (BE-enforced; 403 if not)
Request (outbound, camelCase):
  - tenantId — target tenant UUID, from the selected TenantCard | Internal
  - clientId — `OAUTH_CLIENT_ID` (static, `edu-staff-web`) | Internal
Response payload (inbound, after envelope unwrap) — `TokenResponseDto` →
  mapped to `AuthTokens`:
  - accessToken, refreshToken, sessionId — **Restricted**, tokens only; never
    passed to a Client Component. `switchTenantAction` calls
    `setAuthCookies(tokens)` (server-side, httpOnly) immediately — no token
    value ever reaches presentation.
Pagination: n/a (single-object response)
Errors → UI behavior:
  - 403 (caller no longer a member — race between list-fetch and select) →
    FR-004 error path: inline error on the clicked card, dialog stays open, no
    navigation, no cookie mutation | retryable: no (membership actually gone —
    re-fetch the membership list, don't blind-retry the same call)
  - network/5xx/timeout → error toast, card returns to idle, dialog stays
    open | retryable: yes
  - 401 mid-flow (token expired before switch) → existing reactive-refresh
    interceptor handles the retry-once; if that also fails, treat as network/5xx
    path above
Empty / loading expectation: per-card loading state (NFR-003: aria-busy +
  role=status/aria-live=polite, sr-only "Đang chuyển…"), shown within 100ms of
  activation (NFR-005).
```

## 3. Auth & Security

- Both endpoints require a valid Bearer access token (httpOnly cookie,
  server-side only — decision `0018`). No client-side token handling in this
  story; the dialog only ever calls the existing Server Action.
- No role gating beyond "authenticated caller with ≥2 ACTIVE memberships" —
  identical behavior across teacher/principal/student/parent (per requirements
  §Prioritized Requirements: no role-variant on visibility beyond membership
  count).
- PII: none of `tenantId`/`roles`/`status` is personal data. If the tenant
  display-field gap (§5) is closed with a `tenantName`/`address` field, treat
  `address` as low-sensitivity org data (not PII), consistent with `Internal`
  sensitivity already used in the requirements' `dataDependencies`.
- NFR-007 (hard security gate, already enforced by existing code): token
  minting stays server-side (`switchTenantAction` → `setAuthCookies`); this
  story adds no new HTTP call surface, only UI that invokes the existing
  action — verified: `switch-tenant/actions.ts` never returns tokens to the
  caller, only performs a `redirect()`.

## 4. Mock-first plan

Not applicable for the two endpoints themselves (both REAL). The ONLY
mock-first surface is the **display-field gap** (§5): until BE ships
`tenantName`/`address`/`logoColor` (or equivalent) on `MembershipSummaryDto`,
the dialog needs a client-side stand-in. Two options for `fe-state-engineer`/
`fe-nextjs-engineer` to pick between (not decided here):
  a) local placeholder derivation (initial letter of `tenantId`/a generic
     building icon, no name string) — zero mock data, but the card design
     (name+address text) genuinely cannot be built;
  b) a `bootstrap/lib/mock.ts`-keyed lookup table `tenantId → { name, address,
     logoColor }` gated by `NEXT_PUBLIC_USE_MOCK` (decision `0014`), swapped
     for the real field once BE ships it.
Given DR-018's design explicitly requires name/address per card, **(b) is the
pragmatic default** until the BE schema lands — flagged to `ba-lead` for
confirmation, not decided unilaterally here.

## 5. Gap Finding — tenant display fields (name/address/logo)

**Confirmed by reading code, not assumption:**

- The flow this story reuses (`src/features/tenant/**`) has
  `MembershipSummaryDto` (`src/features/tenant/infrastructure/dtos/membership-response.dto.ts`)
  with **only** `{ tenantId, roles, status }`, and `mapMembership()`
  (`src/features/tenant/infrastructure/mappers/tenant.mapper.ts`) maps
  exactly those three fields — nothing is silently dropped here; the DTO
  itself declares no more fields to drop.
- **However**, a second, parallel implementation of the SAME two endpoints
  exists at `src/features/auth/infrastructure/{dtos/iam-member-response.dto.ts,
  repositories/iam-member.repository.ts, mappers/iam-member.mapper.ts}`
  (wired via `src/bootstrap/di/iam-member.di.ts`, endpoint constants
  `IAM_MEMBER_EP` in `src/bootstrap/endpoint/iam-member.endpoint.ts` — same
  literal paths `/iam/api/v1/members/me/tenants` and
  `/iam/api/v1/members/switch-tenant`). Its `MembershipSummaryDto`
  (`iam-member-response.dto.ts`) **already declares `tenantName?: string` as
  an optional field** — but its mapper, `mapMembershipSummary()`
  (`iam-member.mapper.ts`), does NOT read `dto.tenantName` when building
  `TenantMembership` — it only maps `tenantId`/`roles`/`status`, silently
  dropping `tenantName` if the wire ever sends it.
- **Best-effort conclusion** (cannot fully confirm without edu-api access):
  the presence of an optional `tenantName` field on a DTO for the *same*
  endpoint elsewhere in this codebase strongly suggests `GET
  /members/me/tenants` **may already return `tenantName` on the wire** (or
  did in a prior BE iteration/US-E06.4 draft) and it is the `features/tenant/*`
  DTO (the one THIS story's flow actually uses) that is stale/narrower, not
  necessarily a hard absence on the BE side. `address` and `logo/color` show
  no trace anywhere in the codebase (no DTO, mapper, or entity references
  them) — those two are more plausibly genuinely absent from the wire.
- **Smallest viable fix recommendation**: widen
  `features/tenant/infrastructure/dtos/membership-response.dto.ts` to add
  `tenantName?: string` (mirroring `iam-member-response.dto.ts`), extend
  `mapMembership()` to pass it through, and extend the `TenantMembership`
  domain entity with an optional `tenantName?: string`. This is a **low-risk,
  additive, backward-compatible DTO/entity extension** (optional field, no
  breaking change) that can be attempted BEFORE assuming a full BE schema
  change is required — worth a quick contract-check against edu-api's `iam`
  `openapi.yaml`/`INTEGRATION.md` (`services/iam/docs/`) before committing to
  mock-first for `tenantName` specifically. `address`/`logo` remain mock-first
  regardless (no evidence they exist on the wire anywhere in this repo).
- Also flags a **duplication smell** unrelated to this story's scope but worth
  reporting to `ba-lead`/`fe-lead`: two independent repository
  implementations (`features/tenant/*` vs `features/auth/*/iam-member*`) both
  wire `listMyTenants`/`switchTenant` against the identical BE paths. This
  story must keep using `features/tenant/*` (per its explicit reuse list) —
  it should NOT be the trigger to consolidate the two, but the drift is a
  latent maintenance risk (a future BE contract change could get applied to
  one and not the other).

## 6. Open Questions

- `[OPEN QUESTION]` Does `GET /members/me/tenants` (edu-api `iam` service)
  currently return `tenantName` on the wire? The presence of `tenantName?`
  on `iam-member-response.dto.ts`'s `MembershipSummaryDto` (silently unused by
  its own mapper) is circumstantial evidence it might, but this could not be
  confirmed against edu-api's `services/iam/docs/openapi.yaml` from this repo.
  **Action**: `ba-lead`/whoever has edu-api access should check
  `services/iam/docs/openapi.yaml` + `INTEGRATION.md` for `MembershipSummary`
  schema fields before finalizing whether `tenantName` needs a BE change or
  just a web-side DTO widening.
- `[OPEN QUESTION]` Are `address` and `logoColor`/`logo` planned anywhere on
  the BE `iam` roadmap, or purely a design-spec invention (DR-018)? No trace
  in this repo's DTOs/mappers/entities for either field — treat as genuinely
  absent and mock-first (decision `0014`) unless edu-api access says
  otherwise.
- `[OPEN QUESTION]` Should the two parallel `listMyTenants`/`switchTenant`
  wirings (`features/tenant/*` vs `features/auth/*/iam-member*`) be
  consolidated? Out of scope for this story but flagged for `ba-lead` as a
  maintenance-risk follow-up.
