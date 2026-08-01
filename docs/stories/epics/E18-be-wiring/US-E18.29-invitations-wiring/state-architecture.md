# State Architecture — US-E18.29 Tenant Invitations BE Wiring (list + resend)

Author: `fe-state-engineer`. Resolves the 3 `[OPEN QUESTION — fe-state-engineer]`
items in `plan.md` §5, plus confirms/overrides the resend-mutation and 429
assumptions in §2.1/Phase 3. This SUPERSEDES US-E21.1's
`state-architecture.md` for the list query only (that doc's mutation-shape
precedents for send/revoke/rate-limit-free-resend still stand and are cited
here, not re-litigated). No global client store — server state via TanStack
Query (`useInfiniteQuery` for list, `useMutation` for resend/send/revoke),
tab/search stay local component state, per `.claude/CLAUDE.md`.

Read in full before implementing: `plan.md` (binding on shapes/failure union/
DI), `audit-log-screen.tsx` (the `useInfiniteQuery` precedent this mirrors),
`components/shared/load-more-button/load-more-button.tsx` (canonical, props
already translated by caller).

---

## 1. State Architecture Summary

- **Server state — list**: was one `useQuery` keyed `["admin-invitations",
  tenantId]` holding the full flat array (US-E21.1). Becomes ONE
  `useInfiniteQuery` **per active status tab** keyed
  `["admin-invitations", tenantId, status]` — see §4 for the full reasoning.
  This is a real change of cache topology, not just a hook swap: 5 tabs = up
  to 5 independently-paginated cache entries, each lazily fetched on first
  visit (not prefetched).
- **Tab switch → new query key, not a manual reset.** Matches the audit-log/
  question-bank "filter-key-drives-reset" convention
  ([[query-key-conventions]]): a distinct key is an empty cache entry
  automatically, which is also what prevents `fetchNextPage` from ever
  appending pages across a tab change. `queryClient.resetQueries` is
  unnecessary and not used.
- **Tab-count badges are DROPPED**, not relabeled (§5 below) — the lazy
  per-tab cache topology makes an accurate cross-tab count structurally
  impossible without prefetching every tab (defeats the point of lazy
  pagination), and a wrong/partial number is worse than no number for an
  admin-facing count. This is a user-visible behavior change → design-review
  gate + `/impeccable audit` scoped to `invitations-status-tabs.tsx`.
- **Search-while-paginated gets an explicit inline hint** (§6), shown only
  while actively searching AND more pages remain in the active tab's cache —
  computed, no new state.
- **Resend mutation stays non-optimistic** (confirms plan.md's assumption,
  §7) — server-truth-on-settle, matching the existing revoke pattern
  ([[query-key-conventions]] "Row-level pending state via
  `mutation.variables`" entry, US-E21.1).
- **Resend invalidation is OVERRIDDEN from the plan's "surgical patch"
  suggestion to a broad subtree invalidate** (§7) — resend moves a row
  ACROSS status partitions (`expired` → `pending`), which a single-page
  `setQueryData` patch cannot safely express once status is a cache-
  partitioning key. This is the one place this doc disagrees with plan.md's
  framing rather than just filling a gap.
- **429 rate-limited resend: toast only, no local lockout timer** (§8) —
  confirms plan's "design it simply, no fancy countdown" instruction with an
  explicit reason to skip building it.
- **No new global store, no ADR.** One feature-local query-key namespace
  (`admin-invitations`), extended by one dimension (`status`); no SSE/
  realtime; RSC↔client boundary unchanged in shape (RSC still seeds page 1
  of the default tab only).

---

## 2. State Inventory (delta from US-E21.1's table — only changed/new rows)

| Item | Type | Owner | Shape (TS) | Reason |
| --- | --- | --- | --- | --- |
| Invitation list (per tab) | Server (`useInfiniteQuery`) | `InvitationsScreen` | `InfiniteData<{ok:true; data: InvitationsPage} \| never>` per active `status` key | real cursor pagination, real server-side `status` filter (§4) |
| Status tab (`all\|pending\|accepted\|expired\|revoked`) | Local (`useState`) | container | `InvitationsStatusFilter` | now ALSO drives the query key (not just a client filter) — unchanged local-state *kind*, changed *effect* |
| Search text | Local (`useState`) | container | `string` | unchanged kind; now filters only the ACTIVE tab's loaded pages, not a full dataset (§6) |
| Load-more state | Server (`useInfiniteQuery` derived) | container | `hasNextPage` / `isFetchingNextPage` / `fetchNextPage()` | drives `LoadMoreButton` (canonical shared component, not audit-log's local fork) |
| Load-more error (per tab) | Local (`useState`, reset on tab change) | container | `InvitationFailure["type"] \| null` | mirrors audit-log's `loadMoreError` pattern exactly — a page-N failure must not blank already-rendered rows |
| Tab counts | **REMOVED** | — | — | §5 — dropped, not carried forward |
| Search-limited-results hint | Local, derived (no new state) | container | `boolean` (computed) | §6 |
| `resendInvitation` mutation | Server write (`useMutation`) | container | unchanged shape from US-E21.1, gains 2 new `errorKey` branches (`invitation-not-resendable`, `rate-limited`) | §7/§8 |

---

## 3. State Flow

**Read flow (RSC → ViewModel → client), delta from US-E21.1:**

```
page.tsx (RSC)
  → makeInvitationRepository() → makeListInvitationsUseCase().execute({status: undefined, cursor: undefined})
  → initialPage: InvitationsPage | undefined (undefined if the RSC fetch itself failed)
  → <InvitationsScreen initialPage={initialPage} initialLoadFailed={...} tenantId={...}
       onRefresh={(params) => refreshAction(params)}   // now takes {status?, cursor?}
       ... />

InvitationsScreen ('use client')
  const [tab, setTab] = useState<InvitationsStatusFilter>("all");
  const [query, setQuery] = useState("");

  const initialData = useMemo(() => {
    if (initialLoadFailed || tab !== "all") return undefined;
    return { pages: [{ ok: true, data: initialPage }], pageParams: [undefined] };
  }, [initialLoadFailed, tab, initialPage]);
  // Seeds ONLY the "all" tab's first page — mirrors audit-log's "seed only
  // when the current key structurally matches what RSC rendered" rule
  // ([[query-key-conventions]] "RSC-seeded useInfiniteQuery" entry). Switching
  // to any other tab runs a normal cold client fetch (no RSC seed for it —
  // RSC only ever fetches the default tab, matching plan.md Phase 4 §"RSC
  // page seeds the FIRST page only").

  const listQuery = useInfiniteQuery({
    queryKey: invitationKeys.list(tenantId, tab),
    queryFn: async ({ pageParam }) => {
      const res = await onRefresh({ status: tab === "all" ? undefined : tab, cursor: pageParam });
      if (!res.ok) throw { type: res.errorKey, retryable: res.retryable };
      return res;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => (last.data.hasMore ? last.data.nextCursor : undefined),
    initialData,
    staleTime: 60_000,       // repo global default — no override needed, see §4
    refetchOnWindowFocus: false,
    retry: (n, error) => Boolean((error as ThrownFailure)?.retryable) && n < 2,
  });

  const rows = useMemo(() => listQuery.data?.pages.flatMap((p) => p.data.data) ?? [], [listQuery.data]);
```

**Write flow (resend) → Server Action → invalidation** — see §7.
**No SSE/realtime** — unaffected by this US.

---

## 4. Query Key Hierarchy + Cache Policy — [OPEN QUESTION 1, resolved]

```ts
// src/features/admin/invitations/presentation/invitations-screen/invitations.query-keys.ts
export const invitationKeys = {
  all: () => ["admin-invitations"] as const,
  tenant: (tenantId: string) => ["admin-invitations", tenantId] as const,
  lists: (tenantId: string) => ["admin-invitations", tenantId, "list"] as const,
  list: (tenantId: string, status: InvitationsStatusFilter) =>
    ["admin-invitations", tenantId, "list", status] as const,
};
```

**Decision: `status` belongs IN the key** (`list(tenantId, status)`), giving
each tab its own independently-cached `useInfiniteQuery` instance. **Reject**
the "one key + `queryClient.resetQueries` on tab change" alternative.

Reasoning (per [[query-key-conventions]]'s "put the filter in the key when
it's a real request param" rule, and its direct precedent-flip entry "Per-tab
COLD refetch vs. client-filter-of-one-list — decide by AC wording"):
- **Before this US**, `status` was a pure client-side `.filter()` over one
  fully-resident array — correctly NOT in the key (US-E21.1's own
  `state-architecture.md` §4 said exactly this, for the mock-only, no-`GET`-
  route world).
- **After this US**, `status` is ground-truth #1's real `GET
  .../invitations?status=` server param — the single biggest fact that
  changes between the two stories. A real server param that changes the
  response set MUST partition the cache; folding it into one key + manual
  reset would mean flipping back to a previously-viewed tab re-fetches page 1
  from scratch every time (worse UX, wastes a round-trip on data that hasn't
  changed) AND risks a manual-reset bug class (forgetting to clear stale
  `pages` on tab flip) that a distinct key eliminates by construction.
- **Tradeoff accepted**: up to 5 independent cache entries per tenant instead
  of 1. This is cheap — `gcTime` default (5 min) evicts unused tabs quickly,
  and per ground-truth's own framing ("likely small in practice per iam's
  INTEGRATION.md") this is not a large-N pagination problem needing memory
  discipline. Flipping back to a previously-visited tab within the `gcTime`
  window is a cache hit (instant, `staleTime` 60s default), which is the
  explicit UX win this key shape buys over a reset-based approach.

**`tenantId` stays in the key** — existing precedent from US-E21.1
(`invitationKeys.list(tenantId)`), unchanged rationale (route-segment display
value, not the NFR-006 server-derived request value — confirmed still true,
`tenantId` here is purely a cache-partitioning/display segment, the real
request's tenant scoping is server-derived per `admin-invitations.di.ts`).

| Query | `staleTime` | `gcTime` | `refetchOnWindowFocus` | Notes |
| --- | --- | --- | --- | --- |
| `list(tenantId, status)` × 5 tabs | `60_000` (global default) | `300_000` (global default) | `false` | No override — same reasoning as US-E21.1: correctness comes from mutation-driven `invalidateQueries`, not staleTime expiry. No polling/realtime need. |

`detail(id)` key: still **not introduced** (unchanged from US-E21.1 — no
screen reads a single invitation independently of a list page).

---

## 5. Tab-Count Badges — [OPEN QUESTION 2, resolved: DROP, don't relabel]

**Decision: (a) drop per-tab counts entirely.** Reject both (b) "relabel as
partial/of-loaded" and a hypothetical (c) "fetch a 5th lightweight count
call" (no such endpoint exists per ground-truth, and inventing one is out of
this US's scope — BE would need to ship it, not FE fabricate it).

Why (a), not (b), given a "small in practice" dataset: the blocking issue
isn't display copy, it's the cache topology from §4 — **each status tab
(including `all`) is its OWN lazily-fetched `useInfiniteQuery`, fetched only
once the admin selects that tab.** To show *any* number for a tab the admin
has never clicked, the client would have to have already fetched at least
page 1 of that tab — which means either:
1. Eagerly fetch all 5 tabs on mount just to populate badges (defeats lazy
   per-tab pagination, adds 4 extra requests nobody asked to see yet, and
   still wouldn't be an exact count past each tab's own first page — the
   corrected framing already required for (b) to make sense applies **five
   times over**, not once); or
2. Show "?" / stale-from-last-visit numbers for never-visited tabs — worse
   than no number, actively misleading for an admin-facing count.

Even a "(of loaded)" qualifier on the ACTIVE tab only (technically knowable —
`rows.length` from its own cache) would leave the other 4 tabs with either a
missing number (inconsistent visual rhythm) or a stale one (wrong). Given
this screen's own AC framing ("do not silently under-communicate"), a clean,
uniform "no badge on any tab" reads honestly; a badge present on the current
tab only, absent/wrong elsewhere, does not. **Recommendation: remove the
count `<span>` from every `TabsTrigger` in `invitations-status-tabs.tsx`,
keep the label text only.**

This is a user-visible behavior AND copy change (badge removed from every
tab's accessible name, per that component's own doc comment "the count badge
is part of each tab's accessible name") — flag explicitly to design-review;
`/impeccable audit` should include this component even though plan.md scoped
the audit to "load-more button + 1 new toast" (this is a second, small visual
diff introduced by this same US).

---

## 6. Search-While-Paginated UX — [OPEN QUESTION 3, resolved]

**Mechanism**: a derived (no new state) boolean shown as inline helper text
directly under `InvitationsSearchInput`, computed each render:

```ts
const showPartialSearchHint =
  query.trim() !== "" && (listQuery.hasNextPage ?? false);
```

**When it shows**: only while the admin is actively typing a non-empty
search AND the active tab still has unfetched pages (`hasNextPage === true`).
Hidden when the search box is empty (no search happening, nothing to caveat)
and hidden once `hasNextPage` becomes `false` for that tab (all its rows are
loaded — the client-side substring filter over `rows` is then provably
complete for that tab, no caveat needed).

**Recommendation: explicit hint, never silent** — matches the story's own AC
framing ("do not silently under-communicate"). A silent limitation here is
worse than for the tab-count case because search implies a completeness
expectation ("did you find everyone matching X?") that a plain filtered list
doesn't. Copy is `fe-nextjs-engineer`/i18n's job (e.g.
`invitations.search.partialResultsHint`), mechanism/timing is this doc's
call. Placement: a `<p>` under the search input, same visual tier as the
existing `summary.count`/`summary.filtered` caption line already in
`invitations-screen.tsx` (reuse that styling, don't invent a new one).

No new query/state: this is a pure derivation of an already-read
`listQuery.hasNextPage`, same category as the existing `filteredCount`/
`hasFilters` derivations already in the container.

---

## 7. Resend Mutation — confirmed shape, OVERRIDDEN invalidation strategy

**Confirmed correct (plan.md's assumption)**: no optimism beyond the
existing row-level `isPending`/`variables===id` pattern
([[query-key-conventions]] "Row-level pending state via `mutation.variables`"
— US-E21.1 precedent, unchanged). Resend is a low-frequency, deliberate
per-row admin action; server-truth-on-settle is correct here exactly as it
was for revoke.

**Overridden: invalidation target.** plan.md's Phase 3/§5 floats "a targeted
single-row `setQueryData` patch... since we know the exact updated row from
the resend response" as the cheaper option, asking this doc to confirm it's
safe. **It is NOT safe, and this doc recommends AGAINST it**, in favor of:

```ts
queryClient.invalidateQueries({ queryKey: invitationKeys.lists(tenantId) });
// busts EVERY cached status-tab variant for this tenant (all 5 possible
// `list(tenantId, status)` entries currently in cache), not just the active
// tab's key.
```

**Why a surgical per-page patch is unsafe here**: a `setQueryData` row-patch
only works cleanly when a mutation updates a row **in place, within the same
cache partition** (e.g. revoke: `pending → revoked`, but the row's containing
partition for the `all` tab doesn't change, and revoke isn't offered from a
tab whose partition-membership the row would leave). Resend is structurally
different — **it moves the row ACROSS status partitions**
(`expired → pending`, ground-truth §0 + plan.md §2.2). Concretely, after a
successful resend:
- The row must be **removed** from the `expired` tab's cached pages (it's no
  longer expired).
- The row must be **added** to the `pending` tab's cached pages, if that
  tab's cache exists — but there's no principled cursor position to insert
  it at (page-based cursor pagination has no "insert at position N" primitive,
  and the row's sort position depends on ordering rules this repository
  doesn't own).
- The row's status field must update in-place in the `all` tab's cache (that
  one COULD be a safe surgical patch alone) — but doing this one surgically
  while the other two partitions go stale would leave `expired`/`pending`
  tabs showing wrong membership until their next independent refetch.

Locating+patching correctly across all 3 affected partitions is strictly
harder and more failure-prone than one `invalidateQueries` call, for a
resend action that is inherently low-frequency (an admin manually resending
one expired invite, not a hot path). This directly extends
[[query-key-conventions]]'s "stat-counts-embedded-in-list-response → broad
list invalidation" precedent (US-E19.2 moderation) to a new trigger: **when a
mutation moves an item ACROSS the exact dimension used to partition the
cache, invalidate the whole partitioned subtree, not one partition** — and
explicitly contrasts with `staff-discipline`'s "keep invalidation graphs
disjoint" precedent (US-E09.5), which only applies when sub-resources are
genuinely independent and a mutation never crosses between them; here the 5
tabs are partitions of the exact same underlying set, and this mutation is
defined by crossing between two of them.

`invalidateQueries` with `lists(tenantId)` only busts entries that actually
exist in the cache (never-visited tabs have no entry to invalidate — free),
so this is not meaningfully more expensive than targeting the active tab
alone in the common case (admin working one tab at a time).

**`invitation-not-resendable` (409) branch** (plan.md §2.5/Phase 3): same
treatment as the existing `invitation-invalid` revoke-race branch — toast +
`invalidateQueries({ queryKey: invitationKeys.lists(tenantId) })` (same broad
target, same reasoning: the row's real status diverged from the UI's, and it
could have diverged into any partition).

---

## 8. Rate-Limited (429) Resend — confirmed, no lockout

**Confirmed correct**: "no invalidate" is right — a 429 means the request was
rejected before any server-side row mutation happened; nothing changed,
matches the existing "network/unknown error → no invalidate" branch's
reasoning exactly (§ US-E21.1 precedent, [[query-key-conventions]] "Race-
branch invalidation asymmetry" entry).

**Client-side lockout: NOT worth building — toast only, no local disable-
until-`retryAfterSeconds` timer.** Reasoning:
- Rate limit is 3/hour **per `invitationId`** — an admin would need to click
  resend on the exact same row 3 times within an hour to ever see this in
  the UI; already an edge case bordering on unreachable in normal usage
  (contrast with the 409 branch, which is reachable any time two admin
  sessions race, i.e. plausible).
- A countdown/disabled-until-elapsed lockout needs its own local state
  (`Map<invitationId, unlockAt>` or similar), a timer/interval to re-enable,
  cleanup on unmount, and i18n for a live-updating "try again in Ns" string —
  meaningful complexity for a near-unreachable path.
- The story's own framing explicitly says "design it simply, no fancy
  countdown" (plan.md §2.5) — this doc's job here is to confirm that
  instruction extends to "skip the lockout mechanism entirely," not just
  "skip an animated countdown but still track state."

**What DOES change client-side**: nothing structural — just the toast copy,
computed once at the moment of the 429 response (static string interpolating
`retryAfterSeconds` if present, e.g. `t("toast.resendRateLimited", {seconds})`
vs. a plain fallback copy if the header was absent). No `setInterval`, no new
`useState`, no button-disable beyond the resend button's own existing
`isRowMutating`-driven disable-while-pending (which naturally re-enables the
instant the mutation settles, 429 included).

---

## 9. Async State Machine — delta from US-E21.1

| State | Signal | UI treatment |
| --- | --- | --- |
| List loading (first visit to a tab, no RSC seed) | `listQuery.isPending` (per active tab's key) | `ListSkeleton` — unchanged from US-E21.1 |
| List success | `listQuery.data` present | Table/card-list renders current tab's flattened `rows` |
| List empty, `status !== "expired"` | `rows.length === 0`, no search | Existing `EmptyNoInvitations`-style state |
| List empty, `status === "expired"` (TTL-sweep) | `rows.length === 0` for the `expired` key | SAME empty state, NOT the error state — explicit AC-4 regression guard; `listQuery.isError` must be `false` here (BE returns a valid empty page, not a failure) |
| List empty after search (non-empty raw, zero filtered) | `rows.length > 0`, filtered `0` | Existing `EmptyNoMatch` state, PLUS the §6 partial-search hint stays visible if `hasNextPage` was true (searching an incomplete set found nothing — still worth the caveat) |
| List error (page 1) | `listQuery.isError` | Existing `ListError` + retry → `listQuery.refetch()` |
| Load more available | `listQuery.hasNextPage` | `LoadMoreButton` (canonical shared) visible |
| Load more in flight | `listQuery.isFetchingNextPage` | `LoadMoreButton` `aria-busy` |
| Load more failed | per-tab `loadMoreError` state (reset on tab change, mirrors audit-log) | `LoadMoreButton` shows `errorLabel`/retry copy, existing rows stay rendered |
| Load more exhausted | `hasNextPage === false` | `LoadMoreButton` unmounts (not disabled) |
| Resend row pending | `isRowMutating(id)` | unchanged from US-E21.1 |
| Resend success | resolved `ok:true` | toast + broad `lists(tenantId)` invalidate (§7) |
| Resend `invitation-not-resendable` (409) | resolved `ok:false` | toast (reuse `invitation-invalid` copy pattern) + broad invalidate (§7) |
| Resend `rate-limited` (429) | resolved `ok:false` | distinct toast, **no invalidate**, no lockout (§8) |
| Resend `invitation-invalid` (410, TTL-swept) | resolved `ok:false` | unchanged — existing race-toast + invalidate |
| Resend network/unknown | resolved `ok:false` | unchanged — toast only, no invalidate |

**Failure → i18n key mapping additions** (presentation-only translation, per
`i18n.md`): `invitation-not-resendable` → `invitations.toast.resendRaceError`
(reuse — same user-facing meaning as the existing race copy: "someone else
already changed this invitation, refreshed"); `rate-limited` →
`invitations.toast.resendRateLimited` (new, ICU-plural-safe on
`retryAfterSeconds` if the engineer wants pluralization, else a flat string);
`invalid-request` (400, defensive) → generic `invitations.toast.networkError`
fallback, should not surface in practice.

---

## 10. Race Conditions & Resolution — delta from US-E21.1

1. **Tab flip mid-fetch** (admin clicks tab B before tab A's first page
   resolves) — safe by construction: each tab is its own query-key/query
   instance, so tab A's in-flight response updates ONLY tab A's cache entry
   when it resolves, never bleeding into what's rendered for tab B (same
   "distinct keys are distinct cache entries" guarantee cited in
   [[query-key-conventions]]'s principal-reports term-switch entry).
2. **Resend success racing a background tab refetch** — both end in
   `invalidateQueries`/an active-tab refetch on overlapping keys; TanStack's
   own dedup means a second concurrent invalidate simply re-runs each
   affected query once more — no double-fetch storm, no stale-write risk
   (no optimistic writes exist here to lose, §7).
3. **Search hint flicker on tab switch**: `showPartialSearchHint` reads
   `listQuery.hasNextPage` for the NEWLY active tab's (possibly not-yet-
   fetched) query — while that tab's page 1 is loading, `hasNextPage` is
   `undefined`→falsy, so the hint briefly doesn't show even if the previous
   tab did. Acceptable: the hint is advisory copy, not a correctness
   guarantee, and it re-appears correctly the instant page 1 resolves and
   `hasNextPage` is known.
4. **Resend on a row whose tab you've since navigated away from** (admin
   triggers resend on an `expired` row, then flips to `pending` tab before
   the mutation settles) — the mutation's own `onSuccess` still fires and
   invalidates `lists(tenantId)` regardless of which tab is currently active
   client-side, so the now-active `pending` tab's cache is correctly busted
   too and will show the resent row on its next fetch/visit. No special
   handling needed — this is exactly what the broad (§7) invalidation target
   is for.
5. **Concurrent resend attempts on two different rows** — unchanged from
   US-E21.1's accepted single-shared-mutation limitation (only the most
   recent call's `variables` is tracked); not addressed here, same
   "one-row-at-a-time realistic usage" acceptance as before.

---

## Cross-references

- `plan.md` §2, §3 Phase 3, §5 (the open questions this resolves).
- `story.md` AC-1/AC-2/AC-5 (server-side status filter, load-more precedent,
  resend error paths).
- US-E21.1's `state-architecture.md` (superseded for the list query only;
  mutation-shape/race-condition precedents for send/revoke still apply
  unchanged).
- `src/features/audit-log/presentation/audit-log-screen/audit-log-screen.tsx`
  + its `auditLogKeys` factory — the `useInfiniteQuery` shape mirrored here.
- `src/components/shared/load-more-button/load-more-button.tsx` — canonical
  component used (NOT `audit-log`'s local fork).
- Repo memory: `query-key-conventions.md` — "put the filter in the key when
  it's a real request param," "Per-tab COLD refetch vs. client-filter,"
  "stat-counts-embedded-in-list → broad invalidation," "staff-discipline
  disjoint invalidation" (contrasted against, not applied, in §7).
