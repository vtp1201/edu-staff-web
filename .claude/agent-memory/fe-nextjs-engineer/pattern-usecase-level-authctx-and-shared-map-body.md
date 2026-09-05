---
name: pattern-usecase-level-authctx-and-shared-map-body
description: US-E24.9 — put the 0063 guard at the USE-CASE when the BE re-derives the scope key; delete a hybrid composite once its last force-mock goes; one client wrapper owning shared maps because revalidatePath does not re-propagate props
metadata:
  type: project
---

Three things US-E24.9 (class-hub timetable tab, period-logs/period-preps) settled
that generalize.

**1. decision-0063 guard belongs at the USE-CASE when the repo has nothing of its
own to check.** The canonical 0063 instances put the check in the repository
because the repo owns the scope data. For period-log/prep, core re-resolves the
slot's current teacher server-side on every write, and the one fact the guard
needs (`assignedTeacherMemberId`) is already known to the CALLER that rendered the
row — the repo would have to re-fetch the timetable to learn it. So
`SavePeriodLog/DeletePeriodLog/SavePeriodPrep/DeletePeriodPrep` take
`(authCtx, params)` and assert `ownsSlot()` as their FIRST statement. Same
testability bar is still met: spy repo + forged authCtx over every role → assert
`repo.method` call-count 0. Say this out loud in the use-case doc, or a reviewer
reads it as a missing repository check.
**Why:** BE fuses every write denial (MANAGER, wrong teacher, no slot, weekend,
out-of-term) into ONE 422 so the write path is not an occupancy oracle
(VULN-233-001). The client guard is defense-in-depth + instant feedback, NOT the
enforcement — and the failure union must NOT re-split what the BE fused (a bare
403 maps to the same `slot-forbidden-or-missing` key).
**How to apply:** any write whose authorization key is a field the screen already
rendered. See [[pattern-high-risk-authctx-reauth]] for the repository-level shape.

**2. A hybrid `USE_MOCK`/force-mock composite must be DELETED when its last
force-mocked method gets un-mocked** — not kept "for the seam". Biome catches it
(`noUnusedPrivateClassMembers` on the now-dead `mock` ctor param) but only as a
warning. Leave a block comment where the class was explaining what it did and
when it died; DI then composes the real repo directly. Update the DI tests that
assert `constructor.name`.
**Why:** a pass-through wrapper that wraps nothing is dead code the next reader
has to re-derive; the next partially-wireable operation can reintroduce one.
**How to apply:** un-mocking work (E18-style) — grep for the composite's other
methods before deleting; the `*.di.test.ts` `constructor.name` assertion is the
one that breaks.

**3. `revalidatePath` does NOT push new props into an already-mounted client
subtree.** When two columns read the same server data (day grid + aside chips),
per-leaf local state leaves the sibling stale until a full navigation. Fix: ONE
thin `'use client'` wrapper between the RSC and both columns owning
`useState(initialFromProps)` maps + `upsert*` callbacks; each form reports its
saved entity upward. Await-then-merge the ACTUAL server response — NOT
`useOptimistic` (no precedent in this repo, and there is no client-guessed value
to roll back). `revalidatePath` stays, but only as router-cache correctness for
future navigations.
**Why:** state-engineer caught this as a real gap after the component-architect's
plan said "RSC-only, no client state".
**How to apply:** any RSC screen where ≥2 sibling regions derive from one
mutable dataset. Related: [[pattern-seed-resync-and-live-region]] (useState(seed)
is stale forever if the seed itself changes — safe here because the week only
changes via a full route transition that remounts the subtree).

Bonus ground truth: core's `homeroom-entries` LIST is GVCN/BGH-only, so a subject
teacher's read is a guaranteed 403 → HIDE the block rather than render a
permanently empty read-only strip, and skip the doomed call server-side.
