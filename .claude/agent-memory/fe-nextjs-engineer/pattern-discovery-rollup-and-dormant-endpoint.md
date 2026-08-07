---
name: pattern-discovery-rollup-and-dormant-endpoint
description: E18.46 — a tenant-wide DISCOVERY read needs its own port (different addressing/kind/construction) while a second per-cell decision joins the existing one via RENAME; wiring a dormant endpoint constant; gating a READ with requireRole
metadata:
  type: project
---

BE ships a tenant-wide rollup (`GET /grade-entries/pending-approval`) that tells an
approver WHICH `(classId, subjectId, termId)` tuples have pending work, plus an
already-live but never-called `…/approve` endpoint constant.

**Why:** ports must split on a real distinction, and "one story, one port" is not it.

**How to apply:**

- **Two new capabilities ≠ two new ports.** `approveEntry` joined the existing
  reject port (RENAMED `IGradeRejectionRepository` → `IGradeDecisionRepository`,
  since the old name became wrong): same actor, same BE gate, same per-cell
  addressing, same lifecycle state ⇒ splitting adds a port without a distinction.
  The rollup got its OWN port because it differs on THREE axes: addressing
  (tenant-wide, no key at all — the tenant is a JWT claim), kind (paginated read,
  not mutation), construction (the per-key concrete repo resolves an assessment
  scheme + publish mode it has no use for). Use those three axes as the test.
- **A dormant endpoint constant is a claim, not a fact.** Ground-truth the Go
  use-case for its ACTUAL error set before mirroring the sibling's: approve's is
  a strict SUBSET of reject's (403/404/409 only — no reason-shaped 422), so the
  use-case is a pure pass-through with NO client-side validation to copy.
- **Envelope shape check.** `data` was `{items: […]}` (an object wrapping the
  array), pagination in `meta.pagination` ⇒ `{raw: true}` + `parseEnvelope`, and
  `raw` is a CONFIG-level sibling of `params`.
- **Gate the READ too.** A discovery list that discloses tenant-wide which
  classes have outstanding work carries the same `requireRole` as the mutations
  (BE uses the identical `isAdminOrManager` predicate). It does NOT
  `revalidatePath` — assert that explicitly.
- **Secondary read ⇒ honest degrade.** Seed it from the RSC as a failure KEY on
  an empty page; the section collapses to a retryable `ListError` and the primary
  data still renders. Prove it in the RSC-props test AND a story.
- **Confirm dialog tone matters.** Approve IS a publish → the non-destructive
  `PublishConfirmDialog`; do not force a reason field (assert the dialog has NO
  textbox) and do not reuse the destructive/reason variants.
- **Don't invent an aggregate you can't honour.** No StatCard: any "total
  pending" over LOADED pages changes as you paginate. A missing number beats a
  misleading one.
- Rollup rows carry ids only; resolve display labels client-side from the picker
  options with a raw-id FALLBACK — the rollup is tenant-wide, the picker is not.
- Related: [[pattern-shared-list-states]], [[gotcha-rsc-closure-prop-500]]
  (locked here with a test that INVOKES the handed-down action prop),
  [[pattern-partial-gap-closure-wiring]].
