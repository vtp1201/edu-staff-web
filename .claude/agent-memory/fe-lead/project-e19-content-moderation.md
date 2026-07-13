---
name: project-e19-content-moderation
description: US-E19.2 Content Moderation (high-risk lane) implementation outcome — shared ReportContentDialog, moderation feature, DestructiveConfirmDialog errorSlot extension
metadata:
  type: project
---

US-E19.2 (Content Moderation, epic E19) implemented and merged to main (`adb3d62`),
2026-07-13/14, run in parallel with US-E03.1 (principal-reports) in a dedicated
worktree (`scripts/bin/fe-worktree add US-E19.2 content-moderation`).

**Scope delivered:** shared `ReportContentDialog` (`components/shared/`, the
contract US-E19.1's feed will consume later — landed FIRST per the story's own
dependency note) + net-new `src/features/moderation/` (Clean Architecture) +
`(app)/principal/moderation` route + `DestructiveConfirmDialog` extended with a
new optional `errorSlot` prop (forbidden/transient tone, forces the confirm
button `disabled` on `forbidden` — closes a real re-click bypass of "no retry").

**Pipeline outcome:** planner → component-architect + state-engineer (parallel)
→ engineer (8 phases, 4 commits, TDD) → tech-lead (Approved) + a11y (0
blocker/critical/major, 2 minor fixed) in parallel → design-review gate
(impeccable 0 findings) → QA (`fe-qa-playwright`, Go, but found 12 ACs the
engineer's self-report claimed covered had NO actual Storybook test — wrote 11
new stories closing the gap) → 1 more fix (dismiss now also invalidates
`moderationKeys.audits()`, parity with remove) → merge.

**Reusable pattern confirmed:** extending an existing shared composed component
via an optional prop (component-organization.md's rule) worked cleanly for a
security-sensitive case — `DestructiveConfirmDialog`'s `errorSlot` is
backward-compatible (9 existing callers unaffected) and the tone-forced-disable
nuance (structural, not just omission) was caught by `fe-component-architect`
BEFORE implementation, not after — worth continuing to have the architect
specify structural/security nuances explicitly in prop contracts, not just
shapes.

**Recurring finding worth generalizing:** `fe-nextjs-engineer`'s self-reported
"all high-risk checklist items covered" did not survive `fe-qa-playwright`
re-checking actual test files — this is now the 2nd/3rd time (see
[[project-e22-email-verification]]) QA's own new-test-writing (not just
reviewing existing tests) caught real coverage gaps self-report missed. Keep
briefing QA to verify by reading files, not trust the engineer's summary.

**Harness-cli per-worktree gotcha (again):** `harness.db` is gitignored; a fresh
worktree has none. `cp` the main checkout's binary + `harness-cli init` creates
an EMPTY db (no story rows) — must `story add` before `story update` works (a
bare `update` on a nonexistent id silently no-ops with a confusing "not
found"/"updated" flip-flop if you retry too fast). See also
[[project-e03-principal-reports]] for the same gotcha.

**Merge mechanics:** this time the primary checkout (`main`) was clean/idle
(the parallel US-E03.1 session had already finished and merged), so the normal
`git checkout main && git merge --no-ff` flow worked without needing the
`git commit-tree` workaround from US-E03.1's entry — check primary checkout
status first before assuming the workaround is needed.
