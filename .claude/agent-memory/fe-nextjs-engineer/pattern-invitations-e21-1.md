---
name: pattern-invitations-e21-1
description: E21.1 admin invitations — 2-collaborator hybrid DI (mutations real, list/resend force-mock), client fan-out send, extending a shared IAM repo interface, segmented-radio role pills, fieldset for role=group
metadata:
  type: project
---

US-E21.1 admin/invitations. **Why:** send/revoke are real IAM routes; list/resend
have NO real BE route ever (ground-truthed vs edu-api Go), so they're permanently
mock (cross-repo asks #29/#30). **How to apply** to similar hybrid/blocked wiring:

- **Extending a shared repo interface (`IIamMemberRepository`) breaks every
  implementer.** When adding `listInvitations`/`resendInvitation` (mock-only), the
  REAL `IamMemberRepository` must still satisfy the interface → add **throwing
  "no real route" stubs** (never reached; DI routes those methods to the mock).
  This keeps real-mode `bun run build` green. Same as staff-leave's blocked-stub.
- **2-collaborator adapter repo** = explicit force-mock scoping at the type level:
  `new InvitationRepository(mutationsIam, listIam, tenantId)` where DI passes
  `mutationsIam = USE_MOCK ? mock : real` but `listIam = mock` ALWAYS. Cleaner
  than a runtime branch inside the class (class-management.di.ts hybrid-delegate).
- **Client fan-out send:** real `inviteMember` returns `void`, so
  `Promise.allSettled(emails.map(inviteMember))` → reconcile succeeded/failed;
  synthesize `invitationId` for succeeded (the post-send list refetch has the real
  ids). UI-only `expiryDays` is NOT sent (no wire field). Dedupe in the use-case.
- **tenantId server-derived in DI** via `decodeTenantId(await getAccessToken())`
  (NFR-006), fallback "tenant-acme" in mock mode (mock token has no tenantId).
- **Send dialog owns its form + post-submit reconciliation**: `onSubmit` returns
  the `SendBatchActionResult`; the container does toasts+invalidate, the dialog
  filters succeeded chips out + marks failed ones (keeps form state local).

Shared-component reuse/extension (all pre-approved, no ADR — tokens/variants existed):
- `StatusBadge`: added `"error-dark"` tone (`bg-edu-error-dark-light text-edu-error-dark`).
- `TagChipsInput`: added optional `validate?: (tag)=>boolean` → validated multi-value
  mode (per-chip valid/invalid tint + AlertTriangle, split on `[,;\s]+`, Space commits);
  default undefined = unchanged for lesson-plan/question-bank.
- **Role pills = reuse the `segmented` RadioGroup variant** (US-E03.1), NOT a
  hand-rolled `<label>`+`RadioGroupItem sr-only` (that trips Biome
  `noLabelWithoutControl` and the JSX `{/* biome-ignore */}` won't attach). Override
  per-role checked tint via `data-[state=checked]:bg-*` className + `flex-wrap` root.
- **Biome `role="group"` on a div is rejected** (useSemanticElements) → use
  `<fieldset aria-label className="m-0 inline-flex ... border-0 p-0">` (see also
  [[gotcha-filter-pills-a11y]]).

Proof: 9 new unit/integration test files (+42 tests), 17 Storybook states; build
green in BOTH mock + real mode (real-mode proves the mock-only paths compile/reachable).
