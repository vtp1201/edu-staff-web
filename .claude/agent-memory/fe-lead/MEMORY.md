# FE Lead Memory Index

- [Admin role enabler pattern](feedback-admin-role-enabler.md) — order of changes when adding a new role to nav-config + auth entity
- [E07 Design System epic](project-e07-design-system.md) — US-E07.3 StatCard variants + US-E07.4 StatusBadge implemented; decision 0027 accessible text tokens; next id E07.5
- [E12 Admin Core epic](project-e12-admin-core.md) — US-E12.1–E12.4 + E12.10 implemented; US-E12.5 timetable-builder implemented; remaining US-E12.6 planned
- [E06 BE Integration epic](project-e06-be-integration.md) — US-E06.3..E06.8 all implemented; E06.8 staffing domain+infra done (no UI screen, design-needed); remaining: none in E06
- [Concurrent session shared files](feedback-concurrent-session-shared-files.md) — when another /fe session is active, untracked timetable/feature files may be in working tree; stash only i18n + modified tracked files before checkout; never move untracked files that belong to another session
- [Admin role guard pattern](project-admin-role-guard.md) — RSC layout guard pattern for namespace-level RBAC; decodeRoleClaim in jwt.ts; evaluateAdminAccess in bootstrap/tenant/role-guard.ts
- [Parallel branch workflow](project-parallel-branch-workflow.md) — decision 0025: claim via remote branch early-push, dependency check, auto-merge to main on gate-green, delete branch local+remote
- [Storybook runner fix](project-storybook-esm-fix.md) — bun patch @storybook/nextjs-vite@10.4.2 (preset.js require→dynamic import), postcss.config.js CJS, story appDirectory param; ADR 0032; next Storybook upgrade must re-check patch
- [E13 Teacher Workspace epic](project-e13-teacher-workspace.md) — US-E13.4 TeacherDashboardHome implemented; real BE for total-students (paginated classes+roster); rest mock-first; 291 tests pass
