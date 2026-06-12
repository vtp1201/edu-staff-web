---
name: gotcha-role-record-ripple
description: Adding a member to the Role union breaks every Record<Role,...> map across the app; no edu-role-admin token exists
metadata:
  type: project
---

Adding a member to `Role` (`src/components/layout/app-shell/sidebar/nav-config.ts`)
forces every `Record<Role, T>` to add an entry — `tsc` is the safety net that finds
them all. When I added `"admin"`, `header/role-switcher.tsx` `ROLE_DOT` broke.

**Why:** these maps are exhaustive `Record<Role, …>`, so the compiler rejects a
missing key. Good — but means you can't add a role in isolation.

**How to apply:** after extending `Role` (or `UserRole` in
`features/auth/domain/entities/auth-user.entity.ts`), run `bunx tsc --noEmit` and
fix every `Record<Role,…>` it flags. There is **no `--edu-role-admin` token** in
`tokens.css` — admin role dot reuses `bg-edu-primary` (a new role token would need
an ADR). `DEFAULT_ROUTE.admin = /admin/school-setup`; admin nav has 7 items and no
`/profile` entry (profile via header), so the "profile last" nav test excludes admin.
