---
name: project-e18-be-wiring-batch-4
description: US-186..189 BE-solved-asks batch 4 (US-E18.46-49), 2026-08-07 -- 4 stories, all shipped, fully parallel worktree run
metadata:
  type: project
---

Fourth BE-wiring batch (after 5-story dead-link batch + 8-story batch-2 +
8-story batch-3). Coordinator handed 4 items closing the LAST P2 asks
(#18/#28/#16/#10/#11). All 4 dispatched CONCURRENTLY from the start in
worktrees (US-E18.46/47/48/49) — the first batch where every story ran in
parallel rather than sequential-with-some-parallel-bursts.

| US | What | Key finding |
|---|---|---|
| E18.46 | Grade-approval pending rollup + approve action (BE US-186) | Reviewer applied the US-E18.44 "route reachability ≠ RBAC correctness" lesson proactively — engineer got it right first try (mounted on already-reachable routes). Fix round still needed: seed staleness (useState(prop) never resyncs — same class of bug as elsewhere), cursor/hasMore edge case, 2 a11y Major (missing wait-time in aria-label, missing live-region on load-more) |
| E18.47 | Class attendance range real (BE US-187) | Cleanest story this batch — zero UI diff, pure call-count proof, reviewer APPROVED first pass, a11y correctly ruled N/A (with justification, not silent skip) |
| E18.48 | Timetable conflicts scan real + NEW admin UI (BE US-188, ADR 0128) | Reviewer's ground-truthing corrected the STORY PACKET's own ground truth twice (detectConflicts is the mock's conflict engine not a per-cell highlighter; TimetableData.conflicts was fiction) — a good reminder that even fe-lead-authored ground truth can be wrong and must be re-verified, not just trusted. Surfaced a genuine platform-wide finding (ROLE_ENUM_TO_APP has no path to appRole "admin" — the whole /admin/* namespace is mock-mode-only in practice) — registered as ADR 0070 rather than silently absorbed or ignored |
| E18.49 | Grade-scale bands + assessment-column requiredCount real (BE US-189) | Un-fakes a "confirmed client-only" finding from a much earlier story (US-E18.7/ADR 0053) — reversal of an earlier ADR's own conclusion, handled via body-amendment (not just header) after reviewer flagged the stale prose. Reviewer caught a real precision bug (`.toFixed(1)` truncating sub-0.1 thresholds like a 3.25 GPA cutoff) |

**Recurring/reinforced patterns:**
- **A previous ADR's "client-only, never persisted" conclusion can be reversed by a later BE ship** — when this happens, amend BOTH the ADR's Status header AND every body paragraph making the old claim (reviewer caught 2 stale body paragraphs the initial amendment missed in E18.49 — grep the whole file, not just the summary section, when amending).
- **Ground truth the lead writes into a story packet can still be wrong** — E18.48's packet said `detectConflicts()` was a client-side per-cell highlighter; the engineer + reviewer both independently found it was actually the MOCK repository's own conflict-detection engine with zero presentation callers. Always brief engineers to verify ground truth against actual code, not just execute it.
- **"Dormant real endpoint with a comment inviting future use" is a genuine signal, not dead code to ignore** — E18.46 activated `approveEntry`, which US-E18.44 had already ground-truthed and left a doc-comment for specifically anticipating this.
- **Route-reachability lesson from batch 3 (US-E18.44) generalizes well** — when explicitly briefed into the review prompt for E18.46, the reviewer checked it proactively and the engineer got it right the first time (no 3-round saga this time).
- **A platform-wide finding surfaced mid-review (not asked for, not in scope) still deserves an ADR** — don't let it die in a review verdict's prose. Register it (ADR 0070 this batch), cite it in the closing FE→BE report, move on without trying to fix it inside the story that surfaced it.
- **Parallel worktrees for 4 fully-independent modules (grades/attendance/admin-timetable/assessment-scheme) worked cleanly end-to-end** — dispatched all 4 engineers in one message, no cross-branch leakage, merge conflicts were all in shared docs (TEST_MATRIX.md, screens.md, EPIC-OVERVIEW.md, the FE→BE report) and all cleanly additive/reconcilable by hand.
- **A story-packet copy accidentally committed early** (during an unrelated merge's `git add -A`) causes an add/add conflict on the NEXT merge — resolve by taking the real branch's fully-evidenced version wholesale (`git show <branch>:<path> > <path>`), don't try to hand-merge a planning stub against a finished doc.
