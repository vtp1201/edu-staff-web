---
name: project-rsc-layout-guards
description: INFRA-rsc-layout-guards-role-groups closed ADR 0063's known gap — every role namespace now has an RSC layout guard, not just admin
metadata:
  type: project
---

Story `INFRA-rsc-layout-guards-role-groups` (2026-07-25, merged `6f0941a` on
`main`, branch `fix/rsc-layout-guards-role-groups`, high-risk lane) closed the
gap ADR `0063` documented: previously only `(app)/admin/**` had an RSC
layout-level role guard (`admin/layout.tsx` → `evaluateAdminAccess`);
`principal`/`teacher`/`student`/`parent` relied solely on per-action
`requireRole()` + the repository-level `authCtx` check, with no route-level
backstop.

**Inventory (ground-truthed, useful precedent for future route-group audits):**
grepping every `(app)/*` directory found exactly 5 role-scoped groups —
`admin`, `principal`, `teacher`, `student`, `parent` — plus one intentionally
multi-role group, `(shared)` (`profile`/`feed`/`messages`/`notifications`).
Only `admin` was guarded; `student`/`parent` had the identical unguarded gap
that the ADR only named for `principal`/`teacher` (i.e. an ADR's "known gap"
prose can itself be an incomplete inventory — always re-grep rather than
trusting the doc's named scope literally).

**Fix shape (generalize, don't duplicate — precedent for the NEXT "only one
instance has X" gap):** `evaluateAdminAccess` hardcoded `role === "admin"`.
Extracted a generic `evaluateNamespaceAccess(role, locale, tenantId,
requiredRole)` in the SAME file (`src/bootstrap/tenant/role-guard.ts`),
kept `evaluateAdminAccess` as a thin wrapper calling it with `"admin"` — zero
existing call-site (`admin/layout.tsx`, `admin/parent-links/page.tsx`) or test
changed shape. Then added 4 new `layout.tsx` files, each a structural mirror
of `admin/layout.tsx` with only the required role swapped. This is the
"extend the existing helper with a param, don't copy-paste per group" playbook
the task brief called for — worked cleanly, no reviewer round needed (self-run
review since no `fe-tech-lead-reviewer` was spawned for this pure route-layer,
zero-UI infra fix; tsc/vitest/storybook/build gates carried the proof).

**Testability:** mirrored ADR 0063's "sweep every forbidden role" testability
contract but at the ROUTE-layout boundary (not the repository boundary that
ADR governs) — `describe.each` over all 5 roles as `requiredRole` × every
forged role × unauthenticated, asserting deny-by-default and that a forged
caller always redirects to ITS OWN default route (never dead-ends inside the
namespace it tried to force). No dedicated `*.security.test.ts` filename was
used (that convention is specifically for the repository-boundary `authCtx`
pattern) — extended the existing `role-guard.test.ts` instead, which already
housed the analogous `evaluateAdminAccess` tests.

**Zero-UI infra fix ⇒ no design-review gate:** route-layer server logic only,
no presentation/component change, so this story skipped `fe-tech-lead-reviewer`
/ `fe-accessibility-auditor` / the `/impeccable` design-review gate entirely —
correct call per `.claude/rules/impeccable.md` ("mọi story chạm UI"; this one
doesn't). Full test suite + storybook suite + `bun build` were the proof.

See also [project-adr-0063-authctx](project-adr-0063-authctx.md).
