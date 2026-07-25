# 0063 Server-derived `authCtx` explicit-role-param — repository-boundary authorization

Date: 2026-07-25

## Status

Accepted

## Context

Three high-risk-lane stories independently arrived at the same shape for
enforcing role/scope authorization on mutating (and, in one case, reading)
repository calls, and `fe-tech-lead-reviewer` flagged all three as "ADR-worthy"
without one ever being written:

- **US-E20.1** `admin/parent-links` — `AuthContext { role, tenantId }`
  (`src/features/admin/parent-links/domain/repositories/i-parent-student-link.repository.ts`),
  threaded as a per-call param into `createLink`/`unlinkLink`.
- **US-E09.5** `staff-discipline` — `StaffDisciplineAuthContext { role, memberId,
  staffMemberId }`
  (`src/features/staff-discipline/domain/entities/staff-discipline-auth-context.entity.ts`),
  same per-call-param shape, on all 8 mutating operations.
- **US-E09.6** `student-absences` — `StudentAbsenceAuthContext { role, memberId,
  classId }`
  (`src/features/student-absences/domain/entities/student-absence-auth-context.entity.ts`),
  **constructor-injected** into the mock repository rather than passed per call.

Why this exists at all: `requireRole()` (`src/bootstrap/auth-guard/`) and the
`(app)/admin/layout.tsx` RSC guard (`evaluateAdminAccess`, US-E12.8) are
**route-level** checks. They gate whether a Server Action or page is reachable
at all, but a route gate is a client-navigable boundary, not a data boundary —
it says nothing about which record a specific mutation call is allowed to
touch (e.g. "is this GVCN the homeroom teacher of `classId`?", "does this link
belong to the caller's own tenant?"). Only two of the three features even have
a route-level RSC guard in the first place: `(app)/admin/**` does
(`evaluateAdminAccess`), but `(app)/principal/**` and `(app)/teacher/**` do
**not** — those routes rely on `requireRole()` inside each `actions.ts` plus
this repository-level re-check, with no layout-level backstop. So the
repository-boundary re-authorization is not "defense in depth" layered on top
of an equally strong guard everywhere; for two of these three features it is
the *only* server-side authorization check that runs on a per-record basis.

Two of the three features (`staff-discipline`, `student-absences`) are also
**permanently mock-first** (`bootstrap/di/staff-discipline.di.ts`,
`bootstrap/di/student-absence.di.ts` — roster-UUID gap, decision precedent
from `discipline.di.ts`/`staff-leave.di.ts`), which makes the mock repository
itself the durable enforcement boundary, not a placeholder swapped out once a
real BE lands.

## Decision

Every role-gated mutation (and, where record ownership matters, every read)
takes a **server-derived authorization context** as an explicit parameter (or,
in the stronger variant, a constructor-injected field) threaded through
`i-<feature>.repository.ts` → use-case → repository implementation:

1. **Shape.** A small `domain/entities/<feature>-auth-context.entity.ts` (or a
   repository-file-local `AuthContext` type, as in `admin/parent-links`) with
   only the fields the feature's checks need — always `role: UserRole`, plus
   whatever scope key the feature enforces (`tenantId`, `memberId`,
   `staffMemberId`, `classId`, …). Never more than the feature needs; never a
   generic "current user" blob.
2. **Assembly — server-only, from the token, never from client input.** A
   `make<Feature>AuthContext()` factory lives ONLY in `bootstrap/di/<feature>.di.ts`
   and reads `decodeRoleClaim(token)` / `decodeSubClaim(token)` /
   `decodeTenantId(token)` off the httpOnly access token
   (`getAccessToken()` from `bootstrap/lib/auth-token.server.ts`). It is never
   constructed in `presentation/`, never accepts a role/scope argument from a
   client payload, and an unreadable/absent claim resolves to a **non-privileged**
   role (`?? "student"` in the two force-mocked features) — deny-by-default,
   not fail-open.
3. **Mock-mode dev affordance, ignored in real mode.** Because
   `decodeRoleClaim` returns a synthetic `"admin"` for any token when
   `NEXT_PUBLIC_USE_MOCK=true` (`bootstrap/lib/jwt.ts`), the DI factory accepts
   a route-scoped `mockRoleHint` (a module-level `as const` in each route's own
   `actions.ts`, e.g. `"principal"` for `principal/staff-discipline`,
   `"teacher"` for `teacher/absences`) used **only** when `useMock` is true. A
   pure resolver function (`resolve-staff-discipline-auth-context.ts`,
   `resolve-student-absence-auth-context.ts`) proves by unit test that real
   mode ignores the hint entirely and that the token claim always wins.
4. **Threading.** The context is passed into the repository method (per-call
   param — `admin/parent-links`, `staff-discipline`) or captured once at
   repository construction (constructor-injected — `student-absences`, the
   stronger variant: no call site can substitute a different role/scope after
   construction, narrowing the forgeable surface to the method's own data
   arguments such as `classId`). Either shape is acceptable; constructor
   injection is preferred for new force-mocked features where one repository
   instance already exists per request.
5. **Enforcement runs first, before any read.** Each mutating method calls an
   `assertCanX()` (or inline equivalent) gate as its **first** statement —
   before any `find`/existence lookup. This is required so a forbidden-role
   caller always gets `forbidden`, never `not-found` (which would leak record
   existence to an unauthorized caller). Example:
   `staff-discipline.mock.repository.ts` checks `authCtx.role !== "principal"`
   before any lookup on approve/reject; `student-absence.mock.repository.ts`'s
   `assertCanWriteClass`/`assertCanFlag` run before `find`.
6. **Deny-by-default scope values are unrepresentable as real keys.** Where a
   scope claim cannot yet be resolved server-side (e.g. no homeroom-class claim
   on today's IAM token — the roster-UUID gap), the resolver sets that field to
   `""`, which can never equal a real id, so the ownership check fails closed
   rather than silently permitting a broad match.

## Testability contract (REQUIRED, not optional)

A story using this pattern is not "done" on NFR/security ACs until it has a
**dedicated security test file** (named `*.security.test.ts`, kept separate
from the general repository test file so a reviewer can find it by name) that:

- Invokes the repository (or use-case, for the constructor-injected variant)
  **directly** with a forged `authCtx` — bypassing the UI and the route gate
  entirely. A test that only proves a button is hidden/disabled in the
  presentation layer does **not** satisfy this contract; the client-side
  affordance is a UX nicety, the repository check is the actual boundary.
- Sweeps every forbidden role for every mutating operation (see
  `staff-discipline.mock.repository.security.test.ts`'s `FORGED_ROLES` sweep
  across all 8 mutating ops), not just one representative case.
- Proves scope-forging is denied even when the identity fields otherwise match
  (e.g. `student-absence.mock.repository.security.test.ts` forging a
  `classId` that isn't the caller's own homeroom; `staff-discipline`'s teacher
  list-scope forced server-side despite a forged `staffMemberId`).
- Proves the "forbidden wins over not-found" ordering where record existence
  is sensitive (approve/reject on a nonexistent id with a forbidden role must
  still return `forbidden`, not `not-found`).
- For the mock-mode dev-hint mechanism (§3 above), a resolver-level unit test
  proving real mode ignores the hint and an unreadable/absent claim resolves
  to deny-by-default.

## When this pattern applies

- Any role-gated **mutation** (create/update/delete/approve/reject/flag), full
  stop — regardless of lane.
- **Always** for high-risk lane stories (auth/RBAC/tenant-isolation flagged at
  intake), per `docs/FEATURE_INTAKE.md`'s hard-gate list.
- Reads where a per-record scope (not just role) determines visibility (e.g. a
  teacher's list must be forced to their own homeroom server-side, not merely
  filtered client-side) should also thread the context, even though the
  read itself isn't destructive.
- Not needed for reads that are already schoolwide/role-agnostic once
  `requireRole()` has passed, and not needed as a *per-call* param when the
  feature has no per-record scope concept at all (role-only gating can stop at
  `requireRole()` + a single repository-level `role !== X` check with no
  additional entity).

## Alternatives Considered

1. **Rely on `requireRole()` + the route/layout gate alone (no repository
   re-check).** Rejected — `requireRole()` is role-only, is invoked at the
   `actions.ts` boundary (bypassable in principle by any code path that reaches
   the repository directly, e.g. a future co-located Server Component or a
   test double), and is entirely **absent** as a layout-level backstop for
   `(app)/principal/**` and `(app)/teacher/**` (only `(app)/admin/**` has
   `evaluateAdminAccess`). A route gate also cannot express per-record scope
   (own tenant, own homeroom class) — only a repository-level check with the
   record's own data in hand can.
2. **Implicit authorization via the HTTP client / session read inside the
   repository (repository calls `getAccessToken()` itself).** Rejected — this
   makes the denial path untestable except through a live HTTP/cookie
   round-trip; the whole point of the explicit-param shape is that a reviewer
   or CI test can call the repository directly with a **forged** role and get
   a deterministic, reproducible `forbidden` result (AC-009.5-class
   acceptance criteria across all three stories require exactly this).
3. **A single generic `CurrentUser`/session object reused across all
   features.** Rejected — each feature only needs a narrow slice of the token
   claims (`tenantId` for parent-links, `classId` for student-absences,
   `staffMemberId` for staff-discipline); a shared blob would either carry
   unused fields (surface-area risk) or force every feature to agree on one
   shape prematurely. A small per-feature entity keeps the type-checker
   enforcing exactly the fields that feature's `assertCanX` checks use.

## Divergence found across the 3 instances (documented, not "fixed" by this ADR)

- **Per-call param (`admin/parent-links`, `staff-discipline`) vs.
  constructor-injected (`student-absences`)** — both are accepted per §Decision
  point 4; constructor injection is the stronger variant (no call site can swap
  the context after construction) and is the preferred default going forward,
  but this ADR does not require retrofitting the two existing per-call-param
  features — that would be a code change out of this docs-only ADR's scope.
- **Field naming is not unified**: `AuthContext.tenantId` (parent-links),
  `StaffDisciplineAuthContext.staffMemberId` (staff-discipline),
  `StudentAbsenceAuthContext.classId` (student-absences) — each names its own
  scope field distinctly rather than sharing one interface. This is
  intentional (§Alternatives #3) and not a defect to reconcile.
- **`admin/parent-links`' interface is literally named `AuthContext`** (module-
  scoped in `i-parent-student-link.repository.ts`), while the other two use a
  feature-prefixed domain entity (`StaffDisciplineAuthContext`,
  `StudentAbsenceAuthContext`) in its own `domain/entities/` file. The
  feature-prefixed domain-entity shape is the one this ADR recommends for new
  instances — a bare `AuthContext` name risks colliding with a future
  feature's own concept of the same name.

## Consequences

Positive:

- Every future high-risk feature has one documented, precedent-backed shape to
  copy instead of reinventing an ad-hoc "is this the right role" check inline
  in a Server Action.
- Denial is reproducible in CI by any engineer/reviewer calling the repository
  directly with a forged context — no live session/cookie needed to prove the
  security property.
- Makes explicit, in one place, that `(app)/principal/**` and
  `(app)/teacher/**` currently have **no** RSC layout-level guard (unlike
  `(app)/admin/**`) — a known gap this ADR does not close (see Follow-Up).

Tradeoffs:

- Adds one small entity + one resolver + one DI factory function per feature
  that needs it — more files than a single inline `if (role !== "admin")`
  would need, justified by the testability requirement above.
- The three existing instances are not shape-identical (see Divergence); a
  reader comparing them side by side must know both are "the same pattern"
  despite the per-call-param vs. constructor-injected difference.

## Follow-Up

- Consider adding an RSC layout-level guard for `(app)/principal/**` and
  `(app)/teacher/**` mirroring `(app)/admin/layout.tsx`'s `evaluateAdminAccess`
  — currently these two route groups depend entirely on per-action
  `requireRole()` + the repository-level `authCtx` check, with no
  layout-level backstop. Out of scope for this docs-only ADR; flag to
  `fe-lead` as a candidate US when next touching either route group.
- When a 4th feature adopts this pattern, prefer the constructor-injected
  variant (§Decision point 4) over the per-call-param shape.
