---
name: tenant-membership-contract-gap
description: MembershipSummaryDto (iam, /members/me/tenants + switch-tenant) has two divergent web-side DTOs — one with optional tenantName, one without; display-field gap for E23 tenant-switch cards
metadata:
  type: project
---

Two parallel repository implementations exist in edu-staff-web for the SAME
`iam` endpoints (`GET /iam/api/v1/members/me/tenants`,
`POST /iam/api/v1/members/switch-tenant`):

1. `src/features/tenant/**` (`TenantRepository`, used by `(auth)/select-tenant`
   flow, US-001-tenant-path-resolver / US-E05.1) — `MembershipSummaryDto` =
   `{ tenantId, roles, status }` only. `mapMembership()` maps exactly these.
2. `src/features/auth/infrastructure/{dtos/iam-member-response.dto.ts,
   repositories/iam-member.repository.ts, mappers/iam-member.mapper.ts}`
   (US-E06.4, wired via `bootstrap/di/iam-member.di.ts`,
   `IAM_MEMBER_EP.myTenants`/`switchTenant` — same literal paths) —
   its `MembershipSummaryDto` already declares `tenantName?: string`, but its
   own mapper (`mapMembershipSummary`) does NOT read `dto.tenantName`,
   silently dropping it.

**Why this matters:** for E23 (multi-tenant switch header menu + post-login
select screen), DR-018's card design needs tenant name/address/logo, but
neither entity/DTO carries them today. The (2) DTO's unused `tenantName?`
field is circumstantial evidence the wire MAY already return `tenantName` —
i.e. this could be a cheap additive DTO/entity widening (optional field, no
BE change) rather than a genuine BE contract gap. `address`/`logoColor` have
no trace anywhere in the repo (neither DTO) — those are more plausibly
genuinely absent from the wire; treat as mock-first (decision 0014) pending
edu-api openapi.yaml confirmation.

**How to apply:** before flagging a BE contract gap as needing a BE change,
grep BOTH `features/tenant/**` and `features/auth/**/iam-member*` DTOs/mappers
for the same endpoint — a second, more permissive DTO elsewhere in the repo
may already hint at fields the narrower one just isn't capturing. Also flag
the duplication itself (two independent repo implementations of the same BE
path) as a maintenance-risk follow-up to `ba-lead`/`fe-lead` — do not resolve
it unilaterally inside a feature story. See
`docs/stories/epics/E23-multi-tenant-switch/US-E23.1-tenant-switch-menu/integration.md`
§5 and the `US-E23.2` sibling for the full write-up.
