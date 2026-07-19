---
name: pattern-high-risk-authctx-reauth
description: High-risk mutation server-side re-auth (role + tenant) beyond requireRole — the authCtx seam + forged-role test proof (US-E20.1 Unlink)
metadata:
  type: project
---

US-E20.1 admin parent-student-link Unlink/Create are HIGH-RISK (revoke another
user's data-visibility grant). `requireRole` is ROLE-ONLY (tenant enforced at
layout, not Server Actions) → insufficient for a tenant-match AC.

**Why:** the AC (AC-005.5) demands the API boundary independently re-check role
AND tenant, testable pre-`core` by forging a non-admin/cross-tenant caller — not
just hiding the UI button.

**How to apply (the seam):**
- Repository interface takes an explicit `authCtx: { role: UserRole; tenantId }`
  param on the mutating methods (`createLink`/`unlinkLink`) — never implicit in
  the http client, so it's directly unit-testable.
- DI factory (`bootstrap/di/parent-student-link.di.ts`) assembles authCtx from
  the httpOnly token: `decodeRoleClaim(token)` + `decodeTenantId(token)` (note:
  the fn is `decodeTenantId`, jwt.ts:84 — plan mis-named it `decodeTenantClaim`).
  Mock mode → role "admin" + fall back to the seed tenant.
- Mock repo is the enforcement boundary pre-`core`: `unlinkLink` checks role !==
  "admin" → forbidden (no lookup), then `link.tenantId !== authCtx.tenantId` →
  forbidden (forbidden BEFORE not-found so existence never leaks), then delete.
- Server Action: `requireRole(["admin"])` FIRST (short-circuit forbidden, ZERO
  DI/repo calls) THEN authCtx re-check in repo — two independent layers.

**Three required proofs (all written, green):**
1. mock-repo test: `unlinkLink(existingId, {role:"teacher", tenantId:seed})` →
   forbidden AND `unlinkLink(existingId, {role:"admin", tenantId:"other-tenant"})`
   → forbidden (both assert the row stays).
2. `actions.test.ts`: mock `requireRole`→not-ok, assert `{ok:false,errorKey:"forbidden"}`
   + the use-case factory + authCtx assembly + execute are NEVER called.
3. mapper `toFailure` code-vs-message divergence: a 403 whose message says "not
   found" still maps to `forbidden` (branch on code only).

Non-optimistic Unlink mutation: NO `onMutate`/`setQueryData`; row stays until
2xx; 404→invalidate+toast+close; 403/network→touch nothing, errorSlot. Mirrors
moderation `removeMutation`. Storybook `UnlinkNonOptimisticPending` uses a
never-resolving action and asserts the row is still present while pending.

Related: [[pattern-destructive-confirm-and-moderation]], [[pattern-route-role-guard]],
[[pattern-be-wiring-remap]].
