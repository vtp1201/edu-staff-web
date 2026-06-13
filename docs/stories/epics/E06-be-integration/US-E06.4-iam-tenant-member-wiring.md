# US-E06.4 IAM — Wire Tenant, Member & Invitation Endpoints to Real BE

## Status

planned

## Lane

high-risk

## Dependencies

- Depends on: US-E06.3 (base URL + endpoint paths must be correct first)
- Blocks: none directly; enables multi-tenancy flows (E05)
- Feature module(s) chạm: `src/features/auth/`, `src/features/user/`
- Shared contract/file: `bootstrap/endpoint/tenant.endpoint.ts`,
  `bootstrap/di/auth.di.ts`, `bootstrap/di/tenant.di.ts` (new),
  IAM `MemberResponse`, `MembershipSummary`, `InvitationResponse` DTOs

## Product Contract

Replace mock-first implementations for IAM tenant, member, and invitation endpoints
with real HTTP calls through the Kong gateway. This enables:

- **Tenant provisioning** (SUPER_ADMIN): create, activate, deactivate a tenant school.
- **Member management** (tenant ADMIN): invite a member by email, revoke an
  invitation, add a member directly, change roles, remove a member.
- **Invitation accept** (any authenticated user): accept an invitation link via token.
- **My tenants / switch-tenant**: `GET /iam/api/v1/members/me/tenants` (list all
  tenant memberships); `POST /iam/api/v1/members/switch-tenant` (re-mint a
  tenant-scoped token).

Auth is enforced at Kong edge (`edu-edge-auth`). The web app sends
`Authorization: Bearer <accessToken>` for protected calls.

## Relevant Product Docs

- `edu-api/services/iam/docs/INTEGRATION.md` — Endpoints table, auth flow, error codes
- `edu-api/services/iam/docs/openapi.yaml` — authoritative contract
- `edu-api/services/iam/docs/ERROR_CODES.md` — error code catalogue
- `docs/product/roles-permissions.md` — RBAC model (role scoped to tenant)
- `docs/product/auth.md` — token hybrid strategy (decision 0018/0019)
- `docs/decisions/0030-kong-gateway-base-url.md` — base URL (Kong)

## Kong Routes (via ADR 0030)

| External path (Kong) | Upstream (iam receives) | Auth |
|---|---|---|
| `POST /iam/api/v1/tenants` | `POST /api/v1/tenants` | SUPER_ADMIN Bearer |
| `GET /iam/api/v1/tenants/{id}` | `GET /api/v1/tenants/{id}` | SUPER_ADMIN Bearer |
| `POST /iam/api/v1/tenants/{id}/activate` | same | SUPER_ADMIN Bearer |
| `POST /iam/api/v1/tenants/{id}/deactivate` | same | SUPER_ADMIN Bearer |
| `POST /iam/api/v1/tenants/{id}/invitations` | same | tenant ADMIN Bearer |
| `DELETE /iam/api/v1/tenants/{id}/invitations/{invId}` | same | tenant ADMIN Bearer |
| `POST /iam/api/v1/invitations/accept` | same | Bearer |
| `POST /iam/api/v1/tenants/{id}/members` | same | tenant ADMIN Bearer |
| `PATCH /iam/api/v1/tenants/{id}/members/{userId}` | same | tenant ADMIN Bearer |
| `DELETE /iam/api/v1/tenants/{id}/members/{userId}` | same | tenant ADMIN Bearer |
| `GET /iam/api/v1/members/me/tenants` | same | Bearer |
| `POST /iam/api/v1/members/switch-tenant` | same | Bearer |

## Acceptance Criteria

### TR-012 — DTO definitions
- `MembershipSummaryDto`, `MemberResponseDto`, `InvitationResponseDto`,
  `TokenResponseDto` (reuse from auth) in `features/auth/infrastructure/dtos/`.
- All fields camelCase per IAM wire contract.

### TR-013 — Repository + mapper
- `IamMemberRepository` implements `i-iam-member.repository.ts`; `import 'server-only'`.
- Methods: `listMyTenants()`, `switchTenant(tenantId, clientId)`,
  `inviteMember(tenantId, req)`, `removeMember(tenantId, userId)`,
  `changeRoles(tenantId, userId, roles)`, `acceptInvitation(token)`.
- `IamMemberMapper` maps DTOs → domain entities.
- Error mapping: branch on `error.code`, not `message`. Key codes:
  `FORBIDDEN_ACTION`, `RESOURCE_NOT_FOUND`, `USER_EMAIL_ALREADY_EXISTS`,
  `INVITATION_NOT_FOUND`, `LAST_ADMIN_INVARIANT_VIOLATION`.

### TR-014 — DI factory
- `bootstrap/di/iam-member.di.ts`: `import 'server-only'`;
  `makeIamMemberUseCase()` wires `IamMemberRepository` with `createServerHttpClient()`.
- `USE_MOCK ? MockIamMemberRepository : IamMemberRepository` (decision 0014).

### TR-015 — switch-tenant token rotation
- `switchTenant` returns a new `TokenResponse`; web must update `auth_token` and
  `auth_token_exp` cookies (server-side, httpOnly) and update `tenantId` context.
- Token is tenant-scoped (`memberRoles`, `memberPermissions` claims present).

### TR-016 — Error states in UI (AC for each consuming screen)
- Invite member form: `USER_EMAIL_ALREADY_EXISTS` → field error "Email đã tồn tại".
- Accept invitation: `INVITATION_NOT_FOUND` / `INVITATION_EXPIRED` → error banner.
- Remove member: `LAST_ADMIN_INVARIANT_VIOLATION` → warning dialog "Không thể xóa
  admin cuối cùng".

### TR-017 — TDD
- Unit tests for each use-case (mock repository).
- Integration test: `IamMemberRepository` error-code mapping (mock HTTP, assert
  failure union).
- `bun vitest run` green; `tsc --noEmit` clean; `bun build` green.

### TR-018 — Role guard
- Tenant provisioning endpoints (`POST /tenants`) only accessible to SUPER_ADMIN —
  UI must hide/disable these actions for tenant ADMIN and below.
- Member management only for tenant ADMIN — guard enforced at Server Action level.

## Risk Flags

- Auth (token rotation on switch-tenant)
- Authorization (SUPER_ADMIN vs tenant ADMIN scoping)
- External systems (IAM BE service)
- Public contracts (MemberResponse/InvitationResponse shape)

## Design Notes

- Commands: inviteMember, addMember, changeRoles, removeMember, acceptInvitation,
  switchTenant, activateTenant, deactivateTenant
- Queries: listMyTenants
- API: IAM `/iam/api/v1/members/*`, `/iam/api/v1/tenants/*`, `/iam/api/v1/invitations/*`
- Domain rules: last-admin invariant (409 from BE); email uniqueness; invitation TTL/single-use
- UI surfaces: member management screens (E05 multi-tenancy epic); profile tenant list

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | use-case tests (mock repo); error union exhaustiveness |
| Integration | repository HTTP error-code mapping; envelope unwrap; token cookie update |
| E2E | — |
| Platform | `tsc --noEmit` clean; `bun build` green |
| Release | Kong smoke: `GET /iam/api/v1/members/me/tenants` returns 200 with valid token |

## Harness Delta

TEST_MATRIX row to be added as `planned`.

## Evidence

Add after implementation.
