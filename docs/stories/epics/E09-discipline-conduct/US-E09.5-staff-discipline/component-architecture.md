# Component Architecture — US-E09.5 Staff Discipline (Violations + Conduct Notes)

Written by `fe-component-architect`. Finalizes `plan.md` §1/§4/§6 into concrete
file paths and prop/ViewModel contracts. No implementation code below —
contracts and structure only, per this role's mandate. Read in full before
writing: `plan.md`, `spec.md`, `story.md`, `design-spec.jsonc`
`screens.staffDiscipline` (line ~10217), `design_src/edu/staff-discipline.jsx`
(`StaffDisciplineScreen`/`SDViolationsTab`/`SDConductNotesTab`/`SDStateBadge`/
`SDSeverityBadge`/`SDRatingBadge`/`SDRejectPanel`/`SDSelfApprovedNote`), plus
the closest sibling precedents actually read in full:
`src/features/discipline/presentation/discipline-screen/discipline-screen.tsx`
(one-component-multi-role-route + `Tabs`/`TabsList`/`TabsTrigger` usage),
`src/features/staff-leave/presentation/staff-leave-screen/{staff-leave-screen.tsx,staff-leave-request-card.tsx}`
(approve/reject/reject-reason UX, inline reject panel, dialog-stays-open
pattern), `src/components/shared/{status-badge,empty-state}/*.tsx` (reused
as-is, see §0), and
`docs/stories/epics/E20-parent-student-links/US-E20.1-admin-parent-links/component-architecture.md`
(doc shape this one follows).

---

## 0. Reuse-vs-extend-vs-new decisions (grep/read-verified)

| Shared component | plan.md said | Grep/read finding | Decision |
| --- | --- | --- | --- |
| `components/shared/status-badge` (`StatusBadge`, `StatusTone`) | mockup shows 3 bespoke badge components (`SDStateBadge`/`SDSeverityBadge`/`SDRatingBadge`, raw `<Badge>` + `<Icon>`) | Read `status-badge.tsx` in full. `StatusTone` already covers every tone this screen needs: state (`muted`=DRAFT, `warning`=SUBMITTED, `success`=APPROVED, `error`=REJECTED), severity (`warning`=MINOR, `error`=MODERATE, `error-dark`=SEVERE — `error-dark` already exists per US-E21.1, exact match for "destructive"/`--edu-error-dark`), rating (`success`=SATISFACTORY, `warning`=NEEDS_IMPROVEMENT, `error`=UNSATISFACTORY). Icon+text pairing (NFR-001) is the caller's job — `StatusBadge.children` already accepts arbitrary `ReactNode`, same pattern `StaffLeaveRequestCard`'s `<StatusBadge><StatusIcon/>{label}</StatusBadge>` already uses. | **Reuse directly, zero changes to `status-badge.tsx`.** `SDStateBadge`/`SDSeverityBadge`/`SDRatingBadge` become 3 thin feature-local wrapper components, each resolving a fixed lookup `Record` (state/severity/rating → tone + `lucide-react` icon) and handing off to `StatusBadge` — mirrors `PLRelationBadge`/`PLConsentBadge` (US-E20.1) and `InvitationRoleBadge`/`InvitationStatusBadge` (US-E21.1) exactly. |
| `components/shared/empty-state` (`EmptyState`) | FR-011: principal sees CTA, teacher sees no-CTA, 2 variants × 2 tabs | Read `empty-state.tsx` in full — `icon`/`title`/`body`/`cta{label,icon,onClick,variant}`, `role="status"`, presentation-only (caller passes already-translated strings). Matches both variants exactly: principal (`cta` set, e.g. `{label:"Ghi nhận vi phạm"/"Đặt ghi chú", onClick: openDialog}`), teacher (`cta` omitted entirely — AC-001.5/AC-006.5 "no CTA", not a disabled CTA). | **Reuse directly**, no wrapper needed — each tab container computes the 2 variants' props inline and passes straight to `EmptyState` (no `SDEmpty` dispatcher component required, this is simpler than parent-links' 2-icon dispatch since both variants here share one icon). |
| Skeleton / error-state (no `EduSkeleton`/`EduEmpty`/`EduError` shared component exists — those are `design_src` mockup-only helper names, confirmed by grep of `src/components/`) | mockup names `EduSkeleton`/`EduError` as if they were real components | Grepped `src/components/` — no match. `discipline-screen.tsx` uses its own inline `TableRowSkeleton` + inline `role="alert"` error block; `staff-leave-screen.tsx` uses inline `Skeleton` rows + inline `AlertTriangle` error block. **No generic shared skeleton/error-state component exists repo-wide** (same false-cognate finding US-E21.1/US-E20.1 made for their own mockups' invented helper names). | **New, feature-local, shared BETWEEN this feature's 2 tabs** (not promoted to `components/shared/` — only this feature uses this exact row-list shape today): `sd-list-skeleton.tsx` (fixed `rows=4` per NFR-006/AC-001.1/AC-006.1) and `sd-list-error.tsx` (`role="alert"` + retry button, per AC-001.6/AC-006.7). This is now the **3rd–4th** instance of this exact bespoke-inline-skeleton/error pattern across the codebase (`discipline`, `staff-leave`, now `staff-discipline`) — **flagged (not executed) as a promotion candidate** to `fe-lead`, same flag `US-E20.1`'s doc already raised and left open; not re-decided unilaterally here. |
| **No new shadcn primitive needed** | n/a | `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` (already used identically by `discipline-screen.tsx` for its 3-tab shell — gives `role="tablist"`/`role="tab"`/`aria-selected` for free, satisfying AC-010.2 without a bespoke `SDTabButton`), `Dialog` (both dialogs — constructive, not destructive-confirm), `Textarea`, `Select` (staff/category/term pickers), `Button`, `Badge` (underlies `StatusBadge`), `Skeleton` primitive (underlies `sd-list-skeleton`) all already exist. | — | **Zero `bun ui:add` needed for this story.** |

**Deviation from the mockup flagged (not a token/ADR issue, just a component-shape correction):** `design_src/edu/staff-discipline.jsx`'s `SDTabButton` (raw `<button role="tab">`, line 390) is **not** built — the real codebase already has a `Tabs` primitive (Radix-backed) that supplies the exact same ARIA contract (`role="tablist"`/`"tab"`/`aria-selected`, keyboard arrow-nav) for free, and `discipline-screen.tsx` already proves this pattern in this exact repo for a near-identical 2+-tab shell. Building a hand-rolled `SDTabButton` would duplicate what `Tabs` already gives, violating `component-organization.md`'s "reuse before you build" rule.

No design-system token gap — confirms plan.md §7 point 8 (all 3 badge families reuse existing `StatusBadge` tones, no new token, no ADR).

---

## 1. Architecture Summary

- **Net-new feature scope**: `src/features/staff-discipline/presentation/staff-discipline-screen/` — one screen, flat files under the screen folder (no `components/` subfolder), matching `invitations`/`parent-links`/`class-management` precedent (US-E20.1/US-E21.1 doc convention).
- **New vs reused**: `StatusBadge` and `EmptyState` reused as-is (zero changes). 3 new thin feature-local badge wrappers (`SDStateBadge`, `SDSeverityBadge`, `SDRatingBadge`) + 2 new feature-local list-state components (`sd-list-skeleton.tsx`, `sd-list-error.tsx`, flagged as a promotion candidate, §0). No new shared component promoted — everything genuinely composed-but-single-screen stays feature-local per plan.md §6's explicit instruction.
- **Missing shadcn primitives**: none.
- **Repo-shape decision (plan.md §1, §7 open item 7)**: **CONFIRMED — one `IStaffDisciplineRepository`.** No override. The two sub-resources share an identical `ApprovalTransition` lifecycle, identical `selfApproved` derivation, identical roster resolution, and identical permanent-mock justification (roster-UUID gap) — there is no independent variance a facade-over-two-repos would buy, and `i-discipline.repository.ts` already sets this exact "N sub-resources, 1 interface" norm within this epic. Confirmed **before** Phase 1 use-case signatures are finalized, per plan.md §7 point 7's ask.
- **Container/hook boundary**: `StaffDisciplineScreen` itself is a **thin orchestrator** — it owns only the active-tab client state (FR-008, no navigation) and passes role-scoped VM slices down. `SDViolationsTab` and `SDConductNotesTab` are each their **own container** (own `useQuery`, own filter-draft state, own dialog-open state) — this is the deliberate split that satisfies AC-010.3 ("no carry-over error banner" when switching tabs): two independent query instances, not one combined query gated by a tab switch. `fe-state-engineer` owns the exact query-key/hook mechanics; this doc only names the boundary (§4).
- **Key decisions**:
  1. Reuse `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` directly — no `SDTabButton` (§0 deviation).
  2. `SDRejectPanel` is genuinely shared by both tabs (identical shape, per INT-009's grouping note) — lives once in the screen folder, imported by both tab containers. Not duplicated per-tab.
  3. `SDStateBadge` is shared by both tabs (state enum identical); `SDSeverityBadge` (violations-only) and `SDRatingBadge` (conduct-notes-only) are tab-specific — matches plan.md §4.
  4. `SDSelfApprovedNote` takes **no boolean prop to suppress it** — it is only ever conditionally *rendered* by its caller via the single expression `record.approverMemberId === record.authorMemberId` (i.e. `entity.selfApproved`, computed once at the mapper boundary per plan.md §2) — the component itself has zero internal condition, so there is no code path inside it that can hide the note once mounted (NFR-008/ADR-0073 hard requirement, see §6 of plan.md's Phase 8).
  5. `SetConductNoteDialog`'s AC-007.4 "must not even open" is enforced at the **row's trigger-render boundary**, not inside the dialog (§3.2, §6 below) — the dialog component's own prop type structurally has no "render me but locked" variant.
  6. Constructive dialogs only (`CreateViolationDialog`, `SetConductNoteDialog` both use shadcn `Dialog`, not `AlertDialog`) — neither creates/overwrites is a destructive action requiring `DestructiveConfirmDialog`.
  7. **VM refinement (deviation from plan.md §4, flagged below)**: plan.md §4 listed one singular `initialErrorKey?: StaffDisciplineFailure["type"]`. Since the RSC page fetches **both** lists independently (plan.md §5) and AC-010.3 requires the two tabs to never share error state — including on the very first paint — the VM needs **two** independent initial error keys, not one (§3.1).

---

## 2. Component Tree

```
src/features/staff-discipline/presentation/staff-discipline-screen/

StaffDisciplineScreen                                'use client', THIN ORCHESTRATOR
│  (owns: active tab — client-only, FR-008/AC-010.1; nothing else — no query,
│   no cross-tab state; role-conditional copy/visibility only)
├── Tabs / TabsList / TabsTrigger (shadcn, REUSED as-is — §0 deviation, no SDTabButton)
│     "Vi phạm" (violations) | "Ghi chú hạnh kiểm" (conductNotes)
├── TabsContent value="violations"
│   └── sd-violations-tab.tsx
│       └── SDViolationsTab                            'use client', CONTAINER
│           (owns: violations useQuery, state/staff/severity filter DRAFT —
│            all client-side narrowing per spec §1 scope; create-dialog
│            open/closed; reject-panel target recordId + reason draft)
│           ├── sd-violation-filter-bar.tsx
│           │   └── SDViolationFilterBar                presentational, CONTROLLED
│           │       (state chips + severity chips + "Ghi nhận vi phạm" button,
│           │        principal-only; renders nothing for teacher)
│           ├── sd-list-skeleton.tsx → SDListSkeleton    presentational, NEW,
│           │       feature-local, no props, fixed rows=4 (§0 — flagged
│           │       promotion candidate, not executed)
│           ├── EmptyState (shared, REUSED as-is) — 2 variants computed inline
│           │       by SDViolationsTab (principal: cta set; teacher: cta omitted)
│           ├── sd-list-error.tsx → SDListError          presentational, NEW,
│           │       feature-local (§0), role="alert" + retry button
│           ├── sd-violation-row.tsx
│           │   └── SDViolationRow                       presentational
│           │       ├── sd-severity-badge.tsx → SDSeverityBadge   presentational,
│           │       │     thin wrapper over shared StatusBadge
│           │       ├── sd-state-badge.tsx → SDStateBadge         presentational,
│           │       │     thin wrapper over shared StatusBadge (SHARED w/ conduct tab)
│           │       ├── sd-self-approved-note.tsx → SDSelfApprovedNote
│           │       │     presentational, NO suppression prop (SHARED, §1 decision 4)
│           │       └── sd-reject-panel.tsx → SDRejectPanel       presentational,
│           │             CONTROLLED (SHARED w/ conduct tab, §1 decision 2)
│           └── create-violation-dialog.tsx
│               └── CreateViolationDialog               'use client', CONTROLLED
│                   (shadcn Dialog, constructive; staff Select from
│                    `staffRoster` prop — static, FR-009 — + category Select +
│                    severity segmented + occurredAt date + description textarea)
└── TabsContent value="conductNotes"
    └── sd-conduct-notes-tab.tsx
        └── SDConductNotesTab                            'use client', CONTAINER
            (owns: conduct-notes useQuery keyed by termId only — staff filter
             is client-side narrowing over the fetched superset per spec §1
             scope; term selector state, principal-only; set-dialog open/
             closed + target; reject-panel target key + reason draft)
            ├── sd-conduct-term-bar.tsx
            │   └── SDConductTermBar                     presentational, CONTROLLED
            │       (term Select + staff filter, principal-only; teacher sees
            │        neither — AC-006.3/AC-006.6, scoped to active term)
            ├── SDListSkeleton (SHARED w/ violations tab)
            ├── EmptyState (shared, REUSED as-is) — 2 variants, same rule as above
            ├── SDListError (SHARED w/ violations tab)
            ├── sd-conduct-note-row.tsx
            │   └── SDConductNoteRow                     presentational
            │       ├── sd-rating-badge.tsx → SDRatingBadge     presentational,
            │       │     thin wrapper over shared StatusBadge
            │       ├── SDStateBadge (SHARED w/ violations tab)
            │       ├── (lock indicator — inline, rendered when state===APPROVED;
            │       │     this is the trigger-gate itself, §1 decision 5 / §6)
            │       ├── SDSelfApprovedNote (SHARED)
            │       └── SDRejectPanel (SHARED)
            └── set-conduct-note-dialog.tsx
                └── SetConductNoteDialog                 'use client', CONTROLLED
                    (shadcn Dialog, constructive; rating segmented + note
                     textarea maxLength 5000; NO prop shape for an
                     "approved/locked" render variant — §1 decision 5)
```

File list (all under `src/features/staff-discipline/presentation/staff-discipline-screen/`):

```
staff-discipline-screen.tsx                (orchestrator)
staff-discipline-screen.i-vm.ts
staff-discipline-screen.stories.tsx
sd-violations-tab.tsx
sd-violation-filter-bar.tsx
sd-violation-row.tsx
sd-severity-badge.tsx
create-violation-dialog.tsx
sd-conduct-notes-tab.tsx
sd-conduct-term-bar.tsx
sd-conduct-note-row.tsx
sd-rating-badge.tsx
set-conduct-note-dialog.tsx
sd-state-badge.tsx           (shared by both tabs)
sd-self-approved-note.tsx    (shared by both tabs)
sd-reject-panel.tsx          (shared by both tabs)
sd-list-skeleton.tsx         (shared by both tabs)
sd-list-error.tsx            (shared by both tabs)
sd-categories.ts             (SD_CATEGORIES-equivalent static picklist, presentation-owned — see §3.2 note)
```

No new `components/shared/` or `components/ui/` folders this story (§0).

---

## 3. ViewModel + Prop Interfaces

Types reference `domain/entities` (this feature's own, plan.md Phase 1).
Failure-type import from `domain/failures` for the stable `errorKey` union
follows the already-established repo precedent
(`StaffLeaveScreenVM`/`ParentLinksScreenProps` both import their feature's
`*Failure["type"]` this way) — presentation only imports the **type**, never
a class/value from `domain/failures` or any `infrastructure/`/`bootstrap/di/`.

### 3.1 `staff-discipline-screen.i-vm.ts`

```ts
import type { StaffViolationEntity, CreateStaffViolationInput, RejectStaffViolationInput } from "../../domain/entities/staff-violation.entity";
import type { StaffConductNoteEntity, SetStaffConductNoteInput } from "../../domain/entities/staff-conduct-note.entity";
import type { StaffRosterEntry } from "../../domain/entities/staff-roster.entity";
import type { StaffDisciplineFailure } from "../../domain/failures/staff-discipline.failure";

export type StaffDisciplineRole = "principal" | "teacher";
export type StaffDisciplineErrorKey = StaffDisciplineFailure["type"];

export type StaffDisciplineActionResult<T = undefined> =
  | { ok: true; data: T }
  | {
      ok: false;
      errorKey: StaffDisciplineErrorKey;
      fields?: { field: string; message: string }[];
    };

/**
 * Screen-level ViewModel — the server↔client contract. RSC `page.tsx` seeds
 * BOTH lists from their own independent first-fetch (plan.md §5) — hence TWO
 * initial error keys, not one (deviation from plan.md §4's singular
 * `initialErrorKey`, justified in component-architecture.md §1 decision 7:
 * AC-010.3 forbids the two tabs from sharing error state even on first paint).
 * Client re-fetches on filter/term change via the same action refs
 * (fe-state-engineer's query-key doc owns the exact `useQuery` wiring).
 */
export interface StaffDisciplineScreenVM {
  viewerRole: StaffDisciplineRole;
  /** Only set when viewerRole === "teacher" — carried for UI copy/empty-state
   * branching; the server has ALREADY scoped both lists to this id
   * regardless (NFR-008 pt.3), this is defensive/display-only, never used to
   * re-filter client-side. */
  viewerStaffMemberId?: string;

  initialViolations: StaffViolationEntity[];
  /** Set only when the RSC's own violations fetch failed. Never silently
   * coerced to an empty-list render — error vs empty stays distinct. */
  initialViolationsErrorKey?: StaffDisciplineErrorKey;

  initialConductNotes: StaffConductNoteEntity[];
  /** Set only when the RSC's own conduct-notes fetch failed. Independent of
   * `initialViolationsErrorKey` (AC-010.3). */
  initialConductNotesErrorKey?: StaffDisciplineErrorKey;

  /** Static, passed once, NEVER refetched (AC-002.2 — same list every open,
   * zero network calls for this field). */
  staffRoster: StaffRosterEntry[];

  // Violations — Server Action refs ('use server', factory-per-request DI
  // behind each, plan.md §3 Phase 3/§5).
  listViolationsAction: (params: {
    staffMemberId?: string;
  }) => Promise<StaffDisciplineActionResult<StaffViolationEntity[]>>;
  createViolationAction: (
    input: CreateStaffViolationInput,
  ) => Promise<StaffDisciplineActionResult<StaffViolationEntity>>;
  submitViolationAction: (
    recordId: string,
  ) => Promise<StaffDisciplineActionResult<StaffViolationEntity>>;
  approveViolationAction: (
    recordId: string,
  ) => Promise<StaffDisciplineActionResult<StaffViolationEntity>>;
  rejectViolationAction: (
    input: RejectStaffViolationInput,
  ) => Promise<StaffDisciplineActionResult<StaffViolationEntity>>;

  // Conduct notes — Server Action refs.
  listConductNotesAction: (params: {
    staffMemberId?: string;
    termId?: string;
  }) => Promise<StaffDisciplineActionResult<StaffConductNoteEntity[]>>;
  setConductNoteAction: (
    input: SetStaffConductNoteInput,
  ) => Promise<StaffDisciplineActionResult<StaffConductNoteEntity>>;
  submitConductNoteAction: (
    staffMemberId: string,
    termId: string,
  ) => Promise<StaffDisciplineActionResult<StaffConductNoteEntity>>;
  approveConductNoteAction: (
    staffMemberId: string,
    termId: string,
  ) => Promise<StaffDisciplineActionResult<StaffConductNoteEntity>>;
  rejectConductNoteAction: (
    staffMemberId: string,
    termId: string,
    rejectionReason: string,
  ) => Promise<StaffDisciplineActionResult<StaffConductNoteEntity>>;
}
```

### 3.2 New sub-component prop interfaces (feature-local)

```ts
// sd-violation-filter-bar.tsx — client-side narrowing only (spec §1 scope);
// principal-only, renders null for teacher (container decides, not this
// component — kept dumb/controlled).
export interface SDViolationFilterBarProps {
  stateFilter: StaffViolationEntity["state"] | "all";
  severityFilter: StaffViolationEntity["severity"] | "all";
  onStateFilterChange: (v: StaffViolationEntity["state"] | "all") => void;
  onSeverityFilterChange: (v: StaffViolationEntity["severity"] | "all") => void;
  onOpenCreateDialog: () => void;
}

// sd-violation-row.tsx
export interface SDViolationRowProps {
  violation: StaffViolationEntity;
  staff: StaffRosterEntry; // resolved by the container from `staffRoster`, not looked up here
  categoryLabel: string; // already-i18n'd, resolved from sd-categories.ts by the container
  /** Row-action visibility is caller-computed (role + ownership + state),
   * never re-derived inside the row — mirrors ParentLinkRowVM.actions'
   * "explicit, not re-derived" precedent. */
  canSubmit: boolean;
  canDecide: boolean;
  isRejecting: boolean;
  isBusy: boolean;
  rejectReason: string;
  onSubmit: () => void;
  onApprove: () => void;
  onStartReject: () => void;
  onChangeRejectReason: (v: string) => void;
  onConfirmReject: () => void;
  onCancelReject: () => void;
}

// sd-severity-badge.tsx / sd-rating-badge.tsx / sd-state-badge.tsx — thin
// StatusBadge wrappers, each takes only its own enum value (no `t` prop —
// these call `useTranslations` themselves for the label, since they're
// leaf 'use client' components, matching StaffLeaveRequestCard's own
// STATUS_ICON/STATUS_TONE pattern of resolving locally).
export interface SDStateBadgeProps {
  state: StaffViolationEntity["state"]; // identical union on StaffConductNoteEntity
}
export interface SDSeverityBadgeProps {
  severity: StaffViolationEntity["severity"];
}
export interface SDRatingBadgeProps {
  rating: StaffConductNoteEntity["rating"];
}

// sd-self-approved-note.tsx — NO props to suppress rendering (§1 decision 4).
// Callers gate whether to mount it at all via `record.selfApproved`; once
// mounted it ALWAYS renders its full content. Zero props by design — this
// is the concrete, grep-able proof for Phase 8's "no conditional wraps its
// render call beyond the equality check itself" audit item.
export type SDSelfApprovedNoteProps = Record<string, never>;

// sd-reject-panel.tsx — SHARED shape across both tabs (INT-009 grouping
// note). MIN_REJECT_LENGTH = 10 is a LOCAL constant inside this component
// (NOT imported from domain/use-cases/is-rejection-reason-long-enough.ts —
// presentation may only import domain/entities types + failure-union types,
// not domain/use-cases values; this duplication is intentional and mirrors
// the exact precedent already in `StaffLeaveRequestCard`, which defines its
// own local `MIN_REJECT_LENGTH = 10` rather than importing anything from
// domain). The component computes `valid = reason.trim().length >= 10`
// internally from the controlled `reason` prop, same as the precedent.
export interface SDRejectPanelProps {
  reason: string;
  onChangeReason: (value: string) => void;
  isBusy: boolean;
  /** Server-side bypass of the client guard (AC-005.3/AC-008.6) — renders as
   * an inline textarea error with aria-invalid+aria-describedby, DISTINCT
   * from the internally computed client-guard hint. */
  serverErrorKey?: "missing-reject-reason";
  onConfirm: () => void;
  onCancel: () => void;
}

// sd-list-skeleton.tsx — no props, fixed rows=4 (NFR-006).
// sd-list-error.tsx
export interface SDListErrorProps {
  onRetry: () => void;
}

// create-violation-dialog.tsx
export interface CreateViolationDialogProps {
  open: boolean;
  staffRoster: StaffRosterEntry[];
  isSubmitting: boolean;
  /** Dialog stays open until settled (spec §5) — this is how a failed
   * submit is represented; there is no "close-on-error" path. */
  submitError?: {
    kind: "validation" | "invalid-severity" | "network-error";
    message: string;
    fieldErrors?: {
      field: "staffMemberId" | "category" | "severity" | "occurredAt" | "description";
      message: string;
    }[];
  };
  onSubmit: (input: CreateStaffViolationInput) => void;
  onClose: () => void;
}

// sd-conduct-term-bar.tsx
export interface SDConductTermBarProps {
  /** Absent entirely for teacher — container renders nothing, not a disabled
   * control (AC-006.3). */
  termOptions: { id: string; label: string }[];
  termId: string;
  staffFilter: string | "all";
  staffOptions: StaffRosterEntry[];
  onTermChange: (termId: string) => void; // re-queries INT-006 (server, AC-006.6)
  onStaffFilterChange: (staffMemberId: string | "all") => void; // client-side narrowing only
  onOpenSetDialog: () => void; // opens for a NEW note (no existing target)
}

// sd-conduct-note-row.tsx
export interface SDConductNoteRowProps {
  note: StaffConductNoteEntity;
  staff: StaffRosterEntry;
  canSubmit: boolean;
  canDecide: boolean;
  /**
   * STRUCTURAL enforcement of AC-007.4 ("form must not even open"): this is
   * the ONLY place the "open the set dialog" affordance is rendered for an
   * existing note. When `note.state === "APPROVED"`, the row renders a
   * static lock message (`staffDiscipline.errors.locked`, icon+text, NOT a
   * disabled button) instead of an "edit" trigger — there is no click
   * handler attached to anything when locked. `onOpenSetDialog` below is
   * therefore NEVER invoked for an APPROVED note; the dialog itself has no
   * "open me anyway, locked" prop variant (§3.2 SetConductNoteDialogProps
   * below has no such field), so there is no code path that opens it.
   */
  isLocked: boolean; // = note.state === "APPROVED", computed once by the container, passed down (not re-derived here, matching the row-action-explicit-not-re-derived precedent)
  isRejecting: boolean;
  isBusy: boolean;
  rejectReason: string;
  onSubmit: () => void;
  onApprove: () => void;
  onStartReject: () => void;
  onChangeRejectReason: (v: string) => void;
  onConfirmReject: () => void;
  onCancelReject: () => void;
  onOpenSetDialog: () => void; // gated by `!isLocked` at the call site (JSX), never called otherwise
}

// set-conduct-note-dialog.tsx
export interface SetConductNoteDialogProps {
  open: boolean;
  target: { staffMemberId: string; termId: string; staffName: string; department: string } | null;
  /**
   * Prefill when overwriting an existing DRAFT/REJECTED record; undefined
   * for a brand-new note. There is DELIBERATELY no field/variant here for
   * an APPROVED source record — an APPROVED note must never reach this
   * prop at all (enforced at the row level, see SDConductNoteRowProps
   * above). This is what makes "form must not even open" a type-level
   * guarantee, not just a runtime `if`.
   */
  existing?: { rating: StaffConductNoteEntity["rating"]; note: string };
  isSubmitting: boolean;
  /**
   * "locked" IS still representable here — this is the race/stale-request
   * server-backstop case (AC-007.5): the target was NOT approved when the
   * dialog opened, but became APPROVED before submit resolved. The dialog
   * stays open and renders this inline instead of closing (spec §5).
   * This is the one place `locked` legitimately appears post-open; it is
   * NOT how AC-007.4's pre-open block works (that's the row, above).
   */
  submitError?: {
    kind: "validation" | "invalid-rating" | "term-not-found" | "locked" | "network-error";
    message: string;
    fieldErrors?: { field: "rating" | "note"; message: string }[];
  };
  onSubmit: (input: SetStaffConductNoteInput) => void;
  onClose: () => void;
}
```

**`sd-categories.ts` note**: `SD_CATEGORIES` in the mockup is a static
authoring picklist for the free-text `category` wire field (spec §6 — not an
enum on the entity). It is UI/copy data, not domain data — lives as a
feature-local constant (`{ id: string; i18nKey: string }[]`) in the
presentation folder, labels resolved via `t()` at render time, mirroring how
`SD_TERMS`'s ids are domain-relevant (`termId` IS a wire field) but its
display labels are presentation-owned too.

---

## 4. State Ownership (contract level)

Full query-key/invalidation mechanics are `fe-state-engineer`'s call (plan.md
§4/§6 already flags this explicitly) — this table only maps which
layer/component owns each piece of state so the two docs don't drift.

| State | Owner | Controlled prop or internal? |
| --- | --- | --- |
| Active tab (violations / conductNotes) | `StaffDisciplineScreen` | Internal `useState`, client-only (FR-008) — never a prop into either tab container |
| Violations list (`useQuery`) | `SDViolationsTab` | Internal — independent instance from conduct notes' (AC-010.3) |
| Conduct-notes list (`useQuery`, keyed by `termId` only) | `SDConductNotesTab` | Internal — independent instance from violations' |
| state/severity filter draft (violations, client-side narrowing) | `SDViolationsTab` | Internal; `SDViolationFilterBar` receives current values + change callbacks (controlled, no internal draft buffer needed — these are instant-apply chip toggles, not debounced text) |
| staff filter draft (conduct notes, client-side narrowing) + term selection (server re-query) | `SDConductNotesTab` | Internal; `SDConductTermBar` fully controlled |
| Create-violation dialog open/closed + form field values | `SDViolationsTab` owns `open`; `CreateViolationDialog` owns its own field `useState` internally, reset on open/close (mirrors `PLCreateDialog`'s "no react-hook-form at this scale" decision) | Split, same pattern as US-E20.1 |
| Set-conduct-note dialog open/closed + target + prefill | `SDConductNotesTab` owns `open`/`target`/`existing` (computed once when `onOpenSetDialog` fires); `SetConductNoteDialog` owns its own field `useState` internally | Split |
| Reject-panel target id/key + reason draft (both tabs) | Each tab container owns its own `rejectingId`/`rejectReason` state (2 independent instances, one per tab, never shared) | `SDRejectPanel` itself is fully controlled — no internal state beyond the derived `valid` boolean |
| `staffRoster` (static) | Server-seeded once via VM, never refetched | Prop only, read-only downstream — no component ever calls a "search roster" action (FR-013 exclusion enforced structurally: no such action exists in the VM) |
| Mutations (8 total: create/submit/approve/reject × 2 sub-resources) | Each tab container's own mutation hooks | **NO optimistic UI** (spec §5 hard requirement) — dialogs/reject panels stay open/rendered until the action settles; `isSubmitting`/`isBusy` props gate button disabled + `aria-busy`, never an optimistic list update |
| Toast (success confirmations) | Whichever toast convention the codebase already uses (sonner, per `staff-leave`/other precedent) | Not owned by any component in this tree — fire-and-forget from each container's mutation success callback |

**Hand-off note to `fe-state-engineer`** (in addition to plan.md §4's own
call-outs):
1. Please confirm the **two-independent-`useQuery`-instances** design (one
   per tab container, never a single combined query gated by tab state) is
   how you'll satisfy AC-010.3 — this doc's component split assumes exactly
   that, and `StaffDisciplineScreen` itself is deliberately kept queryless so
   there is no shared query state to leak between tabs.
2. Confirm the split I made on filters: `termId` is the only conduct-notes
   filter that's part of the query key (server re-query, AC-006.6);
   `staffMemberId`/`state`/`severity` are pure client-side array filters over
   whatever the current query returned (spec §1 scope's explicit "client-side
   narrowing" language) — i.e. `SDViolationFilterBar`/`SDConductTermBar`'s
   staff-filter changes must NOT trigger a refetch, only a local re-filter of
   already-fetched data.
3. `initialViolationsErrorKey`/`initialConductNotesErrorKey` (§3.1, §1
   decision 7) need to seed each `useQuery`'s initial error state
   independently — flag if you'd rather model this as two separate
   `initialData`/`initialError` pairs instead of two flat VM fields.

---

## 5. Composition & Variant Strategy

- **No compound-component/slot pattern needed.** Every feature-local
  component takes flat, explicit props, matching `invitations`/`parent-links`/
  `staff-leave` precedent. No `asChild`/`Slot` usage anywhere in this story.
- **`cva` variants**: none needed. `SDStateBadge`/`SDSeverityBadge`/
  `SDRatingBadge` each resolve a fixed lookup `Record` internally and hand the
  result to `StatusBadge`'s existing `tone` prop — no new variant axis on the
  shared primitive (confirmed §0, all 8 needed tones — 4 state + 3 severity +
  3 rating, with `warning`/`success`/`error` reused across families —
  already exist).
- **Design-system pattern reuse**: `StatusBadge` (icon+text badge pattern,
  reused as-is), `EmptyState` (reused as-is), `Tabs` (tab-bar ARIA contract,
  reused as-is — §0 deviation from the mockup's `SDTabButton`). `Dialog`,
  `Select`, `Textarea`, `Button` used directly, no wrappers.
- **Extension points (no over-abstraction until 3+ instances)**: `SDListSkeleton`/
  `SDListError` stay feature-local — this is the 3rd–4th instance of a
  bespoke inline skeleton/error-state pattern in the repo (flagged to
  `fe-lead`, not executed, §0). `SDStateBadge`/`SDSelfApprovedNote`/
  `SDRejectPanel` stay feature-local (this feature's own 2 screens/tabs are
  the only consumers today) — a 2nd FEATURE needing this exact shape would
  trigger promotion to `components/shared/` per `component-organization.md`,
  not before.
- **Constructive-only dialog split confirmed**: neither `CreateViolationDialog`
  nor `SetConductNoteDialog` is destructive (both create/author records, not
  delete/revoke them) — plain shadcn `Dialog` for both, no
  `DestructiveConfirmDialog` involvement in this story.

---

## 6. Accessibility contract

| Interactive node | Role/label | Keyboard |
| --- | --- | --- |
| Tab bar (`Tabs`/`TabsList`/`TabsTrigger`) | Radix-inherited `role="tablist"`/`role="tab"`/`aria-selected` (AC-010.2) — zero manual ARIA needed | Left/Right arrow moves between tabs, Tab moves focus in/out of the tablist, Enter/Space activates (Radix default); ≥44px min-height per tab (design-spec `layout.tabBar`) |
| `SDViolationFilterBar` state/severity chips | Native `<button>` per chip, `aria-pressed` for the active chip | Tab-reachable, Enter/Space toggles |
| `SDConductTermBar` term `Select` | shadcn `Select` → `SelectTrigger aria-label` | Native Radix Select keyboard nav |
| "Ghi nhận vi phạm" / "Đặt ghi chú" trigger buttons | Native `<button>` via `Button`, only rendered for `principal` (absent from DOM for `teacher`, not merely disabled — AC-001.3/AC-006.3) | Tab-reachable, Enter/Space activates |
| `SDConductNoteRow`'s locked-state indicator (APPROVED) | Static text + icon, `aria-hidden` icon + always-visible label (`staffDiscipline.errors.locked`) — NOT a disabled button (a disabled control still announces as a button; this is deliberately non-interactive markup, matching "not merely disabled" language used elsewhere in spec.md) | Not focusable — there is nothing to operate |
| `SDStateBadge`/`SDSeverityBadge`/`SDRatingBadge` | Icon `aria-hidden="true"`, label text always rendered alongside (NFR-001 — never color-only) | n/a (not focusable) |
| `SDSelfApprovedNote` | Icon `aria-hidden="true"` + always-visible label text (ADR-0073 — never suppressed, §1 decision 4) | n/a (not focusable) |
| `SDRejectPanel` textarea | `<label htmlFor>` (visually hidden or visible per design-spec), `aria-invalid={!valid}`, `aria-describedby` pointing at the hint/error text (AC-005.1/.3, AC-008.6) — mirrors `StaffLeaveRequestCard`'s reject textarea exactly | Autofocus on open (mirrors mockup + `StaffLeaveRequestCard`'s focus-management `useEffect`); focus returns to the row's reject-trigger button on cancel/confirm (WCAG 2.4.3, same pattern as `StaffLeaveRequestCard`) |
| `SDRejectPanel` confirm button | Native `<button>`, `disabled` until `valid` (client 10-char guard) AND `!isBusy` | Tab-reachable, Enter/Space activates when enabled |
| `CreateViolationDialog` / `SetConductNoteDialog` | shadcn `Dialog` → `role="dialog"`, focus trap, `aria-labelledby`/`aria-describedby` (Radix-inherited); submit button `aria-busy` while `isSubmitting` | Escape closes (guarded while submitting — dialog stays open per spec §5 during in-flight requests); Tab cycles through fields in visual order, ending at cancel/submit |
| `CreateViolationDialog`/`SetConductNoteDialog` inline field errors | `role="alert"` on the top-level `submitError.message` banner; per-field errors use `aria-invalid`+`aria-describedby` on the specific `Select`/`Textarea` (AC-002.4/.5, AC-007.6/.7) | n/a (announced on appearance) |
| `SDListError` retry button | Native `<button>` inside a `role="alert"` container | Tab-reachable, Enter/Space activates |
| `EmptyState` (shared) | Inherits its own `role="status"` contract unchanged | CTA button (principal variant only) Tab-reachable, Enter/Space activates |

All badges pair icon+text per NFR-001 — none render color-only. The
`SDConductNoteRow` locked-indicator and `SDSelfApprovedNote`'s
never-suppressed contract are this story's two highest-security-relevance
a11y/behavior surfaces (NFR-008/NFR-009) — `fe-accessibility-auditor` and
the Phase 8 security pass (plan.md §7) should both independently verify
these two before the design-review gate.

---

## Cross-references

- `plan.md` §1 (repo-shape — confirmed, not overridden), §4 (component sketch
  this doc finalizes), §6 (explicit ask for this doc), §7 Phase 4 (gate before
  Phase 5), §7 point 7 (repo-shape confirmation ask).
- `spec.md` §"High-Risk-Grade Security Enforcement" — `SDSelfApprovedNote`'s
  zero-prop/never-suppressed contract (§1 decision 4, §3.2, §6) and
  `SDConductNoteRow`'s trigger-gate (§1 decision 5, §3.2, §6) are this doc's
  concrete structural answers to points 4 and 5 of that section.
- `design-spec.jsonc` `screens.staffDiscipline` (line ~10217) — badge tone
  mappings, tab-bar shape, layout padding/maxWidth all sourced verbatim.
- `design_src/edu/staff-discipline.jsx` — read in full before writing this
  doc; component names here match the mockup's `SD*` naming 1:1 **except**
  `SDTabButton` (not built, §0 deviation) and the addition of
  `SDListSkeleton`/`SDListError` (mockup's `EduSkeleton`/`EduError` names do
  not correspond to any real shared component, §0).
- Reused as-is: `src/components/shared/status-badge/`,
  `src/components/shared/empty-state/`.
- Sibling precedents read in full before writing this doc:
  `src/features/discipline/presentation/discipline-screen/discipline-screen.tsx`,
  `src/features/staff-leave/presentation/staff-leave-screen/{staff-leave-screen.tsx,staff-leave-request-card.tsx}`,
  `docs/stories/epics/E20-parent-student-links/US-E20.1-admin-parent-links/component-architecture.md`.
