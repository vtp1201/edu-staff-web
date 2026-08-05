---
name: project-e18-be-wiring-batch-3
description: US-174..184 BE-solved-asks batch 3 (US-E18.38-45), 2026-08-06 -- 8 stories, all shipped, first genuine parallel-worktree run this session
metadata:
  type: project
---

Third major BE-wiring batch (after 5-story dead-link batch + 8-story batch-2).
Coordinator handed 8 items from 2 BE response reports (2026-08-04 + 2026-08-05).
All 8 shipped to `main`. **First batch where I actually used parallel
worktrees** (decision 0033) instead of pure sequential — dispatched
E18.40/E18.42/E18.43 concurrently in worktrees while E18.38 ran on the main
checkout, then E18.39/E18.41 sequentially (same module, dependency-ordered),
then E18.44 (high-risk) with 3 full review rounds.

| US | What | Key finding |
|---|---|---|
| E18.38 | Un-mock /principal/schedule (MANAGER RBAC) | Small, clean — remove one force-mock, mirror sibling factories |
| E18.39 | Un-mock /principal/students (MANAGER RBAC) | Turned out to be **doc/test-only** — the DI factory was ALREADY a plain gate, only stale comments/test assertions needed fixing. Ground-truth BEFORE prescribing "un-mock X" — sometimes the code is already right and only the narrative is stale |
| E18.40 | Teachers screen repoint + subject-assignments compose | Explicit fan-out bound (40 classes) documented; found+fixed a REAL pre-existing bug (mutations sent wrong field name, would 422 in real mode) while ground-truthing something unrelated |
| E18.41 | Admin roster search-pool real (FE-compose set difference) | Reviewer's best-quality pass this batch — praised deleting invented DTOs rather than leaving fiction, and catching a false-empty proactively (before review, not after) |
| E18.42 | Assessment-scheme subjects-by-grade real | DI was already a plain gate (real mode was ALREADY calling the endpoint) — but a MOCK-ERA INVENTED DTO was silently producing `undefined` fields in real mode the whole time. "DI gate is real" ≠ "the DTO shape was ever verified" |
| E18.43 | Sealed-students listing real | Correctly preserved a "real but not reachable end-to-end" reachability caveat inherited from a sibling story rather than overclaiming the fix unblocks the whole feature |
| E18.44 | Grade reject/request-revision flow (HIGH-RISK) | **3 full engineer rounds + 2 full reviewer rounds + 2 a11y rounds** — see below |
| E18.45 | Hygiene pass (memberId claim, 422 casing, doc drift) | TRUE no-op, confirmed by exhaustive grep both by engineer and cross-checked by fe-lead's own pre-dispatch grep. Correct to still dispatch and verify rather than skip — "surely nothing changed" is exactly the kind of claim that needs checking |

**US-E18.44 (grade reject flow) — the recurring pattern this batch converged on hardest:**
Round 1 engineer build was excellent on security/privacy (compile-time
`@ts-expect-error` guard for staff-only field stripping, RBAC `requireRole`
before any DI call, XSS-safe rendering) but reviewer round 1 found the
capability was **built on a route the authorized roles could never reach**
(mounted only in `teacher/grades`, which a `principal`/`admin` session's
strict-equality namespace guard redirects away from before render). Fix round
1 repurposed 2 ALREADY-EXISTING orphan routes (`principal/grade-book`,
`admin/grade-book`) rather than inventing a new route — good instinct, reuse
over invention. Reviewer round 2 found TWO MORE reachability gaps in the fix
itself: (a) a confirmed-by-empirical-reproduction runtime 500 in the
UNCHANGED sibling route (`teacher/grades` default load passes a closure
literal as a Server Action prop — a bug `tsc`/`build`/Storybook ALL miss,
only a unit test that actually INVOKES the prop catches it), and (b) neither
new approver route had a nav entry (shipped-but-unreachable-without-typing-
a-URL). Round 2 fix closed both plus the a11y auditor's `aria-describedby`
finding. **Lesson: "is the RBAC boundary correct" and "can the authorized
role actually get to this control through the UI" are two independent
checks — a reviewer can verify the first flawlessly and still miss the
second unless explicitly told to trace route reachability, not just
guard logic.** This is now the single most load-bearing review instruction
to give for any story that adds a role-gated affordance: don't just check
`requireRole()`/`evaluateNamespaceAccess()` return the right answer, trace
whether the intended actor's SESSION can ever reach the component tree that
calls it (nav entry + route guard + component mount, all three).

**Reused/confirmed patterns from batch 2, still holding:**
- Mock-only-consumer DTOs are unverified by construction — even when the DI
  factory is a plain `USE_MOCK ? Mock : Real` gate (not force-mocked!), a
  DTO invented during mock-first authoring can still be silently wrong in
  the real branch if nobody ever exercised it against the real wire (E18.40,
  E18.42 both hit this independently).
- `BatchResolveMembersUseCase`/`SearchMembersUseCase` (iam-directory) keep
  being the single reusable composition point for "resolve a display field
  I only have an id for" — 3rd/4th reuse this batch (E18.40 teacher names,
  E18.41 student directory, E18.43 sealed-student names).
- A reviewer that reproduces a claimed bug EMPIRICALLY (spun up `bun dev`,
  hit the actual route) rather than reasoning about it from a code read is
  worth the extra time when the claim is "this is pre-existing, not my
  problem" — it turned a dismissable pre-existing-bug claim into a
  must-fix specifically because it sat on THIS story's own AC path.

**Process note:** parallel worktrees (E18.40/42/43 concurrent) worked cleanly
with zero cross-branch commit leakage — the discipline of always re-fetching
+ verifying `git branch --show-current` before each merge, and resolving the
mostly-additive `docs/TEST_MATRIX.md` merge conflicts by hand each time, held
up across ~6 sequential merges in one session. Agent-memory files
(`.claude/agent-memory/fe-nextjs-engineer/MEMORY.md` etc) kept getting
written to by background agents INTO THE MAIN CHECKOUT even while running in
their own worktree for code changes — always `git add`+commit these
opportunistically before merging story branches, they're harmless drive-by
documentation and blocking a `pull --ff-only` otherwise.
