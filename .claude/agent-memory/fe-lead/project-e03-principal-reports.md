---
name: project-e03-principal-reports
description: E03 Principal Reports Dashboard epic status and US-E03.1 implementation notes
metadata:
  type: project
---

US-E03.1 Principal Reports Dashboard implemented (2026-07-12/13, merged to main
at 85fde40). `(app)/principal/reports` — term-scoped stat cards + subject-average/
attendance-trend div-based charts + periodic-reports table with polling
generate→ready, principal-only route gate scoped ONLY to `principal/reports/`
(sibling principal routes untouched — no namespace-wide layout). Mock-first
`IPrincipalReportsRepository`, 5 endpoints (INT-001..005), no real `core`
contract exists yet.

**Why:** DR-019 design request; fills the pre-existing screens.md placeholder row.

**How to apply / recurring patterns worth repeating:**
- **Anti-demo mandate (NFR-005/AC-05.3) pattern**: when a reference mockup has a
  "always fail once for design-review demo" behavior (`failedOnce` in
  `design_src/edu/reports.jsx`), call this out as a dedicated §0 in the spec
  BEFORE anything else — it worked well; every downstream agent (planner,
  engineer, tech-lead-reviewer, QA) independently re-verified it and none
  missed it. The mock-repo fix pattern: constructor-injected `now()` clock for
  deterministic async transitions (poll-generate→ready) PLUS an explicit
  one-shot `forceNextFailure(method)` opt-in for testing error states — one
  mechanism satisfies both the async-transition testability need and the
  anti-demo mandate simultaneously.
- **fe-planner/fe-component-architect/fe-state-engineer can disagree productively
  with the task brief** — planner assumed a shared `EduSkeleton`/`EduError`
  existed in `src/` (it doesn't; those are mockup-only names in
  `design_src/edu/states.jsx`); component-architect caught this and corrected
  course to feature-local skeletons/error-states, citing the identical gap
  already accepted in US-E12.12. Don't over-trust an assumption baked into the
  fe-lead's own delegation brief — brief the specialists to verify, not just
  execute.
- **4 independent regions, 4 independent `useQuery`s** (not 1 combined query)
  is the correct mechanism for "partial failure doesn't take down the other
  regions" (AC-01.3) — trivial by construction, no manual isolation logic
  needed. Same for stale-response-discard on rapid filter switch (AC-01.4):
  `termId`-in-queryKey solves it natively via TanStack's own cache identity —
  do NOT set `placeholderData`/`keepPreviousData` when the AC wants a fresh
  skeleton per switch (that option is the wrong default recommendation for
  this UX).
- **A11Y findings routing**: when the accessibility-auditor's SendMessage reply
  only produces a short summary (not full file:line detail) on the first
  response, explicitly ask it to resend the FULL findings text (not a re-run)
  — it has the detail, just summarized for the channel. Don't re-spawn a fresh
  audit; resume the same agent and ask for the verbose version.
- **Merge-to-main when the primary checkout's `main` is dirty from another
  parallel session**: cannot `git checkout main` in ANY worktree (git refuses
  same-branch-two-worktrees) and must not touch the dirty primary checkout.
  Fix: construct the merge commit via plumbing without any checkout —
  `git commit-tree <feature-branch-tree> -p <origin/main-tip> -p <feature-tip> -m "..."`
  then `git push origin <new-sha>:refs/heads/main`. Zero working-tree risk,
  works even when main is checked out elsewhere with uncommitted changes.
  Afterward, deleting the now-merged local feature branch requires `-D` (not
  `-d`) since the primary checkout's local `refs/heads/main` is stale (only
  `fetch`ed, never fast-forwarded) — confirmed already merged into
  `origin/main` first before force-deleting.
- **`harness-cli` binary is gitignored** (decision 0005, prebuilt Rust binary)
  — a fresh `fe-worktree add` checkout does NOT have it. Copy it from the
  primary checkout (`cp .../edu-staff-web/scripts/bin/harness-cli
  .../worktree/scripts/bin/harness-cli`) and run `harness-cli init` in the
  worktree (creates a fresh local `harness.db`, story history not carried
  over — fine, it's a local dev cache; the git-tracked `docs/TEST_MATRIX.md` +
  story.md are the real durable source of truth across worktrees).
- **FR-009 "Export Excel" shipped as client-side CSV** (UTF-8 BOM, not binary
  `.xlsx`) was accepted by both tech-lead-reviewer and fe-lead as a reasonable
  Should-priority interpretation avoiding a new dependency/ADR — good
  precedent for future "Export Excel" asks unless a real `.xlsx` is explicitly
  required product-side.
