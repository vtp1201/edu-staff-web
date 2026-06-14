# 0036 Preserve BE Role Enum on UserTenantRole Entity

Date: 2026-06-14

## Status

Accepted

## Context

US-E01.2 implements a multi-role select screen where each role card shows:
- The human-readable role label (mapped from BE enum, e.g. TEACHER → "Giáo viên")
- The raw BE enum value as a badge (AC-9: e.g. "TEACHER", "ADMIN", "MANAGER")
- Per-tenant routing (each role-tenant combo is a separate card)

The existing `auth.mapper.ts` from US-E01.1 casts `roles[].role` (the string BE enum value,
e.g. "TEACHER") directly to `UserRole` (the app role string, e.g. "teacher"), discarding
the original enum. This caused two bugs in US-E01.2:

1. **AC-9 enum badge broken**: `MANAGER` was re-computed as `ADMIN` (both map to `principal`);
   `STAFF` was re-computed as `TEACHER` (both map to `teacher`). The badge showed the wrong enum.
2. **Multi-tenant cards collapsed**: cards were built by iterating ROLE_ENUM_TO_APP map
   (one appRole per key), not the user's actual roles array — so two teacher roles at two
   schools showed as one card (the second school was lost).

## Decision

Add `roleEnum: string` field to `UserTenantRole` entity (alongside the existing `role: UserRole`
appRole field). The mapper preserves the raw BE enum string (e.g. "TEACHER", "ADMIN", "MANAGER",
"STAFF", "STUDENT", "PARENT") in `roleEnum`, and continues mapping to the appRole `role` field
for routing purposes.

The `pending_roles` bridge cookie stores `roleEnum` (not `role`) as the key for the
`selectRoleAction` to validate against — because the user's click identifies a specific BE enum +
tenantId combination, not just an appRole.

`RoleSelectUseCase.execute(roleEnum: string, tenantId: string, roles: UserTenantRole[])` matches
on `r.roleEnum === roleEnum && r.tenantId === tenantId`.

Cards on the select-role screen are built by iterating `user.roles` directly (one card per
role-tenant entry in the array), not by iterating an enum map.

## Alternatives Considered

1. **Keep enum only in presentation layer** — derive it from the raw DTO in page.tsx only.
   Rejected: leaks infra knowledge into the RSC page; RSC page cannot import infrastructure.

2. **Separate DTO type for select-role** — pass `UserProfileResponseDto` all the way to the
   presentation. Rejected: violates Clean Architecture (infra DTO in app layer).

3. **Use a separate `roleEnumMap` cookie** — store raw enums separately from appRoles.
   Rejected: unnecessary complexity; a single clean entity field is simpler.

## Consequences

Positive:
- AC-9 enum badges are now correct (MANAGER shows "MANAGER", STAFF shows "STAFF").
- Multi-tenant cards are correct (one card per role-tenant entry).
- `RoleSelectUseCase` is simpler and testable with precise matching.
- No information loss from the BE response.

Tradeoffs:
- `UserTenantRole` entity now has both `role` (appRole) and `roleEnum` (BE string). This is
  intentional: `role` drives routing/RBAC checks; `roleEnum` drives display and selection
  identity. Both are needed.
- All callers of `UserTenantRole` must be checked to ensure `roleEnum` is populated (mapper
  updated, mock data updated).
