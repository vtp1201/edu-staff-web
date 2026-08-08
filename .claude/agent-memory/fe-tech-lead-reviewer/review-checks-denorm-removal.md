---
name: review-checks-denorm-removal
description: What to actually verify when a BE denormalization lets FE delete a collaborator/join — the checks that catch half-wired removals
metadata:
  type: feedback
---

When a story's shape is "BE denormalized a field, so FE deletes a resolver/join
collaborator", run these specific checks rather than the generic gate list.

**Why:** the risk in a removal story is never the new field — it is dead
references, doc comments describing the deleted mechanism, and proof registries
still citing deleted test files. Confirmed on US-E18.56 (2026-08-08), where the
code was clean but `docs/TEST_MATRIX.md` still cited a deleted suite as live proof.

**How to apply:**
- **Prove the negative at runtime, not by file absence.** An assertion that the
  resolver file is gone proves nothing. Demand either a call-COUNT assertion
  (`expect(get).toHaveBeenCalledTimes(1)`) or a stub that THROWS on any
  unexpected URL. US-E18.56 has both — that is the bar.
- **`git grep <symbol> main -- src/`** (against main, not HEAD) to confirm a
  deleted endpoint constant/helper genuinely had one consumer. The engineer's
  grep runs after deletion and can't show what used to reference it.
- **Check `docs/TEST_MATRIX.md`** for rows of the PREDECESSOR story that cite
  now-deleted test files or describe the removed mechanism. Removal stories
  almost always miss this; the packet's Harness Delta usually asks for it.
- **Grep the doc comments for the OLD field/mechanism name**, not just the code.
  Entity/port doc lines survive sweeps (US-E18.56 left one `academicYearLabel`
  reference on `AcademicYear.yearId`).
- **Ask whether a defensive guard died with the collaborator.** A deleted
  resolver often carried validation (blank-label omission, fan-out caps) that
  the new one-liner does not reproduce. Check whether the wire contract makes
  the guard unreachable before deciding if it is blocking.
- **Making a new entity field REQUIRED (not optional) is the good choice** —
  `bunx tsc --noEmit` then enumerates every stale literal. Verify tsc is clean
  rather than grepping for literals yourself.
- Diff the Storybook story file line by line before signing off on skipping the
  design-review gate; fixture-plumbing-only changes (no JSX/className/token)
  are a legitimate skip, and saying so explicitly unblocks `fe-lead`.
