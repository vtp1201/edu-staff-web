# US-E09.6 Student Absences — State Design (`fe-state-engineer`)

Scope: TanStack Query key hierarchy, RSC↔client boundary, invalidation map,
mutation strategy (esp. `flagAbsence`'s non-optimistic constraint), and local/
URL state classification. No implementation code — this doc is the contract
`fe-nextjs-engineer` builds `student-absences-screen.query-keys.ts` and the
tab/container component from.

Precedents mirrored (per `plan.md` §7, verified by reading the actual source,
not assumed):
- Query-key factory shape/style: `src/features/staff-discipline/presentation/
  staff-discipline-screen/staff-discipline.query-keys.ts`.
- RSC↔client wiring (`initialData`, no `HydrationBoundary`): `src/features/
  staff-discipline/presentation/staff-discipline-screen/sd-violations-tab.tsx`
  + `src/app/[locale]/t/[tenant]/(app)/teacher/staff-discipline/page.tsx`.
- Non-optimistic single-row mutation → `invalidateQueries` (not
  `setQueryData`) in `onSuccess`: `src/features/staff-discipline/.../
  sd-violations-tab.tsx` (`rowMutation`) AND `src/features/admin/parent-links/
  presentation/parent-links-screen/parent-links-screen.tsx` (`unlinkMutation`,
  the repo's other named "no optimistic flip, high-risk-grade" precedent).
- Filter-bar state = component `useState`, NOT URL params: `sd-violations-tab.tsx`
  (`stateFilter`/`severityFilter`). `discipline-screen.tsx`'s `useSearchParams`
  usage is for the **tab** (navigational, shareable), not filters — a distinct
  concern this story doesn't have (no tabs here).

## 1. State Architecture Summary

- **One server-state query family**: `studentAbsenceKeys.list(filter)` — a
  single list resource, unlike `staff-discipline`'s two independent
  sub-resources. No tabs, no `HydrationBoundary`.
- **Three mutations**, all going through Server Actions
  (`recordAbsenceAction`, `editAbsenceAction`, `flagAbsenceAction`) refs on
  the VM, wrapped in `useMutation` in the client screen/container.
- **RSC → ViewModel → client `useQuery` with `initialData`** — no
  `HydrationBoundary`/dehydrate wiring; matches the established
  `staff-discipline` pattern exactly (`initialData` seeded conditionally on
  whether the RSC fetch itself failed, so error state is never masked as an
  empty list).
- **Filter state (date-range + principal's class-filter) is component
  `useState`**, feeding the query key — NOT URL search params. This story has
  no tab/deep-link requirement, matching `staff-discipline`'s filter-bar
  convention, not `discipline-screen`'s tab-in-URL convention (different
  concern).
- **`flagAbsence` has ZERO optimistic update** — no `onMutate`, no
  pre-emptive `setQueryData`. `onSuccess` calls `invalidateQueries` (matching
  this repo's established convention for non-optimistic single-row mutations
  — `staff-discipline`'s `rowMutation` and `parent-links`' `unlinkMutation`
  both do this, never a `setQueryData` patch-in). This is the single
  highest-risk decision in this doc — see §6.
- **No global client store.** Everything above is TanStack Query (server
  state), component `useState` (filters, dialog/form local state), and
  Server Actions (writes). Nothing here warrants an ADR — no new
  auth/token/data-contract decision surfaces.

## 2. State Inventory

| Item | Type | Owner | Shape (TS) | Reason |
| --- | --- | --- | --- | --- |
| Absences list | Server state | TanStack Query (`useQuery`) | `StudentAbsenceEntity[]` | Server-owned, list endpoint (INT-002), role-scoped |
| List loading/error/empty | Server state (derived) | `useQuery` flags + `initialErrorKey` | `query.isLoading` / `listErrorKey: StudentAbsenceFailure["type"] \| undefined` | Standard async surface, matches `sd-violations-tab`'s `listErrorKey` derivation pattern |
| Date-range filter (`from`/`to`) | Local/component state | `StudentAbsencesScreen` (or its list container) | `{ from: string; to: string }` | Feeds query key; not shareable/navigational in this story (no AC requires a shareable URL) — matches `staff-discipline` convention |
| Principal class-filter dropdown | Local/component state | Same container, principal-only | `classId: string \| undefined` | Same reasoning; small static dropdown, not paginated |
| Record dialog open/fields | Local form state | `SARecordForm` (react-hook-form + zod, presentation layer designs the schema) | `{ studentMemberId, date, excused, reason? }` | Not shared, not server state until submit |
| Edit dialog open/fields | Local form state | edit dialog component | `{ reason?, excused? }` (natural key rendered as static text, never in form state) | Same reasoning; PATCH partial body assembled from only-changed fields |
| Flag confirm dialog open/target row | Local component state | `StudentAbsencesScreen` (or list container) | `{ classId, studentMemberId, date } \| null` | Gates the confirm dialog; NOT query state |
| `recordAbsence` mutation | Server write | `useMutation` | input `RecordStudentAbsenceInput` → `StudentAbsenceEntity` | New row created |
| `editAbsence` mutation | Server write | `useMutation` | input `EditStudentAbsenceInput` → `StudentAbsenceEntity` | Existing row's `reason`/`excused` changed |
| `flagAbsence` mutation | Server write, NON-OPTIMISTIC | `useMutation` | input `{classId, studentMemberId, date}` → `StudentAbsenceEntity` | One-way terminal transition; AC-005.3 forbids pre-2xx UI change |
| Duplicate-date pre-check | Derived, read-only | Pure function `isDuplicateAbsence` called from the record dialog's submit handler | reads `queryClient.getQueryData(studentAbsenceKeys.list(filter))` (or the list already in scope via the container's own `query.data`) | Must read currently-cached list, not issue a new fetch (FR-003) |
| Static roster (`SA_STUDENT_ROSTER`) | Server-fetched-once (RSC prop) | VM prop `roster` | `StudentRosterEntry[]` | Static, passed once, never refetched — mirrors `staffRoster` in `staff-discipline` |
| Static class options (principal filter) | Server-fetched-once (RSC prop) | VM prop `classOptions` | `{classId, className}[]` | Small static list, not paginated |
| Summary stats (total/unexcused/flagged) | Derived, client-computed | `useMemo` over `query.data` | `{total, unexcused, flagged}` | Client-derived, no separate endpoint (FR-011) |

## 3. State Flow

**Initial paint (RSC → ViewModel → client):**

```
(app)/teacher/absences/page.tsx (RSC)
  → makeStudentAbsenceAuthContext("teacher")
  → makeStudentAbsenceRepository / list use-case .execute({ classId: authCtx.classId, from, to })
  → try/catch → initialAbsences: StudentAbsenceEntity[] (default []) + initialErrorKey?: StudentAbsenceFailure["type"]
  → StudentAbsencesScreen VM props (role="teacher", classId, initialAbsences, initialErrorKey, roster, actions...)
      ↓ 'use client'
  useQuery({
    queryKey: studentAbsenceKeys.list({ classId, from, to }),
    queryFn: () => listAbsencesAction({ classId, from, to }),
    initialData: initialErrorKey ? undefined : initialAbsences,   // error never masked as empty
    ...SA_LIST_QUERY_OPTIONS,
  })
```

Same shape for `(app)/principal/absences/page.tsx`, calling
`makeStudentAbsenceAuthContext("principal")` (no `classId` — schoolwide) and
rendering `StudentAbsencesScreen role="principal"`.

No `HydrationBoundary`/dehydrate anywhere — confirmed by reading the sibling
`staff-discipline` RSC page and tab container; the same `initialData` prop
pattern applies here.

**Filter change (client-only, no navigation):**

```
user changes date-range or class-filter (component useState)
  → query key changes: studentAbsenceKeys.list({ classId?, from, to })
  → useQuery auto-refetches (new key = new cache entry; stale skeleton NOT shown for a key
    already in cache within staleTime — see §4 cache policy)
```

**Mutation → Server Action → invalidation:**

```
recordAbsence: SARecordForm submit → recordAbsenceAction(input) → useMutation
  onSuccess → invalidateQueries(studentAbsenceKeys.lists()) → dialog closes, list refetches

editAbsence: edit dialog submit → editAbsenceAction(input) → useMutation
  onSuccess → invalidateQueries(studentAbsenceKeys.lists()) → dialog closes, row reflects update

flagAbsence: confirm dialog confirm → flagAbsenceAction(params) → useMutation
  NO onMutate. NO setQueryData before response.
  onSuccess → invalidateQueries(studentAbsenceKeys.lists()) → dialog closes,
    refetch brings back state:"FLAGGED_UNEXCUSED" from the SERVER response's
    reflected truth — row only ever shows the flagged badge after a real
    refetch settles, never from a client-side patch.
```

No SSE/realtime applies to this story (not in scope; no `noti` service
integration mentioned in spec.md/integration.md).

## 4. Query Key Hierarchy + Cache Policy

Mirrors `staffDisciplineKeys`'s factory shape/style exactly (flat list
family, no tabs to separate since this feature has only one resource):

```ts
// student-absences-screen.query-keys.ts (fe-nextjs-engineer writes this file)

export type StudentAbsenceFilter = {
  classId?: string; // required-server-side for teacher (always passed); optional client-filter for principal
  from?: string;     // bare YYYY-MM-DD
  to?: string;       // bare YYYY-MM-DD
};

export const studentAbsenceKeys = {
  all: () => ["student-absences"] as const,
  lists: () => [...studentAbsenceKeys.all(), "list"] as const,
  list: (filter: StudentAbsenceFilter) =>
    [...studentAbsenceKeys.lists(), filter] as const,
} as const;

export const SA_LIST_QUERY_OPTIONS = {
  staleTime: 30_000,      // matches SD_LIST_QUERY_OPTIONS precedent
  gcTime: 300_000,
  refetchOnWindowFocus: false,
} as const;
```

Notes:
- No `detail(id)` key — there is no single-record fetch endpoint in this
  story's contract (INT-001/003/004 all return the full mutated entity
  inline; the UI never fetches one row standalone). If a future story adds a
  detail view, add `detail(classId, studentMemberId, date)` then, not now
  (YAGNI — don't pre-build an unused key).
- `classId` is **always present** in the filter object for the teacher route
  (server-scoped, non-optional in practice) and **optional** for the
  principal route (`undefined` = schoolwide, a `classId` string = filtered).
  Both are still legal members of the same `StudentAbsenceFilter` shape — no
  separate key branch needed, exactly as `staffDisciplineKeys.violationsList`
  handles `staffMemberId?` for both principal (omitted) and teacher (always
  passed) callers.
- `from`/`to` are real server params (INT-002 query string) — always part of
  the key. No separate `state`/`excused` client-only narrowing key member (no
  AC requires client-side state/excused filtering distinct from the loaded
  set — unlike `staff-discipline`'s `stateFilter`/`severityFilter`, this
  story renders the full loaded set; if a future AC adds narrowing, it stays
  client-derived over `query.data`, NOT a key member, per the
  `staff-discipline` OQ3 precedent).
- `staleTime`/`gcTime` copied verbatim from `SD_LIST_QUERY_OPTIONS` — no
  story-specific reason to diverge (same "list of role-scoped records,
  moderate staleness tolerance" shape).
- `refetchOnWindowFocus: false` — matches precedent; a flagged/edited row
  from another tab surfaces on the next explicit mutation-triggered
  invalidation or manual refetch, not an window-focus refetch storm.

## 5. Invalidation Map

| Trigger | Keys invalidated | Notes |
| --- | --- | --- |
| `recordAbsence` mutation success | `studentAbsenceKeys.lists()` | Broadest invalidation (all filter variants) — new row must appear regardless of which filter combination is currently active; matches `staff-discipline`'s `invalidate()` helper invalidating the whole sub-resource root, not just the active filter's exact key |
| `editAbsence` mutation success | `studentAbsenceKeys.lists()` | Same reasoning — the edited row may be visible under a different active filter than the one open at edit time (e.g. principal editing... N/A, principal never edits, but teacher's own list could have stale multi-tab state) |
| `flagAbsence` mutation success | `studentAbsenceKeys.lists()` | Same broad invalidation; this is what brings back `state:"FLAGGED_UNEXCUSED"` — see §6, this is the ONLY mechanism that updates the row, never `onMutate`/`setQueryData` |
| `flagAbsence` mutation error, `type: "not-found"` (404, race) | `studentAbsenceKeys.lists()` | Server truth wins — row may already be gone/changed by another actor; invalidate so refetch reconciles (matches `parent-links`' `unlinkMutation` 404-race handling — toast + invalidate, not a manual splice) |
| `flagAbsence` mutation error, `type: "forbidden"` / `"invalid-state"` / `"invalid-id"` / network-error | none | Touch nothing in the cache — dialog reopens with an inline error, row stays exactly as it was (matches `parent-links`' forbidden/network-error branch: "touch NOTHING in the cache") |
| `editAbsence` mutation error, `type: "not-found"` (404) | `studentAbsenceKeys.lists()` | Per spec.md's AC-004.5 ("toast + refetch") — same reconciliation pattern as flag's 404 race |
| `recordAbsence` / `editAbsence` errors other than not-found (`forbidden`, `duplicate-date`, `invalid-date`, `invalid-input`, network) | none | Dialog stays open, fields preserved, inline error shown — no cache touch |

No realtime/SSE row in this story (out of scope, confirmed in §3).

## 6. Mutations & Optimistic Strategy

### `recordAbsence`
- `onMutate`: none (no optimistic insert — a new row's full server-assigned
  shape, incl. `recordedByMemberId`/`createdAt`, isn't known client-side
  anyway; matches `staff-discipline`'s `createMutation`, which also has zero
  optimism).
- `onSuccess`: close dialog, clear inline error, `invalidateQueries(studentAbsenceKeys.lists())`.
- `onError`: dialog stays open; map failure → inline field/banner error
  (future-date → date field; duplicate-date → banner; invalid-input →
  per-field via `error.fields[]`; network → generic + retry, fields
  preserved). No cache touch.

### `editAbsence`
- `onMutate`: none — PATCH body is partial (only changed fields); no
  optimistic patch of `reason`/`excused` in the cached row (a client-side
  optimistic patch here isn't spec-required and this story has no AC
  demanding perceived-instant edit; keep it consistent/simple with the
  no-surprise-elsewhere convention below).
- `onSuccess`: close dialog, `invalidateQueries(studentAbsenceKeys.lists())` →
  refetch reflects updated `reason`/`excused`/`updatedAt` from the server.
- `onError`: `not-found` (404) → toast + `invalidateQueries(...)` (row may
  have been mutated/removed elsewhere); `invalid-input` → per-field;
  `invalid-state` (backstop) → generic inline error; `forbidden` → inline
  dialog error, no cache touch; network → dialog stays open, retry.

### `flagAbsence` — the hard constraint (AC-005.3 / NFR-008 pt.3)

**Exact mechanism, zero ambiguity:**

1. **No `onMutate` callback is defined on this `useMutation` call at all.**
   There is nothing to snapshot and nothing to roll back, because nothing is
   ever optimistically written.
2. **No `queryClient.setQueryData` call exists anywhere in this mutation's
   lifecycle** (not in `onMutate` — which doesn't exist — nor in `onSuccess`).
   The row's `state`/badges are NEVER patched client-side from the mutation's
   own return value either, even though `flagAbsence` returns the full
   updated `StudentAbsenceEntity` — that returned entity is used ONLY to
   confirm the mutation resolved; it is deliberately NOT written into the
   cache directly via `setQueryData(studentAbsenceKeys.list(filter), (old) =>
   patchRow(old, data))`.
3. **`onSuccess` calls `queryClient.invalidateQueries({ queryKey:
   studentAbsenceKeys.lists() })` and nothing else (cache-wise)** — this
   triggers a genuine refetch through `listAbsencesAction`, and the row's
   `FLAGGED_UNEXCUSED` state only ever reaches the UI via that refetch's
   response. This is the exact same shape as `staff-discipline`'s
   `rowMutation.onSuccess` (`void invalidate()`) and `parent-links`'
   `unlinkMutation.onSuccess` (`invalidateQueries(...)` ×3, no
   `setQueryData`) — **confirmed established repo convention for
   non-optimistic single-row mutations is invalidate-then-refetch, not
   setQueryData-patch-from-response**, even though the response carries the
   full updated entity. Do not deviate to a `setQueryData` patch for this
   mutation "for efficiency" — that would reintroduce exactly the
   perceived-instant-success risk AC-005.3 forbids if `onSuccess` ever
   fires before the UI has re-rendered from confirmed state, and it breaks
   parity with the two named precedents.
4. Between click-confirm and settle: confirm button shows
   `pending`/`disabled` (`mutation.isPending`); the row underneath is
   UNTOUCHED — same `state`/badges as before the click.
5. `onError`: `not-found` (404) → toast + `invalidateQueries(lists())`,
   dialog closes (server truth: row already changed); `forbidden` /
   `invalid-state` (re-flag backstop) / `invalid-id` → dialog reopens with
   inline error, NOTHING invalidated, row untouched; network-error → dialog
   stays open/reopens, retry available, row untouched.

This is the story's single hardest state-design constraint and is fully
satisfied by: **no `onMutate`, no `setQueryData` ever, `invalidateQueries`
only in `onSuccess` (and the 404-race branch of `onError`)**.

## 7. Async State Machine

| Surface | Loading | Empty | Error | Stale/refetching | Success |
| --- | --- | --- | --- | --- | --- |
| Teacher list (INT-002) | 4-row skeleton, `query.isLoading` | "Chưa ghi nhận nghỉ học kỳ này" + "Ghi nhận nghỉ học" CTA when `rows.length === 0` and no error | `listErrorKey` (query error OR `initialErrorKey` if query hasn't succeeded yet) → `SDListError`-equivalent + retry re-issuing same filter; `forbidden` backstop → generic error, never silent | Existing rows stay visible while `query.isFetching` (filter change); no full-skeleton flash on refetch (`initialData`/cache already populated for previously-seen keys) | Rows render: student (roster `.find`), date, `SAExcusedBadge` (always), `SAFlaggedIndicator` (if flagged), reason |
| Principal list (INT-002) | Same 4-row skeleton | Same copy, STATIC, no CTA | Same pattern, retry re-issues same filter (incl. class-filter) | Same | Same rows + "Gắn cờ" only on `state===RECORDED` |
| Record dialog | submit button `mutation.isPending` + `aria-busy` | n/a | future-date → inline date-field error before request (client `isFutureDate` guard); duplicate-date → inline banner (client `isDuplicateAbsence` pre-check reading cached list, see §2/§6); server-side identical errors on 422/409; network → dialog stays open, fields preserved | n/a (dialog is not itself a query) | new record appears via `invalidateQueries` refetch, dialog closes |
| Edit dialog | submit button pending | n/a | per-field invalid-input; not-found → toast+refetch; network → retry | n/a | row updates via refetch, dialog closes |
| Flag confirm dialog | confirm button pending/disabled, **row untouched** (§6) | n/a | forbidden/invalid-state/invalid-id → dialog reopens w/ inline error, row untouched; not-found → toast + invalidate + close; network → stays open/reopens, retry | n/a | dialog closes, row shows `FLAGGED_UNEXCUSED` ONLY after refetch settles |

**Error → failure → i18n key mapping** (verbatim from `spec.md` §6, reused
here for the state-machine's error branch, no new keys):

```
StudentAbsenceFailure["type"] → studentAbsences.errors.<type>
  EXCEPT "invalid-date" → studentAbsences.errors.invalid-date-future
```

Presentation translates via `useTranslations("studentAbsences")`; the
mutation/use-case/repository layers never translate — they throw/return the
typed `type` only (matches `.claude/rules/i18n.md`).

## 8. Race Conditions & Resolution

1. **Concurrent flag + refetch race**: principal double-clicks "Gắn cờ" (or
   two tabs) before the first `flagAbsence` settles. Resolution: confirm
   button is `disabled` while `mutation.isPending` (standard TanStack Query
   `isPending` guard) — no second mutation can fire from the same dialog
   instance. If a genuinely separate second flag call reaches the mock repo
   (e.g. second tab) after the first already transitioned the row,
   `invalid-state` (re-flag backstop) fires — surfaced as a generic inline
   error, no cache corruption, because neither mutation ever wrote
   client-side state directly.
2. **Filter change while a mutation is in flight**: user changes date-range
   or class-filter while `recordAbsence`/`editAbsence`/`flagAbsence` is
   pending. The in-flight mutation's `invalidateQueries(lists())` on
   settlement invalidates ALL list-family keys (not just the filter active
   at click-time), so the now-active filter's query also refetches
   correctly regardless of which filter was showing when the mutation
   started — this is exactly why §5 invalidates the broad `lists()` root,
   not a single exact-filter key.
3. **Stale list vs. server's authoritative duplicate/forbidden/re-flag
   check**: client-side `isDuplicateAbsence`/`isFutureDate` pre-checks read
   a potentially-stale cached list (another tab recorded an absence after
   this tab's last fetch). Resolution: server is always the source of truth
   — `ABSENCE_DUPLICATE_DATE`/`ABSENCE_INVALID_DATE`/`ABSENCE_FORBIDDEN`
   still fire from the mock repository even when the client pre-check
   passed, and render the IDENTICAL inline error (FR-002/FR-003 explicitly
   require this dual client+server check for exactly this race).
4. **404 mid-flight (`not-found`) on edit/flag**: row was removed/changed by
   another actor between list-load and this mutation's dispatch. Resolution:
   server truth wins — `invalidateQueries(lists())` + toast, dialog closes;
   never a manual splice/removal of the row from cache (matches
   `parent-links`' `unlinkMutation` 404-race handling verbatim).
5. **Refetch-vs-optimistic race is structurally impossible for `flagAbsence`**
   because there is no optimistic write to race against — the only writer of
   the row's `state` in the cache is the refetch triggered by
   `invalidateQueries` in `onSuccess`, which happens strictly after the
   mutation's own `2xx` response. No interleaving window exists where a
   stale optimistic value and a real refetch could disagree.

## Handoff notes for `fe-nextjs-engineer`

- Write `studentAbsenceKeys` + `SA_LIST_QUERY_OPTIONS` in
  `src/features/student-absences/presentation/student-absences-screen/
  student-absences-screen.query-keys.ts` (filename mirrors
  `staff-discipline.query-keys.ts`'s convention: `<feature-kebab>.query-keys.ts`).
- The `flagAbsence` `useMutation` config in the screen/container component
  MUST have no `onMutate` key present at all (not even an empty one) and MUST
  NOT call `setQueryData` anywhere in its `onSuccess`/`onError` — a code
  reviewer (`fe-tech-lead-reviewer`) should grep for `setQueryData` scoped to
  this feature file and expect zero matches touching the flag mutation.
- Duplicate-date pre-check (`isDuplicateAbsence`, domain pure function) is
  called from the record dialog's submit handler using the list container's
  own `query.data` (already in scope, no `queryClient.getQueryData` needed
  if the pre-check runs inside the same component that owns the `useQuery`
  call) — prefer passing `query.data` directly over reaching into
  `queryClient.getQueryData` from a nested dialog component, unless the
  dialog is architected as a sibling without direct access to `query.data`,
  in which case `queryClient.getQueryData(studentAbsenceKeys.list(filter))`
  is the fallback (both are legal "read from cache, don't fetch" access
  patterns — `fe-component-architect`'s prop-drilling decision governs which
  one applies once the dialog's exact position in the tree is fixed).
