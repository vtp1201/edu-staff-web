---
name: project-e18-26-timetable-by-member
description: US-E18.26 (timetable by-member views + slot room field, epic E18) — resolves cross-repo asks #15/#17, partial #20/#22
metadata:
  type: project
---

US-E18.26 (2026-08-01, epic E18, Wave 3 extension of US-E18.11) un-mocks
`src/features/timetable/`'s 3 previously-permanently-mock operations (student
self-view, teacher personal schedule, parent child-view) against edu-api's new
core US-153 (`GET /members/{memberId}/timetable?termId=` + slot `room` field)
and core US-148 (`GET /members/{memberId}/enrollment` + enriched
`linked-students`). Merged clean to `main` (`95dd57a`), branch deleted.

**Why this worked well as a template for a "resolve a prior US's blocked
asks" story**: the base story packet did the FULL BE ground-truthing myself
(fe-lead) up front — read `services/core/docs/{openapi.yaml,INTEGRATION.md,
ERROR_CODES.md}` directly plus the BE story packets
(`edu-api/docs/stories/epics/E04-core-school-operations/US-153-*.md`,
`US-148-*.md`) for review-flagged caveats — BEFORE spawning `fe-planner`.
This meant the planner's job was "turn an already-verified contract into a
phased file-level plan," not "re-derive the contract," and it caught 5
real corrections against the ACTUAL current code (not just the prior US's
packet prose) that the base story's assumptions got subtly wrong — e.g. the
admin-builder mock already round-tripped `room` correctly (the drop was one
layer up, in the mapper), and `GetChildTimetableUseCase` needed a genuinely
NEW repository method (`getByMember`) since the old `getByClass` is
classId-keyed but the new endpoint is memberId-keyed. **Lesson: when a US
extends a prior US's feature, do the BE ground-truthing yourself at intake
time (cheap, one read pass) rather than delegating it blind to the planner —
it lets the planner spend its budget on code-level correctness instead of
contract discovery, and produces a MUCH tighter brief for the engineer.**

**The one user-visible change (child-picker degraded-identity fallback) got
its own narrow `fe-component-architect` pass** even though the rest of the
US was pure DI/mapper/entity rewiring — right call, confirmed by hindsight:
`fe-accessibility-auditor` found a genuine Blocking contrast bug
(hardcoded `text-white` avatar text against a color-cycling background,
now reachable in real mode with 3+ children hitting `warning`/`error`/`teal`
= all fail 3:1) that only became reachable BECAUSE this US wired the
real roster in. **Lesson: a component that "just needs a small text
fallback" can still hide a latent contrast bug that a previous mock-only
mode never exercised (mock only ever had 2 fixture children, never hit the
3rd+ color in the cycle) — un-mocking a data source can newly EXPOSE an
old bug, not just add new surface; brief the a11y auditor to check the
FULL color-cycling range, not just the new fallback text.**

**Tech-lead review caught a genuine cross-cutting composition bug**: the
by-member endpoint's response has no top-level class name (only per-slot
`classId`), and the student self-view use-case composed its own enrollment
call to recover `className` for display — but the PARENT child-view
(`GetChildTimetableUseCase`) didn't, silently rendering a blank class badge
in real mode despite `linked-students` having ALREADY fetched that exact
`className` one call earlier. **Lesson: when two sibling use-cases
independently need to "recover a display field the primary endpoint
dropped," check that BOTH actually do it — a fix applied to one branch
of a symmetric pair can silently miss the other, especially when the two
branches were written by two different reasoning passes (student vs.
parent) even within the same commit.**

**QA closed a genuine proof gap the plan didn't ask for by name**: the
admin builder's `room` field had full repository/mapper round-trip test
coverage, but ZERO Storybook interaction-level "open dialog → edit room →
save → assert persisted" test — exactly the kind of gap that "proof exists
at the wrong layer" review misses unless someone explicitly asks "does the
UI-level save flow for this exact regressed bug have its own test." QA
wrote it (`RoomFieldEditAndSave`), not the engineer. **Lesson (recurring
pattern across many prior US's in this epic, worth repeating again):
always brief QA to verify AC coverage by reading the actual test files
and, where a gap is real, WRITE the missing test rather than only report
it — this keeps closing real coverage gaps same-cycle instead of a
round-trip.**

**Cross-repo ask hygiene**: reviewer flagged (not fixed, correctly out of
scope) that a DIFFERENT, unrelated feature (`src/features/parent-links`,
US-E20.2) calls the exact same `linked-students` URL this US ground-truthed
but casts to its own speculative, wrong DTO shape (`{studentId, fullName,
avatarUrl}` vs. the real `{linkId, parentMemberId, studentMemberId,
createdAt, classId?, className?}`) — logged as EPIC-OVERVIEW ask #43 (a
web-side follow-up, not a BE ask) rather than touched in this US. **Lesson:
when ground-truthing a shared URL, grep across ALL features that call it
(`grep -rl <url-fragment> src/features`), not just the one you're wiring —
a sibling feature's un-ground-truthed cast against the same endpoint is a
cheap, valuable find even when fixing it is out of scope.**

437 files/3081 vitest tests (baseline 436/3041, +1 file/+40), 151 files/1096
Storybook interaction tests (was 151/1095 pre-QA-fix). tech-lead Approved
(1 correction to the packet's own error-code assumption — `linked-students`'s
403 is `PARENTLINK_FORBIDDEN` not `ROSTER_ACCESS_FORBIDDEN`), a11y PASS
post-fix, design-review PASS (scope: `child-picker.tsx` only), QA Go
post-gap-closure. Resolves cross-repo asks #15/#17; partially resolves #20
(classId/className yes, student name still open) and #22 (classId-discovery
half done for timetable; conduct self-view UI itself remains a separate,
unbuilt product gap — flagged as a follow-up recommendation, not built
here, correctly respecting the scope boundary given at intake).
