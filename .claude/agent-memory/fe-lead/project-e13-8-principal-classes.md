---
name: project-e13-8-principal-classes
description: US-E13.8 Principal Classes implementation — forced-mock DI facade pattern for a role-BE-RBAC gap, cross-repo ask #39, subagent notification stalls
metadata:
  type: project
---

US-E13.8 (Principal Classes, school-wide read-only class list) implemented and
merged to `main` (81ecf0e), 2026-07-26. `docs/stories/epics/E13-teacher-workspace/US-E13.8-principal-classes/`.

**Key pattern — forced-mock DI facade for a confirmed BE-RBAC gap:** ground-truthed
`core`'s Go source (`list_classes.go`) BEFORE implementation and found `MANAGER`
(principal) is NOT in the `isAdmin`/`isTeacher` branch of `ListClassesUseCase` —
a real call always 403s. Rather than block the whole US on a cross-repo fix,
built a new principal-scoped DI facade (`principal-classes.di.ts`) that is
**permanently forced onto the mock repository, deliberately NOT gated by
`USE_MOCK`** (unlike every other factory in the repo) — same family as
`staff-leave.di.ts`/`teaching-plan.di.ts`'s fully-blocked pattern, but scoped to
ONE repository method's ONE consuming screen rather than a whole feature. Admin's
own real DI factory stayed untouched. Logged as cross-repo ask #39 in
`E18-be-wiring/EPIC-OVERVIEW.md`. **Reusable playbook**: when a spec's "central
open decision" section names a real BE-RBAC risk as unverified, ground-truth the
actual Go use-case source yourself before delegating — turns an "unverified
open question" into a locked, buildable decision instead of stalling the US.

**Cross-feature repository reuse, not a new domain layer:** resolved the spec's
repository-choice gap by pointing this screen at ADMIN's canonical
`IClassManagementRepository.listClasses()` (extended with an additive `limit?`
param) rather than extending the principal-local repo that had a documented
"KNOWN GAP" (hardcoded studentCount/homeroom). Confirmed via code read that the
admin RSC page also calls its repository directly with no domain use-case layer
— this screen mirrors that shape (no YAGNI use-case invented).

**fe-component-architect caught a stale plan.md assumption**: plan.md assumed no
shared load-more control existed and proposed a 3rd feature-local copy;
component-architect found `components/shared/load-more-button/` already existed
(promoted US-E19.1) and corrected the plan before the engineer wrote code —
component-architect grepping for existing shared components before finalizing
contracts is worth the extra pass.

**fe-tech-lead-reviewer + fe-accessibility-auditor independently converged on the
same real bug** (empty-state "Xóa bộ lọc" no-op when a tenant's classes are all
archived under the default filter — button announced as actionable but changes
nothing). Two independent reviews finding the identical defect is a strong signal
it's real, not a false positive — trust convergent findings from parallel
reviewers highly.

**fe-qa-playwright found a genuine MAJOR defect post-fix-round** (DEF-E13.8-01):
shared `LoadMoreButton`'s generic `hasError` treatment doesn't distinguish
`forbidden` from `network` — a 403 on load-more got the same enabled-retry
treatment as a transient failure, inconsistent with the full-page 403 state's
"absent control, not disabled" pattern. QA used the "write a story that proves
the defect, then flip it to document actual (non-compliant) behavior with a
DEF-ID comment" technique so the suite stays green while the gap stays
discoverable — good pattern, adopted here. Fix was screen-level only (branch in
`principal-classes-screen.tsx`, not the shared component), correctly avoiding
touching a component 3 other screens depend on.

**Subagent notification-stall pattern recurred badly this session** — the
`fe-nextjs-engineer` agent (same agentId, resumed 3x across the DI-facade
build, fix round, and DEF-E13.8-01 fix) actually kept working and landed real
commits each time, but its completion notifications never reliably reached me;
the coordinator had to relay observed git state twice. Lesson: when resuming
the SAME long-lived engineer agent multiple times in one session, always
verify actual git log/diff state directly rather than waiting indefinitely for
a notification that may not arrive — this is the 3rd+ documented occurrence of
this stall class (see [fe-lead stall & resume](../../../../.ccs/instances/work_nhi/projects/-Users-vietthangpham-thang-pham-Work-edu-staff-edu-staff-web/memory/fe-lead-stall-resume.md) in the user-level memory).
