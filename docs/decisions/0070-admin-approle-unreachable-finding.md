# 0070 Admin appRole is structurally unreachable via real IAM tokens

Date: 2026-08-07

## Status

Accepted (informational finding — no remediation chosen yet, see Follow-Up)

## Context

`fe-tech-lead-reviewer` found this while reviewing US-E18.48 (whole-school
timetable conflicts scan, admin-only route): `ROLE_ENUM_TO_APP`
(`src/features/auth/domain/entities/role-meta.ts`) maps every IAM role enum
to an `UserRole` appRole:

```ts
export const ROLE_ENUM_TO_APP: Record<string, UserRole> = {
  TEACHER: "teacher",
  ADMIN: "principal",
  MANAGER: "principal",
  STAFF: "teacher",
  STUDENT: "student",
  PARENT: "parent",
};
```

**No entry ever produces `"admin"`.** Both BE `ADMIN` and `MANAGER` collapse
onto appRole `principal`. Yet `UserRole` itself includes `"admin"` as a valid
member (`APP_ROLE_LANDING` in the same file has an `admin: "/dashboard"`
entry), and the entire `/admin/*` route namespace
(`(app)/admin/layout.tsx` → `evaluateAdminAccess` → `evaluateNamespaceAccess(role,
..., "admin")`, strict equality) exists and is guarded as if some real actor
could reach it.

The only way `decodeRoleClaim()` ever returns `"admin"` today is the
mock-mode branch in `bootstrap/lib/jwt.ts` (`NEXT_PUBLIC_USE_MOCK=true`
short-circuits to a fixed `"admin"` claim for dev/demo/Storybook). No real
IAM-issued token, under the current `ROLE_ENUM_TO_APP` mapping, can ever
produce appRole `admin`.

This is **not a security hole** — every `/admin/*` guard fails closed
correctly (deny-by-default, `redirect()` before render), so the practical
effect of this gap is that the *entire admin surface is currently reachable
only in mock mode*, not that anyone under-authorized gets in. It has been
noted informally in-code before this ADR (`src/features/feed/domain/policies/feed-role.ts:9`)
but never registered as a decision, and it kept resurfacing across multiple
BE-wiring stories this session (US-E18.13's admin/principal read distinctions,
US-E18.44's role-discriminated grade VM, US-E18.48's admin-only conflicts
scan) without ever being named as a platform-level gap.

## Decision

Register the finding. Do **not** pick a remediation path yet — that is a
product/BE-contract decision, not something a wiring story should decide
unilaterally. Two concrete options exist for whoever picks this up:

1. **BE mints a distinct `ADMIN`-only claim path** (e.g. a platform-level
   `SUPER_ADMIN`-adjacent enum, or split `ADMIN` off from the tenant-`MANAGER`
   grant it currently shares) so a real token can carry an actor FE can map to
   `admin` distinctly from `principal`.
2. **FE retires the `admin` appRole** and folds every `/admin/*` route into
   the `principal` namespace (since `ADMIN`+`MANAGER` already collapse onto
   one appRole everywhere else) — this would mean deleting the separate
   `/admin/*` route tree and the `admin` member of `UserRole`, a real
   architecture change touching every admin-only screen built so far in this
   epic.

Neither is a small change. Until one is chosen, `/admin/*` stays
demo/dev-reachable only via `NEXT_PUBLIC_USE_MOCK=true` — this is the current,
accepted state, not a regression to fix in any single wiring story.

## Alternatives Considered

1. Silently patch `ROLE_ENUM_TO_APP` to map `ADMIN` → `"admin"` instead of
   `"principal"` in whichever story next touches this file — REJECTED: this
   would split every existing `/principal/*` screen's data/behavior for BE
   `ADMIN` actors without a coordinated audit of what actually needs to change
   for them (most `/principal/*` screens' own RBAC gates were verified
   against `MANAGER`+`ADMIN` sharing behavior — silently un-sharing them is a
   correctness risk, not a fix).
2. Ignore it as out-of-scope forever — REJECTED: it is a real gap that will
   keep resurfacing (this is the 4th time it's been noted across stories this
   epic) and deserves a named, findable decision so the next person doesn't
   re-discover it from scratch.

## Consequences

Positive:

- The gap is now documented in one place (`docs/decisions/0070-*`) instead of
  scattered code comments across `feed-role.ts`, various admin-route
  doc-comments, and reviewer verdicts.
- Future stories touching `/admin/*` or `ROLE_ENUM_TO_APP` can cite this ADR
  instead of re-deriving the finding.

Tradeoffs:

- `/admin/*` remains genuinely untestable against a real IAM token until
  either remediation option is chosen and built — live-BE QA of any
  admin-only screen (this epic has built several: staffing, class
  management, roster, assessment scheme, timetable conflicts scan) can only
  be smoke-tested in mock mode for now.

## Follow-Up

- Cross-repo ask: confirm with BE whether option 1 (a distinct admin-tier
  claim) is planned, or whether `ADMIN`/`MANAGER` are intentionally meant to
  be one tenant-admin tier forever (in which case option 2 — retiring the FE
  `admin` appRole/route split — is the right call).
- Until resolved, do not add further `/admin/*`-only screens assuming a real
  token will ever reach them without re-checking this decision first.
