/**
 * Default landing route per role (US-E12.8 follow-up, harness backlog #1).
 *
 * Relocated OUT of `src/components/layout/app-shell/sidebar/nav-config.ts`
 * (a presentation-layer module full of `lucide-react` icons and nav-menu
 * structure) INTO `bootstrap/tenant/` — its real consumers are
 * `role-guard.ts` (this same folder) plus a couple of `app/` route files, all
 * bootstrap-layer/route-layer concerns. Per `.claude/CLAUDE.md`'s layer
 * table, `bootstrap/` may import `domain/`, `infrastructure/`,
 * `bootstrap/lib/*` — never `components/`; the old location had the
 * dependency arrow pointing backwards (it only "worked" because
 * `nav-config.ts` has no `'use client'` and is pure data). `nav-config.ts`
 * no longer defines or re-exports `DEFAULT_ROUTE` at all — every consumer
 * (`role-guard.ts`, `nav-config.test.ts`, and the two `app/` route files that
 * used to import it from `nav-config.ts`) now imports it from
 * `@/bootstrap/tenant` directly, the same direction already established for
 * `tenantUrl` (`app-shell.tsx`, `sidebar.tsx`, `header.tsx`).
 *
 * No behavior change: same values, same shape (`Record<UserRole, string>`,
 * structurally identical to nav-config's local `Role` union so it type-checks
 * as `Record<Role, string>` at every existing call site).
 */
import type { UserRole } from "@/features/auth/domain/entities/auth-user.entity";

export const DEFAULT_ROUTE: Record<UserRole, string> = {
  teacher: "/teacher",
  principal: "/principal",
  student: "/student",
  parent: "/parent",
  admin: "/admin/school-setup",
};
