---
name: us-e13.8-qa-patterns
description: QA patterns for US-E13.8 principal-classes — layout-guard sibling-file gap, permanently-mocked-repo hasMore:false trap, generic LoadMoreButton hasError doesn't branch by errorKey
metadata:
  type: project
---

US-E13.8 (principal school-wide class list, read-only) QA pass findings:

- **Route-guard sibling gap**: `(app)/principal/reports/layout.tsx` had its own
  `layout.test.ts` (RSC redirect-digest recipe), but the top-level
  `(app)/principal/layout.tsx` — the ACTUAL guard `(app)/principal/classes`
  depends on — had zero test. Always check the exact route's own guard file has
  its own test, not just a sibling/nested one; "RBAC reuses existing mechanism"
  claims in story.md can still hide a missing test at the specific route level.

- **Copy-pasting a sibling guard test is risky**: `principal/reports/layout.tsx`
  does its own `tokenTenantId` vs `urlTenantId` mismatch check
  (`evaluateAccess`); the top-level `principal/layout.tsx` uses
  `evaluateNamespaceAccess(role, locale, tenant, "principal")` which checks ROLE
  ONLY — tenant-membership is delegated to the parent `(app)/layout.tsx`
  (`evaluateAccess` runs first, redirects before the nested layout is reached).
  A copy-pasted "tenant-mismatch" test from the reports sibling FAILED against
  the top-level guard — not a real gap, just wrong test for that file's actual
  contract. Always read the actual guard file before writing/porting a test for
  it, even when a sibling with the same name pattern exists.

- **Permanently-mocked DI facade + generic mock repo `hasMore:false` trap**:
  when a screen's DI factory is intentionally forced onto a shared mock
  repository (not gated by `USE_MOCK`, e.g. because real BE 403s for that role
  — see `principal-classes.di.ts`'s MANAGER-forbidden rationale), check whether
  that shared mock's pagination logic ever produces `hasMore: true`. Here,
  `MockClassManagementRepository.listClasses()` always returns
  `hasMore: false` regardless of seed size/params — meaning the >100-class
  edge case (AC-1.22) and all "load more" behavior can NEVER be exercised
  end-to-end in the actual running app, only at the presentational-component
  layer via synthetic Storybook props. Not a defect of the consuming US (shared
  characteristic, pre-existing), but worth flagging as a MINOR finding so
  reviewers don't assume Storybook coverage = real end-to-end reachability.

- **Shared `LoadMoreButton`'s `hasError` is errorKey-blind**: it renders one
  generic enabled "retry" treatment regardless of WHY the load failed. A screen
  whose spec requires a `forbidden`/403 load-more failure to get the SAME
  no-retry treatment as its full-page 403 state (a fairly common AC pattern —
  "same defensive treatment on any subsequent call") will silently violate that
  AC unless the screen's own `handleLoadMore` branches on `errorKey` before
  handing off to `LoadMoreButton`. Always write a `LoadMore_Forbidden`-style
  story (not just `LoadMore_Failure` with a generic network error) when the
  spec has a distinct 403/forbidden AC for the full-page case — found this as
  a real MAJOR defect (DEF-E13.8-01) via this exact story.

- **Defect-proof story pattern used**: write the story asserting the SPEC'd
  (correct) behavior first to confirm it fails against real code (proves the
  defect is real, not a test bug), then flip the assertion to document the
  ACTUAL behavior with a prominent comment + DEF-ID pointer, so the suite stays
  green while the defect is still discoverable/traceable in the story file
  itself. Never leave a permanently-failing story committed — QA can't fix
  production code, so leaving red tests blocks everyone else's pre-push gate.

- AC-1.14/AC-1.22 (filter persists across load-more append, hasMore stays true
  after append = the >100-class soft-cap signal) had ZERO test despite the
  pure `deriveVisibleClasses` unit suite being excellent — the pure-fn test
  can't prove the UI wiring re-applies filter state to newly-appended rows.
  Wrote one combined story (`LoadMore_FilteredAppendKeepsFilterAndControl`)
  exercising filter-then-load-more end-to-end; this is the reusable pattern
  for any screen combining client-side filter + server pagination.
