---
name: project-e12-admin-core
description: E12 Admin Core epic status — US-E12.1–E12.4 + E12.10 implemented; US-E12.5 + US-E12.6 planned
metadata:
  type: project
---

E12 Admin Core epic is the admin-facing configuration flow.

**Implemented:**
- US-E12.1 School Setup — `src/features/admin-school-setup/`
- US-E12.2 Academic Calendar — `src/features/calendar/` (admin route `/admin/calendar`)
- US-E12.3 Subject Catalogue — `src/features/admin/subject-catalogue/` (routes /admin/subjects, /admin/subject-departments)
- US-E12.4 Student Roster — `src/features/admin-roster/` (route /admin/roster, 2026-06-13)
  - Decisions: 0028 (gender indicator tokens), 0029 (gender AA text tokens)
  - DI: `bootstrap/di/admin-roster.di.ts`, endpoint: `bootstrap/endpoint/admin-roster.endpoint.ts`
  - MockRosterRepository seeded with 4 classes + 32 students in 10A1
- US-E12.10 Class Management UI — `src/features/admin/class-management/` (route /admin/classes, 2026-06-14)
  - Create/rename/archive classes, assign homeroom teacher (GVCN)
  - Mock-first (core service + IAM teacher list); 304 tests; 10 Storybook play tests
  - DI: `bootstrap/di/class-management.di.ts`, endpoint: `bootstrap/endpoint/class.endpoint.ts`
  - Nav entry: admin.classManagement added to nav-config.ts

**Planned:** US-E12.5 (timetable), US-E12.6 (assessment scheme)

**Why:** All admin routes are role-guarded server-side via `admin/layout.tsx` (decision 0022). Core service is mock-first (decision 0014).

**Recurring a11y pattern for admin screens:**
- text-edu-text-muted (#8898A9) = 2.9:1 on white — FAILS AA for body text. Use text-edu-text-secondary (#5A6A85 = 5.48:1) for all data content.
- text-edu-success (#13DEB9) on success/10 bg = ~1.6:1 — always use text-edu-success-text (#007A6E, decision 0027) instead.
- text-white on bg-edu-warning = 1.85:1 — always use text-edu-warning-foreground (#2A3547).
- Compact form inputs (outline-none) need has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring on the label wrapper div.
- th elements need scope="col"; empty th needs aria-label.

**Open items:**
- PRODUCT.md for impeccable /init needed (separate Harness item)
- Real repositories need richer error mapping when core service goes live
- Storybook vitest runner blocked env-wide (ERR_REQUIRE_ESM in vite-plugin-storybook-nextjs) — pre-existing issue, separate follow-up
