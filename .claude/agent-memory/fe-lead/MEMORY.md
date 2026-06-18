# FE Lead Memory Index

- [Admin role enabler pattern](feedback-admin-role-enabler.md) — order of changes when adding a new role to nav-config + auth entity
- [E07 Design System epic](project-e07-design-system.md) — US-E07.3 StatCard variants + US-E07.4 StatusBadge implemented; decision 0027 accessible text tokens; next id E07.5
- [E12 Admin Core epic](project-e12-admin-core.md) — US-E12.1–E12.4 + E12.5 + E12.8 + E12.9 + E12.10 implemented; US-E12.9 = Staffing UI (3-tab, /admin/staffing, 342 tests); remaining US-E12.6 planned
- [E06 BE Integration epic](project-e06-be-integration.md) — US-E06.3..E06.8 all implemented; E06.8 staffing domain+infra done; UI screen delivered by US-E12.9; remaining: none in E06
- [Concurrent session shared files](feedback-concurrent-session-shared-files.md) — when another /fe session is active, untracked timetable/feature files may be in working tree; stash only i18n + modified tracked files before checkout; never move untracked files that belong to another session
- [Admin role guard pattern](project-admin-role-guard.md) — RSC layout guard pattern for namespace-level RBAC; decodeRoleClaim in jwt.ts; evaluateAdminAccess in bootstrap/tenant/role-guard.ts
- [Parallel branch workflow](project-parallel-branch-workflow.md) — decision 0025: claim via remote branch early-push, dependency check, auto-merge to main on gate-green, delete branch local+remote
- [Storybook runner fix](project-storybook-esm-fix.md) — bun patch @storybook/nextjs-vite@10.4.2 (preset.js require→dynamic import), postcss.config.js CJS, story appDirectory param; ADR 0032; next Storybook upgrade must re-check patch
- [E13 Teacher Workspace epic](project-e13-teacher-workspace.md) — US-E13.4 + US-E13.5 implemented; E13.5 = Principal Teachers Management (teachers table + assignment sheet, 379 tests, A11Y-001–006 fixed); remaining: E13.1/E13.2/E13.3
- [E01 Auth RBAC epic](project-e01-auth.md) — US-E01.1 email+token done; US-E01.2 SSO+multi-role done (ADR 0035 VNeID, ADR 0036 roleEnum); 304 tests
- [E08 App Shell epic](project-e08-app-shell.md) — US-E08.5 Profile Linked Accounts (VNeID+Google) implemented; SSO icons promoted to components/shared/sso-icons/; ReactQueryProvider added to (app)/layout; mock-first all 3 BE endpoints; 341 tests
- [E09 Discipline epic](project-e09-discipline.md) — ALL 3 US implemented; E09.3 Staff Leave (admin, 448 tests, A11Y-008–016 fixed, card layout + inline reject, destructive btn now bg-edu-error-dark); E09 COMPLETE
- [E10 Communications epic](project-e10-communications.md) — US-E10.1 Messaging 2-pane inbox implemented (532 tests, ADR 0041 SSE-in-presentation, ADR 0042 contacts deferred); US-E10.2 planned
