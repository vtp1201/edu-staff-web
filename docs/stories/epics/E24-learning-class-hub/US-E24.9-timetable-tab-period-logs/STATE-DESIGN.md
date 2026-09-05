# US-E24.9 — Timetable tab: State Architecture

Author: `fe-state-engineer`. No production code here — a design for
`fe-nextjs-engineer` to implement against, alongside `PLAN.md` (ground truth
for entities/DTOs/use-cases/failures — not restated here except where it
constrains state shape).

Grounded against this repo's actual local precedents for RSC+Server-Action
screens with **no TanStack Query**: `features/class-log/presentation/class-log-screen/class-log-screen.tsx`
(list-mirror + `upsert()`), `features/discipline/presentation/student-conduct-screen/components/leave-request-sheet.tsx`
(RHF+zod form, `onSubmitted?(input)` callback contract), and
`features/timetable/presentation/timetable-view/week-nav.tsx` (confirmed NOT
reusable — client-`useState` offset model, this tab needs URL-driven weeks
per PLAN §0.7).

---

## 1. State Architecture Summary

- **Confirmed: no TanStack Query for this tab.** All list reads (week's
  timetable slots, period-logs, period-preps, homeroom entries) are fetched
  server-side in `page.tsx` (RSC, reading `searchParams.week` + `tab`) and
  assembled into `TimetableTabVm`. All 7 writes (`savePeriodLogAction`,
  `deletePeriodLogAction`, `savePeriodPrepAction`, `deletePeriodPrepAction`,
  `saveDailyEntryAction`, `submitDailyEntryAction`, `reviseDailyEntryAction`)
  are Server Actions calling `revalidatePath`. There is no cross-session /
  realtime feed here (no SSE taxonomy for `core` period-logs), no independent
  pagination, no background refetch need — TanStack would add a cache layer
  with nothing meaningfully async-stale to manage. This matches the packet's
  own Design Notes and PLAN §8's YAGNI call.
- **One client boundary above the leaves is REQUIRED, correcting PLAN §6's
  literal "timetable-tab.tsx — RSC (no client fetch)".** The RSC page renders
  the day-grid (left column) and the upcoming-period panel (right column)
  from the SAME server-computed maps (`logsByKey`, `prepsByKey`,
  `homeroomByDate`). If each leaf form (`period-log-form`, `period-prep-form`,
  `daily-log-panel`) only updates its OWN local state after a successful
  save, the sibling upcoming-panel chips ("Chuẩn bị tiết: đã/chưa", "Sổ đầu
  bài tiết: đã/chưa") go stale until the next full navigation — `page.tsx`
  reads `searchParams`, so it's already dynamically rendered per request, but
  a Server-Action-triggered `revalidatePath` does not, by itself, force the
  *already-mounted* client subtree to re-pull new props without an explicit
  `router.refresh()` or an equivalent client-owned merge. **Decision:** add
  ONE thin `'use client'` wrapper, `timetable-tab-body.tsx`, sitting between
  `timetable-tab.tsx` (RSC, does the VM assembly + i18n strings) and the two
  columns. It owns three `useState` maps seeded once from server props via
  `useState(initialValue)` (not re-synced from props on every render — same
  posture as `ClassLogScreen`'s `localEntries`), and passes an `upsert*`
  callback down to each form. This is the **only** new piece of "shared" tab
  state — everything else stays leaf-local. See §2 row 1–3, §6.
- **Optimistic-update verdict: local-state upsert-on-result, NOT
  `useOptimistic`, NOT a manual pre-response guess.** Considered and
  rejected: React 19 `useOptimistic` (no precedent anywhere in this
  codebase; its rollback-on-mismatch semantics solve a problem this screen
  doesn't have — the "optimistic" value here is always the ACTUAL server
  response already awaited client-side, never a client-guessed value ahead
  of the request). The established, repo-wide convention (`ClassLogScreen`,
  `LeaveRequestSheet` → `StudentConductScreen`'s `onSubmitted` callback) is:
  await the Server Action, and on `{ok:true}` merge the returned entity into
  local state directly — this is "instant" from the user's perspective (no
  second round trip, no skeleton) without needing React 19's newer primitive
  or a rollback path (errors just show a banner and leave prior state
  untouched, matching AC's error-banner requirement). Keep this repo's
  pattern for consistency; do not introduce a second convention for the same
  problem.
- **Server vs client split:** `page.tsx` (RSC) resolves `myMemberId`
  (`decodeMemberId` via the already-established session helper),
  `resolveCurrentTermContext()` (extended with `academicYearId`, PLAN §3),
  calls `GetClassTimetableUseCase`/`GetWeekPeriodLogs`/`GetWeekPeriodPreps`/
  `ClassLog`'s list use-case for the resolved week range, and builds
  `logsByKey`/`prepsByKey`/`homeroomByDate` + `weekDays` + `upcoming`
  (`pickUpcomingPeriod`, pure selector, PLAN §4) — all pure server data, zero
  client fetch. `timetable-tab-body.tsx` (client) owns only the 3 mirrored
  maps + per-row/per-day open/closed UI toggles. Forms
  (`period-log-form.tsx`, `period-prep-form.tsx`, `daily-log-panel.tsx`'s
  edit mode) are `'use client'`, RHF+zod, call a Server Action directly
  (passed down as a prop function reference — same "action ref" convention
  as `LeaveRequestSheet`'s `submitAction` prop, not a raw import inside a
  deeply nested leaf).
- **URL state:** `?tab=timetable&week=YYYY-Www` (week only meaningful when
  `tab=timetable`; shell's own `?tab=` already established in US-E24.8).
  Pure parse/format via `iso-week.ts` (PLAN §4) — no client state, no
  `useSearchParams` hook needed since `page.tsx` reads `searchParams` directly
  server-side and builds prev/next `<Link>` hrefs; navigation is a plain
  route transition (Next handles it), not a client-side offset counter like
  the old `WeekNav`.
- **Local form state:** `PeriodLogForm` (lessonTitle/remark/grade/
  absentCount), `PeriodPrepForm` (note/lessonPlanId/materials[]) — RHF +
  zod, matches `LeaveRequestSheet`'s established shape (`Form`/`FormField`
  from `components/ui/form`, `serverErrorKey` state + `role="alert"` banner,
  `useTransition` wrapping the action call, `form.reset()` + close/collapse
  on success).
- **Key decisions flagged to `fe-lead` (not ADR-tier, confirm with
  `fe-component-architect`):**
  1. New client wrapper `timetable-tab-body.tsx` (§ above) — a course
     correction from PLAN §6's literal "RSC, no client fetch" wording; the
     RSC/client split is otherwise unchanged (VM assembly stays server-side).
  2. Reject `useOptimistic` in favor of the established `onSubmitted`-callback
     upsert pattern (§ above) — flagging in case the engineer defaults to the
     newer React primitive out of habit.
  3. `daily-log-panel`'s per-day edit state should NOT reintroduce
     `ClassLogScreen`'s `view: "list"|"new"|"detail"` state machine — there is
     no list here (one entry per day, inline), so a plain per-day
     `isEditing: boolean` (or `Set<date>` if the component instance is shared
     across days rather than mounted once per day-card) is sufficient. Flag
     to `fe-component-architect` when confirming whether `daily-log-panel` is
     mounted once-per-day-card (preferred — boolean local state, zero key
     collisions) or once-for-the-week (would need the `Set<date>` form).

---

## 2. State Inventory

| # | State | Type | Owner | Shape (TS) | Reason |
| --- | --- | --- | --- | --- | --- |
| 1 | Period-log mirror (per slot) | Local (component state), seeded from server prop | `timetable-tab-body.tsx` | `Record<string /* logKeyOf(date,n) */, PeriodLog>` | Shared read by day-grid badges AND upcoming-panel chips; must update from ONE place so both stay in sync after a save (§1) |
| 2 | Period-prep mirror (per slot) | Local (component state), seeded from server prop | `timetable-tab-body.tsx` | `Record<string /* prepKeyOf(date,n) */, PeriodPrep>` | Same reasoning as #1 |
| 3 | Homeroom daily-entry mirror (per date) | Local (component state), seeded from server prop | `timetable-tab-body.tsx` | `Record<string /* date */, HomeroomEntry>` | Day-card's own daily-log-panel reads/writes here; no second consumer today, but co-located with #1/#2 for one merge surface and consistent revalidation story |
| 4 | Period-log form open/closed (per slot) | Local (component state) | `period-row.tsx` | `boolean` (or `"log" \| "prep" \| null` if both forms can't be open simultaneously — confirm with component-architect) | Pure UI toggle, not shared, not fetched — PLAN §8(a)'s "8th piece of global state" concern resolved: this stays leaf-local, never lifted |
| 5 | Period-log form fields | Local (RHF) | `period-log-form.tsx` | `{ lessonTitle: string; remark: string; grade: PeriodGrade; absentCount: number }` | Multi-field validated input (≤200/≤2000/A-D/0-200) — RHF+zod per Decision Framework table |
| 6 | Period-log form server-error banner | Local (component state) | `period-log-form.tsx` | `PeriodLogFailure["type"] \| null` | 422/409/etc. rendered as one undifferentiated banner (AC: no 403/422 split) except `term-mismatch` gets its own copy |
| 7 | Period-prep form fields | Local (RHF + `useFieldArray`) | `period-prep-form.tsx` | `{ note: string; lessonPlanId: string \| null; materials: { title: string; url: string }[] }` | Same reasoning as #5; `materials` needs `useFieldArray` for add/remove ≤20 |
| 8 | Period-prep form server-error banner | Local (component state) | `period-prep-form.tsx` | `PeriodLogFailure["type"] \| null` | Same as #6 (shared failure union, no prep-specific 409 per PLAN §0 ground truth) |
| 9 | Delete-log/prep confirm dialog | Local (component state), capture-at-open-time | `period-row.tsx` | `{ open: boolean; kind: "log" \| "prep"; date: string; periodNumber: number } \| null` | Mirrors `feed-screen-container.tsx`'s `removeVars` capture pattern (US-E19.1 precedent) — avoids a stale confirm click after the map changes |
| 10 | Daily-log-panel edit mode (per day) | Local (component state) | `daily-log-panel.tsx` (one instance per day-card, see §1 flag #3) | `boolean` | Draft textarea only shown while editing; view/edit toggle, not shared |
| 11 | Daily-log-panel form value | Local (component state, plain controlled — NOT RHF) | `daily-log-panel.tsx` | `{ summary: string; notableEvents: string }` | Single-purpose 2-field form identical in shape to `ClassLogEntryForm` (which itself uses plain `useState`, not RHF) — reuse that component/pattern directly rather than a second form technology for the same 2 fields |
| 12 | Week param | URL | `page.tsx` (`searchParams.week`), read-only downstream | `string` (`"YYYY-Www"`, validated/defaulted by `parseIsoWeek`) | Shareable/navigable, matches shell's `?tab=` convention (US-E24.8) |
| 13 | `isPending` (per mutation family) | Local (`useTransition`) | Each form / `period-row.tsx` | `boolean` | Disables submit button, shows "Đang lưu…" — one per in-flight action, not shared |

---

## 3. State Flow

```
page.tsx (RSC)
  reads searchParams.week + tab
  → parseIsoWeek → monday
  → resolveCurrentTermContext() (termId, academicYearId)
  → Promise.all([
       makeGetClassTimetableUseCase().execute(classId)          // slots
       makeGetWeekPeriodLogsUseCase().execute(classId, from, to) // PeriodLog[]
       makeGetWeekPeriodPrepsUseCase().execute(classId, from, to)// PeriodPrep[]
       makeListEntriesUseCase (class-log).execute(classId, from, to) // HomeroomEntry[]
     ])
  → build weekDays[], logsByKey, prepsByKey, homeroomByDate,
    upcoming = pickUpcomingPeriod(...), prevWeekHref/nextWeekHref
  → TimetableTabVm
  → <TimetableTab vm={vm} />                         (RSC, i18n + layout only)
       → <TimetableTabBody                            ('use client')
            initialLogsByKey initialPrepsByKey initialHomeroomByDate
            savePeriodLogAction ... reviseDailyEntryAction (action refs) />
            ├─ useState mirrors seeded ONCE from initial* props
            ├─ <DayCard> × 5-6
            │    └─ <PeriodRow> (per slot)
            │         ├─ own open/closed state
            │         ├─ <PeriodLogForm onSubmitted={upsertLog} action={savePeriodLogAction}/>
            │         └─ <PeriodPrepForm onSubmitted={upsertPrep} action={savePeriodPrepAction}/>
            │    └─ <DailyLogPanel entry={homeroomByDate[date]} onSubmitted={upsertHomeroomEntry}
            │         action={saveDailyEntryAction|submitDailyEntryAction|reviseDailyEntryAction}/>
            └─ <UpcomingPeriodPanel upcoming={recomputed from same logsByKey/prepsByKey state} />

Mutation (e.g. PeriodLogForm submit):
  form.handleSubmit → startTransition(async () => {
    const res = await savePeriodLogAction(classId, date, n, assignedTeacherMemberId, input)
    if (!res.ok) { setServerErrorKey(res.errorKey); return }     // no map mutation on error
    onSubmitted(res.data)                                        // → upsertLog into map (local, instant)
    closeForm()
  })

savePeriodLogAction (Server Action):
  makeSavePeriodLogUseCase() → { useCase, authCtx }
  resolveCurrentTermContext() → termId, academicYearId
  useCase.execute(authCtx, { ...params, termId, academicYearId, input })
  if (result.ok) revalidatePath(CLASS_HUB_PATH, "page")           // cross-navigation/session correctness
  return result                                                    // consumed directly by the client for the local merge — no second fetch
```

`revalidatePath` here is a **cache-correctness measure for future
navigations** (back/forward, another tab reopening the same URL, prefetch),
not the mechanism the CURRENT view relies on for its own UI update — that's
the local `onSubmitted` merge. This avoids depending on `router.refresh()`'s
loading-boundary flash for a same-screen save (matches `ClassLogScreen`'s
existing UX).

---

## 4. Query Key Hierarchy + Cache Policy

**N/A — no TanStack Query in this story.** No query keys, no `staleTime`/
`gcTime` to define. (If a future story adds SSE-driven live period-log
updates across concurrent viewers, that would be the trigger to revisit —
not in scope here; no `noti` SSE taxonomy exists for `core` period-logs per
`api-integration.md`.)

---

## 5. Invalidation Map

Since there is no query cache, "invalidation" here means (a) which
`revalidatePath` call runs server-side per mutation, and (b) which local map
gets upserted client-side.

| Trigger (Server Action) | `revalidatePath` target | Local map upserted |
| --- | --- | --- |
| `savePeriodLogAction` | `CLASS_HUB_PATH` (page) | `logsByKey[logKeyOf(date,n)] = result.data` |
| `deletePeriodLogAction` | `CLASS_HUB_PATH` (page) | delete `logsByKey[logKeyOf(date,n)]` |
| `savePeriodPrepAction` | `CLASS_HUB_PATH` (page) | `prepsByKey[prepKeyOf(date,n)] = result.data` |
| `deletePeriodPrepAction` | `CLASS_HUB_PATH` (page) | delete `prepsByKey[prepKeyOf(date,n)]` |
| `saveDailyEntryAction` | `CLASS_HUB_PATH` (page) | `homeroomByDate[entryDate] = result.entry` |
| `submitDailyEntryAction` | `CLASS_HUB_PATH` (page) | `homeroomByDate[entry.entryDate] = result.entry` |
| `reviseDailyEntryAction` | `CLASS_HUB_PATH` (page) | `homeroomByDate[entry.entryDate] = result.entry` |

`CLASS_HUB_PATH` is the SAME path constant for all 7 — a single
`revalidatePath` covers day-grid AND upcoming-panel AND the students/other
tabs of the same shell page, since `page.tsx` assembles the whole route in
one server render (no separate per-tab cache segment). No per-tab or
per-week variant needed since `page.tsx` is already dynamically rendered on
`searchParams` (not statically cached), so `revalidatePath`'s main value is
invalidating the **Router Cache** (client-side prefetch/back-forward cache),
not a server data cache.

---

## 6. Mutations & Optimistic Strategy

All 7 mutations follow the SAME shape (no per-mutation variation needed):

1. **`onMutate` (implicit, not a TanStack `onMutate` — just "before await")**:
   none — no client-guessed value is shown; the submit button flips to
   `isPending` (via `useTransition`) and stays showing the OLD state until
   the real response returns. This is a deliberate non-optimistic-before
   choice (see §1) — the round trip is typically sub-second for a single
   PUT/DELETE, and showing a guessed value that could be wrong (e.g. slot
   forbidden) would need a rollback path this repo has no precedent for.
2. **On success (`result.ok === true`)**: call `onSubmitted(result.data)` →
   parent (`timetable-tab-body.tsx`) upserts into the relevant map; the leaf
   form collapses (`period-row`'s open state → `false`) or clears (daily-log
   textarea → view mode). Toast success (matches `ClassLogScreen`/
   `LeaveRequestSheet` convention).
3. **On error (`result.ok === false`)**: `setServerErrorKey(result.errorKey)`
   renders the banner; NO map mutation (state stays exactly as before the
   attempt — this IS the "rollback", trivially, because nothing was changed
   optimistically). Form stays open with the user's typed values intact
   (RHF preserves field state across a failed submit automatically).
4. **`onSettled`-equivalent**: none needed beyond `isPending` flipping back
   to `false` (React's own `useTransition` handles this without an explicit
   callback).
5. **Delete flows** (`deletePeriodLogAction`/`deletePeriodPrepAction`): confirm
   dialog captures `{date, periodNumber}` at open time (state #9); on
   confirm, same await→merge→collapse shape, removing the key from the map
   instead of setting it.
6. **SSE**: not applicable — no realtime source for period-logs/preps/
   homeroom-entries.

---

## 7. Async State Machine

| Surface | Loading | Error | Empty | Stale/refetching | Success |
| --- | --- | --- | --- | --- | --- |
| Whole tab (week's data) | Server-rendered — Next's route-level `loading.tsx`/Suspense boundary shows a skeleton matching the 2-col grid shape (day-card skeletons + aside skeleton) during the RSC fetch (prev/next week Link navigation, or first load) | A failed use-case call surfaces as a page-level error boundary OR (preferred, per AC's "no-slots/error" Storybook state) `TimetableTabVm` carries a `loadError?: PeriodLogFailure["type"]` field the RSC branch sets when any of the 4 Promise.all reads fails, rendering an inline banner instead of blowing up the whole page | `slots.length === 0` for the week (holiday-only week / no timetable published) → empty-state card per day, AC's "holiday"/"no-slots" Storybook states | N/A (no background refetch; each navigation IS a fresh server render) | Full 2-col grid renders |
| Period-log form submit | `isPending` → button label "Đang lưu…", disabled | Banner (`role="alert"`) mapping `PeriodLogFailure["type"]` → `teacherClasses.hub.timetable.errors.<type>` (typed `t()` per `i18n.md`); `slot-forbidden-or-missing` and generic `validation` share the SAME banner text per AC (no 403/422 split); `term-mismatch` gets its own copy | N/A (form always has fields to fill) | N/A | Form collapses, `period-row` shows "Đã ghi sổ tiết" + saved content read from `logsByKey` |
| Period-prep form submit | same as above | same mapping, plus `too-many-materials` (also caught client-side before submit, so this is the BE-backstop path — same banner either way) and `lesson-plan-not-owned` | N/A | N/A | Form collapses, "Đã chuẩn bị" shown |
| Daily-log panel (GVCN) | `isPending` per save/submit/revise button | Banner scoped to the panel, `ClassLogFailure["type"]` → `classLog.errors.<type>` (reuse existing namespace, do not re-translate the same failure union under a second key path) | No draft yet for this date → panel shows empty textarea + "Lưu nháp"/"Gửi duyệt" | N/A | Badge updates (DRAFT/SUBMITTED/APPROVED/REJECTED) from `homeroomByDate` |
| Daily-log panel (GVBM / non-homeroom) | N/A (read-only) | N/A | "Chưa có nội dung" caption if no entry exists for the date | N/A | Read-only render of `homeroomByDate[date]`, caption "Chỉ GVCN sửa được" |
| Upcoming-period panel | Server-rendered with the rest of the tab (no independent loading state) | N/A (derived from data already loaded for the main grid; if that failed, the whole tab shows the load error above) | `upcoming === null` → "Không có tiết sắp tới" (AC's named empty state) | Recomputed from the SAME lifted `logsByKey`/`prepsByKey` state after any save — no separate stale window | 2 status chips + 3 shortcut links |

**Failure → i18n key mapping** (typed, per `i18n.md`): `PeriodLogFailure["type"]`
is exactly the key set under `teacherClasses.hub.timetable.errors.*`
(`slot-forbidden-or-missing`, `term-mismatch`, `too-many-materials`,
`lesson-plan-not-owned`, `validation`, `not-found`, `network-error`,
`unknown`) — direct `t(errorKey)` call, no string-matching on `message`.
`ClassLogFailure["type"]` reuses the EXISTING `classLog.errors.*` namespace
(already shipped) for the daily-log panel — do not duplicate.

---

## 8. Race Conditions & Resolution

1. **Week navigation while a mutation is in flight.** Prev/next week is a
   plain `<Link>` (full route transition). If a user clicks it while a
   `startTransition`-wrapped Server Action is still awaiting, React unmounts
   `timetable-tab-body.tsx`'s subtree; the in-flight promise still resolves
   server-side (the PUT/DELETE completes and persists), but the subsequent
   `onSubmitted` call becomes a no-op on an unmounted component (React
   silently discards it in a transition — no error, no leak, no state
   applied to the wrong week since the whole subtree is gone). No explicit
   guard needed. `revalidatePath` still fired inside the action regardless
   of client unmount, so the NEXT time this week is visited server-side, the
   write is reflected.
2. **Two browser tabs / two sessions editing the same slot.** BE is the sole
   authority (PLAN §0.2 ground truth) and does a full-replace PUT with no
   `If-Match`/`updatedAt` optimistic-concurrency check in the contract —
   last-write-wins at the BE. Client-side this shows as: tab A saves, tab B
   (stale local map) still shows tab A's PRE-save content until tab B's user
   either reloads or independently saves (overwriting tab A's write). This is
   an accepted risk per the ground-truth note (no BE support for a
   conflict signal beyond term-mismatch); not solvable client-side without a
   BE contract change — flag as a known gap, not a blocker (matches
   `PeriodLogFailure` having no `"conflict"` variant today).
3. **Create-then-submit two-step failure (daily entry, mirrors
   `ClassLogScreen`'s existing `handleCreate`).** `saveDailyEntryAction`
   (create/update DRAFT) can succeed while a subsequent auto-chained
   `submitDailyEntryAction` fails (network drop between the two awaits) — the
   established handling (already proven in `ClassLogScreen.handleCreate`) is:
   upsert the DRAFT that DID succeed into the map, show the submit error
   banner, leave the entry visibly in DRAFT state (not lost) so the user can
   retry "Gửi duyệt" alone next. Reuse this exact sequencing, do not
   fire-and-forget both calls in parallel.
4. **Materials `useFieldArray` add past 20 racing with a slow submit.** Pure
   client-side array ops, synchronous, no network — no race; the "Thêm"
   button simply disables at `fields.length >= MAX_MATERIALS` (entity
   constant, not a re-declared magic number per PLAN §1).
5. **Confirm-delete dialog capturing stale `{date, periodNumber}` if the map
   changes between open and confirm.** Mitigated by state #9's
   capture-at-open-time shape (same reasoning as US-E19.1's `removeVars`) —
   the confirm action reads from the captured vars, not from a live lookup
   into `logsByKey` at confirm time, so a concurrent save elsewhere in the
   grid can't retarget an in-flight delete confirmation.
6. **`revalidatePath` firing on an action invoked from a week OTHER than the
   one currently rendered (edge case: extremely slow request completing
   after 2+ week-navigations).** `revalidatePath(CLASS_HUB_PATH, "page")`
   invalidates the whole page path regardless of the `week` search param at
   invalidation time — this is desired (it doesn't matter which week was
   active when the write completed; the path-level cache entry that needs
   busting is the shell route itself, and per-request server rendering
   already means the NEXT hit for any week re-fetches fresh data
   regardless).

---

## Notes for `fe-component-architect` (coordination, not this doc's call)

- Confirm `daily-log-panel` mount granularity (once-per-day-card vs.
  once-for-week) — determines state #10's shape (`boolean` vs `Set<date>`).
- Confirm whether `period-row`'s 2 inline forms (log/prep) can both be open
  simultaneously or are mutually exclusive (state #4's shape,
  `boolean` vs `"log"|"prep"|null`).
- Confirm `daily-log-panel` can embed `class-log-entry-form.tsx` (or a
  layout-prop variant of it) directly rather than re-authoring the same
  2-field form — if adapted, the `{summary, notableEvents}` local-state shape
  (state #11) should stay byte-identical to `ClassLogFormValues` so the same
  component/pattern is reused, not forked.
