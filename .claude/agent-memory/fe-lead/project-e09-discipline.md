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

Remaining in E09 epic: NONE — E09 epic is complete.

ADR 0040: severity dark-red token pattern — if another feature needs "critical/serious" severity, reuse `--edu-error-dark` pair. Also now used for destructive button variant.
