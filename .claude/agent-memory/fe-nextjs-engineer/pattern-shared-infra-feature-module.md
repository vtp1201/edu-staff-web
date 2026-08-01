---
name: pattern-shared-infra-feature-module
description: E18.23 — screenless shared feature module (iam-directory) composed by consumer DI via optional function ports; IAM UPPERCASE roles vs lowercase error codes; pagination-until-hasMore trap
metadata:
  type: project
---

**A backend capability used by ≥2 features, with no screen of its own, is a full
feature module** (`src/features/<cap>/` domain + infrastructure, NO
`presentation/`) plus its own `bootstrap/di/<cap>.di.ts`. Consumers COMPOSE its
use-cases from their own DI — never from a repository. Precedent chain:
`bootstrap/lib/resolve-current-term.ts` (thin, composes an EXISTING feature) →
`iam-directory` (thick: new entities + failure union + non-trivial algorithms).

**Why:** the alternative (3 consumers each inlining the HTTP call) triples a
non-trivial algorithm and drifts on the next contract nudge — the backend
equivalent of what `component-organization.md` forbids for components.

**How to apply:**
- **Consumer wiring = an optional narrow FUNCTION port, not the use-case class.**
  `export type TeacherDirectorySearch = (p) => Promise<Result<...>>` declared in
  the consumer's own repository file; DI passes a closure pinning the args the
  repo must not own (tenantId from `decodeTenantId(await getAccessToken())`,
  `role: "TEACHER"`). Make it **optional** — dozens of existing wire-level tests
  do `new XRepository(http)`; an optional port keeps them untouched AND makes
  the fake a one-line `vi.fn()`. Absent port must fail-closed (or degrade to the
  pre-existing fallback), never silently return empty.
- **Cross-feature domain TYPE imports are fine** in the consumer repo (types
  only, zero runtime) — precedent `iam-member.repository.ts` importing
  `features/tenant`'s entity. Translate the foreign failure union into the
  consumer's own union at that boundary so it never reaches presentation.
- **The shared module's DI has NO `USE_MOCK` branch.** `USE_MOCK` selects a
  *screen's* data source; a screenless module gating again would allow a
  half-mock/half-real repo (what decision 0014 exists to prevent). Consumers
  gate and simply never reach it in mock mode.
- **Endpoint reuse, not duplication:** when the new GET shares a URL with an
  existing POST route, hoist ONE builder const above the `_EP` object and alias
  both keys to it. A "builder" whose arg is a query param (`?ids=a,b`) is a lie
  — keep it a plain constant and join in the repo.

**IAM contract facts (US-144, still true 2026-08-01):**
- **Two casings coexist and must NOT be unified: roles are UPPERCASE
  (`TEACHER`), error codes are RAW LOWERCASE (`member_list_forbidden`,
  `too_many_member_ids`).** core/social are UPPER_SNAKE for codes; IAM is not.
- `GET /iam/api/v1/tenants/{id}/members` applies `role`/`search` AFTER the
  keyset read → **a short or ZERO-length page while `hasMore:true` is normal.**
  Loop on `hasMore` only; add a MAX_PAGES guard + stop if `nextCursor` is null.
  Test this exact 3-page shape (1 item / 0 items / done).
- `GET /iam/api/v1/members?ids=` caps at 50 and **silently omits** unknown /
  malformed / other-tenant ids — deliberately not an existence oracle. Own the
  chunking in the use-case so callers never see `too_many_member_ids`; keep the
  code mapped anyway (defensive, provable).
- `memberId === userId` (no surrogate id). LEFT members: excluded from the list,
  INCLUDED in batch lookup — BE owns that rule, the mapper must not re-filter.

**N+1 avoidance in a list repo:** collect all ids from the page → ONE batch call
→ Map lookup in the per-row mapper (pass the Map as a mapper param). Assert
`toHaveBeenCalledExactlyOnceWith([...ids])`. A failed lookup returns an EMPTY
map, never a failure — a missing display name is cosmetic; failing the list over
it is a regression. Single-id paths reuse the same route with a 1-element array.

**Doc-comment rot is a deliverable.** E18 comments assert BE gaps ("IAM has no
listing endpoint at all", "memberName has NO BE source", "no tenant-wide list
exists") that later BE stories falsify. When wiring, re-ground-truth EVERY such
claim and rewrite it — a stale blocker rationale is worse than none. Keep a
force-mock when only ONE blocker survives, but say precisely which and file the
narrow ask; never half-wire (real names + fabricated category) — that's worse
than either clean option.

**Storybook suite is flaky at ~1/1083.** One unidentified failure on run 1, then
3 consecutive fully-green runs on an identical tree. Re-run before blaming a
diff — especially when the US touched zero UI files.
