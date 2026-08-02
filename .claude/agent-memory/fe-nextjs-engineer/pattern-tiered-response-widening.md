---
name: pattern-tiered-response-widening
description: US-E18.33 — widening a shared DTO for a role-TIERED response (field absence is the signal), plus the two-source "authority + decoration" roster composition and how a force-mocked DI factory un-mocks
metadata:
  type: project
---

US-E18.33 (parent child names, IAM ADR-0120). Reusable lessons.

**Why:** an endpoint that was staff-tier-only became callable by every tenant
role, but with a NARROWER row. Same shape recurs whenever BE opens an endpoint
to a lower-privilege caller.

**How to apply:**

1. **Tiered response ⇒ optional fields + CONDITIONAL spread.** When the wire
   omits keys for a lower tier, `email?: string` in the DTO is only half the
   fix — the mapper must spread conditionally
   (`...(dto.email !== undefined ? { email: dto.email } : {})`). Copying
   unconditionally materialises `email: undefined`, which destroys the
   presence-based tier signal (`"email" in row`). Assert
   `Object.keys(x).sort()` in the test, not just `toEqual` (toEqual ignores
   undefined-valued keys → the bug passes).
   Do NOT declare fields you never render (dob/gender PII) even though they
   exist on the wire.
   Required → optional is backward-compatible for callers that only read the
   guaranteed field; prove it by running the existing consumer suites UNMODIFIED.

2. **"Authority + decoration" two-source roster.** One call decides WHICH
   entities exist (here `core` linked-students, self-scoped by token `sub`);
   the second only decorates the ids the first returned. Assert
   `expect(resolveNames).toHaveBeenCalledWith([...exact ids])` — that's the
   security-relevant test. Decoration is best-effort (empty map on failure,
   never throws); the authority read is not.

3. **Un-mocking a force-mocked DI factory needs an env-matrix test.** The
   dangerous direction is `USE_MOCK` UNSET (= false = production) still
   serving seeded children. Test `["true", "false", undefined]` with
   `vi.resetModules()` + constructor-NAME comparison (instanceof is dead after
   resetModules). Real branch needs `auth.di`, `http.server`,
   `auth-token.server` AND **`@/bootstrap/lib/jwt`** stubbed — forgetting
   `decodeSubClaim` makes the id null and the factory silently takes the
   "unidentifiable caller" path instead of the network path.

4. **Un-mocking one factory can break an unrelated RSC page test.** A page that
   composed a force-mocked roster + a force-mocked data read never touched
   `cookies()`. Once ONE of them goes real, the RSC test throws
   "`cookies` was called outside a request scope". Stub the session seam in
   that page test rather than reverting.

5. **Narrow the repository interface instead of stubbing.** If the new real
   implementation only serves 1 of N interface methods, export
   `type IXRepository = Pick<IBigRepository, "theMethod">` and narrow the
   use-case ctor — the full mock still satisfies it structurally, zero test
   edits.

6. **Optional trailing ctor arg keeps ~30 existing wire-level tests green** when
   injecting a new collaborator into a big existing repository (absent =
   previous behaviour). Established precedent: `staffing.repository.ts`.

7. **Ground-truth the brief.** Two of this brief's premises were wrong: the
   `linked-students` wire had no name (so BOTH consumers needed the lookup, not
   just one), and the "already real names" sibling feature (`parent-links`) was
   entirely mock-first. Read the openapi schema AND the sibling's `*.di.ts`
   `USE_MOCK` branch before believing "X already has real data".

8. **Story that proves a mapper, not a fixture.** Build the story's `childList`
   by CALLING the real mapper with a real wire shape + name map. A hand-written
   fixture story passes forever even if the join regresses.
