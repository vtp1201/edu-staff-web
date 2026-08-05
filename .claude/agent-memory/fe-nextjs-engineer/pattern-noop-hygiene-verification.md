---
name: pattern-noop-hygiene-verification
description: "E18.45: how to prove a no-op hygiene/verification story — classify EVERY surviving force-mock reason instead of grepping the fixed phrase; role-grant vs identity-claim blockers are different root causes"
metadata:
  type: project
---

A "BE fixed X — sweep the repo for stale blame" story is a **proof of a negative**.
Grepping the fixed phrase is NOT the proof: the stale comment may never have used
the BE's wording.

**How to actually prove it (E18.45, US-174 memberId-claim sweep):**

1. Grep the phrase AND the mechanism AND the symptom separately
   (`memberId claim` / `ActorMemberID` / `memberId` ∩ `claim` / `memberId` ∩
   `missing|empty|blocked|force-mock`). Each grep alone under-reports.
2. Then enumerate the population the stale comment could hide in — for a
   force-mock sweep that's `grep -rn "force-?mock|no BE (endpoint|capability)"
   src/bootstrap/di/` — and **read every hit's reason in full**, classifying it
   (still-accurate / already-fixed-by-a-sibling-US / genuinely stale). That table
   IS the evidence; a bare "0 hits" is not falsifiable.
3. Write the classification table into the packet's `## Evidence` even when
   nothing changed, so the next sweep doesn't redo the reading.

**Root-cause discrimination that mattered:** a 403 blocker can be *role-based*
(the caller's role matched no `authorize()` branch — `MANAGER` on
`list_classes.go` / `get_member_timetable.go`) or *identity-based*
(`ActorMemberID == ""`, the missing claim). They are fixed by DIFFERENT BE
stories (US-164/US-175 vs US-174). Do not credit an identity fix for retiring a
role-gated force-mock, or vice versa — the comment would then cite the wrong
reason and mislead the next un-mock. Verify which branch of the Go `authorize()`
the grant sits in relative to the `ActorMemberID == ""` guard.

**Also:** a "no-op" story still needs the truthful full gate (`bun vitest run`,
`bunx tsc --noEmit`, pre-push build+storybook). Never invent the test counts in
the packet — read them off the runner output (I drafted 3556/478 from memory; the
real numbers were 3700/487).

Related: [[pattern-two-gaps-one-forcemock]] (one force-mock doc bundles several
reasons — BE closing one un-mocks only one method),
[[pattern-real-mode-that-was-never-real]].
