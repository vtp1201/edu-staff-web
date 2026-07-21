---
name: project-e20-parent-links
description: E20 Parent-Student Links epic — US-E20.1 (admin) + US-E20.2 (parent consent section) status
metadata:
  type: project
---

E20 epic COMPLETE: US-E20.1 (admin parent-links, merged 431df29) + US-E20.2
(parent consent section, merged 19e89cc) both implemented.

US-E20.2 specifics (parent-facing extension of the already-implemented
Profile screen, US-E08.5):
- New independent domain/infra module `src/features/parent-links/` (deliberately
  NOT reusing `src/features/admin/parent-links/`'s repository — story required
  independence; shared entity-shape convention only).
- Latent bug found+fixed in scope: `profile/page.tsx` had hardcoded
  `MOCK.role = "teacher"` for the WHOLE screen (not just this feature) — fixed
  by extracting `getSessionRole()` (mirrors `makeParentLinksAuthContext()`'s
  `decodeRoleClaim`+`getAccessToken` pattern) and using the real role for both
  the display field and the new parent-only gate. Treated as in-scope, not
  creep, since AC-007.2 ("server-driven, not client-hidden") is literally
  untestable against a hardcoded mock role.
- AC-007.2 (VM-omission role gate) proof pattern: a tiny pure function
  (`parentConsentVmGate(role)` in `consent-gate.ts`) returning `{parentConsent:true}`
  or `{}` (empty object, not `{parentConsent:false}`), unit-tested directly —
  this is the clean way to prove "field genuinely absent" without a full RSC
  route-render harness. Reusable pattern for future role-gated VM fields.
- fe-component-architect's promotion ruling: don't force-generalize a 2nd
  occurrence into `components/shared/` when the shapes actually differ
  (`ConsentSkeleton`'s card-shimmer vs `PLSkeleton`'s table-row-shimmer) —
  defer promotion to the 3rd occurrence. Cut a planned `ConsentEmpty` wrapper
  entirely in favor of using `components/shared/empty-state` inline (only one
  empty variant needed).
- fe-state-engineer's deliberate deviation from `LinkedAccountsSection`'s
  `onSettled: invalidateQueries` precedent: this feature uses ONLY targeted
  `setQueryData` patch/rollback per (studentId,category), never
  `invalidateQueries` on toggle settle — a whole-list refetch would race a
  different in-flight optimistic toggle on the same cached array. Worth
  reapplying whenever a list has >1 independently-mutable row.
- [[feedback-agent-relay-resilience]] — this run's engineer agent died mid-task
  (API connection drop) with useful partial work already committed-worthy on
  disk; recovering by committing in logical layer chunks (domain+infra+DI →
  presentation+wiring → docs) rather than one giant commit kept the branch
  bisectable and made resuming trivial.
