# Implementation Plan — US-E18.29 Tenant Invitations BE Wiring (list + resend)

Status: ready for `/fe`. Branch: `feat/us-e18.29-invitations-be-wiring` (claimed).
Ground truth: story.md's own "Ground-truth BE contract" section (fe-lead's own
verification, 2026-08-01) is binding — do not re-derive against edu-api.
Builds on `US-E21.1`'s existing `src/features/admin/invitations/` module and its
`admin-invitations.di.ts` hybrid factory (read there first). Only **list** and
**resend** change; send/revoke/copy-link/accept are untouched except where a
shared file (repo constructor, DI factory, mapper module) structurally requires
a reshape around them.

## 0. Ground-truth recap (binding on every phase below)

- `GET /tenants/{id}/invitations?status&cursor&limit` — admin/SUPER_ADMIN only,
  cursor-paginated, SAME short-page-but-hasMore-true semantics as
  `iam-directory`'s member list (US-E18.23) — must keep following the cursor.
  `status=expired` legitimately near-always empty (BE TTL-sweeps) — not an error.
- `InvitationListItem`: `{invitationId, email, roles: UPPERCASE[], status:
  LOWERCASE, invitedBy: raw userId, createdAt, expiresAt}`. No `token`/`inviteUrl`
  ever (copy-link stays out of scope, unaffected).
- `POST .../invitations/{id}/resend` → `200 InvitationListItem` (same shape),
  same-row token rotation + `expiresAt` refresh + `status→pending`, **preserves**
  `roles`/`invitedBy`/`createdAt`. Only a `PENDING` row is resendable (409
  `invitation_not_resendable` on ACCEPTED/REVOKED); TTL-swept row → 410
  `invitation_invalid` (already mapped). Rate-limited **per `invitationId`**: 3/1h
  → 429 `rate_limit_exceeded` + `Retry-After` header (seconds) — first consumer
  of a `Retry-After` header in this repo, see Phase 0 note.
- Malformed `cursor`/`limit`/`status` → 400 `invalid_request_parameters`.
- OUT OF SCOPE (do not touch behavior, only structural pass-through if a shared
  constructor signature moves): send-dialog / expiry SELECT (already wire-inert,
  not this US's problem), revoke, copy-link, accept flow.

## 1. Canonical-home recap (already decided by US-E21.1, not re-litigated)

- `IIamMemberRepository` (auth feature) stays the contract owner of the raw IAM
  wire shape; `admin/invitations`'s `IInvitationRepository` stays the narrower
  screen-facing port, adapted by `InvitationRepository` in
  `features/admin/invitations/infrastructure/repositories/`.
- `admin-invitations.di.ts` stays the single composition root; it collapses from
  hybrid-delegate to a plain `USE_MOCK ? Mock : Real` gate (US-E18.23/US-E18.25
  precedent) — **only for list/resend**; send/revoke's existing real/mock switch
  is untouched.
- `iam-directory.di.ts` stays **deliberately real-only, no `USE_MOCK` branch**
  (its own doc comment: "each CONSUMER factory already gates on USE_MOCK... their
  mock repositories carry their own seeded names"). This means the `invitedBy`
  resolution collaborator must be **skipped entirely in mock mode**, not routed
  through a mock `IamDirectoryRepository` that doesn't exist — see Phase 2.

## 2. Reshape decisions (explicit, per the task's ask)

### 2.1 `IIamMemberRepository.listInvitations` — new signature

```ts
// i-iam-member.repository.ts
export interface ListInvitationsParams {
  status?: InvitationStatus;
  cursor?: string;
  limit?: number;
}
export interface InvitationsPage {
  data: Invitation[];
  nextCursor: string | null;
  hasMore: boolean;
}
listInvitations(
  tenantId: string,
  params?: ListInvitationsParams,
): Promise<InvitationsPage>;   // was Promise<Invitation[]>
```
Drops `q` from `ListInvitationsParams` (never had a server param, ground-truth —
search stays client-side over loaded pages only, see §4 open question). Mirrors
`i-iam-directory.repository.ts`'s `ListMembersParams`/`DirectoryPage` shape
exactly (sibling pattern named in the task).

`resendInvitation(tenantId, invitationId): Promise<Invitation>` — signature
unchanged, only becomes REAL (no more throw-guard) on `IamMemberRepository`.

### 2.2 `auth/domain/entities/invitation.entity.ts` — reshape

- Rename `sentAt` → `createdAt` (matches the real wire field name exactly; the
  mock's synonymous field was arbitrarily named `sentAt` pre-wiring — rename it
  now rather than translate at the mapper boundary, one less silent alias).
- Drop `tenantId` (never read by any caller today — `InvitationRepository`
  already carries `tenantId` itself; dead field, real wire never has it either).
- Doc comment flips from "PERMANENTLY MOCK" to: `status`/`invitedBy`/`createdAt`
  are now REAL wire fields; `invitedBy` is a **raw userId on the real wire**
  (resolution to a display name is NOT this entity's job — it happens in
  `InvitationRepository`, see Phase 2). Mock repo continues to seed a
  human-readable string directly in `invitedBy` (unchanged mock behavior — see
  §2.4 why this still works).

### 2.3 `admin/invitations` domain — `IInvitationRepository`/use-case reshape

```ts
// i-invitation.repository.ts
export interface ListInvitationsParams {
  status?: InvitationStatus;
  cursor?: string;
  limit?: number;
}
export interface InvitationsPage {
  data: Invitation[];
  nextCursor: string | null;
  hasMore: boolean;
}
listInvitations(
  params?: ListInvitationsParams,
): Promise<Result<InvitationsPage, InvitationFailure>>;   // was zero-arg, flat array
```
`ListInvitationsUseCase.execute(params?)` — thin passthrough, same shape change.
`ResendInvitationUseCase` — unchanged signature, no failure-union change to its
own type (the union itself gains members, see §2.5).

`Invitation` entity in `admin/invitations/domain` — **no shape change** (`id`,
`email`, `role`, `status`, `invitedBy`, `sentAt`, `expiresAt` all stay). Screen
concept "sentAt" stays as the screen's own label; the mapper reads the renamed
auth-domain `createdAt` into this unchanged `sentAt` field. `invitedBy` here is
guaranteed **always a display name (or fallback placeholder), never a raw id**
— resolution is fully hidden inside infrastructure (Phase 2), so
`build-row-vm.ts`/presentation need **zero changes** for AC-3.

### 2.4 `invitedBy` resolution — composition shape (Phase 2 detail, decided here)

`InvitationRepository` gains a 3rd collaborator, a **function**, not a repo
instance, so mock mode needs no fake `IamDirectoryRepository`:

```ts
type ResolveDisplayNames = (ids: string[]) => Promise<Map<string, string>>;

class InvitationRepository implements IInvitationRepository {
  constructor(
    private readonly mutationsIam: IIamMemberRepository,
    private readonly listIam: IIamMemberRepository,
    private readonly tenantId: string,
    private readonly resolveNames: ResolveDisplayNames,
  ) {}
}
```
- **Real mode** (`admin-invitations.di.ts`): `resolveNames` wired to
  `makeBatchResolveMembersUseCase()` (`iam-directory.di.ts`, real-only, exactly
  as its own doc comment prescribes) → `Map` of `userId → (name ?? email ??
  fallback)`. Ids that fail to resolve (batch call itself errors, OR a specific
  id is silently absent per `batchLookup`'s own "unknown ids omitted" contract)
  → **fallback to a stable placeholder** (a truncated id, e.g. first 8 chars +
  `"…"`, or an i18n `unknownMember` string — decide exact copy in Phase 4) so a
  secondary failure never blocks the whole list (AC-3).
- **Mock mode**: `resolveNames = async (ids) => new Map(ids.map((id) => [id,
  id]))` (identity passthrough) — because `MockIamMemberRepository`'s
  `invitedBy` field already holds a ready-to-display string (e.g. "Trần Minh
  Quân"), not a real userId; the identity map means "resolve X to X", i.e. a
  no-op, preserving today's mock behavior unchanged. `iam-directory.di.ts` is
  never touched in mock mode (matches its own real-only contract).
- `listInvitations()` flow: fetch page from `listIam` → map DTO→entity (role
  lowercase, status passthrough) → collect unique raw `invitedBy` values →
  `resolveNames(ids)` → re-map each row's `invitedBy` through the returned Map
  (`resolved.get(raw) ?? fallbackPlaceholder(raw)`) → return the page.

### 2.5 Failure-union additions

`InvitationFailure` (admin/invitations, screen-facing) gains 3 members:
```ts
| { type: "invitation-not-resendable" }              // 409
| { type: "rate-limited"; retryAfterSeconds?: number } // 429
| { type: "invalid-request" }                         // 400 (defensive only)
```
`IamMemberFailure` (auth, wire-facing) gains the matching 3, mapped in
`iam-member.repository.ts`'s `mapIamFailure`:
```ts
case "invitation_not_resendable": return { type: "invitation-not-resendable" };
case "rate_limit_exceeded": return { type: "rate-limited", retryAfterSeconds };
case "invalid_request_parameters": return { type: "invalid-request" };
```
`invitation.mapper.ts`'s `toInvitationFailure` passes all 3 through 1:1 (no
collapsing, unlike `invitation-expired`/`member-exists` → `invitation-invalid`).

**`Retry-After` header — first consumer in this repo (flag, not an ADR):**
`ApiError` (`bootstrap/lib/api-envelope.ts`, SHARED file) currently carries no
response headers. `normalizeError()` needs one additive field,
`retryAfterSeconds?: number`, parsed from the axios error's
`response.headers["retry-after"]` (seconds, per BE contract) when present —
purely additive to the shared `ApiError` shape, no existing caller's behavior
changes. This is the kind of shared-file touch the story's own framing flags as
"design it simply, no fancy countdown" — a single toast copy is enough, per
AC-5. No ADR needed (additive field, not a new architecture), but calling it out
because it is the first 429-with-header consumer and the field lives in a
shared bootstrap file every repository imports.

## 3. Phased breakdown

### Phase 0 — Shared IAM contract reshape (`features/auth/`)

Files:
- `domain/entities/invitation.entity.ts` — rename `sentAt`→`createdAt`, drop
  `tenantId`, flip doc comment to "real wire, `invitedBy` = raw userId" (§2.2).
- `domain/repositories/i-iam-member.repository.ts` — `ListInvitationsParams`
  (drop `q`, add `cursor`/`limit`), new `InvitationsPage` type,
  `listInvitations` returns `Promise<InvitationsPage>` (§2.1). Doc comments on
  `listInvitations`/`resendInvitation` flip from "MOCK-ONLY" to real route refs.
- `domain/failures/iam-member.failure.ts` — add `invitation-not-resendable`,
  `rate-limited` (w/ `retryAfterSeconds`), `invalid-request`.
- `infrastructure/dtos/iam-member-response.dto.ts` — add
  `InvitationListItemResponseDto { invitationId, email, roles: string[], status:
  string, invitedBy: string, createdAt: string, expiresAt: string }` (matches
  `InvitationListItemResponse` 1:1); keep the existing thin `InvitationResponseDto`
  (POST-invite response) untouched.
- `bootstrap/endpoint/iam-member.endpoint.ts` — add
  `invitationResend: (tenantId, invId) => \`${invitation(tenantId, invId)}/resend\``
  (reuses the existing `invitation()` builder, no new base path).
- `bootstrap/lib/api-envelope.ts` (SHARED) — additive `retryAfterSeconds?:
  number` on `ApiError`, populated in `normalizeError()` from the response
  `retry-after` header when present (§2.5). No behavior change for any existing
  caller (field is optional, ignored unless read).
- `infrastructure/repositories/iam-member.repository.ts` — real
  `listInvitations`: `GET` with `{ raw: true }` + `parseEnvelope` (mirrors
  `iam-directory.repository.ts` EXACTLY, incl. the `raw` top-level-sibling-of-
  `params` regression trap called out in the task); real `resendInvitation`:
  `POST` to the new resend endpoint, maps the DTO through a new
  `mapInvitationListItem` mapper fn; `mapIamFailure` gains the 3 new
  `case`s (§2.5), reading `retryAfterSeconds` off the (now-extended) `ApiError`.
- `infrastructure/repositories/mocks/iam-member.mock.repository.ts` +
  `fixtures.ts` — update field name `sentAt`→`createdAt`, drop `tenantId` from
  fixtures; `listInvitations` mock now returns `{data, nextCursor: null,
  hasMore: false}` (single unpaginated page — mock has no real cursoring need,
  matches `iam-directory`'s own mock precedent of NOT bothering with fake
  pagination); `resendInvitation`'s existing race-guard (`status !== "expired"`
  → `invitation-invalid`) stays, PLUS honour the new 409/429 paths if useful for
  Storybook (optional — a fixture flag can force a specific mock invitation id
  into `rate-limited`/`invitation-not-resendable` for the new stories in Phase 5,
  same convention as other mock repos' "special id triggers this failure").

Test first: `iam-member.repository.test.ts` (extend existing file) — new cases:
real `listInvitations` envelope+pagination unwrap (raw:true+parseEnvelope,
regression-trap assertion that `raw` is NOT nested in `params`), status/cursor/
limit forwarded as query params, 400/403/409/410/429 → failure mapping incl.
`retryAfterSeconds` read off the header; real `resendInvitation` same-shape
response mapping. `iam-member.mock.repository.test.ts` — updated field rename,
unpaginated-page shape assertion.

Done when: `tsc --noEmit` clean, extended repository test green.

### Phase 1 — `admin/invitations` domain reshape (TDD-first)

Files:
- `domain/failures/invitation.failure.ts` — add the 3 members (§2.5).
- `domain/repositories/i-invitation.repository.ts` — `ListInvitationsParams`/
  `InvitationsPage` (§2.3), `listInvitations(params?)` new signature.
- `domain/use-cases/list-invitations.use-case.ts` + `.test.ts` — passthrough
  now takes `params?`; test: status forwarded unchanged, empty page (expired
  tab TTL-sweep case) returns `{data: [], hasMore: true/false}` cleanly, not an
  error.
- `domain/use-cases/resend-invitation.use-case.ts` — no signature change; extend
  `.test.ts` with the 2 new failure branches (`invitation-not-resendable`,
  `rate-limited`) passed through unchanged from the repo Result.

Test first (red→green): `list-invitations.use-case.test.ts` (params
passthrough + empty-page-is-not-error) → `resend-invitation.use-case.test.ts`
(new failure branches). Mock `IInvitationRepository` per test, no HTTP.

Done when: both use-case test files green, domain has zero new outside imports.

### Phase 2 — Infrastructure + DI (real adapter + name-resolution composition)

Files:
- `infrastructure/mappers/invitation.mapper.ts` — `toInvitation` reads
  `a.createdAt` (was `a.sentAt`) into `sentAt`; NEW `resolveInvitedBy(rows,
  resolved: Map<string,string>, fallback: (id:string)=>string)` pure helper (or
  inline in the repository — the mapper is the natural home for a pure
  transform, keep the repository orchestration-only per layer rules).
- `infrastructure/repositories/invitation.repository.ts` — 4th constructor
  param `resolveNames: ResolveDisplayNames` (§2.4); `listInvitations(params?)`
  now: `listIam.listInvitations(tenantId, params)` → map → collect ids →
  `resolveNames` → re-map `invitedBy` → return `InvitationsPage`.
  `resendInvitation` — unchanged shape, just passes through the extended
  `IamMemberFailure` (409/429/410) via `toInvitationFailure`'s 1:1 additions.
- `bootstrap/di/admin-invitations.di.ts` — collapse hybrid → plain gate:
  ```ts
  export async function makeInvitationRepository(): Promise<IInvitationRepository> {
    if (USE_MOCK) {
      const iamMock = new MockIamMemberRepository();
      const identity: ResolveDisplayNames = async (ids) =>
        new Map(ids.map((id) => [id, id]));
      return new InvitationRepository(iamMock, iamMock, "tenant-acme", identity);
    }
    await ensureFreshSession();
    const tenantId = decodeTenantId((await getAccessToken()) ?? "") ?? "";
    const iamReal = new IamMemberRepository(await createServerHttpClient());
    const batchResolve = await makeBatchResolveMembersUseCase(); // iam-directory.di.ts, real-only
    const resolveNames: ResolveDisplayNames = async (ids) => {
      const result = await batchResolve.execute(ids);
      const map = new Map<string, string>();
      if (result.ok) for (const m of result.value) map.set(m.id, m.displayName);
      return map; // caller (repository) applies the id fallback for misses
    };
    return new InvitationRepository(iamReal, iamReal, tenantId, resolveNames);
  }
  ```
  (exact `MemberSummary` field names — `id`/`displayName` or similar — TO BE
  CONFIRMED against `iam-directory/domain/entities/member-summary.entity.ts`
  before writing code; not re-read in this planning pass, flag for
  `fe-nextjs-engineer` to verify the exact field name.)

Test first: extend `invitation.repository.test.ts` (integration-boundary) —
(a) `listInvitations` in mock mode: identity resolveNames leaves `invitedBy`
unchanged; (b) `listInvitations` in real-shaped mode: resolveNames Map applied,
missing id falls back to placeholder, a `resolveNames` rejection does NOT fail
the whole list (AC-3 "never blocks on a secondary failure" — repository must
catch/ignore that specific failure, not propagate it as the list's own Result
failure); (c) `resendInvitation` maps 409/429/410 correctly, `retryAfterSeconds`
carried through.

Done when: repository test green (incl. the AC-3 non-blocking case), DI
factories compile, `bootstrap/di/index.ts` re-export unchanged (no new export
names, same 4 factory names as US-E21.1).

### Phase 3 — Presentation (pagination + rate-limit toast)

**No VM/build-row-vm change** (§2.3 — `invitedBy` arrives pre-resolved).

Files:
- `invitations-screen.tsx` — replace the single `useQuery` with
  `useInfiniteQuery` (mirrors `audit-log-screen.tsx`'s pattern exactly): queryFn
  calls `onRefresh(params)` (now takes `{status, cursor}` — status IS the
  active tab per AC-1), `getNextPageParam` from `hasMore`/`nextCursor`,
  `initialData` seeded from RSC's first page. **Tab change → new query key**
  (server-side status filter replaces the current pure-client
  `filterInvitations` status branch — see §4 open question, this is exactly the
  kind of query-key-structure call flagged for `fe-state-engineer`). Search
  stays client-side (`filterInvitations`'s email-substring branch only, status
  branch removed) applied over whatever pages are currently loaded — NOT the
  full dataset (no server `q=` param exists), so search results can legitimately
  be incomplete until "load more" is exhausted; needs an explicit UX signal
  (helper text?) — flag to `fe-state-engineer`/design-review, don't silently
  under-communicate.
- Add `LoadMoreButton` from `components/shared/load-more-button/` (the
  **canonical** shared component per `component-organization.md` — NOT
  `audit-log`'s own local fork at
  `features/audit-log/.../components/load-more-button.tsx`, which predates the
  promotion and is itself a duplicate the team should clean up separately, NOT
  in this US's scope). The shared component takes already-translated
  `label`/`errorLabel` props (no built-in `useTranslations`), unlike
  audit-log's local one — thread `t("loadMore.label")` etc. from this screen's
  own `invitations` namespace.
- `resendMutation.onSuccess`/`onError` branch — add `rate-limited` handling:
  distinct toast (`t("toast.resendRateLimited", {seconds: retryAfterSeconds})`
  if present, else a plain "try again later" copy), **no refetch/invalidate**
  (row state didn't change — AC-5 defensive branch, structurally near-
  unreachable since resend is only offered on `expired` rows, but must not
  crash if the race occurs); `invitation-not-resendable` — same treatment as
  the existing `invitation-invalid` race branch (toast + invalidate to
  reconcile, since it means the row's real status diverged from what the UI
  showed).
- `invitations-status-tabs.tsx` / tab-count badges — **OPEN QUESTION for
  `fe-state-engineer`**: `statusCounts()` (`filter-invitations.ts`) currently
  assumes the FULL raw list is client-resident; with real cursor pagination
  that's no longer true after page 1. Either (a) drop per-tab counts, (b) fetch
  counts from a 5th lightweight call (doesn't exist on the wire), or (c) label
  counts as "of loaded" — do not silently keep computing counts as if they were
  exact. Flag, don't decide.

State classification delta from US-E21.1 (hand off to `fe-state-engineer`):
- **Server** (TanStack Query) — was `useQuery` keyed
  `["admin-invitations", tenantId]`; becomes `useInfiniteQuery` keyed
  `["admin-invitations", tenantId, status]` (status now part of the key since
  it's now a real server param) — **exact key shape is a state-architecture
  call, not decided here**, flag explicitly.
- **Optimistic mutations** — resend's existing row-level `isPending` pattern is
  unaffected; only the invalidate/no-invalidate branching gains the
  `rate-limited` case (no invalidate).
- **Local state** — tab/search unchanged in kind (local `useState`), but the tab
  setter must now also reset/refetch the infinite query (new query key), not
  just re-run a pure client filter.

Test/story additions (`invitations-screen.stories.tsx`):
1. `LoadMoreVisible` / `LoadMoreLoading` / `LoadMoreExhausted` (hasMore=false →
   button unmounted).
2. `ResendRateLimited` — toast copy assertion, row stays in its prior state
   (not reset to pending), no refetch triggered.
3. `ResendNotResendable` — toast + invalidate (row reconciles).
4. `ExpiredTabEmptyAfterTtlSweep` — re-verify existing `EmptyNoMatch`-style
   empty state renders (not the error state) when `status=expired` returns an
   empty page with `hasMore` possibly still true/false.
5. Re-verify all 13 existing US-E21.1 stories green against the new
   `InvitationsPage`-shaped mock action responses (prop/type-only churn, no UI
   behavior change expected for those).

Done when: all stories pass interaction tests, `fe-tech-lead-reviewer` +
`fe-accessibility-auditor` gates green; design-review gate — no new visual
surface beyond the load-more button + a new toast, run `/impeccable audit`
scoped to those two additions only (screen layout unaffected).

### Phase 4 — RSC page + Server Actions + i18n

Files:
- `.../admin/invitations/actions.ts` — `refreshAction` now takes
  `{status?, cursor?}` and returns the paginated shape
  (`ListActionResult = {ok:true; data: InvitationsPage} | {ok:false; errorKey}`,
  was flat `Invitation[]`); `resendInvitationAction` unchanged signature, its
  `MutationActionResult` gains the 2 new `errorKey` members (type-level only,
  same discriminated union pattern).
- `.../admin/invitations/page.tsx` — RSC seeds the FIRST page only
  (`{status: "all", cursor: undefined}`), unchanged shape otherwise.
- i18n (`messages/{vi,en}.json`, namespace `invitations`, extend — do NOT
  regenerate): add
  `invitations.loadMore.{label,loading,ariaLabel}`,
  `invitations.toast.{resendRateLimited (ICU plural on seconds if provided),
  resendNotResendable}`,
  `invitations.errors.invalidRequest` (defensive, likely never surfaced),
  `invitations.table.invitedByFallback` (placeholder copy for an unresolved
  `invitedBy`, e.g. "Không xác định" / "Unknown").

Test first: none new (actions are thin wrappers, per US-E21.1's own
convention — no dedicated `actions.test.ts` precedent in this repo for admin/*
screens).

Done when: `bun build` + `tsc --noEmit` clean in both mock and real mode, i18n
keys present in both `vi.json`/`en.json` (typed `t()` calls compile).

### Phase 5 — Full test-matrix + harness proof

- Run full suite (`bun vitest run`), Storybook interaction suite
  (`vitest.storybook.mts`), `bun build`.
- `docs/stories/epics/E18-be-wiring/EPIC-OVERVIEW.md` — mark asks #29/#30
  RESOLVED, cite this US.
- `docs/TEST_MATRIX.md` — flip US-E18.29 row to `implemented` with real
  unit/integration/e2e/platform proof.
- `scripts/bin/harness-cli story update --id US-E18.29 --unit 1 --integration 1
  --e2e 1 --platform 1` (adjust booleans to what's actually proven).

## 4. Test matrix summary (maps to story.md §Validation)

| Layer | File(s) |
| --- | --- |
| Unit | `list-invitations.use-case.test.ts` (params passthrough, empty-page-not-error), `resend-invitation.use-case.test.ts` (2 new failure branches), `invitation.mapper.test.ts` (createdAt rename, invitedBy resolution helper, role/status case-fold unchanged) |
| Integration | `iam-member.repository.test.ts` (real list/resend: raw:true+parseEnvelope, 400/403/409/410/429 incl. `retryAfterSeconds`), `iam-member.mock.repository.test.ts` (rename + unpaginated-page shape), `invitation.repository.test.ts` (mock-mode identity resolveNames, real-mode Map + fallback + non-blocking resolveNames failure, resend error mapping) |
| E2E | `invitations-screen.stories.tsx` — 13 existing states re-verified + 5 new (Phase 3 list) |
| Platform | `bun build && bunx tsc --noEmit`, both `NEXT_PUBLIC_USE_MOCK=true/false` |
| Release | design-review gate — scope is data-source swap + load-more control + 1 new toast; `/impeccable audit` scoped to those |

## 5. Risks, dependencies, open questions

- **[OPEN QUESTION — fe-state-engineer]** Exact query-key structure for
  `useInfiniteQuery` (does `status` belong in the key, or should tab-switch
  reset via `queryClient.resetQueries` instead of a new key?) and whether
  resend should ever be optimistic beyond the existing row-level `isPending`
  flag (plan assumes no — server-truth-on-settle, matching US-E21.1's existing
  revoke pattern) — confirm rather than assume.
- **[OPEN QUESTION — fe-state-engineer]** Tab-count badges
  (`invitations-status-tabs.tsx`) currently assume a fully-loaded raw list;
  real pagination breaks that assumption starting page 2. Needs an explicit
  decision (drop counts / relabel as partial / accept staleness), not a silent
  carry-forward of the old client-side `statusCounts()`.
- **[OPEN QUESTION — fe-state-engineer]** Search-while-paginated UX: substring
  search only ever sees currently-loaded pages (no server `q=`). Needs an
  explicit affordance (e.g. "load more to search further" hint) or accept as a
  known limitation — flag to design-review, don't silently under-communicate.
- **`MemberSummary` field names** (`id`/`displayName` or equivalent) used in
  §2.4's `resolveNames` sketch are NOT re-verified in this planning pass —
  `fe-nextjs-engineer` must read
  `iam-directory/domain/entities/member-summary.entity.ts` before implementing
  Phase 2's DI wiring.
- **`ApiError.retryAfterSeconds` addition is a SHARED-file touch**
  (`bootstrap/lib/api-envelope.ts`) — purely additive/optional field, no
  existing caller's behavior changes, but flag to `fe-lead` for awareness per
  the shared-file-touch convention (not an ADR — no architecture/token
  decision, just a first-time header read).
- **Duplicate `LoadMoreButton`** already exists in this repo (`audit-log`'s
  local fork predates the `components/shared/load-more-button/` promotion,
  per that component's own doc comment "promoted... on its 2nd caller, US-E19.1").
  This US uses the CANONICAL shared one and does not fork a third — cleaning up
  `audit-log`'s stale local copy is out of scope here, flag as a separate
  follow-up if `fe-lead` wants it filed.
- **No new design-system token** — load-more button reuses existing `Button`
  variant; rate-limit toast reuses existing toast/`text-edu-error-text` pattern
  from the existing `resendNetworkError` toast. No ADR expected.
- **RBAC (AC-8)**: already enforced client-side by `admin/layout.tsx`
  (decision 0022/0024); Phase 0's `mapIamFailure`'s existing `forbidden_action
  → {type:"forbidden"}` branch is reused unchanged — no new mapping needed,
  just confirm the existing error+retry (or no-retry) presentation state
  applies, per ADR 0063's repository-boundary-authorization precedent (defense
  in depth, not a new gate).
