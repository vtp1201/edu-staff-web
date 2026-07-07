---
name: project-e12-admin-core
description: E12 Admin Core epic status — US-E12.1–E12.4 + E12.5 + E12.8 + E12.9 + E12.10 + E12.12 implemented; US-E12.6 planned
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
- US-E12.12 Audit Log (admin, read-only, append-only, cursor-paginated) — `src/features/audit-log/` (route /admin/audit-log, 2026-07-06/07)
  - Mock-first (core US-064 audit endpoint status unconfirmed anywhere in repo); REAL repo fully wired (not a bare not-implemented scaffold) so its contract is provable now — DI still selects Mock while USE_MOCK=true, flip is a one-line change later
  - First screen combining RSC-seeded `initialData` + client `useInfiniteQuery` (no `HydrationBoundary` pattern exists in this repo) — see fe-state-engineer memory `reference-query-key-conventions.md`
  - Applied filter lives in URL search params (draft/applied split preserved from design mockup, draft debounced into URL) — query key is the applied filter, so a filter change is a brand-new infinite-query cache entry (no manual page reset needed)
  - Key defect caught by review: `useInfiniteQuery`'s `isError` collapses first-page AND load-more failures into one flag — naive `status = query.isError ? "error" : ...` wipes already-loaded rows on a failed "load more". Fix: `firstPageError = query.isError && events.length === 0` gates the full-table error banner; a separate local `loadMoreError` state (set via `fetchNextPage({ throwOnError: true }).catch(...)`) drives an inline retry near the load-more button instead. Also: `fetchNextPage()` WITHOUT `{ throwOnError: true }` silently swallows the rejection (TanStack Query v5 `QueryObserver` catches with noop) — `.catch()` alone never fires without that option.
  - 219 test files / 1143 tests; tech-lead Approved-after-fix; a11y clean PASS (0 findings); QA PASS (13/13 AC covered, strengthened 2 assertions)
  - Follow-ups flagged in story Harness Delta: BE US-064 confirmation before USE_MOCK=false; promote `DateRangeFields` to `components/shared/` on 2nd use; strengthen `Filter_EntityType`/`Filter_DateRange` stories to drive real inputs instead of seeded fixtures

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
