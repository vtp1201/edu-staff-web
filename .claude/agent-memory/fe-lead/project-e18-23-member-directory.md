---
name: project-e18-23-member-directory
description: US-E18.23 member-directory wiring — shared iam-directory module pattern, staff-leave partial-unblock decision, reviewer perf catch
metadata:
  type: project
---

US-E18.23 (2026-08-01, normal lane, merged 89bfcc4) — IAM US-144 (member
directory + batch lookup) + core US-149 (staff-leave tenant-wide list)
finally closed the epic's longest-running gap-class (asks #6/7/9/13/15/18/
20/21/22, 10+ confirmations across [[project-e18-be-wiring]]) for two of its
blocked screens, and minted the epic's FIRST genuinely-new shared feature
module for it.

**New module**: `src/features/iam-directory/` (domain+infra only, no
presentation — owns no screen) wraps IAM's `GET .../members?role=&search=&
cursor=&limit=` (paginated directory, must follow `nextCursor` until
`hasMore:false`, never stop on a short/zero-length page) + `GET /members?ids=`
(≤50-id batch lookup, unresolved ids silently dropped). Consumed by
`class-management`/`staffing`'s own DI factories via composition (decision
0017), not duplicated 3x.

**Test for when a shared BE capability earns a real feature module vs. a bare
`bootstrap/lib/*.ts` composing an EXISTING feature** (the
`resolve-current-term.ts` shape, precedent from US-E18.11/12): is the logic
non-trivial AND identical across ≥2 callers AND genuinely new domain (new
entities, new failure union, a pagination/chunking algorithm)? If yes → new
feature module. `resolve-current-term.ts` composes something that already
existed elsewhere; iam-directory had nothing pre-existing to compose into.

**Un-mocked**: `class-management.listTeachers` (real `role=TEACHER`
UPPERCASE, closes ask #7 for this caller) and `staffing`'s assignment
`memberName` (ONE batch call per list page, not N — reviewer verified this in
the actual repository loop, not just the test's mock-call-count assertion).

**`staff-leave` deliberately STAYS mock** even though 2 of its 3 original
blockers (ask #13) closed by this BE update — the 3rd, `department`/
`leaveType`, is a genuinely-missing wire concept (BE's own openapi.yaml
states `leaveType` is an intentional forward-looking product decision,
OQ-149-01, not a gap) that the shipped presentation card reads as a REQUIRED
non-optional lookup (`LEAVE_TYPE_META[request.leaveType]` would be
`undefined`). New cross-repo ask #41 filed for the missing fields.

**Generalizable lesson**: when N-1 of N blockers on an old "stays mock" ask
close from a single BE update, do not half-wire. Verify the LAST field is
genuinely still missing by reading the actual PRESENTATION component's field
usage (not just the domain entity's type declaration) — and if still
missing, correct the stale doc-comment rationale in place (doc-only commit)
+ file a narrower follow-up ask, rather than leaving obsolete blocker text
that no longer matches the current BE contract.

**IAM casing trap reconfirmed a 3rd time**: tenant `roles` enum is UPPERCASE
(`"TEACHER"`), error codes are raw lowercase (`member_list_forbidden`) — the
two conventions coexist in the SAME service and must never be unified or
assumed to generalize to each other.

**Reviewer caught a real perf bug a fully-green test suite didn't surface**:
the pagination-drain loop never forwarded `limit`, so a correctly-terminating
pagination-until-`hasMore:false` test was still running at BE's default page
size (20/page) instead of the cap (100/page) — 5x more RSC-blocking round
trips than necessary for a large tenant. Lesson: a pagination-termination
test proves correctness of the loop's exit condition, not efficiency of its
page size — review specifically for whether `limit`/page-size params are
forwarded on every paginated call, not just whether the loop eventually
stops.

Proof: 434 files / 2964 tests (2963 pre-fix, +1 regression test for the
perf fix), `tsc --noEmit` clean, `bun build` clean, tech-lead APPROVED first
pass (2 one-line SHOULD-FIX items, applied same-branch by the engineer,
re-verified by fe-lead directly). Zero UI/ViewModel/i18n change on both
wired consumers → no design-review/a11y gate needed, matching the
established zero-UI-DI-only precedent (US-E18.8/9/14/20). Push flaked once
on the unrelated (zero-UI-touched) Storybook interaction suite in the
pre-push gate — retried clean on the same commit; matches the known
pre-existing feed/invitations-screen flake noted elsewhere in memory, not
attributable to this US's diff.
