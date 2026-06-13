---
name: project-be-api-readiness
description: Which edu-api services are READY to integrate and which are mock-first — as of 2026-06-13 audit
metadata:
  type: project
---

As of 2026-06-13 audit:

**IAM service (port 8080) — FULLY IMPLEMENTED AND READY:**
- auth: register, signin, social, refresh, signout, forgot/reset password, email verification
- users: GET/PATCH /users/me, email verification OTP
- tenants: create, get, activate, deactivate (SUPER_ADMIN)
- members: add, change-roles, remove, listMyTenants, switch-tenant
- invitations: invite, delete, accept
All handlers have Go source + tests in `edu-api/services/iam/internal/`.

**core service (port 8081) — FULLY IMPLEMENTED AND READY:**
- school: create, get current (`/api/v1/schools/*`)
- config: GET/PUT school config + setup-status (`/api/v1/config/school/*`)
- calendar: academic years + terms CRUD (`/api/v1/academic-years/*`)
- curriculum: subject-parents, subjects, class-subjects (`/api/v1/subject-parents/*`, `/subjects/*`, `/class-subjects/*`)
- class: CRUD + homeroom teacher + student roster (`/api/v1/classes/*`)
- staffing: departments, position-titles, position-assignments (`/api/v1/departments/*` etc.) — US-058
All handlers have Go source in `edu-api/services/core/internal/{school,calendar,curriculum,class,staffing}/`.

**notification service — WORKER ONLY, no HTTP:**
- Consumes AMQP events (invitation emails, password recovery).
- NOT routed through Kong. NOT accessible via HTTP. Remains mock-first on web side.

**lms, social services — NOT BUILT:**
- No source in `edu-api/services/`. Mock-first per decision 0014.

**Kong gateway (port 8000) — ACTIVE:**
- Routes: `/iam/*` → iam:8080, `/core/*` → core:8081.
- All protected paths behind `edu-edge-auth` plugin (ES256 JWT + denylist).
- Public paths: `/iam/api/v1/auth/signin|register|refresh|social|password/*`, health, JWKS.

**Why:** `NEXT_PUBLIC_API_URL` was wrongly defaulting to `localhost:8080/api/v1` (direct IAM, no Kong). ADR 0030 corrects to `localhost:8000`. Endpoint path constants also missing `/api/v1` segment on core files.

**How to apply:** All new BE integration stories (US-E06.3 through US-E06.8) depend on US-E06.3 (base URL fix) first. IAM is fully ready for wiring; core is fully ready for wiring. Only notification/lms/social remain mock-first.
