---
name: project-e09-discipline
description: E09 Discipline/Conduct epic — US-E09.1 + US-E09.2 + US-E09.3 all implemented; E09 epic complete
metadata:
  type: project
---

US-E09.1 Discipline Screen (teacher/principal) — implemented 2026-06-17.
- Routes: `/teacher/discipline`, `/principal/discipline`
- 3-tab screen: Vi phạm (Violations) + Hạnh kiểm (Conduct) + Nghỉ phép (Leave)
- Mock-first (core BE not shipped); feature module `src/features/discipline/`
- ADR 0040: `--edu-error-dark` (#b91c1c) + `--edu-error-dark-light` (#fee2e2) for "Nặng" severity
- Pattern used: RSC-props + local-state + Server Actions (not TanStack Query client — matches class-log)
- 425 vitest tests (86 files); 9 Storybook stories; tsc clean; build green
- Nav entry: Scale icon, labelKey `shell.nav.discipline`, teacher + principal roles

US-E09.2 Student Conduct Screen (student + parent) — implemented 2026-06-18.
- Routes: `/student/conduct`, `/parent/conduct`
- Extends `src/features/discipline/` domain with 4 student-scoped repo methods + 4 use-cases
- New use-cases: submit-leave-request (validates reason ≥10 chars, date ≥ today), get-my-conduct-summary, get-my-violations, get-my-leave-requests
- New failure types: `invalid-date`, `reason-too-short`
- New `SubmitLeaveRequestInput` interface in leave-request.entity.ts
- Presentation: `presentation/student-conduct-screen/` — StudentConductScreen + 4 sub-components
- i18n namespace: `discipline.studentConduct.*` (full vi+en); `shell.nav.conduct`
- A11Y: 7 findings fixed (A11Y-001–007) — contrast via `--edu-text-secondary`, form focus-on-error, role="alert" removed from static content, aria-live loading, min-h-11 touch targets, Sheet close i18n, landmark h2+progressbar label
- 436 vitest tests (88 files); 7 Storybook stories with play(); design-review 19/20 PASS
- Button primitive updated: `min-h-11` added to default size for WCAG 2.5.5
- Sheet primitive updated: `closeLabel` prop added for i18n close label

US-E09.3 Staff Leave Management (admin only) — implemented 2026-06-18.
- Route: `/admin/staff-leave` (guarded by existing admin/layout.tsx evaluateAdminAccess)
- New feature module: `src/features/staff-leave/` (completely separate from discipline feature)
- Mock-first (core staff-leave BE not shipped); STAFF_LEAVE_EP in bootstrap/endpoint/
- Pattern: RSC-props + local-state + Server Actions (same as E09.1/E09.2)
- Entities: StaffLeaveRequestEntity (staffRole: teacher|staff, leaveType: annual|sick|personal|family)
- Use-cases: GetStaffLeaveRequests, ApproveStaffLeave, RejectStaffLeave (min 10 char reason)
- Failure union: not-found, already-processed, reason-too-short, missing-reject-reason, network-error
- Presentation: card-based layout (NOT table) with inline reject editor (no modal)
- i18n namespace: `staffLeave` (53 keys, full vi+en); `shell.nav.staffLeave`
- Nav entry: CalendarClock icon, admin role only
- A11Y: 9 findings fixed (A11Y-008–016) — approve button contrast (text-edu-warning-foreground on success bg), destructive button variant fixed to bg-edu-error-dark (9 items: 2 critical + 4 major + 3 minor)
- Button primitive updated: destructive variant now bg-edu-error-dark (ADR 0040 pattern reused)
- 448 vitest tests (91 files); 7 Storybook stories with play(); design-review 13/13 PASS
- Tech-lead APPROVED; QA Conditional Pass (4 minor tech-debt DEFs, no blockers)

**Why RSC-props pattern:** mock-first with no cacheable remote data — consistent across all E09 stories and class-log pattern.

**Key pattern — staff-leave vs discipline:** staff-leave is a SEPARATE feature module (`src/features/staff-leave/`). Do NOT add admin staff-leave concerns to `src/features/discipline/`. The discipline module is student/teacher/principal scoped; staff-leave is admin-scoped. This boundary must be maintained.

**Key a11y note:** `text-edu-success-foreground` (#fff) on `bg-edu-success` (#13deb9) = 1.72:1 — FAILS. Always use `text-edu-warning-foreground` (#2a3547) as dark text on success-green backgrounds for buttons. This is a systemic token gap; `--edu-success-foreground` should not be used on colored button backgrounds.

**QA tech-debt for BE integration follow-up (when core service ships):**
- DEF-002: Add `unauthorized` + `unknown` failure types to failure union + i18n
- DEF-004: Mapper should normalize dates to ISO YYYY-MM-DD (currently stores DD/MM/YYYY)
- AC-8 says "admin/principal" but guard only allows admin — clarify if principal needs access

US-E09.5 Staff Discipline (violations + conduct notes, tabbed, principal author/approve, teacher read-only) — implemented 2026-07-25, merged 37457d7.
- Routes corrected by ADR 0062 mid-BA-intake: `/principal/staff-discipline` + `/teacher/staff-discipline`, NOT `/admin/*` — DR-022's own mockup role checks (`role==='principal'`) contradicted its stated admin-tier placement; ground-truthed before build, not caught by review. Lesson: when a DR's route table and its own reference-mockup role checks disagree, trust the mockup's actual `role===` checks.
- One `IStaffDisciplineRepository` covering both sub-resources' 10 methods (mirrors `i-discipline.repository.ts`'s 3-sub-resources-1-interface precedent) — component-architect confirmed the plan's recommendation without override.
- **`authCtx` explicit-role-param pattern** (2nd use after US-E20.1 parent-links): every repo method takes `{role, memberId, staffMemberId}` so NFR-008 (server-side re-auth independent of client route guard) is directly testable by calling the method with a forged role — this is now a *repeated* pattern across 2 features with no ADR. Flagged by tech-lead-reviewer as ADR-worthy before a 3rd feature copies it.
- Mock-mode role hint: `makeXAuthContext(routeHint)` takes a route-scoped (not client-controllable) role hint used ONLY when `NEXT_PUBLIC_USE_MOCK=true`; real mode always trusts the token claim, deny-by-default on unknown role. Verified end-to-end by reviewer (hint is a literal const in each route's own actions.ts file, never a function param).
- No RSC layout guard exists for `(app)/principal/**`/`(app)/teacher/**` (only `(app)/admin/layout.tsx` has one) — confirmed this is the existing repo-wide pattern (find turned up zero results), not a regression introduced by this story. AC-009.1-class requirements for non-admin roles are carried by the shared auth/tenant gate + server-side per-action authCtx re-check, not a route guard.
- Design-spec fidelity gap caught by tech-lead-reviewer, not by architect/engineer: engineer shipped `category` as free-text Input citing "missing i18n option keys" — but category is a stored WIRE VALUE (data), not UI chrome, so no i18n keys were needed at all and the excuse didn't hold. Lesson: when a design-spec-normative field type (select/segmented) is swapped for a "simpler" control citing an i18n gap, check whether the field's values are actually DATA (excluded from i18n by `.claude/rules/i18n.md`) before accepting the excuse — segmented severity/rating controls had the same issue (S1, should-fix) reusing existing `ui/radio-group variant="segmented"` primitive.
- QA (fe-qa-playwright) found 4 MAJOR test-coverage gaps that a thorough AC-by-AC file-level re-check caught but the engineer's own AC-tagged comments had missed: an adjacent field's test was mistaken for the literal AC subject's test (category select tested, but AC-002.2 literally names staff-member select), "dialog exists" asserted instead of "fields preserved" on network error, one dialog (out of two symmetric ones) had zero coverage for a shared AC pattern, and one tab (out of two symmetric tabs) had zero coverage for a shared AC pattern. Recurring meta-lesson: when a spec has "mirrors X" / "same pattern as Y" language for a second instance, explicitly verify the SECOND instance has its own test, don't assume symmetry implies coverage.
- 5-agent pipeline (planner → component-architect + state-engineer parallel → engineer → tech-lead-reviewer + a11y-auditor parallel → fix pass → QA) ran cleanly end-to-end in one session with zero blocking findings at any gate — tech-lead review found only 1 must-fix + 3 should-fix (all design-spec fidelity, zero security/architecture defects) despite NFR-008/NFR-009 being release-blocking high-risk-grade gates on a "normal" lane story.
- Final: 406 vitest files/2658 tests, 146 Storybook files/994 tests, tsc clean, build green (both routes present).

Remaining in E09 epic: NONE — E09 epic is complete.

ADR 0040: severity dark-red token pattern — if another feature needs "critical/serious" severity, reuse `--edu-error-dark` pair. Also now used for destructive button variant.
