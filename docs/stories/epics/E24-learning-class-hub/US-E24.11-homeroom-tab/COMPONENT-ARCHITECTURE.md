# US-E24.11 Component Architecture — Tab Chủ nhiệm (GVCN)

Owner: fe-component-architect. No implementation code — contracts + structure
only. Builds on `PLAN.md` (fe-planner, ground-truthed against BE). AC source:
`US-E24.11-homeroom-tab.md`. Reuses US-E24.8's shell (`ClassHubScreen`,
`ClassHubTabs`, `tabId`/`panelId`) and US-E24.9's `TimetableTab` pattern
(async RSC tab + `page.tsx`-level `Promise.allSettled`) as the structural
precedent — this tab is a sibling of `timetable-tab/`, not a new shape.

## 1. Architecture Summary

- **Feature scope**: fill US-E24.8's `"homeroom"` `TabPlaceholder` branch in
  `teacher/classes/[classId]/page.tsx` with 3 independently-loaded,
  independently-failing cards (attendance / open violations / pending leave).
- **New components** (all under
  `features/teacher/presentation/class-hub/homeroom-tab/`):
  `homeroom-tab.tsx`, `attendance-today-card.tsx`, `open-violations-card.tsx`,
  `pending-leave-card.tsx`, `homeroom-card-error.tsx`.
- **Promoted component** (decision `0026`, 2nd screen trigger):
  `reject-leave-dialog.tsx` moves from
  `features/discipline/presentation/discipline-screen/components/` to
  `components/shared/reject-leave-dialog/` — verbatim, zero prop change.
- **Reused verbatim, no fork**: `StatCard` (shared, `tone` prop already covers
  success/warning/error — confirms PLAN §0.7), `StatusBadge`, `EmptyState`,
  `Button asChild` (Radix `Slot`), `ClassHubTabs`/`ClassHubScreen`/`tabId`/
  `panelId` (US-E24.8, untouched).
- **Missing primitives**: none. `bun ui:add` not needed — `Card`/`Badge`/
  `Button`/`Dialog`/`Textarea`/`Label` all already exist and are already used
  by the discipline feature this reuses.
- **Key decisions**:
  1. **Per-card error isolation lives in `homeroom-tab.tsx` (the RSC
     container), not inside each card's VM.** `page.tsx`'s `Promise.allSettled`
     produces 3 `PromiseSettledResult`s; `homeroom-tab.tsx` maps each
     `rejected` result to the SAME `homeroom-card-error.tsx` (zero-client-JS
     retry), and each `fulfilled` result to that card's own presentational
     component. This keeps `AttendanceTodayCardVm`/`OpenViolationsCardVm`/
     `PendingLeaveCardVm` pure success-shape types (no `errorKey?` field
     threaded through 3 places) — the union lives once, at the tab level.
  2. **Resolves PLAN §9 open question**: card-level retry = a plain
     server-rendered `<Button asChild><Link href={sameTabHref}>…</Link></Button>`
     (re-navigating to `?tab=homeroom` re-runs the RSC `Promise.allSettled`).
     Zero client JS, satisfies AC "lỗi từng card độc lập (retry)" — no client
     wrapper needed for cards 1 and 2. Card 3 already has a client boundary for
     approve/reject, so its own error path can additionally use
     `router.refresh()`, but the FIRST-LOAD failure path (its own
     `Promise.allSettled` rejection) uses the identical RSC
     `homeroom-card-error.tsx` as the other two — one error component, not
     three.
  3. **`pending-leave-card.tsx` is the only client boundary**, and it is a
     narrow, leaf-level one — mirrors `leave-tab.tsx`'s already-proven pattern
     (local `useState` list + optimistic remove-on-success + promoted
     `RejectLeaveDialog`) verbatim. `attendance-today-card.tsx` and
     `open-violations-card.tsx` are pure RSC (`async function`, `getTranslations`),
     no interactivity beyond a `<Link>`.
  4. **`OpenViolationsCardVm` reads the EXISTING mock `ViolationEntity`** (no
     wire/domain change here — that's PLAN §0.1's territory) and is built by
     `page.tsx` filtering client-side on `status === "recorded"` (the mock
     proxy for "chưa xử lý" per PLAN §0.1) — the VM only carries the fields the
     card displays, not the whole entity.

## 2. Component Tree

```
app/[locale]/teacher/classes/[classId]/page.tsx                          RSC · EXTEND (US-E24.8)
│  Promise.allSettled([
│    makeGetClassAttendanceUseCase().execute(classId, todayIso()),
│    makeGetViolationsUseCase().execute({ classId }),      // existing, still mock
│    makeGetLeaveRequestsUseCase().execute({ classId }),   // now real-capable
│  ])
│  → assembles HomeroomTabVm (3 card sub-VMs, each success-shape only)
│  → binds HomeroomTabActions (approveLeaveHomeroomAction / rejectLeaveHomeroomAction)
│
└─ <HomeroomTab vm actions />                    RSC · async · NEW
   features/teacher/presentation/class-hub/homeroom-tab/homeroom-tab.tsx
   │  grid `auto-fit minmax(300px,1fr)` gap-4, 3 independent cells
   │
   ├─ cell 1: attendance.status === "rejected"
   │    → <HomeroomCardError icon={CalendarX} retryHref=… />   RSC · NEW (shared error leaf)
   │  else
   │    → <AttendanceTodayCard vm={attendance.value} />         RSC · presentational · NEW
   │       (reuses <StatCard/> ×3, <StatusBadge/>, <Link><Button asChild/></Link>)
   │
   ├─ cell 2: violations.status === "rejected"
   │    → <HomeroomCardError … />
   │  else
   │    → <OpenViolationsCard vm={violations.value} />          RSC · presentational · NEW
   │       (reuses <StatusBadge tone="error"/>, <EmptyState/>, <Link><Button asChild/></Link>)
   │
   └─ cell 3: leave.status === "rejected"
        → <HomeroomCardError … />
      else
        → <PendingLeaveCard vm={leave.value}                    'use client' · NEW
             classId={classId} actions={{ approveLeave, rejectLeave }} />
           │  local useState<LeaveRequestEntity[]> (mirrors leave-tab.tsx)
           │  reuses <StatusBadge tone="warning"/>, <EmptyState/>, <Button/>
           └─ <RejectLeaveDialog open isPending onOpenChange onConfirm />
              components/shared/reject-leave-dialog/reject-leave-dialog.tsx   PROMOTED (was feature-local)
```

Existing, untouched ancestors (US-E24.8, for orientation only):
```
app/[locale]/teacher/classes/[classId]/page.tsx
└─ <ClassHubScreen header tabs>                RSC
     ├─ <ClassHubHeader/>                      'use client' (existing)
     ├─ <ClassHubTabs/>                        'use client' (existing)
     └─ children = the active tab's RSC subtree ← <HomeroomTab .../> slots in here
```

### File map (new + touched)

| File | Layer | Client/Server | Note |
| --- | --- | --- | --- |
| `features/teacher/presentation/class-hub/homeroom-tab/homeroom-tab.i-vm.ts` | contract | n/a | new |
| `features/teacher/presentation/class-hub/homeroom-tab/homeroom-tab.tsx` | presentation | RSC (async) | new, container/composition |
| `features/teacher/presentation/class-hub/homeroom-tab/attendance-today-card.tsx` | presentation | RSC (async) | new, presentational |
| `features/teacher/presentation/class-hub/homeroom-tab/open-violations-card.tsx` | presentation | RSC (async) | new, presentational |
| `features/teacher/presentation/class-hub/homeroom-tab/pending-leave-card.tsx` | presentation | `'use client'` | new, controlled + local UI state |
| `features/teacher/presentation/class-hub/homeroom-tab/homeroom-card-error.tsx` | presentation | RSC (sync) | new, shared error leaf (3 cards) |
| `components/shared/reject-leave-dialog/reject-leave-dialog.tsx` (+`index.ts`+`.stories.tsx`) | shared | `'use client'` | **promoted**, same file content |
| `features/discipline/presentation/discipline-screen/components/reject-leave-dialog.tsx` | — | — | **deleted** (moved, not copied) |
| `features/discipline/presentation/discipline-screen/components/leave-tab.tsx` | presentation | `'use client'` | touched: import path only |
| `app/[locale]/teacher/classes/[classId]/page.tsx` | route | RSC | extended: homeroom branch |
| `app/[locale]/teacher/classes/[classId]/actions.ts` | route | `'use server'` | new/extended: 2 actions |

No new `components/ui/` primitive. No new `components/shared/` composed
component besides the promotion — `StatCard`/`StatusBadge`/`EmptyState`/
`Button`/`Dialog` cover every visual need.

## 3. ViewModel + Prop Interfaces

### 3.1 `homeroom-tab.i-vm.ts` (screen contract — server↔client boundary)

```ts
import type { AttendanceRecord } from "@/features/attendance/domain/entities/attendance-record.entity";
import type { LeaveRequestEntity } from "@/features/discipline/domain/entities/leave-request.entity";

/** One "chưa xử lý" violation row — the card's OWN minimal shape, not the
 *  full ViolationEntity (only what's displayed: student, description, date).
 *  Sourced from the existing mock `ViolationEntity` (PLAN §0.1) — `page.tsx`
 *  filters `status === "recorded"` and maps down to this shape. */
export interface OpenViolationItemVm {
  id: string;
  studentName: string;
  description: string;
  /** Pre-formatted "DD/MM/YYYY" — component does zero date math. */
  dateLabel: string;
}

/** Success-shape only. A rejected Promise.allSettled result never reaches
 *  this type — `homeroom-tab.tsx` renders `HomeroomCardError` instead
 *  (see Architecture Summary decision 1). */
export interface AttendanceTodayCardVm {
  taken: boolean;
  present: number;
  excused: number;
  absent: number;
  /** "/teacher/attendance?classId=&date=today" — pre-built, component never
   *  constructs query strings. */
  attendanceHref: string;
}

export interface OpenViolationsCardVm {
  items: OpenViolationItemVm[];
  count: number;
  /** "/teacher/discipline?classId=" */
  disciplineHref: string;
}

export interface PendingLeaveCardVm {
  requests: LeaveRequestEntity[];
}

export type HomeroomActionResult =
  | { ok: true }
  | { ok: false; errorKey: string /** DisciplineFailure["type"] */ };

/** Server Action refs, bound once by page.tsx and threaded down as ONE prop
 *  (mirrors TimetableTabActions' "one prop, not a firehose" convention).
 *  `classId` is passed at call time (not pre-bound) because
 *  ApproveLeaveUseCase/RejectLeaveUseCase's real construction needs it for
 *  the authCtx.homeroomClassIds check (PLAN §0.3/§0.4) — the action itself
 *  re-derives nothing; it only forwards what the card already has in scope. */
export interface HomeroomLeaveActions {
  approveLeave: (
    id: string,
    studentMemberId: string,
    classId: string,
  ) => Promise<HomeroomActionResult>;
  rejectLeave: (
    id: string,
    studentMemberId: string,
    classId: string,
    reason: string,
  ) => Promise<HomeroomActionResult>;
}

/** One discriminated cell per card — `page.tsx` maps its own
 *  `PromiseSettledResult<T>` array into this shape 1:1. `homeroom-tab.tsx`
 *  switches on `.ok` to pick `HomeroomCardError` vs. the real card — this is
 *  the ONLY place the error/success union is inspected. */
export type HomeroomCardResult<T> =
  | { ok: true; data: T }
  | { ok: false; retryHref: string };

export interface HomeroomTabVm {
  classId: string;
  attendance: HomeroomCardResult<AttendanceTodayCardVm>;
  violations: HomeroomCardResult<OpenViolationsCardVm>;
  leave: HomeroomCardResult<PendingLeaveCardVm>;
}
```

Note on `AttendanceRecord` import above: NOT used directly in this file — the
3 tallied numbers (`present`/`excused`/`absent`) are pre-counted by `page.tsx`
via the existing `countStatuses` helper (grep `features/attendance` for it
before reintroducing — PLAN assumes it exists) from
`AttendanceRoster.records: AttendanceRecord[]`. The VM never carries the raw
`AttendanceRecord[]` — only the 3 already-tallied numbers — so
`attendance-today-card.tsx` does zero aggregation. (Import left out of the
actual file; noted here only to justify why the count fields are `number`,
not derived client-side.)

### 3.2 `attendance-today-card.tsx`

```ts
export interface AttendanceTodayCardProps {
  vm: AttendanceTodayCardVm;
}
```

- RSC, `async function AttendanceTodayCard({ vm }: AttendanceTodayCardProps)`,
  `const t = await getTranslations("teacher.classHub.homeroom.attendance")`.
- Renders: card chrome (`border-border bg-card shadow-card rounded-[var(--edu-radius-card)]`,
  matching `TabPlaceholder`/`LeaveTab` list-card convention) → header row
  (title + `<StatusBadge tone={vm.taken ? "success" : "warning"}>`) → 3×
  `<StatCard variant="compact" label=… value={vm.taken ? String(n) : "—"}
  tone={success|warning|error} />` (compact variant fits a 3-up dense tile row
  better than the icon-box default variant used elsewhere in this same file's
  sibling cards — no new variant, `compact` already exists) → footer
  `<Button asChild variant="outline"><Link href={vm.attendanceHref}>{t("openLink")}</Link></Button>`.
- Not-taken state (`vm.taken === false`): all 3 tiles render literal `"—"` (AC)
  with an `sr-only` "chưa điểm danh" suffix per tile (mirrors design-spec's
  score-cell '—' a11y note) — NOT three separate optional fields; `present`/
  `excused`/`absent` stay typed `number` always (page.tsx sends `0` when not
  taken, the component decides "—" purely off `vm.taken`, never off the
  numbers being zero — a taken day with 0 absences must NOT read as "—").

### 3.3 `open-violations-card.tsx`

```ts
export interface OpenViolationsCardProps {
  vm: OpenViolationsCardVm;
}
```

- RSC, `async function OpenViolationsCard({ vm }: OpenViolationsCardProps)`,
  `getTranslations("teacher.classHub.homeroom.violations")`.
- Header: title + `<StatusBadge tone="error">{vm.count}</StatusBadge>` (count
  badge only shows the tone when `count > 0`; `count === 0` still renders the
  badge with `tone="muted"` — AC "count > 0 → tone error" implies `count ===
  0` must NOT be error-toned).
- Body: `vm.items.length === 0 → <EmptyState icon={ShieldOff} title={t("empty")} />`;
  else `<ul>` of rows — `initials`/avatar NOT shown (PLAN's minimal VM has no
  avatar fields — this card is denser than `violations-tab.tsx`'s full table,
  intentionally, per design-spec's "rows student + reason + date").
- Footer: `<Button asChild variant="outline"><Link href={vm.disciplineHref}>{t("openLink")}</Link></Button>`.
- No interactivity, no dialog, no client boundary.

### 3.4 `pending-leave-card.tsx`

```ts
export interface PendingLeaveCardProps {
  vm: PendingLeaveCardVm;
  classId: string;
  actions: HomeroomLeaveActions;
}
```

- `'use client'`. Mirrors `leave-tab.tsx`'s proven shape exactly (same repo,
  same team already reviewed this pattern — do not invent a different one):
  - `const [list, setList] = useState<LeaveRequestEntity[]>(vm.requests)`
  - `const [rejectTarget, setRejectTarget] = useState<LeaveRequestEntity | null>(null)`
  - `const [isPending, startTransition] = useTransition()`
  - `handleApprove(req)`: `startTransition(async () => { const res = await
    actions.approveLeave(req.id, req.studentId, classId); if (!res.ok) {
    toast.error(tErr(res.errorKey)); router.refresh(); return; }
    setList(prev => prev.filter(r => r.id !== req.id)); toast.success(...) })`
    — item is REMOVED from the list (not status-flipped in place, unlike
    `leave-tab.tsx`'s all-statuses table) because this card is an
    **inbox of pending items only** — an approved/rejected request has nothing
    left to show here (AC: "Duyệt → item mất").
  - `handleReject(reason)`: same shape, calls `actions.rejectLeave(id,
    studentMemberId, classId, reason)`, removes on success, closes dialog.
  - 403/`forbidden` path: `toast.error(...)` + `router.refresh()` (re-runs the
    RSC `Promise.allSettled`, resyncing the list from the server — AC's
    explicit "403 → toast lỗi + refetch").
- Header: title + `<StatusBadge tone="warning">{list.length}</StatusBadge>`.
- Body: `list.length === 0 → <EmptyState icon={CalendarOff} title={t("empty")} />`;
  else `<ul>` rows: `studentName`, `t("item", { start, end, reason })`
  (ICU-style, PLAN §5), Duyệt (`variant="default"`, ≥44px) / Từ chối
  (`variant="outline"`, ≥44px) buttons — same button pair shape as
  `leave-tab.tsx`, `aria-label` includes student name (a11y, no bare "Duyệt"
  button with ambiguous target when multiple rows exist).
- No footer link (unlike cards 1/2 — card 3's own list IS the full detail,
  there's no separate "mở đơn nghỉ" screen per the packet).
- Renders `<RejectLeaveDialog open={rejectTarget !== null} isPending
  onOpenChange onConfirm={handleReject} />` from
  `@/components/shared/reject-leave-dialog` (promoted import path).

### 3.5 `homeroom-card-error.tsx` (shared error leaf, this screen only — feature-local, not `shared/`, since only 3 siblings in 1 screen use it; promote later if a 4th screen needs the identical shape)

```ts
export interface HomeroomCardErrorProps {
  icon: LucideIcon;
  title: string;       // already-translated
  body?: string;       // already-translated
  retryHref: string;    // same `?tab=homeroom` URL — re-navigating re-fetches
  retryLabel: string;  // already-translated
}
```

- RSC, sync, presentational. Card chrome identical to the other 3 cards +
  `<EmptyState icon={icon} title={title} body={body} />` (no `cta` prop — its
  `onClick`-only contract doesn't fit a server Link) + a plain
  `<Button asChild variant="outline"><Link href={retryHref}>{retryLabel}</Link></Button>`
  below it. Zero client JS (Architecture Summary decision 2).
- `homeroom-tab.tsx` supplies `icon`/`title`/`body`/`retryLabel` per-card (3
  call sites, 3 different i18n keys — `errors.attendance`/`errors.violations`/
  `errors.leave` under the tab's namespace) — the component itself carries no
  per-card knowledge.

### 3.6 `homeroom-tab.tsx`

```ts
export interface HomeroomTabProps {
  vm: HomeroomTabVm;
  actions: HomeroomLeaveActions;
}
```

- RSC, `async function HomeroomTab({ vm, actions }: HomeroomTabProps)`. Grid
  wrapper (`grid gap-4` + `grid-cols-[repeat(auto-fit,minmax(300px,1fr))]` per
  design-spec `homeroomTab.grid` — inline arbitrary value is the one
  Tailwind-v4-sanctioned exception for a non-token grid-template, same
  pattern as any other `auto-fit` grid already in the repo; grep an existing
  `auto-fit` usage before hand-rolling the class string).
- Switches each of `vm.attendance`/`vm.violations`/`vm.leave` on `.ok` →
  renders that card or `HomeroomCardError` (Architecture Summary decision 1).
- Reject-title/build note: this file does NOT call `getTranslations` itself
  for card bodies (each card owns its own namespace slice) — it only resolves
  the 3 error-state i18n strings (`teacher.classHub.homeroom.errors.*`) to
  pass into `HomeroomCardError`, keeping the "sub-namespace per card" i18n
  convention consistent with `AttendanceTodayCard`/`OpenViolationsCard`/
  `PendingLeaveCard` each translating their own body.

## 4. State Ownership (contract level)

| State | Owner | Kind |
| --- | --- | --- |
| Which card errored | `page.tsx` (`Promise.allSettled` result) → `HomeroomTabVm.{card}.ok` | server-derived, read-only prop |
| Attendance taken/counts | `page.tsx` (maps `AttendanceRoster` → `AttendanceTodayCardVm`) | server-derived, read-only prop |
| Open-violation rows | `page.tsx` (filters existing mock `ViolationEntity[]`) | server-derived, read-only prop |
| Pending-leave list (initial) | `page.tsx` → `PendingLeaveCardVm.requests` | server-derived, seeds client state |
| Pending-leave list (post-action) | `pending-leave-card.tsx` `useState<LeaveRequestEntity[]>` | **internal UI state**, optimistic remove-on-success (identical shape to `leave-tab.tsx` — no new pattern) |
| Reject dialog open/target | `pending-leave-card.tsx` `useState<LeaveRequestEntity \| null>` | internal UI state |
| Reject dialog reason text | `RejectLeaveDialog` internal `useState<string>` (unchanged, promoted verbatim) | internal UI state, encapsulated in the dialog itself — never lifted |
| Approve/reject in-flight | `pending-leave-card.tsx` `useTransition()` | internal UI state |
| Active tab (`?tab=homeroom`) | URL (US-E24.8, `ClassHubTabs`) | **not touched by this US** |
| Card retry navigation | plain `<Link>` to the same `?tab=homeroom` URL | **not client state at all** — a real GET, RSC re-executes `Promise.allSettled` |

**Hand-off to `fe-state-engineer`**: no TanStack Query, no global store needed
anywhere in this tab — confirm only that (a) `router.refresh()` after a 403 on
approve/reject is sufficient to resync `pending-leave-card.tsx`'s local list
with the server truth (it re-runs `page.tsx`'s RSC fetch and remounts this
subtree with fresh `vm.leave.requests`, per the `key={vm.weekParam}`-style
remount precedent in `TimetableTab` — decide whether `HomeroomTab` needs an
analogous `key` on `PendingLeaveCard` keyed by something stable per class/date
to guarantee the client `useState` reseeds after a server action revalidate,
since unlike the week-nav case there's no natural "identity changes" key here
— **flag this specifically**, it's the one place a state decision belongs to
state-engineer, not architecture); (b) no client-side polling/refetch interval
is introduced (out of scope, none requested by AC).

## 5. Composition & Variant Strategy

- **No compound component, no `cva` variant needed.** All 3 cards share only
  chrome (border/rounded/shadow), which is duplicated as a Tailwind class
  string per card body (3 instances) rather than factored into a
  `HomeroomCardShell` wrapper — 3 instances is the do-not-abstract-yet
  threshold per this rule's own "no over-abstraction until 3+ instances"
  guidance being read literally: `HomeroomCardError` DOES get abstracted
  (3 error-call-sites, identical shape) but the 3 *success* card bodies each
  have materially different internals (tiles vs. list vs. interactive list) —
  abstracting their shared chrome into a 4th component for 3 call sites of a
  ONE-LINE className is not worth the indirection; keep it inline, mirror
  `TabPlaceholder`'s own inline chrome.
- **`StatCard` `variant="compact"`** is the extension point already built for
  exactly this dense-tile-row need (§3.2) — no new variant proposed.
- **`RejectLeaveDialog` promotion carries zero prop change** — both call sites
  (`leave-tab.tsx`, `pending-leave-card.tsx`) use the identical
  `open`/`isPending`/`onOpenChange`/`onConfirm` contract and the identical
  copy (`discipline.leave.rejectDialog.*`, reused verbatim, PLAN §5 — no
  `title`/`description` prop needed since both screens want the SAME dialog
  text, resolving PLAN §6's open question: the copy is identical, so no prop
  widening).
- **`Slot`/`asChild`**: used exactly once per card (footer/error "open"/"retry"
  link rendered as an outline button) — `<Button asChild><Link .../></Button>`,
  the repo's existing pattern for "styled-as-button navigation" (avoids a
  `<button onClick={() => router.push(...)}>` client-side anti-pattern for
  what is semantically a navigation, and keeps cards 1/2/error RSC-pure).
- **No `children`/slot API** on any new component — every card takes a single
  flat `vm` prop (+ `actions` for card 3), matching every existing class-hub
  tab's contract (`TimetableTab`, `LeaveTab`).

## 6. Promotion Checklist — `reject-leave-dialog.tsx` (decision 0026)

**Before (feature-local)**:
`features/discipline/presentation/discipline-screen/components/reject-leave-dialog.tsx`
— imported once, by `leave-tab.tsx` (`import { RejectLeaveDialog } from
"./reject-leave-dialog"`).

**After (promoted)**:
`components/shared/reject-leave-dialog/reject-leave-dialog.tsx` +
`components/shared/reject-leave-dialog/index.ts` (barrel re-export) +
`components/shared/reject-leave-dialog/reject-leave-dialog.stories.tsx`
(new — promoted shared components need their own story per
`component-organization.md`; can port the existing story's states — default/
too-short/pending — from wherever `leave-tab.tsx`'s Storybook currently covers
the dialog interaction, or write a fresh minimal one if none exists standalone
today — engineer to confirm at implementation time).

**Move checklist (behavior MUST NOT change)**:
- [ ] File content copied verbatim — component body untouched (props
      `open`/`isPending`/`onOpenChange`/`onConfirm`, the `MIN_LENGTH = 10`
      validation, the `discipline.leave.rejectDialog.*` i18n namespace — all
      stay exactly as-is; this is a location move, not a redesign).
- [ ] Delete the old
      `discipline/presentation/discipline-screen/components/reject-leave-dialog.tsx`.
- [ ] `leave-tab.tsx` import updated:
      `import { RejectLeaveDialog } from "./reject-leave-dialog"` →
      `import { RejectLeaveDialog } from "@/components/shared/reject-leave-dialog"`.
      No other line in `leave-tab.tsx` changes.
- [ ] `pending-leave-card.tsx` imports from the SAME new path (never a 3rd
      copy) — `import { RejectLeaveDialog } from "@/components/shared/reject-leave-dialog"`.
- [ ] i18n namespace `discipline.leave.rejectDialog.*` in
      `messages/{vi,en}.json` stays exactly as-is — the dialog keeps reading
      its own translated copy regardless of which screen renders it (PLAN §5 —
      do not duplicate these keys under `teacher.classHub.homeroom.*`).
- [ ] `discipline.leave.rejectDialog` namespace name is a pre-existing
      artifact of the dialog's ORIGINAL feature (`discipline`) — this is fine
      to keep even after promotion (shadcn/i18n convention here is
      "namespace by the string's origin", not "namespace by folder"; no
      other shared component in this repo has needed a namespace rename on
      promotion — precedent holds).
- [ ] No existing `reject-leave-dialog.test.tsx`/interaction test changes
      behaviorally — only its import path, if it imports the component
      directly rather than through `leave-tab.tsx`.
- [ ] Grep for any OTHER reference to the old path
      (`discipline-screen/components/reject-leave-dialog`) before deleting —
      confirm exactly one caller today (`leave-tab.tsx`) per this doc's read;
      re-verify at implementation time in case a later US added a second
      feature-local caller unnoticed here.

## 7. Accessibility Contract

| Node | Requirement |
| --- | --- |
| `AttendanceTodayCard` badge ("Đã điểm danh"/"Chưa điểm danh") | text label carries the state, not color alone (already true of `StatusBadge`) |
| `AttendanceTodayCard` 3 tiles | number + text label both visible (`StatCard`'s existing `label`/`value` pair); not-taken "—" tiles get an additional `sr-only` "chưa điểm danh" span so a screen reader doesn't read a bare em-dash |
| `AttendanceTodayCard`/`OpenViolationsCard` footer link | `<Button asChild>` renders a real `<a>` (via `Link`) with visible text — no icon-only link |
| `OpenViolationsCard` count badge | `aria-label` on the badge stating count in words when `count > 0` (e.g. `aria-label={t("countLabel", { count: vm.count })}`) so the number isn't the only announced content — mirrors `StatusBadge`'s existing `aria-label` prop, already wired |
| `PendingLeaveCard` Duyệt/Từ chối buttons | `aria-label` includes student name (`t("approveLabel", { student })`/`t("rejectLabel", { student })`, mirrors `leave-tab.tsx` verbatim); both ≥44px touch target (`size="sm"` on `Button` — confirm meets the 44px floor per existing `leave-tab.tsx` precedent, same component, already audited) |
| `RejectLeaveDialog` (promoted, unchanged) | focus trap via Radix `Dialog` (already proven); `Textarea` has `<Label htmlFor>`, `aria-required`, `aria-invalid` + `aria-describedby` wired to an inline `role="alert"` error — all pre-existing, verified unchanged by the promotion |
| `HomeroomCardError` retry link | `<Button asChild><Link>` real `<a>`, visible label (never icon-only); `EmptyState`'s `role="status"` announces the error text on render |
| Grid cells | no `role`/`tabindex` needed — 3 independent `<section>`-like cards, not a composite widget; each card's OWN interactive elements carry their own semantics (no wrapping `role="group"` required by AC) |
| Tab visibility gate (GVBM → fallback on `?tab=homeroom`) | unchanged, owned entirely by US-E24.8's `resolveClassHubTab` — this US does not touch that gate |

## Open items for `fe-lead` / next agents

1. **fe-state-engineer**: confirm the `PendingLeaveCard` remount-key question
   in §4 (does a server-action-triggered `router.refresh()` reliably reseed
   its local `useState` list, or does `HomeroomTab` need to pass a `key` that
   changes on revalidate — analogous to `TimetableTab`'s `key={vm.weekParam}`).
2. **fe-nextjs-engineer**: confirm an existing `countStatuses`-style tally
   helper in `features/attendance` before writing a new one for
   `AttendanceTodayCardVm.{present,excused,absent}` (grep first, per PLAN's
   own note).
3. **fe-nextjs-engineer**: confirm no other caller of the pre-promotion
   `reject-leave-dialog.tsx` path exists before deleting it (checklist §6,
   last line).
4. No new ADR proposed by this pass — no new design-system token, no new
   `ui/` primitive, no new ambiguous shared-component fork. The promotion is
   the only structural change and it is covered by decision `0026` directly.
