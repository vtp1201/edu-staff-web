---
name: dr-012-019-batch-reconcile-pattern
description: How an 8-screen "group-B" mockup batch (already-generated + P1-P8 audited jsx) was reconciled onto the Harness surface in one combined branch instead of 8 separate ones
metadata:
  type: feedback
---

When a user hands over N already-generated + already-audited mockups (e.g. via
a Claude-Design prompt pack like `docs/design-requests/PROMPTS-group-b-ui-gen.md`)
in one batch and explicitly asks to reconcile them together, it is fine to
deviate from strict "1 DR = 1 branch" and do ONE combined `docs/dr-NNN-MMM-<slug>`
branch covering all N DRs, sequentially committed (skeleton DRs → design-spec
entries → i18n keys → docs sync → delivered-status flip), then a single gate +
merge at the end.

**Why**: `.claude/rules/uiux-workflow.md` prescribes 1 DR = 1 branch for
claim-safety under parallel sessions, but that model assumes independent
claim windows. When 8 DRs are requested atomically by the same user in the
same run, with no other `docs/dr-*` branches in flight (verified via
`git fetch --prune` + `git branch -a`), doing 8 mechanical branch-cycles adds
pure overhead (8x gate runs) with no claim-safety benefit — one session already
owns the whole batch. Confirmed acceptable in this run (see task instructions
which explicitly allowed "consecutive DR branches... in this run").

**How to apply**: only collapse to one branch when (a) the user's own request
already groups the DRs as one packaging unit, (b) `git fetch --prune` confirms
zero contention, and (c) none of the DRs edit conflicting regions of the same
shared file in a way that needs real sequencing enforcement (still serialize
WITHIN the branch: one writer of `design-spec.jsonc` at a time, DR `.md` files
edited by a different specialist in parallel is safe). If ANY of those three
conditions fail, fall back to strict 1-DR-1-branch.

## Task assignment split that worked well

- `uiux-designer` = sole writer of `docs/product/design-spec.jsonc` (all N
  screens' entries in one pass, self-serialized internally).
- `uiux-ux-writer` = sole writer of the DR `.md` files' copy sections (i18n
  key blocks), running in TRUE parallel with the designer since it's a
  different file set.
- `uiux-docs-manager` runs AFTER both finish (needs their output to describe
  accurately) — screens.md, design-system.md, DR README, design-changelog.
- The lead writes DR skeletons first (before delegating) and does the final
  delivered-status flip + design-review verdict section (after validating)
  — keeps ownership of the Harness-truthfulness gate with the lead, not
  specialists.

## Known gotcha: uiux-ux-writer may lack Bash

In this run `uiux-ux-writer`'s tool grant did not include Bash — it could
Edit/Write but not `git commit`. The lead must check `git status`/diff and
commit on its behalf rather than assuming the specialist committed. Always
verify `git log` after a delegated task reports "done" — don't trust that a
specialist committed just because it said so.

## Epic numbering used (repo now at E23)

E19 = Social (feed+moderation), E20 = Parent-Student Links, E21 = Tenant
Invitations, E22 = Email Verification, E23 = Multi-Tenant Switch. E10.5 used
for messaging presence (extends existing E10 rather than new epic). E03.1
used for Principal Reports (E03 was reserved in screens.md header but never
assigned a US before this batch — filled the existing placeholder row instead
of adding a duplicate).

See also: [[dr-011-pattern]], [[dr-009-reconcile-pattern]] for prior reconcile
batches (impeccable retrofit, UX polish) that also grouped multiple concerns
into one DR/branch when the user's own request was already a batch.
