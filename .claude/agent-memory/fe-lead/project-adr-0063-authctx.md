---
name: project-adr-0063-authctx
description: ADR 0063 documents the authCtx explicit-role-param security pattern used 3x (E20.1/E09.5/E09.6); repository-boundary auth, not route-gate-only
metadata:
  type: project
---

Registered decision `0063-server-derived-auth-context-explicit-param.md`
(2026-07-25, docs-only, commit `9ba1b17`) after `fe-tech-lead-reviewer` flagged
the `authCtx` pattern as "ADR-worthy" on 3 consecutive stories (US-E20.1
parent-links, US-E09.5 staff-discipline, US-E09.6 student-absences) with no
decision record.

**Why:** route gates (`requireRole()`, `(app)/admin/layout.tsx`) are role-only
and client-navigable; they can't express per-record scope (own tenant, own
homeroom class) and — for `(app)/principal/**`/`(app)/teacher/**` — there is no
RSC layout-level guard at all (only `(app)/admin/**` has `evaluateAdminAccess`).
The repository-level `authCtx` re-check is therefore often the ONLY per-record
server-side authorization, not defense-in-depth on top of an equally strong
layer.

**How to apply:** any NEW role-gated mutation (or scope-sensitive read) should
cite ADR 0063 and copy its shape — a small `<feature>-auth-context.entity.ts`
`{role, <scope key>}` assembled ONLY in `bootstrap/di/<feature>.di.ts` from
token claims, threaded into the repository (constructor-injected is the
*preferred* stronger variant per the ADR, not the per-call-param shape used by
the first two instances), with a dedicated `*.security.test.ts` that forges
the role/scope and calls the repository directly (not through the UI). Do not
re-flag this as "needs an ADR" — point authors at `0063` instead. Known open
gap (not closed by this ADR): no RSC layout guard for principal/teacher route
groups — a candidate follow-up US if either group is touched again.

See also [project-e20-parent-links](project-e20-parent-links.md),
[project-e09-discipline](project-e09-discipline.md).
