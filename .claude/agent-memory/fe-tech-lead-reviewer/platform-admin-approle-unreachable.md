---
name: platform-admin-approle-unreachable
description: No BE role enum maps to appRole "admin", so the whole /admin/* namespace is mock-mode-only in practice — ADR-worthy, verified 2026-08-07
metadata:
  type: project
---

`src/features/auth/domain/entities/role-meta.ts` `ROLE_ENUM_TO_APP` maps
`TEACHER→teacher`, `ADMIN→principal`, `MANAGER→principal`, `STAFF→teacher`,
`STUDENT→student`, `PARENT→parent`. **Nothing maps to `admin`.**
Every `/admin/*` layout gates on strict equality `role === "admin"`
(`bootstrap/tenant/role-guard.ts` → `evaluateNamespaceAccess`). The only path
to `admin` is `decodeRoleClaim`'s mock branch (`bootstrap/lib/jwt.ts`:
`NODE_ENV !== production && NEXT_PUBLIC_USE_MOCK === "true"` → `"admin"` for
any non-empty token) or a token whose `role` claim is literally `"admin"`.

**Why it matters:** it makes ADMIN-only BE endpoints over-safe (MANAGER really
is blocked) but also means the real-mode admin surface is unreachable by the
very BE role that authorises it. Already noted in code at
`src/features/feed/domain/policies/feed-role.ts:9` — but there is **no ADR**
(0036 covers preserving the BE enum, not this gap).

**How to apply:** when a story's AC is "MANAGER cannot reach X" on an
`/admin/*` route, the guard genuinely satisfies it — don't ask for extra
gating. But flag the reachability gap to `fe-lead` as ADR-worthy rather than
letting a story silently absorb it; changing the map moves every BE ADMIN user
out of the `principal` namespace app-wide.

Related: [[recurring-violations]], [[conventions]].
