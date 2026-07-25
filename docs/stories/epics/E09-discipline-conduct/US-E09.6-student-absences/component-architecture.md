# Component Architecture — US-E09.6 Student Absences (Teacher/GVCN + Principal)

Written by `fe-component-architect`. Finalizes `plan.md` §4/§7's sketch into
concrete file paths + prop/ViewModel contracts, and resolves the two open
questions plan.md explicitly flagged for this pass (§0 below). No
implementation code — contracts/structure only. Read in full before writing:
`plan.md`, `spec.md`, `story.md`, `design-spec.jsonc` → `screens.studentAbsences`
(line ~10403), `design_src/edu/student-absences.jsx`
(`StudentAbsencesScreen`/`SAAbsenceRow`/`SAExcusedBadge`/`SAFlaggedIndicator`/
`SARecordForm`/`SAFlagConfirmDialog`/`SADateField`), plus the sibling precedent
read in full: `src/features/staff-discipline/presentation/staff-discipline-screen/*`
(one-component-multi-role-route, `sd-state-badge.tsx`/`sd-severity-badge.tsx`/
`sd-segmented-field.tsx`/`sd-list-skeleton.tsx`/`sd-list-error.tsx` shapes, and
that story's own `component-architecture.md` doc convention followed here),
`src/features/audit-log/presentation/audit-log-screen/components/date-range-fields.tsx`
(feature-local raw `<input type="date">` pattern — confirms no shared
`DateField` primitive exists), `src/components/shared/{status-badge,empty-state,
stat-card,publish-confirm-dialog,destructive-confirm-dialog}/*.tsx`.

---

## 0. Reuse-vs-extend-vs-new decisions (grep/read-verified)

| Shared component | Mockup said | Grep/read finding | Decision |
| --- | --- | --- | --- |
| `components/shared/status-badge` (`StatusBadge`, `StatusTone`) | `SAExcusedBadge`/`SAFlaggedIndicator` as bespoke `<Badge>+<Icon>` | `StatusTone` already covers both signals: excused→`success`, unexcused→`warning` (text uses `--edu-warning-foreground` per NFR-002, matching `StatusBadge`'s `warning` tone class exactly), flagged→`error` (matches mockup's `T.error`/`errorLight`). Icon+text pairing (NFR-001) is the caller's job, same as `SDStateBadge`. | **Reuse directly, zero changes.** `SAExcusedBadge`/`SAFlaggedIndicator` become 2 thin feature-local wrappers, mirrors `SDStateBadge`/`SDSeverityBadge` exactly. |
| `components/shared/empty-state` (`EmptyState`) | 2 role-scoped variants (teacher CTA / principal static, no CTA) | Read in full — `icon`/`title`/`body`/`cta{label,icon,onClick,variant}`, `role="status"`. Matches both variants: teacher passes `cta`, principal omits it entirely (AC-002.4 "STATIC, NO CTA" — not a disabled CTA). | **Reuse directly**, no wrapper — the screen container computes the 2 variants inline, same as `staff-discipline`'s finding (no dispatcher component needed, one shared icon/copy). |
| `components/shared/stat-card` (`StatCard`) | 3-up `StatCard` grid (total/unexcused/flagged) | Read in full — `variant="default"` supports `icon`/`label`/`value`/`tone`, no trend needed here (spec doesn't call for trend arrows). | **Reuse directly** inside a thin feature-local grid wrapper (`sa-stats-row.tsx`) — 3 `StatCard` instances, tones `primary`/`warning`/`error` matching the badges above. |
| `components/shared/publish-confirm-dialog` (`PublishConfirmDialog`) | `SAFlagConfirmDialog` — mockup styles it red/error with a "flag" icon and "cannot be undone" copy | **`design-spec.jsonc`'s own `adminPrincipalView.flagAction.confirmDialog.pattern` field literally says**: *"mirrors lesson-plan.jsx LPConfirmDialog one-way publish confirm"* — and `PublishConfirmDialog` **is** that exact component, already promoted to `components/shared/` (US-E11.9) for precisely this one-way/irreversible/non-destructive-tone shape (`open`, `isLoading`, `onConfirm`, `onCancel`, `labels{title,body,confirm,publishing,cancel}`). Read `destructive-confirm-dialog.tsx` too as the alternative — its `variant="destructive"` (red) button + `AlertDialog` framing is for *deleting/revoking* data (US-E19.2/US-E22.1 precedent: unlink, revoke). Flagging a student absence does not delete or revoke anything — it moves a record forward into a terminal *follow-up* state, which is what `PublishConfirmDialog` (non-destructive, one-way) already models. **The mockup's red color choice is a visual-only deviation, not evidence this needs the destructive variant** — irreversibility ≠ destructiveness. | **Reuse `PublishConfirmDialog` directly** via a thin feature-local wrapper `sa-flag-confirm-dialog.tsx` that only supplies `labels` (from `studentAbsences.flagConfirm.*`, already-authored i18n) and forwards `open`/`isLoading`/`onConfirm`/`onCancel`. **Flag to `fe-lead`/`uiux`**: if design-review pushes back wanting the red/error tone from the mockup, that is a call on `PublishConfirmDialog`'s shared tone (affects US-E11.9/question-bank too), not a reason to fork a new dialog for this story alone. |
| Skeleton / error-state (`EduSkeleton`/`EduError` — mockup-only names) | rows-skeleton, error+retry | Confirmed (again) no generic shared skeleton/error-state component exists repo-wide — same finding `staff-discipline`'s doc already made (that was the 3rd–4th instance; this is now the **5th**). | **New, feature-local**: `sa-list-skeleton.tsx` (fixed `rows=4`, mirrors `sd-list-skeleton.tsx` 1:1) and `sa-list-error.tsx` (`role="alert"` + retry, mirrors `sd-list-error.tsx` 1:1). **Escalating the promotion flag to `fe-lead`**: this pattern is now byte-for-byte duplicated across `discipline`, `staff-leave`, `staff-discipline`, and (this story) `student-absences` — 5 instances is well past the "promote on 2nd use" bar in `component-organization.md`; recommend a follow-up story to extract `components/shared/list-skeleton` + `components/shared/list-error` rather than a 6th copy next time. Not executed here (out of this story's scope) — flagged only. |
| `SADateField` (mockup) | date input w/ label, used in filter bar AND record form | No shared `DateField` exists (`date-range-fields.tsx`/`date-field.tsx` in `audit-log`/`admin/calendar` are each feature-local raw `<input type="date">` wrappers — confirms this is the established per-feature pattern, not a gap to fill with a new shared component yet — only 2 prior instances, below the promotion bar). | **New, feature-local** `sa-date-field.tsx` — label + native `<input type="date">`, mirrors `date-range-fields.tsx`'s shape (own `useId`, `INPUT_CLASS` literal, `aria-invalid`/`aria-describedby` wiring). Used in the filter bar (×2, from/to) AND inside the record dialog (×1, `max=today`). **Never used in edit mode** — see §1 decision 1 below, the core open question this doc resolves. |
| Excused/unexcused 2-value toggle (mockup: 2 raw buttons) | segmented control | `sd-segmented-field.tsx` already establishes the pattern: `ui/radio-group` `variant="segmented"` (Radix `role="radiogroup"`, arrow-key nav, focus ring for free) wrapped in a generic `T extends string` field. Excused is a `boolean`, not a string union, so the generic can't be reused as-is without a cast. | **New, feature-local** `sa-excused-toggle.tsx` — same construction as `sd-segmented-field.tsx` (built on `ui/radio-group` `variant="segmented"`), specialized for the boolean excused/unexcused pair (internally maps `"true"|"false"` radio values ↔ `boolean`). Not a copy of `SDSegmentedField` (different value type), but the identical underlying primitive usage — no new primitive needed. |
| Student select (record dialog), class-filter dropdown (principal) | native `<select>` | `ui/select` (shadcn Select) already used identically by `create-violation-dialog.tsx`'s staff picker and `sd-conduct-term-bar.tsx`'s term/staff pickers. | **Reuse `ui/select` directly**, no wrapper. |
| Reason textarea | native `<textarea maxLength=5000>` | `ui/textarea` used directly, unwrapped, by `sd-reject-panel.tsx`/`set-conduct-note-dialog.tsx`. | **Reuse `ui/textarea` directly**, no wrapper. |
| `Dialog` (record + edit forms) | mockup renders the record form as an inline expanding panel, not a modal | Every sibling story in this epic (`create-violation-dialog.tsx`, `set-conduct-note-dialog.tsx`) converts the mockup's inline-panel authoring UI into a modal `Dialog` for consistency with the rest of the app's create/edit UX — same conversion applied here. Neither record nor edit is destructive, so plain shadcn `Dialog`, not `AlertDialog`. | **New (structure only)**: one shared `sa-absence-form-dialog.tsx` — see §1 decision 2. Zero new shadcn primitive; `Dialog` already exists. |
| **No new shadcn primitive needed** | n/a | `Dialog`, `Select`, `Textarea`, `RadioGroup` (`variant="segmented"`), `AlertDialog` (underlies the reused `PublishConfirmDialog`), `Badge` (underlies `StatusBadge`), `Skeleton` (underlies `sa-list-skeleton`), `Card` (underlies `StatCard`) all already exist. | **Zero `bun ui:add` needed for this story.** |

No design-system token gap — every tone/color this screen needs (`success`/
`warning`/`error` on `StatusBadge`, `primary`/`warning`/`error` on `StatCard`)
already exists. No ADR required, confirming `spec.md` §8 point 5.

---

## 1. Open questions resolved (plan.md §4/§7's explicit ask)

### Decision 1 — `SADateField` in edit mode: **separate static-text render, NOT a disabled/read-only variant of `SADateField`**

Validating plan.md's lean, not overriding it. Reasoning:

- AC-004.3's bar is explicit and higher than "looks non-editable": *"never as
  an input/select of any kind, even disabled — this AC fails if any of the
  three natural-key fields is editable in any form"*. A `disabled`
  `<input type="date">` (or `SADateField` with a `readOnly`/`disabled` prop) is
  **structurally still an input element** — it has a `value`, it participates
  in `<form>` semantics, and a future refactor could trivially flip the
  `disabled` flag back on without touching any other code path. That is
  exactly the kind of latent regression risk AC-004.3's wording is guarding
  against (mirrors `staff-discipline`'s `SetConductNoteDialogProps` precedent
  of making an AC a **type-level** guarantee, not a runtime `if`).
- The fix is cheap: a wholly separate, non-input leaf component
  (`sa-static-field.tsx`, §3.2) that renders `<span>`/`<div>` text — never an
  `<input>`, `<select>`, or any element with `role="textbox"`/`"combobox"`/
  `"listbox"`. There is no code path inside it that could ever become an
  editable control, because it has no `value`/`onChange` prop in its type at
  all.
- **Concrete enforcement mechanism** (goes one step further than plan.md
  asked): `SADateField` and `SAStaticField` are used from two **structurally
  disjoint** branches of a discriminated union on `SAAbsenceFormDialogProps`
  (§3.2) — the `mode: "edit"` variant's prop type has **no** `onDateChange`/
  `onStudentChange` field at all (only `dateDisplay`/`studentDisplay`/
  `classDisplay: string`, no setters). `fe-nextjs-engineer` therefore cannot
  accidentally wire an `<input>` to the edit form's identity fields — the type
  itself has nothing to wire. This is the same "make the AC a compile error to
  violate" technique `component-architecture.md` (US-E09.5) used for
  `SDSelfApprovedNote`/`SetConductNoteDialogProps`.

### Decision 2 — Record vs. edit form: **ONE shared component (`SAAbsenceFormDialog`) with a `mode: "record" | "edit"` discriminated-union prop, not two separate components**

Resolving plan.md's flagged open question. Reasoning:

- The two forms share real, identical UI: the excused/unexcused toggle
  (`sa-excused-toggle.tsx`) and the reason textarea (`ui/textarea`,
  ≤5000 chars) are pixel-identical in both flows (FR-004's editable-field set
  IS exactly this pair). A "two separate components" split would either
  duplicate that shared fieldset markup or immediately need its own extracted
  sub-component anyway — at which point the two "separate" dialogs are just
  thin shells around the same shared pieces, which is what a `mode` prop
  gives for free with less indirection.
  **Only** the identity block differs (record: student `Select` + `SADateField`
  input; edit: 3× `SAStaticField` static text) — those differences are cleanly
  expressed as the two arms of a discriminated union.
- Discriminated union (not one flat optional-everything interface) is the key
  choice: it means `mode: "edit"` structurally **cannot** carry an
  `onDateChange`/`onStudentChange`/roster-select prop — TypeScript itself
  rejects wiring those, closing the exact risk AC-004.3 warns about (Decision
  1). A flat interface with `date?: string; onDateChange?: (v) => void`
  present-but-optional would NOT give that guarantee — an engineer could still
  wire `onDateChange` in edit mode by mistake and nothing would catch it.
- The record dialog additionally needs record-only concerns (duplicate-date
  banner, future-date guard, roster) that don't exist in edit mode (which has
  no roster/date validation to run since those fields are immutable) — these
  slot cleanly as `mode: "record"`-only fields on the union, never present on
  `mode: "edit"`.
- One component keeps the shared submit/cancel footer, `aria-busy` pending
  state, and inline `submitError` banner wiring (mirrors
  `CreateViolationDialogProps`/`SetConductNoteDialogProps`'s `submitError`
  shape) in exactly one place instead of two — less drift risk than 2
  independently-maintained dialogs.

---

## 2. Architecture Summary

- **Net-new feature scope**: `src/features/student-absences/presentation/student-absences-screen/` — flat files under the screen folder (no `components/` subfolder), matching `staff-discipline`/`invitations`/`parent-links` doc convention.
- **Simpler container shape than `staff-discipline`**: this story has **ONE list, ONE query family** (not a 2-tab split) — so `StudentAbsencesScreen` is BOTH the role-conditional orchestrator AND the single container (owns the list query, filter drafts, and all 3 dialogs' open/target state) — there is no tab-container split to make here, unlike US-E09.5's deliberate 2-container-per-tab design.
- **New vs reused**: `StatusBadge`, `EmptyState`, `StatCard`, `PublishConfirmDialog` all reused as-is (zero changes to any). 2 new thin badge wrappers (`SAExcusedBadge`, `SAFlaggedIndicator`), 1 new stats-grid wrapper (`SAStatsRow`), 2 new list-state components (`sa-list-skeleton.tsx`, `sa-list-error.tsx` — flagged as an overdue promotion candidate, §0), 1 new date-field leaf (`sa-date-field.tsx`), 1 new static-text leaf (`sa-static-field.tsx`), 1 new segmented-toggle leaf (`sa-excused-toggle.tsx`), 1 new row component (`sa-absence-row.tsx`), 1 new shared form dialog (`sa-absence-form-dialog.tsx`, mode-discriminated — §1 decision 2), 1 new thin flag-confirm wrapper (`sa-flag-confirm-dialog.tsx` over `PublishConfirmDialog` — §0).
- **Missing shadcn primitives**: none (§0).
- **Container/hook boundary**: `StudentAbsencesScreen` is the ONLY container in this tree — everything else listed above is presentational (`SAAbsenceRow`, badges, `SAStatsRow`, `SAListSkeleton`, `SAListError`, `SAStaticField`, `SADateField`, `SAExcusedToggle`) or controlled-but-dumb (`SAAbsenceFormDialog`, `SAFlagConfirmDialog` — receive all state as props, own no query/mutation). `fe-state-engineer` owns the exact `useQuery`/mutation-hook wiring inside the screen container; this doc only names the boundary (§4).
- **Key decisions**: recorded fully in §1 above (`SADateField`/edit-mode static-text split; one `SAAbsenceFormDialog` with a `mode` discriminated union) plus the §0 reuse table (notably: `SAFlagConfirmDialog` = a thin wrapper over the ALREADY-PROMOTED `PublishConfirmDialog`, not a new dialog).

---

## 3. Component Tree

```
src/features/student-absences/presentation/student-absences-screen/

StudentAbsencesScreen                                  'use client', CONTAINER
│  (owns: list useQuery keyed by {classId?, from?, to?}; date-range filter
│   draft; principal's class-filter draft; record-dialog open state;
│   edit-dialog open+target state; flag-confirm open+target state — see §4)
├── header (breadcrumb + title + role badge, inline JSX — no sub-component,
│     matches design-spec `layout` block, no reuse gap identified)
├── sa-stats-row.tsx
│   └── SAStatsRow                                     presentational
│       └── StatCard ×3 (shared, REUSED as-is — total/unexcused/flagged)
├── filter bar (inline in the screen; composed of reused/new leaves below —
│     no wrapper component needed, mirrors `sd-violation-filter-bar.tsx`'s
│     level of extraction but this bar has no principal-only conditional
│     branch worth its own file: only the class-Select is role-gated)
│   ├── ui/select (principal-only class filter — REUSED, absent for teacher)
│   ├── sa-date-field.tsx ×2 (SADateField — "from"/"to")
│   └── "Ghi nhận nghỉ học" trigger button (teacher-only — opens
│         SAAbsenceFormDialog mode="record"; ABSENT from DOM for principal,
│         not disabled, AC-006.5-equivalent for this story's teacher/CTA split)
├── sa-list-skeleton.tsx → SAListSkeleton              presentational, NEW,
│       feature-local, fixed rows=4 (NFR-007/AC-001.1/AC-002.1, §0)
├── EmptyState (shared, REUSED as-is) — 2 variants computed inline by the
│       screen (teacher: cta set; principal: cta omitted, AC-002.4)
├── sa-list-error.tsx → SAListError                    presentational, NEW,
│       feature-local (§0), role="alert" + retry button
├── sa-absence-row.tsx (×N)
│   └── SAAbsenceRow                                   presentational
│       ├── student (resolved via `roster.find`, container-side) + date + reason
│       ├── sa-excused-badge.tsx → SAExcusedBadge       presentational, thin
│       │     wrapper over shared StatusBadge (ALWAYS rendered, AC-007.1)
│       ├── sa-flagged-indicator.tsx → SAFlaggedIndicator  presentational,
│       │     thin wrapper over StatusBadge, mounted ONLY when
│       │     state==="FLAGGED_UNEXCUSED" — genuinely absent otherwise, not an
│       │     empty placeholder (AC-007.2)
│       ├── edit action (teacher only, own-class rows) → opens
│       │     SAAbsenceFormDialog mode="edit" with this row's identity
│       └── "Gắn cờ" action (principal only, state==="RECORDED" rows only) →
│             opens SAFlagConfirmDialog with this row's identity (AC-005.1)
├── sa-absence-form-dialog.tsx
│   └── SAAbsenceFormDialog                            'use client', CONTROLLED
│       mode="record" branch (teacher, new absence):
│       │   ├── ui/select (student — `roster` prop, own class only, FR-010)
│       │   ├── sa-date-field.tsx → SADateField (max=today, AC-003.1)
│       │   ├── sa-excused-toggle.tsx → SAExcusedToggle
│       │   ├── ui/textarea (reason, ≤5000 chars)
│       │   └── inline submitError banner (future-date field error,
│       │         duplicate-date banner, per-field invalid-input, network —
│       │         all via one discriminated `submitError` prop, §3.2)
│       mode="edit" branch (teacher, existing absence):
│       │   ├── sa-static-field.tsx ×3 → SAStaticField (date/class/student —
│       │   │     STATIC TEXT ONLY, no input of any kind, §1 decision 1)
│       │   ├── sa-excused-toggle.tsx → SAExcusedToggle (SHARED w/ record mode)
│       │   ├── ui/textarea (reason, ≤5000 chars — SHARED w/ record mode)
│       │   └── inline submitError banner (per-field invalid-input,
│       │         not-found→toast+refetch is container-level, network)
│       (shared footer: Cancel + Submit, `aria-busy` while `isSubmitting`,
│        shadcn `Dialog` — constructive, not destructive)
└── sa-flag-confirm-dialog.tsx
    └── SAFlagConfirmDialog                             'use client', CONTROLLED
        thin wrapper — forwards straight to the ALREADY-SHARED
        `PublishConfirmDialog` (§0) with `labels` from
        `studentAbsences.flagConfirm.*`; NO optimistic state flip (row stays
        `RECORDED` until the mutation's `onSuccess`, AC-005.3 — enforced at
        the container's mutation-hook level, not in this component)
```

File list (all under
`src/features/student-absences/presentation/student-absences-screen/`):

```
student-absences-screen.tsx                (container + orchestrator, one file)
student-absences-screen.i-vm.ts
student-absences-screen.stories.tsx
student-absences-screen.query-keys.ts       (fe-state-engineer owns contents)
sa-stats-row.tsx
sa-date-field.tsx
sa-static-field.tsx
sa-excused-toggle.tsx
sa-excused-badge.tsx
sa-flagged-indicator.tsx
sa-absence-row.tsx
sa-absence-form-dialog.tsx
sa-flag-confirm-dialog.tsx
sa-list-skeleton.tsx
sa-list-error.tsx
sa-error-message.ts                         (failure-type → i18n key mapper,
                                              mirrors sd-error-message.ts;
                                              the ONE explicit override:
                                              "invalid-date" → i18n leaf
                                              "invalid-date-future", §2 domain
                                              shape decision in plan.md)
```

No new `components/shared/` or `components/ui/` folders this story (§0). No
new `unflag`-shaped affordance anywhere in this tree (FR-006/FR-013 —
genuinely absent, not permission-hidden).

---

## 4. ViewModel + Prop Interfaces

Types reference `domain/entities` (this feature's own, plan.md Phase 1).
Presentation only imports the failure union's **type** (`StudentAbsenceFailure["type"]`),
never a class/value from `domain/failures`, and never anything from
`infrastructure/`/`bootstrap/di/` — matches the repo-wide layer rule and the
`staff-discipline` precedent exactly.

### 4.1 `student-absences-screen.i-vm.ts`

```ts
import type {
  EditStudentAbsenceInput,
  RecordStudentAbsenceInput,
  StudentAbsenceEntity,
} from "../../domain/entities/student-absence.entity";
import type { StudentRosterEntry } from "../../domain/entities/student-roster-entry.entity";
import type { StudentAbsenceFailure } from "../../domain/failures/student-absence.failure";

export type StudentAbsencesRole = "teacher" | "principal";
export type StudentAbsencesErrorKey = StudentAbsenceFailure["type"];

export type StudentAbsencesActionResult<T = undefined> =
  | { ok: true; data: T }
  | {
      ok: false;
      errorKey: StudentAbsencesErrorKey;
      fields?: { field: string; message: string }[];
    };

export interface StudentAbsencesClassOption {
  classId: string;
  /** Display DATA (class name), not i18n copy. */
  className: string;
}

/**
 * Screen-level ViewModel — the server↔client contract. Unlike
 * `StaffDisciplineScreenVM` (2 independent lists → 2 error keys), this story
 * has ONE list/query family, so ONE `initialErrorKey` is sufficient (no
 * AC-010.3-equivalent cross-list isolation requirement exists here).
 */
export interface StudentAbsencesScreenVM {
  role: StudentAbsencesRole;
  /**
   * Teacher's own homeroom class — scopes record/edit + seeds the default
   * filter. Undefined/unused for `principal` (server already scopes
   * schoolwide/class-filtered independent of any client value).
   */
  classId?: string;

  initialAbsences: StudentAbsenceEntity[];
  /** Set only when the RSC's own list fetch failed. Error and empty stay
   * distinct — never silently coerced to an empty-list render. */
  initialErrorKey?: StudentAbsencesErrorKey;

  /**
   * Static, teacher's own class only; passed once, NEVER refetched (FR-010 —
   * no live search). Empty array for `principal` (never renders a record
   * form, so never needs it).
   */
  roster: StudentRosterEntry[];
  /** Principal's class-filter dropdown — small static list, not paginated.
   * Absent/unused for `teacher` (no class filter rendered for that role). */
  classOptions?: StudentAbsencesClassOption[];

  // Server Action refs ('use server', factory-per-request DI behind each).
  listAbsencesAction: (params: {
    classId?: string;
    from?: string;
    to?: string;
  }) => Promise<StudentAbsencesActionResult<StudentAbsenceEntity[]>>;
  recordAbsenceAction: (
    input: RecordStudentAbsenceInput,
  ) => Promise<StudentAbsencesActionResult<StudentAbsenceEntity>>;
  editAbsenceAction: (
    input: EditStudentAbsenceInput,
  ) => Promise<StudentAbsencesActionResult<StudentAbsenceEntity>>;
  flagAbsenceAction: (params: {
    classId: string;
    studentMemberId: string;
    date: string;
  }) => Promise<StudentAbsencesActionResult<StudentAbsenceEntity>>;
}
```

### 4.2 New sub-component prop interfaces (feature-local)

```ts
// sa-stats-row.tsx
export interface SAStatsRowProps {
  total: number;
  unexcused: number;
  flagged: number;
}

// sa-date-field.tsx — mirrors date-range-fields.tsx's shape (own useId,
// aria-invalid/aria-describedby wiring). Used standalone (filter bar ×2) and
// inside SAAbsenceFormDialog's mode="record" branch (×1, with `max`).
export interface SADateFieldProps {
  label: string; // already-i18n'd
  value: string; // bare YYYY-MM-DD, "" = unset
  onChange: (value: string) => void;
  max?: string; // "today" bound (AC-003.1)
  invalid?: boolean;
  errorMessage?: string; // already-i18n'd, presence also drives aria-invalid
}

// sa-static-field.tsx — STATIC TEXT ONLY. No value/onChange handler shape at
// all in this type — see §1 decision 1. Never renders <input>/<select>/any
// role="textbox"|"combobox"|"listbox" element.
export interface SAStaticFieldProps {
  label: string; // already-i18n'd
  value: string; // already-resolved display string (date, class name, or student full name)
}

// sa-excused-toggle.tsx — boolean-specific segmented control, built on
// ui/radio-group variant="segmented" (mirrors sd-segmented-field.tsx's
// underlying primitive usage, specialized for a 2-value boolean instead of a
// generic string union).
export interface SAExcusedToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
  labelExcused: string; // already-i18n'd "Có phép"
  labelUnexcused: string; // already-i18n'd "Không phép"
  disabled?: boolean;
}

// sa-excused-badge.tsx / sa-flagged-indicator.tsx — thin StatusBadge
// wrappers, call useTranslations themselves for the label (leaf 'use client'
// components, mirrors SDStateBadge's local-resolution pattern — no `t` prop).
export interface SAExcusedBadgeProps {
  excused: boolean;
}
// SAFlaggedIndicator takes NO props — callers gate whether to mount it at all
// via `absence.state === "FLAGGED_UNEXCUSED"` (mirrors SDSelfApprovedNote's
// "no suppression prop" contract, AC-007.2's "genuinely absent" requirement).
export type SAFlaggedIndicatorProps = Record<string, never>;

// sa-absence-row.tsx
export interface SAAbsenceRowProps {
  absence: StudentAbsenceEntity;
  student: StudentRosterEntry; // resolved by the container from `roster`, not looked up here
  /** Row-action visibility is caller-computed (role + ownership + state),
   * never re-derived inside the row — mirrors SDViolationRowProps'
   * "explicit, not re-derived" precedent. */
  canEdit: boolean; // teacher, own class, always true for own rows (no state gate — FR-004 has no state restriction)
  canFlag: boolean; // principal AND absence.state === "RECORDED"
  onEdit: () => void;
  onFlag: () => void;
}

// sa-absence-form-dialog.tsx — discriminated union on `mode` (§1 decision 2).
// Shared base:
interface SAAbsenceFormDialogBaseProps {
  open: boolean;
  isSubmitting: boolean;
  excused: boolean;
  onExcusedChange: (value: boolean) => void;
  reason: string;
  onReasonChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export interface SARecordFormDialogProps extends SAAbsenceFormDialogBaseProps {
  mode: "record";
  roster: StudentRosterEntry[]; // teacher's own class only (FR-010)
  studentMemberId: string;
  onStudentChange: (value: string) => void;
  date: string;
  onDateChange: (value: string) => void;
  today: string; // injected "today" bound (never real Date.now() at this layer either — VM-seeded)
  submitError?: {
    kind:
      | "future-date" // AC-003.3/.4 — inline date-field error
      | "duplicate-date" // AC-003.5/.6 — inline banner
      | "invalid-input" // AC-003.7 — per-field
      | "network-error"; // AC-003.8 — dialog stays open, fields preserved
    message: string;
    fieldErrors?: { field: "reason"; message: string }[];
  };
}

export interface SAEditFormDialogProps extends SAAbsenceFormDialogBaseProps {
  mode: "edit";
  // Natural key — STATIC DISPLAY TEXT ONLY. No onChange for any of these
  // three anywhere in this type (§1 decision 1) — this is what makes
  // AC-004.3 a compile-time guarantee, not a runtime check.
  dateDisplay: string;
  classDisplay: string;
  studentDisplay: string;
  submitError?: {
    kind: "invalid-input" | "not-found" | "network-error"; // AC-004.4/.5/.6
    message: string;
    fieldErrors?: { field: "reason"; message: string }[];
  };
}

export type SAAbsenceFormDialogProps =
  | SARecordFormDialogProps
  | SAEditFormDialogProps;

// sa-flag-confirm-dialog.tsx — thin wrapper over the shared PublishConfirmDialog.
export interface SAFlagConfirmDialogProps {
  open: boolean;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Forwarded straight to PublishConfirmDialog.labels — studentAbsences.flagConfirm.*. */
  labels: {
    title: string;
    body: string;
    confirm: string;
    publishing: string;
    cancel: string;
  };
  /** AC-005.6 forbidden / AC-005.8 invalid-state (re-flag backstop) surfaced
   * inline — NOT modeled by PublishConfirmDialog itself (it has no error
   * slot), so this wrapper renders it as a small inline banner ABOVE the
   * forwarded PublishConfirmDialog's body when set. Dialog stays open either
   * way (spec §5). */
  submitError?: { message: string };
}

// sa-list-skeleton.tsx — no props, fixed rows=4 (NFR-007).
// sa-list-error.tsx
export interface SAListErrorProps {
  message: string; // already-i18n'd (container maps the failure key via sa-error-message.ts)
  onRetry: () => void;
}
```

`sa-error-message.ts` note: pure function
`studentAbsenceErrorMessage(errorKey, t)` (or equivalent), the single place
that applies the `"invalid-date"` → `studentAbsences.errors.invalid-date-future`
override (spec.md §6/§2) — every other `errorKey` maps 1:1 to
`studentAbsences.errors.<errorKey>`. Mirrors `sd-error-message.ts`'s shape.

---

## 5. State Ownership (contract level)

Full query-key/invalidation mechanics are `fe-state-engineer`'s call (plan.md
§4/§7 already flags this explicitly) — this table only maps which
layer/component owns each piece of state so the two docs don't drift.

| State | Owner | Controlled prop or internal? |
| --- | --- | --- |
| Absences list (`useQuery`, ONE family keyed by `{classId?, from?, to?}`) | `StudentAbsencesScreen` | Internal — only one query instance exists in this whole tree (simpler than `staff-discipline`'s 2-per-tab split, §2) |
| Date-range filter draft (`from`/`to`) | `StudentAbsencesScreen` | Internal; `SADateField` ×2 fully controlled |
| Principal's class-filter draft | `StudentAbsencesScreen` | Internal; `ui/select` fully controlled — server re-query on change (INT-002's `classId` query param) |
| Record-dialog open/closed + form field values (`studentMemberId`/`date`/`excused`/`reason`) | `StudentAbsencesScreen` owns `open`; field values live in the screen's own `useState` (mirrors `PLCreateDialog`/`CreateViolationDialog`'s "no react-hook-form at this scale" precedent), reset on open/close | Split — `SAAbsenceFormDialog` (mode="record") is fully controlled, owns no internal field state itself |
| Edit-dialog open/closed + target (`classId`/`studentMemberId`/`date` — read-only identity) + editable field values (`excused`/`reason`) | `StudentAbsencesScreen` owns `open`/`target`; editable field values seeded from the target row when opened | Split, same pattern as record dialog |
| **Client-side duplicate-date pre-check** (`isDuplicateAbsence`, plan.md §2) | `StudentAbsencesScreen`, reading the already-loaded list query's cached data before calling `recordAbsenceAction` | Not a separate fetch — pure function over already-fetched state |
| Flag-confirm dialog open/closed + target (`classId`/`studentMemberId`/`date`) | `StudentAbsencesScreen` owns `open`/target | `SAFlagConfirmDialog` fully controlled, owns no internal state |
| Mutations (`recordAbsence`/`editAbsence`/`flagAbsence`) | `StudentAbsencesScreen`'s own mutation hooks | `flagAbsence` explicitly has **NO optimistic update** (AC-005.3/NFR-008 pt.3 — the hardest state-design constraint in this story): the row's `state`/badges must not change until the mutation's `onSuccess` updates the cache from the server response. `isSubmitting`/`isLoading` props gate button `disabled`+`aria-busy` everywhere, never an optimistic list patch. |
| `roster`/`classOptions` (static) | Server-seeded once via VM, never refetched | Prop only, read-only downstream — no component ever calls a "search roster" action (FR-010/FR-012 exclusion enforced structurally: no such action exists in the VM) |
| Toast (success confirmations) | Whichever toast convention the codebase already uses (sonner, per sibling precedent) | Not owned by any component in this tree — fire-and-forget from the screen's mutation success callbacks |

**Hand-off note to `fe-state-engineer`** (in addition to plan.md §4/§7's own
call-outs):
1. Confirm the **single `studentAbsenceKeys.list({classId?, from?, to?})`
   family** (no tab split needed, unlike `staff-discipline`) is sufficient —
   this doc's component tree assumes exactly that (`StudentAbsencesScreen` is
   both the orchestrator AND the only container).
2. The no-optimistic-update mechanics for `flagAbsence` (AC-005.3) is this
   story's single hardest state-design constraint — please design it
   explicitly (e.g. no `onMutate` handler on that mutation at all, cache only
   updated in `onSuccess`) and confirm back to this doc's assumption that
   `SAFlagConfirmDialog`/`SAAbsenceRow` receive zero optimistic-state props.
3. `classId` is required-vs-optional depending on role in the query key
   (teacher: always the homeroom `classId`; principal: optional, from the
   class-filter dropdown, `undefined` = schoolwide) — confirm the key shape
   handles both without producing two different cache-key families for what
   is conceptually one query.

---

## 6. Composition & Variant Strategy

- **No compound-component/slot pattern needed.** Every feature-local
  component takes flat, explicit props (or, for `SAAbsenceFormDialogProps`,
  an explicit discriminated union — see §1 decision 2) — matches
  `staff-discipline`/`invitations`/`parent-links` precedent. No `asChild`/
  `Slot` usage anywhere in this story.
- **Discriminated union, not `cva` variants, for the one genuine "two shapes
  of the same thing" case** (`SAAbsenceFormDialogProps`'s `mode`). `cva` is
  for styling variants of a single element; this is a *structural* prop-shape
  difference (which fields exist at all), which TypeScript's discriminated
  unions model directly and enforce at compile time — the right tool here,
  not `cva`.
- **`cva` variants used elsewhere**: none needed this story. `SAExcusedBadge`/
  `SAFlaggedIndicator` each resolve a fixed lookup internally and hand off to
  `StatusBadge`'s existing `tone` prop — no new variant axis on the shared
  primitive (all 3 needed tones — `success`/`warning`/`error` — already
  exist).
- **Design-system pattern reuse**: `StatusBadge` (icon+text badge, reused
  as-is), `EmptyState` (reused as-is), `StatCard` (reused as-is inside
  `SAStatsRow`), `PublishConfirmDialog` (reused as-is for the one-way flag
  confirm — §0). `Dialog`, `Select`, `Textarea`, `RadioGroup` (`variant=
  "segmented"`) used directly, no wrappers beyond the boolean-specialized
  `SAExcusedToggle`.
- **Extension points (no over-abstraction until 3+ instances)**:
  `SAListSkeleton`/`SAListError` stay feature-local for THIS story but are
  now flagged (§0) as an overdue promotion candidate at 5 instances — a
  decision for `fe-lead`, not executed here. `SADateField`/`SAStaticField`/
  `SAExcusedToggle`/`SAAbsenceFormDialog` stay feature-local (this feature's
  own screen is the only consumer today) — a 2nd FEATURE needing the exact
  same shape would trigger promotion to `components/shared/` per
  `component-organization.md`, not before.

---

## 7. Accessibility contract

| Interactive node | Role/label | Keyboard |
| --- | --- | --- |
| `SADateField` (filter bar ×2, record dialog ×1) | `<label htmlFor>` associated native `<input type="date">`, `aria-invalid`+`aria-describedby` when `invalid` (mirrors `date-range-fields.tsx`) | Native date-input keyboard support; `max` attribute constrains but does not replace the client re-validate-on-submit guard (AC-003.3) |
| `SAExcusedToggle` | Radix `role="radiogroup"`/`role="radio"` (inherited from `ui/radio-group`), programmatic name via `aria-labelledby` (a `<label htmlFor>` cannot point at a radiogroup, same as `SDSegmentedField`) | Arrow-key navigation between the 2 segments, Tab in/out, Enter/Space selects (Radix default); ≥44×44px touch target |
| Principal's class-filter `Select` | shadcn `Select` → `SelectTrigger aria-label` | Native Radix `Select` keyboard nav |
| "Ghi nhận nghỉ học" trigger (header + empty-state CTA, teacher only) | Native `<button>` via `Button`, absent from the DOM for `principal` (not merely disabled — AC-006.5-equivalent for this story) | Tab-reachable, Enter/Space activates |
| `SAAbsenceRow`'s edit action (teacher, own-class rows) | Native `<button>` via `Button`, `aria-label` includes the student name (icon-only or ambiguous label otherwise) | Tab-reachable, Enter/Space opens `SAAbsenceFormDialog` mode="edit" |
| `SAAbsenceRow`'s "Gắn cờ" action (principal, `state==="RECORDED"` only) | Native `<button>` via `Button`, rendered ONLY on eligible rows — genuinely absent on `FLAGGED_UNEXCUSED` rows, not disabled (AC-005.1) | Tab-reachable, Enter/Space opens `SAFlagConfirmDialog` |
| `SAAbsenceFormDialog` (both modes) | shadcn `Dialog` → `role="dialog"`, focus trap, `aria-labelledby`/`aria-describedby` (Radix-inherited); submit button `aria-busy` while `isSubmitting` | Escape closes (guarded while submitting — dialog stays open per spec §5 during in-flight requests); Tab cycles through fields in visual order, ending at cancel/submit |
| `SAAbsenceFormDialog`'s inline `submitError` banner (future-date field error / duplicate-date banner / per-field invalid-input) | `role="alert"` on the banner container; per-field errors use `aria-invalid`+`aria-describedby` on the specific field (`SADateField`'s own `invalid`/`errorMessage` props, or `ui/textarea`) | n/a (announced on appearance) |
| `SAAbsenceFormDialog` mode="edit"'s `SAStaticField` ×3 | Plain text (`<span>`/`<div>`), NOT focusable, NOT any ARIA input role — genuinely non-interactive markup, the concrete answer to AC-004.3 | Not focusable — there is nothing to operate |
| `SAExcusedBadge`/`SAFlaggedIndicator` | Icon `aria-hidden="true"`, label text always rendered alongside (NFR-001 — never color-only); `SAFlaggedIndicator` visually AND semantically distinct from `SAExcusedBadge` (different tone/icon), never merged into one pill | n/a (not focusable) |
| `SAFlagConfirmDialog` (→ `PublishConfirmDialog`) | Inherits `AlertDialog`'s `role="alertdialog"`, focus trap, focus-restore-to-trigger (Radix-inherited, same contract `DestructiveConfirmDialog`/`PublishConfirmDialog` already prove) | Escape/overlay → `onCancel` (no request fires) while not loading; confirm/cancel both native `<button>`s, `aria-busy` on confirm while `isLoading` |
| `SAListError` retry button | Native `<button>` inside a `role="alert"` container (mirrors `sd-list-error.tsx`) | Tab-reachable, Enter/Space activates |
| `EmptyState` (shared) | Inherits its own `role="status"` contract unchanged | CTA button (teacher variant only) Tab-reachable, Enter/Space activates |

All badges pair icon+text per NFR-001 — none render color-only. The
`SAStaticField`/edit-mode-immutability contract and the
`SAFlagConfirmDialog`/no-optimistic-update contract are this story's two
highest-security-relevance a11y/behavior surfaces (NFR-008/NFR-009,
"High-Risk-Grade Security Enforcement" section of `spec.md`) —
`fe-accessibility-auditor` and the Phase 8 security pass (plan.md §7) should
both independently verify these two before the design-review gate.

---

## Cross-references

- `plan.md` §4 (component sketch this doc finalizes), §7 (explicit ask + the
  `SADateField` open question this doc resolves in §1).
- `spec.md` §"High-Risk-Grade Security Enforcement" — `SAStaticField`'s
  zero-onChange/structural-immutability contract (§1 decision 1, §4.2, §7) is
  this doc's concrete structural answer to AC-004.3; `SAFlagConfirmDialog`'s
  no-optimistic-update contract (§4.2, §5, §7) is the concrete structural
  answer to AC-005.3/NFR-008 pt.3.
- `design-spec.jsonc` `screens.studentAbsences` (line ~10403) — badge tone
  mappings, layout padding/maxWidth, and the `SAFlagConfirmDialog`↔
  `PublishConfirmDialog` pattern note (`adminPrincipalView.flagAction.
  confirmDialog.pattern`) all sourced verbatim.
- `design_src/edu/student-absences.jsx` — read in full before writing this
  doc; component names here match the mockup's `SA*` naming 1:1 **except**
  the addition of `SAStaticField`/`SAStatsRow`/`SAExcusedToggle`/
  `SAAbsenceFormDialog`/`SAListSkeleton`/`SAListError` (structural
  additions this doc introduces, none of which exist as named components in
  the mockup) and `SAFlagConfirmDialog` becoming a thin wrapper over the
  already-shared `PublishConfirmDialog` rather than a bespoke dialog.
- Reused as-is: `src/components/shared/{status-badge,empty-state,stat-card,
  publish-confirm-dialog}/`.
- Sibling precedents read in full before writing this doc:
  `src/features/staff-discipline/presentation/staff-discipline-screen/*`
  (+ its own `component-architecture.md`, this doc's shape template),
  `src/features/audit-log/presentation/audit-log-screen/components/date-range-fields.tsx`.
