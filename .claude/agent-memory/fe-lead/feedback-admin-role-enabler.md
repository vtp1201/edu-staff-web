---
name: feedback-admin-role-enabler
description: Pattern for adding a new role to nav-config + auth entity — the admin role enabler delivery (US-E12.1 Phase 1)
metadata:
  type: feedback
---

When adding a new role to the shell (nav-config.ts), the pattern is:
1. Add i18n keys to shell.nav.* first (both vi.json + en.json) — TypeScript will error if keys missing
2. Add new Lucide icon imports in nav-config.ts
3. Extend Role union type
4. Add NAV_BY_ROLE.[newRole] array
5. Add DEFAULT_ROUTE export (Record<Role, string>)
6. Extend ROLE_LABEL_KEY
7. Update nav-config.test.ts — note: not all roles have /profile as last item (admin doesn't)
8. Update auth-user.entity.ts UserRole union

**Why:** nav-config.ts NavLabelKey type is derived from `typeof messages.shell.nav` — adding keys without i18n first causes TypeScript errors.

**How to apply:** Any future role additions follow this exact order. The test "always exposes the shared profile entry last" must filter out roles that don't have /profile in their nav.
