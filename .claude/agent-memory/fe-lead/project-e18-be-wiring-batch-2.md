---
name: project-e18-be-wiring-batch-2
description: US-164..173 BE-solved-asks batch (US-E18.30-37), 2026-08-03 -- 8 stories, all shipped
metadata:
  type: project
---

Second major BE-wiring batch this session (after the 5-story dead-sidebar-link
batch): coordinator handed a list of 8 BE-solved asks (US-164..173) to consume.
All 8 shipped to `main`, sequentially, solo mode throughout (no other in-flight
FE branches at any claim check).

| US | What | Key finding |
|---|---|---|
| E18.30 | Principal Classes real (US-164 MANAGER grant + US-173 studentCount/homeroom enrichment) | Removed 5 separate client-side enrichment fan-outs across 4 repositories; bonus-fixed a raw-UUID-as-teacher-name bug for free |
| E18.31 | Feed wiring (US-165 author identity) | Intake claimed "full un-mock" — WRONG, only 1 of 3 documented gaps closed; shipped a HYBRID (reads real, writes honest-degrade) instead — ADR 0067 |
| E18.32 | Moderation queue (US-172/166) | 4 of 5 gaps closed; found + fixed 2 shared-PRIMITIVE bugs (Sheet focus-restore, StatCard icon contrast) that benefit every consumer repo-wide — ADR 0068 |
| E18.33 | Parent child-switcher real names (US-167 tiered batch lookup) | Reused `iam-directory`'s `BatchResolveMembersUseCase` (already existed from US-E18.29); 2 wrong intake premises found+corrected (timetable's endpoint never had names; US-E20.4's "real names" was actually still mock) |
| E18.34 | Parent attendance real (doc-drift, not a real gap) | Engineer re-verified an "already contract-correct" DTO from a prior story and found it was WRONG (domain-cased status vs wire UPPER_SNAKE) — mock fixtures had masked it |
| E18.35 | Admin roster real (US-169 dob/gender) | Same `BatchResolveMembersUseCase` widened a 2nd time; reviewer caught a NEW MANAGER-403 gap + a false-empty regression + a decision-0026 duplicate (`missing-value`/`unavailable-value`) — ADR 0069 |
| E18.36 | Staff-leave full un-mock (US-170) | Un-mocking woke a DORMANT security gap: 2 mutation Server Actions had no `requireRole`, harmless while mocked, live once real — reviewer's single most valuable catch this batch |
| E18.37 | Notification unread filter (US-171, closes ask #42) | Simplest story — pure infra swap, zero UI, retired a whole client-side drain mechanism; only a vacuous-test SHOULD-FIX |

**Lessons that will recur:**
- **Always re-verify the coordinator's "closes ask #N" framing against the actual BE source before briefing the engineer** — 2 of 8 stories (E18.31, E18.34) had a materially wrong ground-truth premise handed down, caught only by independent Go-source reading at intake or during implementation. See [[feedback-reuse-claims-need-be-authorize-groundtruth]] — this batch reinforces it twice more.
- **"Un-mocking a feature" wakes up dormant defense-in-depth gaps.** A missing `requireRole` guard on a Server Action is invisible while the DI factory routes to mock (nothing real is ever mutated) — it becomes a live gap the moment `USE_MOCK ? Mock : Real` starts returning Real. Brief every un-mock engineer to explicitly check Server Action guards, not just the repository/DTO/mapper layer.
- **Un-mocking also wakes up dormant "silent false-empty" UI bugs** — a `rosterResult.ok ? data : []` pattern is harmless while the mocked path always returns `ok:true`; once real, a genuine 403/404 renders as "no data" indistinguishable from a truly empty list. Same root cause as the requireRole issue: code paths that were structurally unreachable become reachable.
- **`iam-directory`'s `BatchResolveMembersUseCase` (from US-E18.29) is now the established, 3-times-reused tool for "resolve display fields for ids I already have"** (grades/timetable child names, admin-roster dob/gender/name, staff-leave name+role). Always check this exists before building a parallel batch-lookup client — it's the single point of truth for the IAM tiered-response contract now.
- **The "invented anticipatory DTO, only ever exercised by a mock that shares the same wrong assumption" trap recurred 3+ times** (feed, admin-roster, parent-attendance, moderation) — a DTO/mapper pair that's only ever fed by hand-written mock fixtures can encode a wrong assumption invisibly, because the mock author and the "real" DTO author are often the same session making the same guess. The fix pattern each time: delete the invented shape, replace with the actual openapi schema, re-cast mock fixtures to match the REAL wire vocabulary (not the other way around) so mock and real share one mapper.
- **Component-organization duplicates keep recurring across features that don't know about each other** (`ChildIdentityHeader`/`ChildSwitcher` in E20.4/E20.5, `missing-value`/`unavailable-value` in E18.32/E18.35) — always brief `fe-component-architect` (or the reviewer, if architect is skipped) to grep for "does a semantically-identical shared primitive already exist in a DIFFERENT feature" before accepting a new feature-local component, not just within the same feature.
- **A found-but-out-of-scope shared-primitive bug (Sheet focus-restore, StatCard contrast) is worth fixing AT THE PRIMITIVE LEVEL in the same story**, not just flagging — it benefits every other consumer for free and the fix is usually small. Don't defer these to "someday" if the story is already touching that primitive's consumer.
- **Sequential solo-branch processing of 8 stories works but is slow** (each full pipeline: planner-skip/ground-truth → engineer → reviewer+a11y parallel → fix round → design-review gate → QA → docs close-out → merge) — budget accordingly for future large batches; consider whether some stories in a batch could go on worktrees in parallel if genuinely independent (this batch's 8 stories touched almost entirely disjoint feature modules and could likely have been parallelized).
- **ADR discipline**: registered 0067 (feed hybrid), 0068 (moderation partial), 0069 (admin-roster status constant) — one per genuinely new architectural/contract decision; amended 0066 in place (superseded-note pattern) for the notification drain retirement rather than a new ADR, since it was reversing that ADR's own prior decision, not making a new one.
