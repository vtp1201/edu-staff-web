---
name: actor-role-patterns
description: Confirmed actor/role definitions and in-feature role flag patterns for edu-staff-web requirements documents
metadata:
  type: user
---

# Actor / Role Patterns

## System roles (from docs/product/roles-permissions.md)
Four roles, always expressed as: `teacher | principal | student | parent`
- Role is tenant-scoped: `UserTenantRole = { role, tenantId, tenantName }`
- Roles are NOT system-global; permissions are per-tenant

## In-feature role flags (NOT system RBAC)
Some features have in-feature privilege flags that are stored on domain entities, not in the auth system.
These do NOT require an ADR for RBAC — they are data fields, not auth surface changes.

Example: `selfIsGroupAdmin: boolean` on GroupEntity (messaging feature, US-E10.4)
- In-feature group admin is the creator of a group, or designated members
- It is enforced at the domain use-case layer AND the presentation layer
- It is NOT a new system role and does NOT change the `UserRole` union

## Capability table pattern for TR-XXX actors
Always list per-role: what each actor CAN do (positive capabilities only).
Capabilities that are role-gated in the UI must also be enforced at the domain use-case layer (defense-in-depth).

## Sensitive design-system gate
Whenever a story adds:
- A new system RBAC rule (route access, new UserRole variant) → flag to ba-lead for ADR
- Auth surface change (token, cookie, session) → flag to ba-lead for ADR
- A new in-feature flag (like selfIsGroupAdmin) → document as [ASSUMPTION], note it is NOT a system RBAC change
