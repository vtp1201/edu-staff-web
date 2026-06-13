---
name: project-be-api-readiness
description: Which edu-api services are READY to integrate and which are mock-first — as of 2026-06-13 audit
metadata:
  type: project
---

Updated 2026-06-14 (corrected). Earlier claim "design 1406 = 1206, no new screens" was WRONG — correct comparison is 29/04 (design-spec.jsonc source) vs 1406, which has significant changes. See ADR 0034 and project-design-1406-rebaseline memory.

As of 2026-06-14 audit:

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

**Core service gaps (planned, not yet in openapi.yaml)**:
- `/api/v1/classes/:classId/attendance` — US-046 (planned)
- `/api/v1/class-log` (homeroom book) — US-044 (planned)
- Grade entry endpoints — US-060 (branch `feat/us-060-grade-entry` exists but NOT merged to core main; openapi not updated as of 2026-06-14)
- Grade scale / assessment scheme — US-059 (LIVE in openapi.yaml as of 2026-06-14)
- `linkedAccounts[]` field on `/users/me` response — NOT present in IAM `UserProfileResponse`. No link/unlink endpoints exist in IAM. US-E08.5 is fully mock-first.
- `/teaching-assignments` path — does NOT exist in core openapi. The correct endpoints for GVCN/GVBM assignment are: `GET/PUT /classes/{classId}/homeroom-teacher` and `PUT /classes/{classId}/subjects/{subjectId}/teacher`.
- `gradePublishMode` — REAL field in `GET/PUT /config/school/operational-settings` (`OperationalSettingsResponse`). Enum: `[SELF_PUBLISH, ADMIN_APPROVAL]`. Used by US-E13.4 (label only) and US-E14.2 (Publish flow branching).
- VNeID provider — `SocialRequest.provider` enum = `[google, facebook]` only; VNeID is NOT supported in IAM. US-E08.5 VNeID row and US-E01.2 VNeID flow are fully mock/client-only until IAM adds the provider.

**Why:** `NEXT_PUBLIC_API_URL` was wrongly defaulting to `localhost:8080/api/v1` (direct IAM, no Kong). ADR 0030 corrects to `localhost:8000`. Endpoint path constants also missing `/api/v1` segment on core files.

**How to apply:** IAM fully wired (E06.4). Core admin CRUD fully wired (E06.5–E06.8). New features needing attendance/class-log/grade-entry → mock-first (decision 0014) until BE builds US-046/US-044/US-060. Assessment scheme config (US-059) is REAL.
