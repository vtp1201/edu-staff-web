# US-E15.3 Principal Member Schedule (index page — closes dead sidebar link)

## Status

planned

## Lane

normal

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm: `src/features/timetable/` (new thin use-case
  `get-member-timetable.use-case.ts` wrapping the ALREADY-REAL
  `IWeeklyTimetableRepository.getByMember`), `src/features/principal/`
  (reuse `get-principal-teachers.use-case.ts` as the picker source), route
  `app/[locale]/t/[tenant]/(app)/principal/schedule/page.tsx`
- Shared contract/file: `features/timetable/presentation/timetable-view/` (the
  `TimetableView` component + `child-picker.tsx` pattern — REUSE the picker
  pattern for a teacher-picker, do not fork `TimetableView` itself)

## Product Contract

Sidebar nav (`nav-config.ts`, principal role) links to `/principal/schedule`
but the route does not exist. This adds a principal-facing schedule viewer:
pick a teacher (from the existing principal teacher roster,
`get-principal-teachers.use-case.ts`, already implemented in US-E13.5) and view
that teacher's weekly timetable.

Ground-truthed reuse — **no BE gap, no mock-first needed**:
`RealWeeklyTimetableRepository.getByMember(memberId)` (US-E18.26) is already
wired to the real `GET /members/{memberId}/timetable` endpoint and is
role-agnostic (member-scoped, not caller-role-scoped) — the parent view already
calls it successfully with a CHILD's memberId; this story calls it with a
TEACHER's memberId instead. This is the exact repository primitive the
domain-layer doc comment on `IWeeklyTimetableRepository` anticipates
("the by-member fetch... backs the student self-view... and the parent's
per-child view") — extending it to a THIRD caller (principal viewing a
teacher) is additive, not a new BE integration.

## Relevant Product Docs

- No `docs/product/design-spec.jsonc` entry for this screen. Reuse the
  `TimetableView` component + the parent screen's picker pattern
  (`getChildListAction`/`initialChildId` swapped for a teacher list/id) — same
  visual layout, no new tokens.

## Acceptance Criteria

- Given a principal opens `/principal/schedule`, they see a teacher picker
  (reuse the existing principal teacher list) defaulting to the first teacher,
  and that teacher's weekly timetable renders below (reuse `TimetableView`).
- Given the principal switches teachers via the picker, the timetable
  refetches for the newly selected teacher (`getByMember(newTeacherId)`).
- Given the school has zero teachers, the picker + timetable show the existing
  empty state (reuse, no new empty-state component).
- Given the timetable fetch 404s (`TIMETABLE_MEMBER_NOT_RESOLVABLE` — no
  published schedule for that teacher), the screen shows the SAME "not
  published yet" empty state the teacher/parent views already show.
- Week navigation (prev/next) reuses the existing `week-nav.tsx`.
- WCAG 2.1 AA: picker is a proper labelled combobox/select, keyboard operable,
  focus visible, no color-only day/period distinction (already established by
  US-E15.1/E15.2 — do not regress).

## Design Notes

- Commands: none (read-only).
- Queries: `getPrincipalTeachersAction()` (existing, US-E13.5) for the picker
  source; NEW `getMemberTimetableAction(memberId, weekStart?)` Server Action →
  NEW `get-member-timetable.use-case.ts` → existing `getByMember` repository
  method (no new repository code, no new DTO).
- API: `GET /members/{memberId}/timetable?termId=` — already implemented,
  ground-truth against `TIMETABLE_VIEW_EP.memberTimetable` (no new endpoint
  constant needed).
- Domain rules: none new — reuses `toTimetableViewFailure` mapping as-is.
- UI surfaces: `app/[locale]/t/[tenant]/(app)/principal/schedule/page.tsx` (RSC)
  + a NEW small `teacher-picker.tsx` (feature-local under
  `features/timetable/presentation/timetable-view/`, sibling to
  `child-picker.tsx` — same component shape, different data source; confirm
  with `fe-component-architect` whether to extract a shared generic
  `member-picker` instead of two near-identical pickers, per decision `0026`).

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `get-member-timetable.use-case.test.ts` |
| Integration | none new (repository already covered by US-E18.26) |
| E2E | Storybook interaction: picker switch → refetch, empty state, not-published state |
| Platform | `bun build` clean |
| Release | design-review gate + a11y audit green |

## Implementation Plan

Ground-truthed against current code (2026-08-02): `IWeeklyTimetableRepository.getByMember`
is real (US-E18.26); `TimetableRole = "student" | "parent"` only (no `"principal"` yet);
`TimetableView`'s picker AND week-nav are both gated on a single internal `isParent`
flag — this needs generalizing, not just a new leaf component. `PrincipalTeacher`
(`displayName`, `email`, `homeroomClassName`, `status: "ACTIVE"|"ON_LEAVE"`) has NO
name-fallback gap (unlike `TimetableChild.name?`, ask #20 residual) and no color-identity
scheme — confirms picker data shapes are genuinely different, not just a type swap.

### Phase 1 — Domain: `get-member-timetable.use-case.ts`

- File: `src/features/timetable/domain/use-cases/get-member-timetable.use-case.ts`.
  Thin wrapper — NOT a roster-validating use-case like `GetChildTimetableUseCase`
  (no "no-child" concept; the principal always calls with an id sourced straight
  from the same `getPrincipalTeachersAction()` list rendered in the picker, so a
  double roster-check would be dead code, per Design Notes: "no new repository
  code, no new DTO"):
  ```ts
  export class GetMemberTimetableUseCase {
    constructor(private readonly repo: IWeeklyTimetableRepository) {}
    async execute(memberId: string, weekStart?: string): Promise<TimetableViewResult<WeeklyTimetable>> {
      try {
        return { ok: true, data: await this.repo.getByMember(memberId, weekStart) };
      } catch (err) {
        return { ok: false, error: toTimetableFailure(err) };
      }
    }
  }
  ```
- Test first (red): `get-member-timetable.use-case.test.ts`, mirror
  `get-child-timetable.use-case.test.ts`'s repo-stub pattern:
  - calls `getByMember(memberId, weekStart)` and passes both args through;
  - `ok:true` returns `repo`'s `WeeklyTimetable` untouched (no className composition —
    that's the parent-only enrichment; a teacher's own class name context isn't
    needed here per AC);
  - propagates a typed thrown failure (`{ type: "not-found" }`) unchanged;
  - maps a non-typed throw to `{ type: "network-error" }`.
- Done when: 4 unit tests green.

### Phase 2 — DI + Server Actions

- `src/bootstrap/di/timetable-view.di.ts`: add
  `makeGetMemberTimetableUseCase()` returning `new GetMemberTimetableUseCase(await makeRepo())`
  — reuses the existing `makeRepo()` (already wires `HybridWeeklyTimetableRepository`,
  real `getByMember`). No new DI file.
- New `src/app/[locale]/t/[tenant]/(app)/principal/schedule/actions.ts` (`'use server'`),
  mirroring `parent/schedule/actions.ts`'s two-action shape but for principal:
  - `getPrincipalTeacherListAction()` — `requireRole(["principal"])` guard →
    `(await makeGetPrincipalTeachersUseCase()).execute()` (existing factory, already
    in `@/bootstrap/di`) → map `Result<PrincipalTeacher[], PrincipalTeachersFailure>`
    (`.value`/`.failure` shape, NOT `.data`/`.error` — different Result convention
    than `timetable-view.result.ts`) into the same `{ ok, data }` / `{ ok, errorKey }`
    action-result shape the picker/page expect.
  - `getMemberTimetableAction(memberId, weekStart?)` — `requireRole(["principal"])`
    guard → `(await makeGetMemberTimetableUseCase()).execute(memberId, weekStart)`.
- No integration test (repository already covered US-E18.26); these are thin
  guard+map wrappers, covered indirectly by the Storybook interaction in Phase 4.

### Phase 3 — Component architecture (picker + `TimetableView` prop widening)

**This phase's result should be reviewed by `fe-component-architect` before Phase 4
implementation** — it changes the shared `TimetableView` component's public prop
surface (consumed by the parent screen too), not just an additive leaf file.

- **Recommendation: new sibling `teacher-picker.tsx`, do NOT force a generic
  `member-picker.tsx` yet.** Rationale (decision `0026` tree — "genuinely different
  data/labels" vs "same pattern, different type"):
  - `ChildPicker` renders a color-token avatar circle keyed by `TimetableChildColor`,
    an ordinal-fallback name (`t("childOrdinalLabel")`) for the documented name-gap,
    and a "class pending" fallback — all driven by gaps specific to the parent's
    linked-students contract (ask #20 residual, US-148 D5).
  - `PrincipalTeacher` has none of those gaps (`displayName` always populated) but
    needs its OWN fields the child picker has no slot for: `status` (`ON_LEAVE`
    should render a badge/dimmed state — new visual, not in `ChildPicker` at all)
    and no color-identity system.
  - Forcing both through one generic component today means either (a) a config
    object per-caller specifying avatar/fallback/badge rendering — more indirection
    than the ~50-line component it replaces, or (b) rendering unused fields —
    both violate YAGNI for a single extra consumer. Per the component-organization
    decision tree this is item 3 (composed, single-screen-each, tentative pattern
    reuse) — build as a sibling now; **promote to a shared generalized picker only
    if a 3rd caller needs the same shape** (not before).
  - Open question for `fe-component-architect` to confirm/override: whether
    `status: "ON_LEAVE"` should be visually distinguished in the picker (e.g. muted
    row + badge) or simply included in the roster unstyled — no design-spec entry
    exists for this screen to arbitrate.
- New file: `src/features/timetable/presentation/timetable-view/teacher-picker.tsx`.
  Same shape as `ChildPicker` (fieldset/legend, `<button>` cards, `aria-pressed`,
  `min-h-11`, focus-visible ring) but props take `PrincipalTeacher[]`, render
  `displayName` (no ordinal fallback needed), `homeroomClassName` as the secondary
  line (fallback `classPending`-equivalent copy when null), and a status affordance
  for `ON_LEAVE`. No color-token avatar ring — reuse a neutral avatar box (2-char
  initials of `displayName`, always derivable, no gap).
- `TimetableView` prop widening — replace the single `isParent` gate with a
  `showsSwitcherAndWeekNav = viewerRole === "parent" || viewerRole === "principal"`
  boolean, and add principal-parallel props:
  `teacherList?: PrincipalTeacher[]`, `initialTeacherId?: string`,
  `fetchMemberTimetable?: (memberId: string, weekStart?: string) => Promise<TimetableActionResult>`.
  Render `<ChildPicker>` when `viewerRole==="parent" && childList.length>=2`,
  `<TeacherPicker>` when `viewerRole==="principal" && teacherList.length>=2`
  (single-teacher schools skip the picker, same UX rule as parent's single-child).
  `cellVariant="teacher"` (already-built US-E15.2 seam — shows class name per slot,
  correct for "principal viewing a teacher's timetable").
  Extend `TimetableRole` to `"student" | "parent" | "principal"` in
  `timetable-view.i-vm.ts`; extend `ERROR_KEYS` map — no new key needed, existing
  `not-found → errors.unknown` already covers the "not published yet" AC.
- Week nav: reuse `WeekNav` unchanged (already generic — takes `weekOffset`/
  `weekDates`/`onChange`, no role coupling).

### Phase 4 — Route + i18n + tests

- `src/app/[locale]/t/[tenant]/(app)/principal/schedule/page.tsx` (RSC), mirroring
  `parent/schedule/page.tsx` 1:1 with teacher in place of child:
  ```tsx
  const teacherRes = await getPrincipalTeacherListAction();
  const teacherList = teacherRes.ok ? teacherRes.data : [];
  const firstTeacherId = teacherList[0]?.teacherId;
  let initialState: TimetableDataState;
  if (!firstTeacherId) {
    initialState = teacherRes.ok ? { status: "empty" } : { status: "error", errorKey: teacherRes.errorKey };
  } else {
    initialState = toDataState(await getMemberTimetableAction(firstTeacherId));
  }
  return (
    <TimetableView
      viewerRole="principal"
      initialState={initialState}
      teacherList={teacherList}
      initialTeacherId={firstTeacherId}
      fetchMemberTimetable={getMemberTimetableAction}
    />
  );
  ```
- Confirm route is under the principal role-gated layout
  (`(app)/principal/layout.tsx` or route guard) — same protection tier as
  `principal/teachers/page.tsx`; do not duplicate guard logic beyond the
  Server Actions' own `requireRole(["principal"])`.
- i18n: reuse `timetableView` namespace entirely for shared copy (`errorTitle`,
  `errors.*`, `emptyTitle`/`emptyBody`, `retry`, `period`, `days.*`, `recess`,
  `teacherCaption`). NEW keys needed only for the teacher-picker's own strings
  (mirroring `childPickerLabel`/`classPending`, NOT `childOrdinalLabel` — no
  fallback-name gap here):
  - `timetableView.teacherPickerLabel` (fieldset legend, e.g. "Chọn giáo viên để
    xem thời khoá biểu")
  - `timetableView.homeroomPending` or reuse `classPending` copy if semantically
    identical (a teacher with no homeroom) — confirm wording during copy pass,
    default to reusing `classPending` if the Vietnamese reads naturally for both.
  - `timetableView.statusOnLeave` (badge text) if Phase 3's open question resolves
    to "show a badge".
  Add both `vi.json` and `en.json` in the same edit (source = vi).
- Test plan:
  - Unit: Phase 1's `get-member-timetable.use-case.test.ts` (4 cases above).
  - Storybook interaction (new `principal-schedule` story or extend
    `timetable-view.stories.tsx` with `viewerRole="principal"` variants):
    teacher switch → refetch (assert `fetchMemberTimetable` called with new id,
    grid re-renders with `cellVariant="teacher"`), zero-teachers empty state,
    `not-found` → "not published yet" empty state, week nav prev/next (reuse
    existing `WeekNav` interaction coverage — no new assertions needed if it's
    truly unchanged).
  - a11y: picker is a `<fieldset>`/`<legend>` + real `<button>` (keyboard +
    focus-visible), same pattern already audited for `ChildPicker` — no new
    pattern to re-audit, just confirm parity.
- Done when: `bun vitest run` green, `bun build` clean, design-review gate +
  a11y audit pass (no new tokens — visual reuse only).

### fe-component-architect / fe-state-engineer recommendation

- **`fe-component-architect`: YES, but scoped.** Phase 3 changes a SHARED
  component's (`TimetableView`) public prop surface and role-gating logic used by
  an existing screen (parent) — not just adding an isolated leaf file. Hand off
  Phase 3's picker-split rationale + prop-widening sketch above for confirmation/
  refinement before `fe-nextjs-engineer` implements it, and to settle the
  `ON_LEAVE` styling open question.
- **`fe-state-engineer`: NOT needed.** The interaction (switch teacher → refetch,
  week nav) is a direct replication of the parent screen's already-established
  pattern — RSC-seeded initial state + `useTransition`-wrapped Server Action
  re-fetch on picker select, no TanStack Query, no new cache/invalidation
  surface. Same conclusion the parent/teacher screens already reached.

### Open questions

- `ON_LEAVE` teacher styling in the picker (dimmed row? badge? nothing?) — no
  design-spec entry for this screen; resolve in Phase 3 hand-off or default to
  "no special styling, status not surfaced in the picker" if `fe-component-architect`
  has no strong opinion (YAGNI — AC doesn't mention it).
- Exact `homeroomPending`-vs-reuse-`classPending` copy call — confirm wording
  reads naturally for a teacher ("chưa chủ nhiệm lớp nào" vs child's "chưa có
  lớp") before deciding to add a new key vs reuse.
- Whether the principal route needs its own role-gate layout file or inherits
  one already covering `/principal/*` — verify `(app)/principal/layout.tsx`
  exists and covers `/principal/schedule` by path convention (very likely, since
  `/principal/teachers` already works) before writing Phase 4.

## Component Architecture

*(fe-component-architect — reviewed planner's Phase 3 sketch against the actual
current `timetable-view.tsx`/`.i-vm.ts`, `child-picker.tsx`,
`principal-teacher.entity.ts`, and the ALREADY-EXISTING `ON_LEAVE` status
convention in `principal-teachers-screen.tsx`. Confirms the planner's
recommendation with two concrete grounding facts the planner didn't have:
`cellVariant: "class" | "teacher"` already exists in `timetable-grid.tsx`
(US-E15.2 seam, unused until now), and `StatusBadge`/`STATUS_TONE` already
render `ON_LEAVE → warning` on the principal teachers screen — reuse it
verbatim, do not invent a new status affordance.)*

### 1. Picker split: confirmed, sibling `teacher-picker.tsx` — no generic `member-picker`

Overruling would require ignoring decision `0026`'s own carve-out: a shared
home is for a pattern reused **as-is** across ≥2 screens, not a pattern forced
into sameness. `ChildPicker` and the new `TeacherPicker` diverge on THREE axes
simultaneously, each independently justifying a distinct component:

| Axis | `ChildPicker` (`TimetableChild`) | `TeacherPicker` (`PrincipalTeacher`) |
| --- | --- | --- |
| Id field | `childId` | `teacherId` |
| Name | `name?` — real-mode gap, ordinal fallback (`t("childOrdinalLabel")`) | `displayName` — always populated, no fallback |
| Avatar | color-token ring keyed by `TimetableChildColor` (`CHILD_COLOR_CLASSES`) | neutral single-tone initials box, **reuse the exact `Avatar` helper pattern already in `principal-teachers-screen.tsx`** (`bg-primary/15`, `size-9`, `initials(name)`) |
| Secondary line | `className` / `classPending` | `homeroomClassName` / **new** `homeroomPending` (see i18n below — semantically distinct from `classPending`, don't reuse) |
| Extra affordance | none | `status: "ON_LEAVE"` → `StatusBadge tone="warning"` (already-established convention, not a new decision) |

Forcing one generic component today means a config-object indirection layer
over two ~50-line components for a single extra consumer — textbook premature
abstraction. **Promote to a shared `components/shared/member-picker/` only
when a 3rd caller needs this same card-picker shape** (decision `0026` item 3).
Until then this stays feature-local:
`src/features/timetable/presentation/timetable-view/teacher-picker.tsx`,
sibling to `child-picker.tsx` — same canonical home as its sibling, not a new
one.

### 2. Widened `TimetableRole` / `TimetableViewProps` contract

`timetable-view.i-vm.ts`:

```ts
import type { PrincipalTeacher } from "@/features/principal/domain/teachers/entities/principal-teacher.entity";

export type TimetableRole = "student" | "parent" | "principal";

export interface TimetableViewProps {
  viewerRole: TimetableRole;
  initialState: TimetableDataState;

  // Parent-only (UNCHANGED — existing parent screen keeps working as-is)
  childList?: TimetableChild[];
  initialChildId?: string;
  fetchChildTimetable?: (childId: string) => Promise<TimetableActionResult>;

  // Principal-only (NEW — parallel shape, not a rename of the parent props)
  teacherList?: PrincipalTeacher[];
  initialTeacherId?: string;
  fetchMemberTimetable?: (
    memberId: string,
    weekStart?: string,
  ) => Promise<TimetableActionResult>;
}
```

`domain/entities` import note: `PrincipalTeacher` lives under
`features/principal/domain/`, not `features/timetable/domain/` — this is a
CROSS-FEATURE type import into a `.i-vm.ts`. That's allowed (`.i-vm.ts` is the
server↔client contract file, and `domain/entities` types are the one thing
`presentation/` may import per the layer table) but it IS the one contract
coupling this story introduces between the `timetable` and `principal`
features. No new coupling avoidable here — the picker's whole job is to show
principal-domain data — but flag it so `fe-tech-lead-reviewer` doesn't read it
as a layering violation: it's a domain-entity (types-only) import, same
category as `TimetableChild`, not an infrastructure/DI import.

`ChildListActionResult` gets a principal-teacher sibling for symmetry (used by
`getPrincipalTeacherListAction`'s return shape in Phase 2 — already sketched
there as reusing `{ ok, data }`/`{ ok, errorKey }`; make it a named type here
rather than an inline union so the picker's prop type stays readable):

```ts
export type TeacherListActionResult =
  | { ok: true; data: PrincipalTeacher[] }
  | { ok: false; errorKey: TimetableErrorKey };
```

`ERROR_KEYS` map in `timetable-view.tsx`: **no change** — `"no-child"` stays
parent-specific dead-but-harmless for principal (never produced by
`GetMemberTimetableUseCase`, which has no roster-validation branch per Phase
1); `"not-found"` already covers "not published yet" for all three roles.

### 3. `timetable-view.tsx` internal branching — replace `isParent` with role-derived booleans

Confirmed: `isParent`-as-single-gate does not generalize (it currently
conflates THREE unrelated concerns — week-nav visibility, picker visibility,
and header/retry copy branching). Replace with named derivations, each scoped
to what it actually gates (a general `showsSwitcherAndWeekNav` flag as the
planner sketched would immediately need re-splitting for `cellVariant` and
picker-choice anyway, so name the granular ones directly):

```ts
const showWeekNav = viewerRole === "parent" || viewerRole === "principal";
const showChildPicker = viewerRole === "parent" && childList.length >= 2;
const showTeacherPicker = viewerRole === "principal" && teacherList.length >= 2;
const cellVariant = viewerRole === "principal" ? "teacher" : "class";
```

State: keep **two** parallel `useState` slots (`selectedChildId`,
`selectedTeacherId`) rather than one unified `selectedMemberId` — the id
FIELD NAME differs per source list (`childId` vs `teacherId`) and only one
slot is ever live per `viewerRole`, so unifying buys nothing but a rename at
the read site. This mirrors the picker-split reasoning one level up: same
judgment call, applied consistently, not two different philosophies.

```ts
const [selectedChildId, setSelectedChildId] = useState(
  initialChildId ?? childList[0]?.childId ?? "",
);
const [selectedTeacherId, setSelectedTeacherId] = useState(
  initialTeacherId ?? teacherList[0]?.teacherId ?? "",
);
```

`runFetch`/`onSelectChild`/`onRetry`: generalize to a role-branched pair
(`runChildFetch` unchanged; add `runTeacherFetch`/`onSelectTeacher` mirroring
it 1:1 against `fetchMemberTimetable`/`selectedTeacherId`). `onRetry` becomes:

```ts
const onRetry = useCallback(() => {
  if (viewerRole === "parent" && fetchChildTimetable) runChildFetch(selectedChildId);
  else if (viewerRole === "principal" && fetchMemberTimetable) runTeacherFetch(selectedTeacherId);
  else router.refresh();
}, [viewerRole, fetchChildTimetable, fetchMemberTimetable, runChildFetch, runTeacherFetch, selectedChildId, selectedTeacherId, router]);
```

Render swap:

```tsx
{showWeekNav ? (
  <WeekNav weekOffset={weekOffset} weekDates={weekDates ?? []} onChange={setWeekOffset} />
) : (
  <ReadOnlySelectors />
)}

{showChildPicker && (
  <ChildPicker childList={childList} selectedChildId={selectedChildId} onSelect={onSelectChild} disabled={isPending} />
)}
{showTeacherPicker && (
  <TeacherPicker teacherList={teacherList} selectedTeacherId={selectedTeacherId} onSelect={onSelectTeacher} disabled={isPending} />
)}

<TimetableGrid timetable={view.timetable} cellVariant={cellVariant} weekDates={weekDates} />
```

`weekDates` derivation: `isParent ? buildWeekDates(weekOffset) : undefined` →
`showWeekNav ? buildWeekDates(weekOffset) : undefined` (student stays
`undefined`, principal now gets real dates like parent — required, since
principal's week nav is live per AC).

`displayClassName` (Header's `· Lớp 10A1` suffix): **parent-only, unchanged.**
Do NOT extend this to show the teacher's homeroom class in the header —
`cellVariant="teacher"` already surfaces the relevant class name PER SLOT in
the grid (US-E15.2 seam), so a header-level class suffix would be redundant/
wrong context for "which class is the principal looking at" (there isn't one
— a teacher's week spans multiple classes). Leave `displayClassName` computed
from `childList` only; it naturally evaluates to `""` for `viewerRole ===
"principal"` and the `{displayClassName && …}` guard already hides the suffix.

`Header` component: change its prop from `isParent: boolean` to `viewerRole:
TimetableRole` (the boolean was already a leaky abstraction of three copy
decisions — title-this-week, subtitle-parent-vs-student, range display).
Internal:

```ts
const showWeekNav = viewerRole === "parent" || viewerRole === "principal";
const title = viewerRole === "parent" && weekOffset === 0 ? t("titleThisWeek") : t("title");
const subtitle =
  viewerRole === "parent" ? t("subtitleParent", { range })
  : viewerRole === "principal" ? t("subtitlePrincipal", { range })
  : t("subtitleStudent");
```

`subtitlePrincipal` is a genuinely NEW i18n key (not a reuse) — `subtitleParent`'s
copy is written from the parent's-child possessive framing ("thời khoá biểu
của con bạn…"), which reads wrong for "principal viewing a teacher's
schedule." `title`/`titleThisWeek` ARE reused as-is (generic "Thời khoá biểu",
no possessive framing — fine for all three roles).

### 4. `teacher-picker.tsx` prop contract

```ts
// src/features/timetable/presentation/timetable-view/teacher-picker.tsx
import type { PrincipalTeacher } from "@/features/principal/domain/teachers/entities/principal-teacher.entity";

interface TeacherPickerProps {
  teacherList: PrincipalTeacher[];
  selectedTeacherId: string;
  onSelect: (teacherId: string) => void;
  disabled?: boolean;
}
```

Structure mirrors `ChildPicker` 1:1 (same a11y shape — `fieldset`/`legend`,
real `<button>` cards, `aria-pressed`, `min-h-11`, `focus-visible:ring-3`,
`motion-safe:transition-colors`), diverging only where the data does:

- **Legend**: `t("teacherPickerLabel")` (new key, sr-only — mirrors
  `childPickerLabel`).
- **Avatar**: NOT `CHILD_COLOR_CLASSES` (no color-identity concept for
  teachers) — reuse the **exact** existing pattern from
  `principal-teachers-screen.tsx`'s `Avatar`/`initials()` helpers verbatim
  (`size-9 rounded-full bg-primary/15`, 2-char initials of `displayName`,
  always derivable, no fallback branch needed). Do not reinvent an avatar
  style; import/re-derive the same `initials()` logic locally (it's a pure
  4-line string helper, not worth extracting to `shared/` for one extra call
  site yet).
- **Primary line**: `child.displayName` — no ordinal-fallback branch (unlike
  `ChildPicker`, `PrincipalTeacher.displayName` has no documented gap).
- **Secondary line**: `homeroomClassName ? t("classLabel", { className: homeroomClassName }) : t("homeroomPending")`
  — reuses `classLabel` (generic "· Lớp X" formatting is identical), but
  needs the **new** `homeroomPending` key (see i18n below — do NOT reuse
  `classPending`, the meanings diverge).
- **Status affordance** (resolves the open question — see §5): render
  `<StatusBadge tone="warning">{t("statusOnLeave")}</StatusBadge>` inline
  next to the secondary line when `status === "ON_LEAVE"`; nothing rendered
  for `"ACTIVE"` (no badge-for-the-default-case noise, consistent with how
  `principal-teachers-screen.tsx` already only badges non-default statuses…
  actually confirm: that screen badges every row incl. ACTIVE — for the
  picker's denser card layout, ACTIVE gets NO badge to keep visual noise
  down; only the exception (`ON_LEAVE`) is called out. This is a deliberate,
  minor divergence from the table screen's convention, justified by the
  different information density of a card-picker vs a data table — same
  token/tone, different "when to show" threshold).
- **Selectable, not disabled** — see §5.

`STATUS_TONE`-equivalent inline (no need to import the table screen's
private `STATUS_TONE` const — it's a 1-entry map here, `"ON_LEAVE" →
"warning"`, inline the literal `tone="warning"` at the call site instead of a
constant for one branch).

### 5. `ON_LEAVE` selectability — resolved: selectable, with a `StatusBadge` label, not disabled

**Decision: `ON_LEAVE` teachers stay selectable (no `disabled`), with a
`StatusBadge tone="warning"` label.** Rationale:
- The prompt's own framing is correct — a principal legitimately wants to see
  an on-leave (or recently departed) teacher's last published timetable
  (coverage planning, handover, audit).
- There's **already a precedent in this exact codebase**:
  `principal-teachers-screen.tsx` lists `ON_LEAVE` teachers in the roster
  table, fully interactive (assignment sheet still opens), with a `warning`
  `StatusBadge` — it does NOT disable/dim the row. Disabling in the picker
  would be an inconsistent, un-precedented UX decision introduced without a
  design-spec entry to justify it.
- No AC requires disabling; AC only requires the picker to be a labelled,
  keyboard-operable combobox — a status label is additive, doesn't regress
  any AC.
- This is a **reuse** of an established status/tone decision, not a new
  design-system decision — no ADR needed.

### 6. i18n keys (both `vi.json` and `en.json`, `timetableView` namespace)

| Key | Reuse? | Note |
| --- | --- | --- |
| `teacherPickerLabel` | NEW | sr-only fieldset legend, mirrors `childPickerLabel` |
| `homeroomPending` | NEW | secondary-line fallback — **do not reuse `classPending`**, see §4 |
| `statusOnLeave` | NEW | `StatusBadge` text, e.g. "Đang nghỉ phép" |
| `subtitlePrincipal` | NEW | Header subtitle, principal framing (see §3) |
| `title`, `titleThisWeek`, `classLabel`, `errorTitle`, `errors.*`, `emptyTitle`, `emptyBody`, `retry`, `period`, `days.*`, `recess`, `teacherCaption`, `eyebrow`, `academicYear`, `semester`, `yearValue`, `semesterValue` | REUSE as-is | no principal-specific variant needed |

### 7. Non-breaking confirmation for `student`/`parent` callers

- `viewerRole: "student"` path: untouched — `showWeekNav`/`showChildPicker`/
  `showTeacherPicker` all evaluate the same as the old `isParent`-derived
  values did for student (`false`/`false`/`false`); `cellVariant` stays
  `"class"`; `Header`'s `viewerRole` prop swap preserves the exact same
  branch outcomes the old `isParent` boolean produced for `"student"`.
- `viewerRole: "parent"` path: untouched — `childList`/`initialChildId`/
  `fetchChildTimetable` props are unchanged in name, type, and behavior;
  `showChildPicker`/`showWeekNav` evaluate identically to the old
  `isParent`-gated logic; `subtitleParent`/`titleThisWeek` copy paths
  unchanged.
- All new props (`teacherList`, `initialTeacherId`, `fetchMemberTimetable`)
  are optional and additive — existing `<TimetableView viewerRole="parent"
  .../>` call sites compile and behave identically with zero prop changes.
- `parent/schedule/page.tsx` and `parent/schedule/actions.ts` require **no
  edits** for this story.

## Harness Delta

Registered via `harness-cli story add --id US-E15.3`.

## Evidence

(fill after implementation)
