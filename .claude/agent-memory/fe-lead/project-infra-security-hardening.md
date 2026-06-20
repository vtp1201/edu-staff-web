---
name: project-infra-security-hardening
description: US-INFRA.2 security hardening: auth-guard module, SSE tenant validation, Server Action test pattern, build guard
metadata:
  type: project
---

US-INFRA.2 implemented and merged to main (2026-06-20, commit 68c407d + 969f1c8).

**Why:** Pre-production defense-in-depth from /improve audit (commit 20690db). Four plans 003→001→002→004.

**What was done:**
- `.env.example` created (4 placeholder vars); `next.config.ts` build-guard throws when `NODE_ENV=production && NEXT_PUBLIC_USE_MOCK=true`
- `src/bootstrap/auth-guard/` module: pure `evaluateAccess()` (access-context.ts) + server-only `requireRole()` (require-role.server.ts) + index.ts
- `(app)/layout.tsx` now derives real role + tenantId from httpOnly token; redirects to select-tenant when not allowed; mock-safe (passes urlTenantId as tokenTenantId when USE_MOCK=true)
- `approveGradeBatchAction`, `requestGradeRevisionAction`, `bulkLockBatchesAction` gated by `requireRole(["admin"])`
- SSE `route.ts` validates `?tenant=` against token claim via extracted `resolveStreamTenant()` pure helper; returns 403 on mismatch, mock-bypassed
- Login/social/logout Server Action tests added

**Proof:** 804 tests pass (159 files); tsc clean; lint clean; bun build passes.

**Key learnings:**
- Build guard (plan 005 refinement): trigger is now deploy/CI signal (`CI=true`, `VERCEL=1`, or `DEPLOY_ENV=production`), not `NODE_ENV`. Local pre-push no longer trips the guard — no workaround needed. In real CI, `.env.local` is absent so the guard evaluates against the explicit env.
- Academic-seal Server Action does NOT exist in the app layer (only use-case exists in features/academic-records). Plan 004 flagged this correctly.
- `requireRole` for Server Actions is role-only (no URL tenant param available); uses synthetic sentinel tenant so `evaluateAccess` can be reused.

**How to apply:** When adding new state-changing admin/principal actions: import `requireRole` from `@/bootstrap/auth-guard` and call it first. Pattern: `const guard = await requireRole(["admin"]); if (!guard.ok) return { ok: false, errorKey: "forbidden" };`
