# US-E24.9 Component Architecture — Timetable tab

Owner: fe-component-architect. No implementation code below — types + composition
contracts only. Ground truth read before writing this: `PLAN.md` (§0–§11),
`design_src/edu/class-hub.jsx` (`ChSessionsTab`/`ChPeriodLogForm`/`ChPrepForm`/
`CH_DAILY_STATUS`/`ChDailyBadge`), `design-spec.jsonc#teacher-class-hub.sessionsTab`,
`features/class-log/presentation/class-log-screen/**` (existing form/detail/status
patterns), `features/teacher/presentation/class-hub/**` (US-E24.8 shell this tab
plugs into), `features/teacher/presentation/shared/role-badges.tsx`,
`components/shared/status-badge`.

## 1. Architecture Summary

- **Scope**: replace the `"timetable"` branch of `TabPlaceholder` in
  `app/.../teacher/classes/[classId]/page.tsx` with a real RSC tree: 2-column
  week grid (left: day cards with period rows, per-period log/prep actions,
  daily homeroom strip; right: upcoming-period aside).
- **New composed components** (all single-screen today → `features/teacher/
  presentation/class-hub/timetable-tab/`, per component-organization.md's
  "1 screen = feature-local, promote on 2nd consumer" rule — nothing here is
  reused by another screen yet):
  `timetable-tab.tsx`, `class-timetable-week-nav.tsx`, `day-card.tsx`,
  `period-row.tsx`, `period-log-form.tsx`, `period-prep-form.tsx`,
  `materials-field-array.tsx`, `daily-log-panel.tsx`, `upcoming-period-panel.tsx`.
- **Reused verbatim (no new component)**: `StatusBadge` (`components/shared/
  status-badge`) for the daily-entry status + live-period chip; `RoleBadges` is
  NOT used here (no role badges inside this tab — the shell header already
  shows them). `Button`, `Input`, `Label`, `Textarea`, `Select` primitives from
  `components/ui/*`.
- **Reuse decision — `ClassLogEntryForm` (class-log feature) is NOT embedded
  as-is.** Read it: it renders its OWN full-page chrome (`ChevronLeft` back
  button, `max-w-2xl` centered card, `<h2>` title/subtitle) — a screen-body
  component, not an embeddable strip. The mockup's `daily-log-panel` is a thin
  inline strip (badge + textarea + 2 buttons, no card chrome of its own,
  lives at the bottom of a `day-card`). Per PLAN §8/§11's own accepted
  fallback: **`daily-log-panel.tsx` is a new, thin, feature-local component
  that binds to the SAME `createEntryAction`/`submitEntryAction`/
  `reviseEntryAction` Server Actions** (imported straight from the class-log
  route, already the plan's own §5/§6 pattern) and the SAME `STATUS_TONE` map
  (`features/class-log/presentation/class-log-screen/status-tone.ts` — import,
  do not re-derive) — no new repo/use-case, no forked business logic, only a
  different (inline, no-back-button) layout for the same action bindings. This
  is a layout difference the design spec itself calls for (`sessionsTab.
  dailyClassLog.strip` vs `class-log`'s own full-page card), not a duplicate
  component for the same pattern.
- **Missing shadcn primitive**: none. `Select` is already available
  (confirm via `bun ui:add select` if `components/ui/select/` doesn't exist
  yet — grep found no evidence one way or the other in this pass;
  `fe-nextjs-engineer` to verify before use in `period-prep-form.tsx`'s
  lesson-plan picker and flag to `fe-lead` if a `bun ui:add select` is needed).
- **Key decisions**:
  1. Week-nav is a NEW component (`class-timetable-week-nav.tsx`), not a reuse
     of `features/timetable/presentation/timetable-view/week-nav.tsx` — that
     component is `useState`-offset based, the opposite state model from this
     tab's URL-driven `?week=` (PLAN §0.7). Different state model → different
     component, per component-organization.md ("khác design/khác state model
     thật sự" is the one case that does NOT collapse into a shared variant).
  2. `period-row` owns its own open/closed form state as **internal `useState`**
     (`'log' | 'prep' | null`), not lifted to `timetable-tab` — confirms PLAN
     §8(a). Only one form open per row at a time (mirrors the mockup's
     `drawer` state, scoped per-key there; scoping it per-row instead of
     per-tab is strictly narrower/simpler and behaviorally identical since a
     user can only look at one row's form at a time).
  3. `daily-log-panel`'s "which of the 4 actions is enabled" is **fully
     server-resolved into props** (`canEdit`, `entry.status`) — the component
     itself only decides *rendering*, never re-derives role/permission logic
     (mirrors `class-log-entry-detail.tsx`'s own `canTeacherSubmit`/
     `canTeacherRevise` pattern, computed the same way, just inline instead of
     as local consts inside a bigger detail view).
  4. Per-slot "own/live/logged/prepped" state is **fan-out props on
     `PeriodRowVm`**, computed by the RSC page from `isMySlot`/`isPeriodLive`/
     `logKeyOf`/`prepKeyOf` (domain selectors, PLAN §4) — `period-row.tsx`
     itself does zero selector logic, pure render of booleans it's given.

## 2. Component Tree

```
app/.../teacher/classes/[classId]/page.tsx                              RSC · container
  (activeTab === "timetable" branch — replaces <TabPlaceholder tab="timetable" />)
  └─ <TimetableTab vm={TimetableTabVm} />                                RSC · presentational-composition
       ├─ <ClassTimetableWeekNav ... />                                  RSC (Link-only, no client JS)  · presentational
       ├─ grid: minmax(0,1.7fr) minmax(260px,1fr), mobile 1-col
       │   ├─ LEFT column — day cards
       │   │   └─ <DayCard vm={DayCardVm} /> × 5–6 (Mon–Sat)             RSC · presentational
       │   │        ├─ header (today/holiday — pure markup, no sub-component)
       │   │        ├─ <PeriodRow vm={PeriodRowVm} />  × N               'use client' · presentational + internal UI state (open form)
       │   │        │    ├─ (own-slot only) 2 toggle buttons
       │   │        │    ├─ <PeriodLogForm .../>   (open === 'log')      'use client' · controlled (react-hook-form)
       │   │        │    │    └─ segmented A/B/C/D radio group (native, no new primitive)
       │   │        │    ├─ <PeriodPrepForm .../>  (open === 'prep')     'use client' · controlled (react-hook-form)
       │   │        │    │    └─ <MaterialsFieldArray .../>              'use client' · controlled (useFieldArray)
       │   │        │    └─ (GVCN viewing another teacher's own-logged
       │   │        │        period) read-only inline summary — plain
       │   │        │        markup inside PeriodRow, no sub-component
       │   │        │        (single <div>, not worth extracting)
       │   │        └─ <DailyLogPanel vm={DailyLogPanelVm} />            'use client' · presentational + controlled (textarea value)
       │   └─ RIGHT column (aside)
       │        └─ <UpcomingPeriodPanel vm={UpcomingPeriodPanelVm} />    RSC · presentational (pure Links, no client state)
       └─ (no-slots / holiday / error states — rendered INSIDE DayCard /
           TimetableTab itself via vm flags, no separate component — see §6)
```

Container/presentational split:
- **Container (RSC, data-resolving)**: `app/.../page.tsx` only. It assembles
  `TimetableTabVm` (fetch week range logs/preps/homeroom-entries/timetable,
  resolve `myMemberId`, build week-nav hrefs) — per US-E24.8's own precedent,
  `timetable-tab.tsx` itself does NOT fetch (Server-Component-as-children
  composition, but here the tab body is one component receiving one VM object
  rather than `children`, since — unlike the shell — there's only one tab body
  and it has non-trivial internal composition worth its own file).
- **Presentational (props-only)**: everything else. `TimetableTab`,
  `ClassTimetableWeekNav`, `DayCard`, `UpcomingPeriodPanel` need **no** client
  JS (pure Server Components — Links + markup, exactly like `class-hub-header.
  tsx`/`class-hub-tabs.tsx`'s split in US-E24.8, except `ClassHubTabs` needed
  `'use client'` for aria-selected roving focus and this week-nav needs none).
  `PeriodRow`, `PeriodLogForm`, `PeriodPrepForm`, `MaterialsFieldArray`,
  `DailyLogPanel` are `'use client'` (open/closed state, form state, optimistic
  textarea) but take 100% of their data via props — no fetch, no DI import.

## 3. ViewModel + Prop Interfaces

### 3.1 `timetable-tab.i-vm.ts` (screen-level VM — assembled by page.tsx)

```ts
import type { PeriodGrade, PeriodLog } from "@/features/period-log/domain/entities/period-log.entity";
import type { PeriodPrep } from "@/features/period-log/domain/entities/period-prep.entity";
import type { PeriodLogFailure } from "@/features/period-log/domain/failures/period-log.failure";
import type { HomeroomEntry } from "@/features/class-log/domain/entities/homeroom-entry.entity";
import type { ClassLogFailure } from "@/features/class-log/domain/failures/class-log.failure";
import type { TimetableSlot } from "@/features/timetable/domain/entities/timetable-slot.entity";
import type { LessonPlanEntity } from "@/features/lesson-plan/domain/entities/lesson-plan.entity";

/** One rendered day (Mon–Sat) of the class's week. */
export interface TimetableDayVm {
  /** YYYY-MM-DD. */
  date: string;
  /** i18n-resolved label built by the page ("Thứ 2 · 27/04"), NOT raw enum —
   *  presentation only interpolates, never maps day-of-week → label itself
   *  (that mapping already exists once, in the page). */
  dayLabel: string;
  isToday: boolean;
  /** Present only when the school calendar marks the date a holiday; absent
   *  → normal day. Holding the LABEL (not a boolean) because the AC wants the
   *  holiday's own name shown ("Nghỉ lễ 30/04"), not a generic "Holiday" string. */
  holidayLabel?: string;
  periods: PeriodRowVm[];
  daily?: DailyLogPanelVm; // absent on a holiday (no periods, no daily strip)
}

/** Per-slot fan-out — everything PeriodRow needs, pre-computed by the page
 *  from the domain selectors (`isMySlot`, `isPeriodLive`, `logKeyOf`, `prepKeyOf`).
 *  PeriodRow does ZERO of this derivation itself (decision §1.4). */
export interface PeriodRowVm {
  periodNumber: number;
  /** "HH:mm–HH:mm" already formatted by the page, or undefined (no bell
   *  schedule yet — AC: "chưa có → không hiện giờ"). */
  timeRangeLabel?: string;
  subjectName: string;
  teacherName: string;
  /** `TimetableSlot.teacherMemberId` — passed through untouched so the Server
   *  Action can thread it as `assignedTeacherMemberId` without a second fetch. */
  teacherMemberId: string;
  room?: string;
  isMine: boolean;
  isLive: boolean;
  /** Existing log/prep for THIS slot+date, or undefined ("not yet"). Passed as
   *  the full entity (not just a boolean) because the read-only GVCN view and
   *  the "already logged" chip both need its fields (title/rating/absent). */
  log?: PeriodLog;
  prep?: PeriodPrep;
  /** True only for GVCN viewing a period that ISN'T theirs but has a log —
   *  drives the read-only "Sổ tiết (GVCN chỉ đọc)" strip (design-spec
   *  `sessionsTab.periodLogForm`). Pre-computed by the page (role + isMine),
   *  not derived inside PeriodRow. */
  showReadOnlyLogForOther: boolean;
  classId: string;
  date: string;
  /** Ctx the Server Action needs verbatim — resolved once by the page via
   *  `resolveCurrentTermContext()`, not re-resolved per row. */
  termId: string;
  academicYearId: string;
}

export interface DailyLogPanelVm {
  classId: string;
  date: string;
  entry?: HomeroomEntry; // absent → "no entry yet" empty state
  /** True only for a GVCN of THIS class — gates the write UI. GVBM (or a
   *  GVCN denied by `assertHomeroomOf`, defense-in-depth) sees read-only. */
  canEdit: boolean;
}

export interface UpcomingPeriodPanelVm {
  /** null → "Không có tiết sắp tới" empty state (AC). */
  upcoming: {
    subjectName: string;
    dayLabel: string;
    date: string;
    periodNumber: number;
    timeRangeLabel?: string;
    room?: string;
    isPrepared: boolean;
    isLogged: boolean;
  } | null;
  shortcuts: {
    teachingPlanHref: string;
    attendanceHref: string;
    classLogHref: string;
  };
}

export interface TimetableTabVm {
  classId: string;
  myMemberId: string;
  weekParam: string; // "2026-W36"
  prevWeekHref: string;
  nextWeekHref: string;
  days: TimetableDayVm[]; // 5–6 entries, Mon–Sat
  upcoming: UpcomingPeriodPanelVm;
  /** Whole-tab failure (timetable fetch itself failed) — days/upcoming are
   *  empty arrays/null in this case; the tab renders ONE error state, not a
   *  partial grid. */
  error?: "network-error" | "unknown";

  // ── Server Action refs (bound by page.tsx from bootstrap/di) ──────────
  savePeriodLogAction: (
    classId: string,
    date: string,
    periodNumber: number,
    assignedTeacherMemberId: string,
    termId: string,
    academicYearId: string,
    input: { lessonTitle: string; remark?: string; grade: PeriodGrade; absentCount: number },
  ) => Promise<{ ok: true; log: PeriodLog } | { ok: false; errorKey: PeriodLogFailure["type"] }>;
  deletePeriodLogAction: (
    classId: string, date: string, periodNumber: number,
    assignedTeacherMemberId: string, termId: string, academicYearId: string,
  ) => Promise<{ ok: true } | { ok: false; errorKey: PeriodLogFailure["type"] }>;
  savePeriodPrepAction: (
    classId: string, date: string, periodNumber: number,
    assignedTeacherMemberId: string, termId: string, academicYearId: string,
    input: { note?: string; lessonPlanId?: string; materials: { title: string; url: string }[] },
  ) => Promise<{ ok: true; prep: PeriodPrep } | { ok: false; errorKey: PeriodLogFailure["type"] }>;
  deletePeriodPrepAction: (
    classId: string, date: string, periodNumber: number,
    assignedTeacherMemberId: string, termId: string, academicYearId: string,
  ) => Promise<{ ok: true } | { ok: false; errorKey: PeriodLogFailure["type"] }>;
  /** For PeriodPrepForm's lesson-plan <select> — the teacher's OWN plans only
   *  (already filtered server-side by the page's own DI call, same posture as
   *  `classes` in `ClassLogScreenVM`: raw data, no client fetch). */
  myLessonPlans: Pick<LessonPlanEntity, "planId" | "title">[];

  saveDailyEntryAction: (
    classId: string, entryDate: string, summary: string, notableEvents?: string,
  ) => Promise<{ ok: true; entry: HomeroomEntry } | { ok: false; errorKey: ClassLogFailure["type"] | "unauthorized" }>;
  submitDailyEntryAction: (
    classId: string, entryId: string,
  ) => Promise<{ ok: true; entry: HomeroomEntry } | { ok: false; errorKey: ClassLogFailure["type"] | "unauthorized" }>;
  reviseDailyEntryAction: (
    classId: string, entryId: string,
  ) => Promise<{ ok: true; entry: HomeroomEntry } | { ok: false; errorKey: ClassLogFailure["type"] | "unauthorized" }>;
}
```

Note on `TimetableSlot`: the plan (§0.5) adds `teacherMemberId`/`startTime`/
`endTime` to the entity additively — `PeriodRowVm` above already reflects the
POST-extension shape (`teacherMemberId: string`, `timeRangeLabel?: string`
derived from `startTime`/`endTime` by the page, not raw times passed down —
presentation gets a display string, never re-formats time itself, consistent
with `dayLabel` above).

### 3.2 `day-card.tsx`

```ts
export interface DayCardProps {
  vm: TimetableDayVm;
  /** Bound once by the page — see §3.1 action refs — threaded down instead
   *  of importing `next/navigation`/DI in this presentational component. */
  actions: Pick<TimetableTabVm,
    | "savePeriodLogAction" | "deletePeriodLogAction"
    | "savePeriodPrepAction" | "deletePeriodPrepAction"
    | "saveDailyEntryAction" | "submitDailyEntryAction" | "reviseDailyEntryAction"
    | "myLessonPlans"
  >;
}
```
(Bundling the 7 action refs + `myLessonPlans` into one `actions` prop, passed
through `DayCard` → `PeriodRow`/`DailyLogPanel`, avoids an 8-prop firehose at
every call site; still 100% typed, no context/store — see §4.)

### 3.3 `period-row.tsx`

```ts
export interface PeriodRowProps {
  vm: PeriodRowVm;
  actions: Pick<TimetableTabVm,
    | "savePeriodLogAction" | "deletePeriodLogAction"
    | "savePeriodPrepAction" | "deletePeriodPrepAction" | "myLessonPlans"
  >;
}
```
Internal state: `const [open, setOpen] = useState<"log" | "prep" | null>(null)`
— never lifted (decision §1.2). Toggle buttons only render when `vm.isMine`.

### 3.4 `period-log-form.tsx`

```ts
export interface PeriodLogFormProps {
  initial?: PeriodLog; // present → "edit existing" (title pre-filled, delete button shown)
  classId: string; date: string; periodNumber: number;
  assignedTeacherMemberId: string; termId: string; academicYearId: string;
  saveAction: TimetableTabVm["savePeriodLogAction"];
  deleteAction: TimetableTabVm["deletePeriodLogAction"];
  onClose: () => void;
}
```
Zod schema (engineer-authored, contract only noted here): `lessonTitle`
required ≤200, `remark` ≤2000 optional, `grade` enum A|B|C|D required,
`absentCount` int 0–200. Constants imported from the entity module
(`MAX_*` per PLAN §1), never re-declared. Segmented A/B/C/D control =
a `role="radiogroup"` of 4 `role="radio"` buttons (native, no new primitive —
see §6 a11y) bound via react-hook-form's `Controller`.

### 3.5 `period-prep-form.tsx`

```ts
export interface PeriodPrepFormProps {
  initial?: PeriodPrep;
  classId: string; date: string; periodNumber: number;
  assignedTeacherMemberId: string; termId: string; academicYearId: string;
  lessonPlans: Pick<LessonPlanEntity, "planId" | "title">[];
  saveAction: TimetableTabVm["savePeriodPrepAction"];
  deleteAction: TimetableTabVm["deletePeriodPrepAction"];
  onClose: () => void;
}
```
Zod: `note` ≤`MAX_NOTE_LENGTH` (5000, BE cap — §0 ground truth) optional,
`lessonPlanId` optional (`<Select>` — verify primitive exists, §1),
`materials` array via `MaterialsFieldArray`, capped `MAX_MATERIALS` (20) with
the 21st add blocked client-side (disable "+ Thêm", not a submit-time error).

### 3.6 `materials-field-array.tsx`

```ts
export interface PeriodMaterialInput { title: string; url: string; }

export interface MaterialsFieldArrayProps {
  /** react-hook-form `useFieldArray` binding — passed the `control` + `name`,
   *  NOT the raw array, so this component participates in the parent form's
   *  validation/submit rather than owning parallel state. */
  name: "materials";
  maxItems: number; // MAX_MATERIALS
  maxTitleLength: number; // MAX_MATERIAL_TITLE_LENGTH
}
```
(No `control`/`Control<T>` generic spelled out here — that's a
`fe-nextjs-engineer` react-hook-form wiring detail, not an architecture
contract; the interface's job is only to fix the field name + caps so the
form and the entity's constants can't drift.)

### 3.7 `daily-log-panel.tsx`

```ts
export interface DailyLogPanelProps {
  vm: DailyLogPanelVm;
  saveAction: TimetableTabVm["saveDailyEntryAction"];
  submitAction: TimetableTabVm["submitDailyEntryAction"];
  reviseAction: TimetableTabVm["reviseDailyEntryAction"];
}
```
Rendering, per `vm.entry?.status` + `vm.canEdit` (mirrors `class-log-entry-
detail.tsx`'s `canTeacherSubmit`/`canTeacherRevise` booleans, computed inline
here since there's no separate detail view to share them with):
- no `entry` + `canEdit` → empty textarea + "Lưu nháp"/"Gửi duyệt" (calls
  `saveAction` then, if not-draft, `submitAction` — same 2-call sequence
  `class-log-screen.tsx`'s own `handleCreate` already uses for "create then
  submit", reused as the exact same call shape, not reinvented).
- `entry.status === "DRAFT"` + `canEdit` → editable textarea (pre-filled) +
  same 2 buttons.
- `entry.status === "SUBMITTED" | "APPROVED"` + `canEdit` → read-only text +
  `StatusBadge` (reuses `STATUS_TONE` from class-log).
- `entry.status === "REJECTED"` + `canEdit` → `entry.reason` shown +
  "Sửa & gửi lại" button (→ `reviseAction`).
- `!canEdit` (GVBM, or a non-homeroom GVCN denied server-side) → read-only
  render + i18n caption "Chỉ GVCN sửa được", regardless of status.

### 3.8 `upcoming-period-panel.tsx`

```ts
export interface UpcomingPeriodPanelProps {
  vm: UpcomingPeriodPanelVm;
}
```
Pure Server Component — 3 shortcuts are `<Link>`s (`teachingPlanHref` etc.
already fully built by the page, `?classId=` query included per packet — no
`useSearchParams`/client nav needed here).

### 3.9 `class-timetable-week-nav.tsx`

```ts
export interface ClassTimetableWeekNavProps {
  weekParam: string; // "2026-W36" — display only, page already formatted the label
  weekRangeLabel: string; // e.g. "27/04 – 02/05" (built server-side, iso-week.ts)
  prevHref: string;
  nextHref: string;
}
```
Pure Server Component, two `<Link>`s (prev/next), no client state — confirms
decision §1.1 (different from `WeekNav`'s button+`onChange` shape).

## 4. State Ownership (contract level)

| State | Owner | Notes |
| --- | --- | --- |
| `?week=` (which week is rendered) | URL, resolved server-side | `page.tsx` reads `searchParams.week`, calls `parseIsoWeek` (PLAN §4); NOT client state anywhere in this tree. |
| Which period's form is open (`log`/`prep`/`null`) | `PeriodRow` internal `useState` | Never lifted — confirmed decision §1.2. Closing one row's form on opening another is NOT required by any AC; if the engineer wants "only one open at a time" it's a `timetable-tab`-level `useState<string|null>` promoted then — flag to `fe-state-engineer`... but **not needed for this story** (YAGNI, matches PLAN §8's "skip fe-state-engineer" call). |
| Daily-entry textarea draft value (before save) | `DailyLogPanel` internal `useState`, seeded from `vm.entry?.summary` | Same shape as `class-log-entry-form.tsx`'s own local `summary` state — not global. |
| Period-log / period-prep form field values | react-hook-form (`PeriodLogForm`/`PeriodPrepForm` local, uncontrolled-by-default) | No TanStack, no global store (PLAN Design Notes: "Không TanStack cần thiết"). |
| Server data (logs/preps/timetable/homeroom-entries for the rendered week) | RSC, resolved ONCE by `page.tsx` per request | `revalidatePath` after any Server Action re-runs the whole RSC tree — the standard "form submits → page revalidates → next render shows the new state" flow already used by `class-log-screen.tsx`'s siblings. No client cache to invalidate. |
| `isPending` (submit-in-flight) | `useTransition` inside each client sub-component (`PeriodLogForm`, `PeriodPrepForm`, `DailyLogPanel`) | Same pattern as `class-log-screen.tsx`'s single `useTransition` — but scoped PER FORM here (not one tab-wide transition) since multiple rows can plausibly be mid-edit; each component owns its own pending flag. |

**Hand-off note to `fe-state-engineer`**: confirmed skip per PLAN §8 — URL +
RSC-resolved VM covers 100% of this tab's data needs; forms are local
react-hook-form state; `revalidatePath(CLASS_HUB_PATH, "page")` after each
Server Action is the only "refresh" mechanism. Re-engage ONLY if the engineer
finds a concrete need for optimistic badge-flip before revalidation resolves
(not built here, no evidence of a UX problem requiring it).

## 5. Composition & Variant Strategy

- **No compound-component pattern needed** — this tree is 100% ordinary
  parent→child prop-drilling (per-slot fan-out is already flattened onto
  `PeriodRowVm`, so there's no need for a `DayCard.Period`/`DayCard.Daily`
  slot API; a single `days: TimetableDayVm[]` prop is sufficient and simpler).
- **`cva`/variant use**: none new. `StatusBadge`'s existing `tone` prop
  (`success`/`warning`/`error`/`muted`) covers all 4 daily statuses AND the
  "Đang diễn ra" live chip (`tone="success"`, matches design-spec's "success
  tone, chữ + dot" — the dot is a decorative `<span>` inside the badge's
  children, not a new badge variant).
- **`Slot`/`asChild` (Radix)**: not needed — no component here wraps a
  polymorphic trigger element that needs to render as something else (the
  toggle buttons are plain `<Button>`, the shortcuts are plain `<Link>`).
- **Extension points held back (no premature abstraction, <3 instances)**:
  the "read-only strip for someone else's period log" (§2, GVCN view) is
  inlined directly in `PeriodRow` rather than its own component — it's a
  single conditional `<div>` block, not reused anywhere else. If a 3rd
  "read-only entity summary chip" pattern shows up elsewhere in E24, THEN
  extract to `components/shared/`.
- **Design-system reuse**: `StatusBadge` (daily status + live chip),
  `Button`/`Input`/`Label`/`Textarea` primitives, existing `class-log`
  `STATUS_TONE` map (import, don't reinvent), existing `card`/`shadow-card`
  token classes already used by `day-card`/`upcoming-period-panel` (same
  classes `class-log-entry-list.tsx` uses for its own list items — `rounded-
  [var(--edu-radius-card)] border border-border bg-card shadow-card`).

## 6. Accessibility Contract

| Interactive node | Requirement |
| --- | --- |
| Period-row log/prep toggle buttons | Real `<button>` with `aria-expanded={open === 'log'|'prep'}` and `aria-controls` pointing at the form's id; icon-only state change (pen→check) MUST keep a text label too (already true in mockup: "Ghi sổ đầu bài tiết"/"Đã ghi sổ tiết" — never icon-only). |
| Segmented A/B/C/D grade control | `role="radiogroup"` with `aria-label` (e.g. "Xếp loại tiết"), each option a `role="radio"` `aria-checked`, arrow-key navigation between the 4 (native radiogroup keyboard contract) — NOT 4 unrelated buttons. |
| `lessonTitle` / `remark` / `absentCount` / prep `note` inputs | Each has a `<Label htmlFor>` (mirrors `class-log-entry-form.tsx`'s `useId()` pattern exactly); character-counter text ("120/200") is decorative — pair with `aria-describedby` on the input so screen readers announce remaining length, not just visually. |
| `absentCount` number input | `<Input type="number" min={0} max={200}>` + the "tham khảo — không thay điểm danh" hint as `aria-describedby`, not color/placement alone. |
| Materials add/remove | "+ Thêm" button disabled (not hidden) at 20 items, with a visible + `aria-live="polite"` count ("20/20 — đã đạt giới hạn") so a screen-reader user learns WHY the action stopped; each material row's remove button gets `aria-label={t("periodPrep.removeMaterial", { title })}` (icon-only `X`, per `class-log-entry-detail.tsx`'s own `aria-label` precedent on icon buttons). |
| Materials URL field | `aria-invalid` + inline error text (not color-only) when the URL doesn't parse as `http(s)://` — same pattern as `class-log-entry-form.tsx`'s `summaryInvalid`/`aria-describedby` pair. |
| Daily-log status badge | `StatusBadge` already renders TEXT + tone (never color-only) — no change needed, just reuse. |
| "Đang diễn ra" live chip | Text label ("Đang diễn ra") + dot, not dot-only — confirmed already in the design spec; dot is `aria-hidden="true"`. |
| Daily-log textarea (GVCN) | `<Label htmlFor>` ("Nhận xét chung về lớp trong ngày"), same `useId()` pattern. |
| "Chỉ GVCN sửa được" read-only caption | Plain text, not solely implied by a disabled-looking textarea — must be readable copy, not just `aria-disabled` with no visible reason. |
| Week-nav prev/next | Real `<Link>` (not `<button onClick>` doing client nav) with `aria-label` ("Tuần trước" / "Tuần sau") since the chevron icons alone aren't self-describing; disable/omit the "prev" link only if there's a real floor (there is none per AC — weeks scroll indefinitely both directions). |
| Upcoming-panel shortcut rows | Real `<Link>` per row (not a clickable `<div>`, per design-spec's own a11y note for `ChClassList`'s card — the same anti-pattern applies here), full row is the link's hit area (`Link` wraps the row content, not a nested button-in-link). |
| Holiday day-card | `holidayLabel` text conveys the state (error-text color is NOT the only signal) — already true in the VM contract (§3.1 `holidayLabel?: string`, not a boolean). |
| No-slots day (e.g. Saturday with nothing scheduled) | Render an explicit "Không có tiết" row inside the day card body (not just an empty card) so screen-reader users get confirmation of "checked, nothing here" vs. a broken render. |

## Handoff notes

- **To `fe-state-engineer`**: not spawned (PLAN §8's own call, confirmed
  above in §4) — flag only if optimistic UI becomes a real ask later.
- **To `fe-lead`**: one thing to verify before the engineer starts —
  `components/ui/select/` existence for `PeriodPrepForm`'s lesson-plan picker
  (§1's missing-primitive flag: run `bun ui:add select` if absent).
- **To `fe-nextjs-engineer`**: `daily-log-panel.tsx` intentionally reuses the
  class-log Server Actions (imports, not a fork) but is a NEW component (not
  an embed of `ClassLogEntryForm`/`ClassLogEntryDetail`) — see §1's reuse
  decision for the reasoning your review/tests should hold this to.
