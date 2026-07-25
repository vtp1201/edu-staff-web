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

## "admin" in design-spec.jsonc roles is NOT a 5th UserRole
Recurring pattern (confirmed US-E20.1, DR-014; also seen DR-015 invitations,
academic-records, audit-log): `design-spec.jsonc` entries list
`"roles": ["principal", "admin"]` for screens under `(app)/admin/**`. There is
no `admin` UserRole in `roles-permissions.md` (only teacher/principal/student/
parent). Treat "admin" here as a UI/route-group label — the actual actor is
`principal`. State this as an `[ASSUMPTION]` in TR-XXX rather than inventing a
5th role or asking a clarifying question (established, low-risk to assume).

## Multi-tenant switch data-gap pattern (US-E23.1/E23.2, DR-018, 2026-07-12)
`src/features/tenant/domain/entities/tenant-membership.entity.ts` (`TenantMembership`)
and `MembershipSummaryDto` carry ONLY `tenantId, roles[], status` — NO display
name/address/logo. The existing shipped `(auth)/select-tenant` screen (US-E01.2)
literally renders raw `tenantId` (a UUID) as the "name". Any new tenant-switch
design (card grid w/ logo+name+address) needs this data-dependency gap flagged
to `ba-integration-analyst` — do not assume the fields exist just because a
design-spec entry references them.

## Screen-consolidation pattern: check for a prior story at the SAME route/trigger before treating as net-new
Before writing FRs for a "new" screen, grep whether a route/trigger already exists
(e.g. `(auth)/select-tenant` already implemented for US-E01.2 when DR-018/US-E23.2
targeted the same route+trigger for a richer redesign). If found: recommend
"enhance in place" instead of a second parallel screen, DO NOT unilaterally merge/
close the Harness stories — write the recommendation into requirements.md §0 and
report to ba-lead for confirmation.

## BE conduct-domain ADMIN/MANAGER actor names ≠ this app's `admin` route-guard role (ADR 0062, 2026-07-25)
`edu-api` core's `conduct` sub-domain (staff-violations, staff-conduct-notes)
authorizes by BE role names `ADMIN` (authoring capacity) and `MANAGER`
(approving capacity). Both collapse onto this app's **`principal`** role, NOT
the app's separate narrow `admin` route-guard role (school-setup/roster/
calendar/parent-links/invitations, decision `0022`, strict guard in
`(app)/admin/layout.tsx`). A DR (DR-022) initially placed these screens under
`/admin/*` by naming coincidence; ADR 0062 corrected routes to
`(app)/principal/staff-discipline` + `(app)/teacher/staff-discipline` after
the mockup's own role checks (`role === 'principal'`) contradicted the DR's
route table. **When a BE contract/DR names `ADMIN`/`MANAGER` actors for a
BGH-tier capacity, verify against the actual reference mockup's role checks
and `roles-permissions.md` before assuming it maps to this app's `admin`
role** — default assumption should be `principal` unless the feature is
genuinely admin-core config. Same "single-admin-tenant fallback" pattern
(`selfApproved` bool, shown not hidden, ADR 0073) recurs wherever one
`principal` actor both authors and approves — treat as an established
convention, not a new decision, for future conduct/approval-workflow stories.

## Sensitive design-system gate
Whenever a story adds:
- A new system RBAC rule (route access, new UserRole variant) → flag to ba-lead for ADR
- Auth surface change (token, cookie, session) → flag to ba-lead for ADR
- A new in-feature flag (like selfIsGroupAdmin) → document as [ASSUMPTION], note it is NOT a system RBAC change
