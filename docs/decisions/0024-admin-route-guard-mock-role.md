# 0024 Admin Route Guard — Mock-First Role Claim Decoding

Date: 2026-06-13

## Status

Accepted

## Context

US-E12.8 implements a server-side route guard that enforces `role === "admin"`
before rendering any `/admin/*` page. The guard reads the user's role from the
JWT in the `auth_token` httpOnly cookie.

IAM BE (US-049) has not yet issued a `role: "admin"` claim in real JWTs. Until
it does, all local development and test flows that use mock data
(`NEXT_PUBLIC_USE_MOCK=true`) would be blocked by a real role check — because
the mock JWT or empty token would yield `role = null`, which redirects away from
`/admin/*`.

Additionally, the exact JWT claim name is not yet confirmed by IAM openapi.yaml:
it may be `role` (scalar) or `memberRoles` (array). The current `auth.mapper.ts`
maps `roles[]` from `UserProfileResponse` (a REST response, not a JWT claim).

## Decision

1. `decodeRoleClaim(token: string): UserRole | null` in `bootstrap/lib/jwt.ts`
   reads the `role` scalar claim from the JWT payload. If IAM later issues
   `memberRoles: string[]`, the implementation maps `memberRoles[0]` to the
   scalar.

2. When `NEXT_PUBLIC_USE_MOCK === "true"`, `decodeRoleClaim` returns `"admin"`
   for any non-null, non-empty token string, bypassing the real claim check.
   This is the mock-first pattern (decision 0014) — the same gating already
   used in DI factories (`bootstrap/lib/mock.ts`).

3. The mock bypass is implemented in `decodeRoleClaim` itself (not in the
   layout) so it is fully visible and testable in unit tests with `NEXT_PUBLIC_USE_MOCK`
   set/unset via `import.meta.env` or `process.env`.

4. When the IAM service publishes a real `role: "admin"` claim (US-049), the
   mock branch can be removed without changing the `admin/layout.tsx` guard
   logic — only `decodeRoleClaim` changes.

## Alternatives Considered

1. **Always enforce real claim, require a test token** — blocks local dev until
   IAM ships. Not acceptable for a mock-first repo.

2. **Mock at the layout level** (`if (USE_MOCK) return children`) — hides the
   mock logic in the layout rather than the decode function; harder to see and
   test; the decode function becomes the natural seam.

3. **Separate `decodeRoleClaimMock` helper** — adds indirection without benefit;
   a single function with an explicit `USE_MOCK` branch is cleaner.

## Consequences

Positive:

- Local development (`USE_MOCK=true`) continues to work for all `/admin/*`
  screens without a real IAM token.
- The mock branch is isolated in one function and fully unit-tested.
- When IAM ships the real claim, removing the mock branch is a one-line change.

Tradeoffs:

- `decodeRoleClaim` reads `process.env.NEXT_PUBLIC_USE_MOCK` at call time.
  This is consistent with `bootstrap/lib/mock.ts` (`USE_MOCK` constant) and
  does not introduce a new pattern.
- If IAM issues `memberRoles[]` instead of `role` scalar, a small mapper
  update is needed. The unit tests cover both shapes to catch this early.

## Follow-Up

- Remove mock bypass once IAM US-049 ships `role: "admin"` in JWT claims.
- Align `decodeRoleClaim` with `openapi.yaml` when available.
- Consider middleware-level defense-in-depth guard as a hardening follow-up
  (reads `request.cookies.get(AUTH_COOKIE)` in edge runtime — feasible but
  lower priority than the RSC guard).

## Related

- decision `0014` — mock-first pattern (`NEXT_PUBLIC_USE_MOCK`)
- decision `0019` — auth endpoint alignment (IAM token shape)
- decision `0022` — admin role separation
- US-E12.8 — admin route role guard
- IAM US-049 — BE admin role claim
