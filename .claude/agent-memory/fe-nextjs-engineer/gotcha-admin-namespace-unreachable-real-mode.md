---
name: gotcha-admin-namespace-unreachable-real-mode
description: No BE role enum maps to the appRole `admin`, so the whole `/admin/*` namespace is mock-mode-only in practice — check this before claiming an admin-gated feature is reachable in real mode
metadata:
  type: project
---

`ROLE_ENUM_TO_APP` (`features/auth/domain/entities/role-meta.ts`) maps BE
`ADMIN` **and** `MANAGER` both onto the appRole **`principal`**. Nothing maps to
`admin`. The `/admin/*` namespace guard is strict equality `role === "admin"`
(`evaluateAdminAccess`), and `decodeRoleClaim` only returns `"admin"` for a
literal `"admin"` claim — or for ANY token when `NEXT_PUBLIC_USE_MOCK=true` and
`NODE_ENV !== "production"` (`jwt.ts` dev shortcut).

⇒ With a live IAM token, **nobody reaches `/admin/*`**, including a BE ADMIN.

**Why:** found while wiring US-E18.48 (whole-school timetable conflicts scan,
BE US-188 = ADMIN/SUPER_ADMIN only). The AC "MANAGER/principal cannot reach
this surface" is over-satisfied — but so is "BE ADMIN can", which is the role
the endpoint actually authorises. This is platform-wide and pre-existing
(roster, invitations, grade-book, timetable all sit under `/admin/*`), NOT
something a single story introduced.

**How to apply:**
- When a story's AC is "role X cannot reach this", prove it by composing
  `decodeRoleClaim(token) → evaluateAdminAccess(...)`, not by asserting a
  hand-written appRole — the mapping is where the real answer lives. Stub
  `NEXT_PUBLIC_USE_MOCK=false` in that test or the dev shortcut hands you
  `"admin"` and the test proves nothing.
- Do NOT "fix" it inside a feature story: changing `ADMIN → "admin"` moves every
  BE ADMIN user out of the `principal` namespace app-wide (different landing
  route, different screens). That is an ADR, flag it to `fe-lead`.
- Related: [[gotcha-affordance-unreachable-by-role]] — same class of defect one
  level down (right guard, wrong mounting route).
