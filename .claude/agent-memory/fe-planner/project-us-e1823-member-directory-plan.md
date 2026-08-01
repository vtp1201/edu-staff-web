---
name: project-us-e1823-member-directory-plan
description: US-E18.23 member-directory wiring plan — shared iam-directory module decision, staff-leave stay-mock decision
metadata:
  type: project
---

Planned 2026-08-01 for US-E18.23 (member-directory wiring, IAM US-144 + core
US-149). Plan written into
`docs/stories/epics/E18-be-wiring/US-E18.23-member-directory-wiring/story.md`
`## Implementation Plan`.

Key decisions:
1. **New shared feature module `src/features/iam-directory/`** (domain+infra,
   no presentation) + `bootstrap/di/iam-directory.di.ts`, composed into by
   `class-management`/`staffing`(/`staff-leave` if ever unblocked) DI
   factories — NOT 3 independent inline HTTP calls. Precedent used to justify
   this: `src/bootstrap/lib/resolve-current-term.ts` (US-E18.11/US-E18.12)
   already established that `bootstrap/di`/`bootstrap/lib` composing across
   features (decision 0017) is the sanctioned pattern in this epic — but that
   precedent composes an EXISTING feature's use-case via a bare lib function;
   iam-directory is genuinely NEW domain (pagination loop, batching/chunking,
   3rd lowercase-IAM-code taxonomy) so it earns a full feature module, with
   the *composition* glue (not the domain) living in each consumer's
   `bootstrap/di/<x>.di.ts`.
2. **staff-leave: recommended stay mock-first** even after US-149 closes the
   list/staffMemberId gap — `department`/`leaveType` are non-optional fields
   consumed directly by the presentation component
   (`LEAVE_TYPE_META[request.leaveType]` un-guarded lookup, `· {department}`
   interpolation) with zero wire source; inventing values is forbidden, and
   the alternative (redesign the badge/line to tolerate missing data) is
   disproportionate design-review/component-architect scope for a "normal"
   lane wiring US. Recommended new cross-repo ask #41 instead of wiring.

Reusable takeaway: when this repo's own precedent (bootstrap/lib composition
of an EXISTING feature) doesn't quite fit because the shared logic is
genuinely NEW domain (not just resolving/joining data from an already-real
feature), a proper new feature module is justified — the "one component/repo,
one home" rule (`component-organization.md`) generalizes to backend
capabilities: 2-3 near-identical non-trivial implementations = duplication
smell, not just UI components.
