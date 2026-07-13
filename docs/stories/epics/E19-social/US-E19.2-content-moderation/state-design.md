# US-E19.2 — Content Moderation — State & Query Architecture

Author: `fe-state-engineer`. Scope: state/query design only — **no store/hook
implementation code**. Feeds `fe-nextjs-engineer` (Phase 5/6 of `plan.md`) and
`fe-component-architect` (VM boundary). No global client store introduced —
100% TanStack Query (server state) + URL (filter/tab) + local form state
(confirm-remove note, detail-sheet transient UI), per CLAUDE.md.

Precedent mirrored exactly: `src/features/audit-log/presentation/audit-log-screen/audit-log-screen.tsx`
(RSC seeds page 1 → `useInfiniteQuery` takes over, draft/applied URL filter
split, `ThrownFailure` shape for `retryable`-aware retry). Never-optimistic
mutation precedent: `[[admin two-step approval / safety-critical gate pattern]]`
(academic-record-seal, US-E14.6) — same "no `onMutate`, wait for server" rule
applied here to `removeContent`.

---

## 1. State Architecture Summary

- **3 independent query subtrees** under one root `moderationKeys`: `list`
  (queue, infinite/cursor), `detail` (single report, sheet), `audit` (timeline,
  infinite/cursor). Each is queried separately — the container never derives
  detail or audit data from the list cache.
- **Stats are NOT their own query.** Per plan.md's resolved assumption (spec.md
  §8, integration.md INT-191-02), `stats: { pendingCount, resolvedThisWeekCount,
  removedCount }` rides inside every `GET /reports` list-page response. This
  has one hard consequence, called out explicitly per the task brief: **any
  mutation that changes a report's status must invalidate the ENTIRE `lists()`
  subtree** (every cached filter/tab variant), not just the active tab's key or
  the touched report's `detail()` entry — otherwise a principal sitting on the
  "Đã xử lý" tab after removing content from the "Chờ xử lý" tab sees stale
  `pendingCount`/`removedCount` in the StatCards next time they revisit
  "Chờ xử lý" without a hard refresh.
- **2 mutations touch this screen's cache**: `dismissReport`, `removeContent`.
  A 3rd mutation, `submitReport`, is domain-shared (`bootstrap/di/moderation.di.ts::makeSubmitReportUseCase`)
  but is invoked from a **different route's** container (feed / messaging via
  `ReportContentDialog`) — it does not read or write any `moderationKeys` cache
  and is out of scope for this screen's invalidation graph. Noted so
  `fe-nextjs-engineer` doesn't wire a phantom invalidation here.
- **`removeContent` is never optimistic** — explicit `useMutation` shape below
  has no `onMutate`/`onError` rollback pair, only `onSuccess`/`onSettled`. This
  is a hard NFR-101/AC-1928.6 requirement, not a style choice.
- **RSC↔client boundary**: `page.tsx` seeds `initialFilter` + `initialQueuePage`
  (which carries `stats`) + `initialErrorKey`, exactly like `audit-log`. Detail
  sheet and audit tab are **never RSC-prefetched** — both are client-only
  queries gated by `enabled` (sheet-open / tab-active), since they're
  interaction-triggered, not first-paint content.
- **Filter/tab state is 100% URL-synced** (`status`, `contentType`, `search`,
  `tab`), draft/applied split identical to audit-log — no `useState` holds the
  source of truth for anything shareable.
- **Open-question flag carried from plan.md** (do not silently resolve): the
  audit query's scope parameter (`scopeId` i.e. `roomId` in
  INT-191-07 — naming ambiguity, spec.md §8/integration.md §5) is treated here
  as **a single fixed value resolved server-side** (VM prop, not user-selectable),
  consistent with requirements.md's single-tenant-principal assumption. If BE
  clarifies audit needs multiple scope calls or a different aggregate endpoint,
  `moderationKeys.audit()` gains a real parameter and the audit tab's query
  shape changes from one `useInfiniteQuery` to N. Flagging to `fe-lead` — **not**
  resolved by this design.

---

## 2. State Inventory

| Item | Type | Owner | Shape (TS) | Reason |
| --- | --- | --- | --- | --- |
| Queue filter (status/type/search) | URL state | `useSearchParams` (applied) + local draft `useState` | `ModerationFilter = { status: "pending"\|"resolved"\|"all"; contentType: "all"\|"post"\|"comment"\|"message"; search: string }` | Shareable/back-button-friendly per CLAUDE.md; drives the list query key (FR-104). Draft/applied split matches audit-log (debounced search). |
| Active tab (queue vs audit) | URL state | `useSearchParams` (`tab=queue\|audit`) | `"queue" \| "audit"` | Shareable deep-link (e.g. link straight to audit tab); also gates which query is `enabled`. |
| Report queue (paginated) | Server state | `useInfiniteQuery` | `ReportEntity[]` pages + `stats: ModerationStatsEntity` per page | List data from `social`; cursor-paginated per api-integration.md. |
| Report detail (sheet) | Server state | `useQuery` | `ReportDetailEntity \| undefined` | Only fetched on row click; distinct entity (adds `fullContent`/`context`/`duplicateReports`), never derived from the list row (FR-105 explicit no-stale-render rule). |
| Detail sheet open/selected id | Local UI state | `useState` in container (or URL `?report=<id>`, see §8 race note) | `{ open: boolean; reportId: string \| null }` | Transient UI, not independently shareable enough to force into URL for v1 — see race-condition note in §8 for why URL-syncing this is a *should*, not blocking. |
| Audit timeline (paginated) | Server state | `useInfiniteQuery` | `AuditEntryEntity[]` pages | Read-only, principal-only, INT-191-07; only fetched when `tab==="audit"`. |
| Dismiss mutation state | Server state (write) | `useMutation` | `void` success payload (updated report merged via invalidation, not local echo) | FR-106; button `aria-busy` derives from `mutation.isPending`. |
| Remove-content mutation state | Server state (write) | `useMutation` | `void` success payload | FR-108, HIGH-RISK, never optimistic. |
| Confirm-remove dialog local fields (`reason`/note) | Local form state | `useState` inside dialog (or lifted to container per `DestructiveConfirmDialog` extension contract) | `{ reason?: string }` (INT-191-05 `reason` field — required/optional pending BE confirmation, plan.md open question 3) | Not shared, not shareable, no react-hook-form needed for a single optional field — plain controlled input is enough; escalate to react-hook-form+zod only if BE confirms `reason` becomes required with format rules. |
| `ReportContentDialog` form (`reason`, `note`) | Local form state | Owned by the **consumer route** (feed/messaging), not this screen | `{ reason: ReportReason; note?: string }` | Out of this screen's state design — dialog is pure UI per plan.md's consumer contract; each consumer wires its own submit handler to the shared `SubmitReportUseCase`. |
| `viewerRole` | Server-resolved prop (not query) | RSC → VM prop | `"principal" \| ...` | Defensive UI-hiding only (NFR-101: real gate is server 403); resolved once at RSC render, never refetched client-side. |

---

## 3. State Flow

```
RSC (page.tsx)
  reads searchParams: tab, status, contentType, search, cursor(=null for page1)
  → makeListReportsUseCase().execute(filter, cursor=null)   (soft-fail to initialErrorKey, per plan.md Phase 6)
  → maps to ModerationScreenProps:
       { initialFilter, initialQueuePage /* incl. stats */, initialErrorKey,
         viewerRole, listReportsAction, getReportDetailAction,
         dismissReportAction, removeContentAction, getModerationAuditLogAction }
  → <ModerationScreen {...vm} />

Client (moderation-screen.tsx, 'use client')
  appliedFilter = parse(useSearchParams())      // URL is the source of truth
  draft = useState(initialFilter) synced both ways (debounced draft→URL, effect URL→draft)

  useInfiniteQuery(moderationKeys.list(appliedFilter))
    initialData = seeded ONLY if appliedFilter === initialFilter && !initialErrorKey
    (same guard as audit-log's `filtersEqual` check)

  [tab === "audit"] useInfiniteQuery(moderationKeys.audit())   -- enabled: tab==="audit"

  [sheet open] useQuery(moderationKeys.detail(reportId))       -- enabled: open && !!reportId

  useMutation(dismissReportAction)   → onSuccess: invalidate lists() + detail(reportId)
  useMutation(removeContentAction)   → onSuccess: invalidate lists() + detail(reportId) + audit()
                                        (NO onMutate — see §6)

SSE: none in this story (no realtime requirement in spec.md/integration.md;
moderation actions are principal-solo-navigate, not cross-session live-pushed —
same reasoning as academic-record-seal's "self-navigate, not live push" note).
```

---

## 4. Query Key Hierarchy + Cache Policy

```ts
// src/features/moderation/presentation/moderation-screen/moderation-screen.tsx
// (key factory colocated with the container — matches auditLogKeys precedent)

export const moderationKeys = {
  all:     () => ["moderation"] as const,

  lists:   () => [...moderationKeys.all(), "list"] as const,
  list:    (filter: ModerationFilter) =>
             [...moderationKeys.lists(), filter] as const,

  details: () => [...moderationKeys.all(), "detail"] as const,
  detail:  (reportId: string) =>
             [...moderationKeys.details(), reportId] as const,

  // Single fixed scope in this story (see §1 open-question flag) — kept as a
  // 0-arg key today; if BE confirms a real scope param, change to
  // audit: (scopeId: string) => [...moderationKeys.all(), "audit", scopeId] as const
  // and thread scopeId through the VM the same way `viewerRole` is threaded.
  audits:  () => [...moderationKeys.all(), "audit"] as const,
  audit:   () => moderationKeys.audits(),
} as const;
```

| Key | Query type | `staleTime` | `gcTime` | `refetchOnWindowFocus` | Rationale |
| --- | --- | --- | --- | --- | --- |
| `moderationKeys.list(filter)` | `useInfiniteQuery` | `30_000` | `120_000` | `false` | Matches audit-log's compliance-list cadence — queue isn't realtime-critical but stats embedded in it should refresh on revisit; short-ish stale window so a principal switching tabs sees reasonably fresh counts without hammering the endpoint. |
| `moderationKeys.detail(reportId)` | `useQuery` | `0` | `60_000` | `true` | **Always refetch on open** — FR-105/AC-1925.4 explicitly forbids stale/cached rendering (404 must not show stale data). `staleTime: 0` + refetch on mount is the correct way to guarantee this without a manual `removeQueries` dance on every row click. |
| `moderationKeys.audit()` | `useInfiniteQuery` | `15_000` | `120_000` | `false` | NFR-101's audit trail is the compliance proof surface — short stale time so a remove/dismiss done seconds ago is visible when the principal checks the tab, but not `0` since it's read-only and not safety-gating a decision (unlike `detail`). |

Global default (`react-query-provider.tsx`, unchanged): `staleTime: 60_000`,
`retry: 1`, `refetchOnWindowFocus: false` — all three overrides above are
intentional deviations, documented per `[[query-key-conventions]]` memory
convention (record cache durations that diverge from global default).

**Retry policy** (all three queries + both mutations): `retry` predicate reads
`error.retryable` off the thrown `ModerationFailure`-shaped object (never a
blanket retry count) — identical `ThrownFailure` pattern to audit-log:

```ts
retry: (failureCount, error) =>
  Boolean((error as unknown as ThrownFailure | undefined)?.retryable) &&
  failureCount < 2,
```

`forbidden`/`not-found`/`already-resolved`/`validation` never retry
(`retryable: false` from `toFailure`); only the mapped `network-error`/
transient bucket does.

---

## 5. Invalidation Map

| Trigger | Invalidates | Does NOT touch | Why |
| --- | --- | --- | --- |
| `dismissReport` success (INT-191-04) | `moderationKeys.lists()` (whole subtree — **not** just `list(activeFilter)**, since `stats` rides in every filter variant's payload per §1) · `moderationKeys.detail(reportId)` | `moderationKeys.audits()` | Plan.md explicitly scopes dismiss's audit write as **server-side only, no separate FE call needed** (integration.md INT-191-04: "audit log entry recorded server-side (no separate FE call needed)"). The audit **tab** still eventually reflects it once the principal navigates there and its own query runs — no need to force-bust an unopened tab's cache. If the audit tab happens to already be mounted/visible in the same session (unlikely given the confirm flow closes the dialog and stays on the queue), its normal `staleTime: 15_000` will pick it up on next natural refetch; not force-invalidated here to avoid speculative cross-key coupling not asked for by the AC set (only `removeContent`'s AC and the high-risk checklist explicitly demand the audit-entry-visible-after-action proof). |
| `removeContent` success (INT-191-05) | `moderationKeys.lists()` (whole subtree) · `moderationKeys.detail(reportId)` · `moderationKeys.audits()` | — | THE high-risk one. `lists()` for the same stat-staleness reason as dismiss. `detail(reportId)` so re-opening the same report (e.g. from a stale-tab link) shows `status: "removed"` + `resolvedBy`/`resolvedAt`, never a cached "pending" ghost. `audits()` is invalidated **unconditionally on every remove**, not just when the audit tab happens to be open — this is the concrete mechanism behind the high-risk checklist item "every dismiss/remove path is proven to produce a retrievable audit entry ... a Storybook/interaction test performs remove → switches to audit tab → asserts the new entry appears": invalidating eagerly (rather than relying on `staleTime` expiry) guarantees the very-next audit-tab mount is a fresh fetch, not a coincidentally-fresh cache hit. |
| `submitReport` success (different route, e.g. feed) | — (nothing under `moderationKeys`) | everything | Explicitly out of scope per §1 — a different container's cache entirely. If a future story wants the queue to reflect a just-submitted report live in the SAME session (principal has the moderation screen open in another tab while a teacher reports something), that is a cross-tab/SSE concern not specified by any AC here — do not invent it. |
| Detail sheet close (no mutation) | — | — | Closing the sheet is a UI-only transition; `enabled: open` naturally stops refetching, cache entry just goes stale per `gcTime` and gets GC'd if unused — no manual `removeQueries` needed. |
| Filter/tab change (URL nav) | — (new query key = new cache entry automatically) | — | Per `[[rsc-readonly-pattern]]`/audit-log convention: "filter-key-drives-reset, not manual reset" — changing `appliedFilter` produces a distinct `moderationKeys.list(filter)` key, which is a fresh empty infinite-query cache slot; never manually clear `pages`. |

---

## 6. Mutations & Optimistic Strategy

### `dismissReport` (FR-106, INT-191-04) — optimistic allowed but NOT recommended; designed as non-optimistic for consistency

```ts
const dismissMutation = useMutation({
  mutationFn: (reportId: string) => dismissReportAction(reportId),
  // No onMutate — dismiss is non-destructive but still has a 409 race
  // (report already resolved by someone else) that the confirm-info toast
  // needs to surface accurately (integration.md: "409 → inline error, refetch
  // report to show current state, no silent overwrite"). An optimistic flip to
  // "dismissed" would have to be rolled back visibly on 409, which is exactly
  // the flicker this pattern exists to avoid (same reasoning as [[admin
  // two-step approval / safety-critical gate pattern]]) — so treat dismiss the
  // same as remove for simplicity/consistency, even though dismiss alone
  // isn't the HIGH-RISK item.
  onSuccess: (_data, reportId) => {
    queryClient.invalidateQueries({ queryKey: moderationKeys.lists() });
    queryClient.invalidateQueries({ queryKey: moderationKeys.detail(reportId) });
  },
  onError: (error) => {
    // inline error in the detail sheet footer, keyed off error.type
    // ("already-resolved" → force a detail refetch too, so the sheet shows
    // current server state instead of a stale "pending" footer with dead
    // buttons — see race note §8)
    if ((error as ThrownFailure)?.type === "already-resolved") {
      queryClient.invalidateQueries({ queryKey: moderationKeys.detail(currentReportId) });
    }
  },
});
```

### `removeContent` (FR-108, INT-191-05) — HIGH-RISK, NEVER optimistic

```ts
const removeMutation = useMutation({
  mutationFn: (vars: { reportId: string; kind: ReportKind; contentId: string; reason?: string }) =>
    removeContentAction(vars),

  // *** NO onMutate. NO setQueryData before the promise resolves. ***
  // This is the explicit, code-review-verifiable shape the high-risk checklist
  // demands: "Never-optimistic remove: useMutation for remove has NO
  // onMutate/optimistic setQueryData; a Storybook/interaction test asserts
  // content still shows non-removed state while the mutation's promise is
  // pending (mock a delayed resolver)." A reviewer should be able to grep this
  // mutation definition and see zero `onMutate` keys, full stop.

  onSuccess: (_data, vars) => {
    queryClient.invalidateQueries({ queryKey: moderationKeys.lists() });
    queryClient.invalidateQueries({ queryKey: moderationKeys.detail(vars.reportId) });
    queryClient.invalidateQueries({ queryKey: moderationKeys.audits() });
    // toast + dialog close handled by the container's onSuccess callback,
    // not inside this mutation definition
  },

  onError: (error, vars) => {
    // 403/FORBIDDEN → dialog stays open, distinct copy, NO retry button
    // 409/already-resolved → dialog closes, queue refetches (handled by the
    //   lists() invalidation that ALSO needs to fire on this specific error —
    //   see the note below)
    // transient → dialog stays open, inline error WITH retry
    // Branch is done in the container/dialog on `error.type` (never
    // error.message) per AC-1928.9 — this mutation object only carries the
    // typed failure through; it does not itself decide UI copy.
    if ((error as ThrownFailure)?.type === "already-resolved") {
      // 409 case explicitly requires "dialog closes, queue refetches" even
      // though the mutation itself did not succeed — the write partially
      // landed from someone else's action, so lists()/detail() must still be
      // invalidated on THIS error branch, not only in onSuccess.
      queryClient.invalidateQueries({ queryKey: moderationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: moderationKeys.detail(vars.reportId) });
    }
    // 403/transient: deliberately invalidate NOTHING — content must remain
    // exactly as it was pre-mutation (no cache disturbance at all).
  },
});
```

No `onSettled` on either mutation — invalidation is done explicitly per branch
(`onSuccess` vs the `already-resolved` sub-case of `onError`) rather than a
blanket `onSettled` that would also fire (and invalidate) on the 403/transient
paths where nothing should be touched.

### `submitReport` (different consumer route — noted, not designed here)

Lives in feed/messaging's own container per plan.md's consumer contract. Not
this screen's `useMutation` — flagged only so `fe-nextjs-engineer` doesn't
accidentally wire it into `moderation-screen.tsx`.

---

## 7. Async State Machine

Exactly the 5 states FR-107/AC-1927.6 requires, one visible at a time, for the
**queue**; detail sheet and audit tab have their own reduced sets per spec.md
§5's UI-states table.

### Queue (`moderationKeys.list(filter)`)

| State | Condition | UI treatment |
| --- | --- | --- |
| loading | `query.isLoading` (no cached pages yet) | `EduSkeleton`, 5 rows (FR-107) |
| empty-positive | `query.data` resolved, `events.length === 0`, tab === "pending", **and** `stats.pendingCount === 0` | Positive-tone `EduEmpty`: "Không có báo cáo nào chờ xử lý" |
| empty-filtered | `query.data` resolved, `events.length === 0`, and either tab !== "pending" OR `stats.pendingCount > 0` (filter/search narrowed a non-empty set) | Neutral `EduEmpty`: "Không tìm thấy báo cáo nào" |
| error (whole-screen) | `query.isError && events.length === 0` (first-page failure — mirrors audit-log's `firstPageError`) | `EduError` + retry — **replaces the entire screen**, not just the stat row, per AC-1923.2 |
| success | `events.length > 0` | Table (or stacked cards ≤760px) with working filters; stats row rendered from the same page's `stats` field |
| load-more error (sub-state, not a primary state) | `fetchNextPage` rejects | Inline retry affordance on the load-more control only — already-rendered rows stay visible (same as audit-log's `loadMoreError` local state, reset on filter-key change) |

Failure→i18n mapping (per `[[failure-union-i18n]]` convention —
`moderation.errors.<type>`): `ModerationFailure["type"]` values
(`validation`, `already-reported`, `not-found`, `already-resolved`,
`forbidden`, `network-error`) map 1:1 to `moderation.errors.validation`,
`moderation.errors.already-reported`, etc. `forbidden` gets its own distinct
copy (never merged with `network-error`'s generic message) per NFR-101/AC-1928.6.

### Detail sheet (`moderationKeys.detail(reportId)`)

| State | Condition | UI treatment |
| --- | --- | --- |
| loading | `query.isLoading` | skeleton/spinner inside the sheet (FR-105) |
| error (404) | `query.isError && error.type === "not-found"` | inline error, sheet does **not** render any content section — explicit no-stale-render rule (AC-1925.4) |
| error (transient) | `query.isError && error.type === "network-error"` | inline error + retry |
| success (pending) | `query.data.status === "pending"` | full content + Dismiss/Gỡ nội dung footer buttons |
| success (resolved) | `query.data.status !== "pending"` | full content + resolve-info section instead of footer (no action buttons — mirrors audit-tab's "no controls" rule for a resolved report) |

No "empty" state for detail — it's always populated once fetched (FR-105 has
no empty case).

### Audit tab (`moderationKeys.audit()`)

| State | Condition | UI treatment |
| --- | --- | --- |
| loading | `query.isLoading` | `EduSkeleton` |
| empty | resolved, zero entries | simple empty state, **no** positive/filtered split (spec.md §5 explicit: unlike the queue) |
| error (403) | `error.type === "forbidden"` | distinct "không có quyền" copy, no retry (defense-in-depth; route itself is principal-gated) |
| error (transient) | `error.type === "network-error"` | `EduError` + retry |
| success | entries present | reverse-chronological timeline, icon+text action badges, zero action controls anywhere in this subtree (AC-1929.6) |

### Mutations (dismiss / remove)

| State | Condition | UI treatment |
| --- | --- | --- |
| idle | not pending | normal button |
| pending | `mutation.isPending` | button `aria-busy`, disabled; for remove, confirm dialog's submit button `aria-busy` — content in the sheet/row **stays rendered exactly as pre-mutation** |
| error (403/forbidden) | remove only | distinct permissions copy inline in the confirm dialog, **no retry button**, dialog stays open |
| error (409/already-resolved) | both | distinct message; dismiss → inline error + forced detail refetch (no overwrite); remove → dialog closes + queue/detail refetch |
| error (transient) | both | inline error **with** retry button; dismiss → status unchanged; remove → content still not marked removed |
| success | both | toast + dialog close (remove) / no dialog to close (dismiss, it's a sheet footer button) + cache invalidation per §5 |

---

## 8. Race Conditions & Resolution

1. **Two mutations firing concurrently on the same report** (e.g. a
   double-click on "Gỡ nội dung" before the first request round-trips, or a
   second principal dismissing while this one is mid-remove). Resolution:
   server is authoritative — the button is disabled while `mutation.isPending`
   (client-side single-flight per button), and the 409 `already-resolved`
   branch is exactly the server-side race detector; the client never assumes
   its own action landed until the response comes back (reinforced by the
   never-optimistic rule). No client-side mutex beyond the disabled button is
   needed because the server already rejects the loser with 409.

2. **Detail sheet open on a report that a `dismissReport`/`removeContent` from
   a DIFFERENT row/session concurrently resolves.** Since `detail(reportId)`
   uses `staleTime: 0` (always refetch on (re)mount) but is NOT polled while
   open, a sheet left open across a slow background mutation could show a
   stale "pending" footer momentarily. Resolution: the confirm-remove/dismiss
   flows only ever originate from the currently-open sheet in this screen's UX
   (no bulk actions in scope per plan.md), so the "other session" case is rare
   (another principal, different browser tab) — acceptable residual risk is a
   409 on that specific principal's own next action attempt, which is already
   the designed error path (`already-resolved` → forced refetch). Not solved
   with polling; polling `detail()` would contradict the "no realtime
   requirement" scope note in §1.

3. **Refetch (from `lists()` invalidation) racing the mutation's own in-flight
   response** — e.g. `removeContent`'s `onSuccess` invalidates `lists()`
   immediately; if a background refetch of the currently-active list resolves
   *before* the row-level UI has processed the mutation's own success, could
   the row flicker? Resolution: because this mutation is never optimistic,
   there is no pre-mutation client state to conflict with — the row's cached
   entity in `list()` only changes once the invalidated query actually
   refetches, which will show the server-confirmed `"removed"` status. No
   flicker risk exists here specifically *because* optimism was avoided (the
   inverse of the LMS cross-query-patch caution in `[[query-key-conventions]]`,
   where invalidation-during-optimism was the flicker risk — here there's no
   optimism to flicker against).

4. **Filter/tab change while a mutation is in flight** (principal changes the
   search box or switches "Chờ xử lý"→"Đã xử lý" tab mid-remove-confirm).
   Mutation variables are captured at the moment the confirm dialog opened
   (`reportId`/`kind`/`contentId` bound at open-time, not re-read from live
   `appliedFilter`/selected-row state) — same guidance as the
   admin-two-step-approval memory entry ("capture the selector at dialog-open
   time"). The mutation's `onSuccess`/`onError` invalidation targets
   (`moderationKeys.lists()`, `detail(reportId)`) are keyless-enough (whole
   subtree bust, and a fixed captured `reportId`) that a filter change
   mid-flight doesn't invalidate the wrong thing — it just means the
   now-currently-active `list(newFilter)` key also gets busted and refetches,
   which is correct behavior (stats must reflect the just-completed action
   regardless of which tab the principal is now looking at).

5. **Sheet closed before its `detail()` query resolves** (principal clicks a
   row, then immediately closes the sheet before the fetch returns).
   `enabled: open && !!reportId` unmounts the enabling condition; TanStack
   cancels the in-flight query attempt (default behavior) — no state leak, no
   stale render, since the sheet component itself unmounts/hides and won't
   paint a response that arrives after close. Should NOT restore the sheet's
   open state from URL as a "close = still fetching in background" pattern —
   deliberately keep sheet-open as ephemeral local state (see §2 for the
   URL-vs-local trade-off) precisely so this cancellation is trivial and
   correct; if a future revision URL-syncs `?report=<id>` for deep-linking, the
   `enabled` condition and cancellation behavior are unaffected either way.

6. **Load-more (`fetchNextPage`) racing a `lists()` invalidation from a
   dismiss/remove mutation.** If a principal is scrolling/paginating the queue
   at the exact moment they (or, less likely, a background invalidation from
   their own just-completed action on an earlier page) triggers a refetch of
   the base query, TanStack Query's `useInfiniteQuery` refetches ALL currently
   fetched pages in key order on invalidation (standard v5 behavior) — this is
   accepted as correct here (matches audit-log's existing pattern, no special
   handling needed) since the alternative (partial-page invalidation) isn't
   supported by the library and isn't worth a custom workaround for a queue
   that isn't a high-frequency infinite-scroll surface.

---

## Flags to `fe-lead`

1. **Confirms/extends plan.md's cross-cutting invalidation call** (§5 above):
   both `dismissReport` and `removeContent` invalidate `moderationKeys.lists()`
   as a whole subtree (all filter/tab variants), not just the active filter's
   key — required because `stats` is embedded per-list-response. This is a
   concrete resolution of the plan's flagged open problem, not a change to it.
2. **`removeContent`'s `onError` for the 409/`already-resolved` branch also
   invalidates `lists()`/`detail()`** (not only `onSuccess`) — integration.md
   explicitly says 409 → "dialog closes, queue refetches" even though the
   mutation itself is reported as a client-side failure. Flagging so
   `fe-nextjs-engineer` doesn't read "never optimistic" as "never invalidate on
   error" — those are different concerns (the former is about NOT showing
   removed-before-confirmed; the latter is about reflecting a real state change
   that happened server-side via someone else's concurrent action).
3. **Audit query key is currently 0-arg** (`moderationKeys.audit()`, no
   `scopeId`) per the single-tenant-principal assumption — this depends on
   spec.md/integration.md open question #4 (`INT-191-07`'s `roomId` ambiguity)
   staying resolved as "one fixed scope." If BE says otherwise, this key shape
   and the audit tab's query count both change — already flagged upstream in
   plan.md/spec.md, repeating here so it isn't lost between packet files.
4. **No ADR needed from this state design** — no global store introduced, no
   new auth/token handling, no new data-contract decision beyond what
   integration.md already stages as open questions.
