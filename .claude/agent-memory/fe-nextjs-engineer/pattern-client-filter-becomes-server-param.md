---
name: pattern-client-filter-becomes-server-param
description: US-E18.29 — un-mocking a list whose client-side filter becomes a real server param (per-tab infinite query, dropped count badges, short-page-with-hasMore trap, Retry-After on shared ApiError, hybrid-collaborator retirement)
metadata:
  type: project
---

Un-mocking `admin/invitations` list+resend (IAM US-147). Applies to any
mock-first list whose **client filter becomes a real wire param**.

**A client `.filter()` turning into a server param cascades further than the
query key.** `status` moving into `GET ?status=` meant: key gains the dimension
(one `useInfiniteQuery` per tab), the client filter helper LOSES its status
branch (search-only — narrow its signature, don't leave a redundant second
filter), and per-tab **count badges become undeletable-by-relabelling**: each tab
is lazily fetched, so any number for a never-visited tab is either fabricated
(prefetch all 5) or stale. Dropping the badge entirely is the honest fix — but it
changes every tab's accessible name, so it is a second design-review surface on
top of the new control.

**Short-page-with-hasMore strands an empty state.** IAM/core apply filters AFTER
a bounded keyset read, so page 1 can be EMPTY with `hasMore: true`. I first gated
`<LoadMoreButton>` on `showTable` (the natural place) — that renders the empty
state with no way to follow the cursor. Gate it on `!error && !loading` instead
and let the component's own `!hasMore → null` do the hiding. Story it explicitly:
empty page 1 → click load-more → real rows appear.

**Header-derived failure data on the SHARED `ApiError`.** 429 `Retry-After` was
the repo's first header read: add an optional `retryAfterSeconds` + a
`retryAfterSecondsOf()` reader in `bootstrap/lib/api-envelope.ts`, parse from
`response.headers` in `normalizeError` (case-insensitive; ignore the RFC
HTTP-date form — BE's contract is delta-seconds). Purely additive, ~0 blast
radius. Thread it as a NUMBER through failure → action result
(`{errorKey, retryAfterSeconds?}`), never as pre-translated copy; presentation
picks between a `{seconds}` string and a wait-less fallback key.

**Retiring a force-mock hybrid: delete the second collaborator, don't keep an
identical twin.** `new InvitationRepository(mutationsIam, listIam, …)` existed
ONLY to express "list/resend always mock". Once both are real the plan's literal
sketch passed the same instance twice — dead structure contradicting its own doc
comment. Collapsing to one `iam` param (and updating the "routes through the LIST
repo" test that only proved force-mocking) is the honest read of the AC.

**Secondary name resolution = a FUNCTION collaborator, not a repo.**
`resolveNames: (ids) => Promise<Map<id,name>>` lets mock mode wire an identity map
(`id → id`, since mock `invitedBy` already holds a display name) so
`iam-directory.di.ts` stays real-only by its own design. Real mode composes
`makeBatchResolveMembersUseCase()`; **`MemberSummary.memberId` IS the userId**
(openapi: "member ids (= user ids)") so it keys `invitedBy` directly — verify
this, the field names differ from what a plan will guess (`memberId`/`displayName`,
not `id`).

**Unresolved display name: blank in the repo, translate in presentation.** The
repo can't call `t()`, and emitting a raw UUID is the thing AC-3 forbids → map
misses to `""` and add an `invitedByFallback: string` to the row-VM label bag.
Keeps i18n at the presentation boundary with a one-line `||` in `buildRowVM`.

**Align the MOCK to the real guard matrix while you're there.** The old mock threw
one generic race failure for every non-expired row; real BE distinguishes 410
(absent/TTL-swept) from 409 (accepted/revoked) and resends ANY pending row. Fixing
the mock is how the new 409 branch gets exercised in dev, and the mock test is the
cheapest place to encode the contract.

Proof: 440 files/3166 tests, Storybook 151/1122 (+12 stories), tsc + lint clean,
`bun run build` green in mock AND real mode.

Related: [[pattern-boundary-narrow-remap]], [[pattern-be-wiring-remap]],
[[pattern-rsc-seeded-infinite-query]], [[pattern-invitations-e21-1]],
[[gotcha-initialdata-observer-scoped]], [[pattern-shared-infra-feature-module]].
