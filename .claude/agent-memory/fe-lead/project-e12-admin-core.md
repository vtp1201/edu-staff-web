---
name: project-e12-admin-core
description: E12 Admin Core epic status — US-E12.1–E12.4 + E12.5 + E12.8 + E12.9 + E12.10 implemented; US-E12.6 planned
metadata:
  type: project
---

E12 Admin Core epic is the admin-facing configuration flow.

**Implemented:**
- US-E12.1 School Setup — `src/features/admin-school-setup/`
- US-E12.2 Academic Calendar — `src/features/calendar/` (admin route `/admin/calendar`)
- US-E12.3 Subject Catalogue — `src/features/admin/subject-catalogue/` (routes /admin/subjects, /admin/subject-departments)
- US-E12.4 Student Roster — `src/features/admin-roster/` (route /admin/roster, 2026-06-13)
- US-E12.5 Timetable Builder — `src/features/admin/timetable/` (route /admin/timetable)
- US-E12.8 Admin Route Guard — RSC layout guard, decodeRoleClaim, evaluateAdminAccess
- US-E12.9 Staffing UI — `src/features/admin/staffing/presentation/` (route /admin/staffing, 2026-06-14)
  - 3-tab screen: DepartmentsScreen / PositionTitlesScreen / AssignmentsScreen
  - Domain/infra from E06.8 (StaffingRepository, use-cases, mock fixtures)
  - Nav entry: `shell.nav.staffing` + icon `Users2` added to nav-config.ts admin section
  - isAdmin prop gates all write actions (RBAC); motion-safe on Sheet+AlertDialog; icon-lg 44px
  - Mock-first academic-year validation in assignPositionAction (core not live yet, decision 0014)
  - 342 tests pass; bun build green; tech-lead Approved; a11y 3 major findings fixed
- US-E12.10 Class Management UI — `src/features/admin/class-management/` (route /admin/classes, 2026-06-14)

**Planned:** US-E12.6 (assessment scheme — design pending DR-001)

**Why:** All admin routes are role-guarded server-side via `admin/layout.tsx` (decision 0022). Core service is mock-first (decision 0014).

**Recurring a11y pattern for admin screens:**
- text-edu-text-muted (#8898A9) = 2.9:1 on white — FAILS AA for body text. Use text-edu-text-secondary (#5A6A85 = 5.48:1) for all data content.
- text-edu-success (#13DEB9) on success/10 bg = ~1.6:1 — always use text-edu-success-text (#007A6E, decision 0027) instead.
- text-white on bg-edu-warning = 1.85:1 — always use text-edu-warning-foreground (#2A3547).
- text-white on bg-edu-error-text = use text-edu-error-foreground token instead.
- Compact form inputs (outline-none) need has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring on the label wrapper div.
- th elements need scope="col"; empty th needs aria-label.
- Blocked-action buttons (aria-disabled=true): always add aria-describedby pointing to sr-only hint span with reason text.
- Sheet + AlertDialog animations: always prefix animate-*/fade-*/slide-*/zoom-* with motion-safe:.

**Open items:**
- EmptyState component triplicated in staffing screens — promote to components/shared/empty-state/ as follow-up (tech-lead should-fix, non-blocking)
- PRODUCT.md for impeccable /init needed (separate Harness item)
- Real repositories need richer error mapping when core service goes live
- Storybook vitest runner blocked env-wide (ERR_REQUIRE_ESM in vite-plugin-storybook-nextjs) — pre-existing issue, separate follow-up
