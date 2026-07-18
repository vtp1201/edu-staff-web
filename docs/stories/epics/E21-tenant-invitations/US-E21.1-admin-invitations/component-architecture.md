# Component Architecture — US-E21.1 Admin Tenant Invitation Management

Written by `fe-component-architect`. Finalizes `plan.md` §2 Phase 3's component
sketch into concrete file paths, prop/ViewModel contracts, and an explicit
reuse-vs-extend-vs-new call for every shared component touched. No
implementation code below — contracts and structure only, per this role's
mandate. Read in full before writing: `plan.md`, `story.md`, `design-spec.jsonc`
`screens.invitations` (~line 4393), `design_src/edu/invitations.jsx`
(`InvitationsScreen`/`INV*` helpers), and the shared components this doc
extends (`status-badge`, `tag-chips-input`, `destructive-confirm-dialog`) plus
the sibling precedent `src/features/admin/staffing/presentation/**` and
`src/features/admin/class-management/presentation/**` (folder shape: flat
files directly under `presentation/<screen>/`, no `components/` subfolder —
that convention observed in this repo's admin/* siblings, followed here) and
`src/features/question-bank/presentation/**` (most recent
promotion/reuse-table precedent for this doc's shape).

---

## 0. Reuse-vs-extend-vs-new decisions (grep-verified, supersedes plan.md's prose)

| Shared component | plan.md said | Grep finding | Decision |
| --- | --- | --- | --- |
| `components/shared/status-badge` (`StatusBadge`, `StatusTone`) | "extend tone map if a status tone is missing, do NOT fork" | `TONE_CLASS` has `primary/success/warning/error/info/purple/teal/muted` — every tone this screen's **role** badges need (`teacher→primary, student→warning, parent→purple, manager→success, admin→error`, exact 1:1 match to design-spec `roleBadgeColors`) already exists. Status badges: `pending→warning`, `accepted→teal`, `expired→muted` also already exist. **`revoked→error-dark`** (design-spec: `var(--edu-error-dark)`) has **no matching tone** — `TONE_CLASS` tops out at `error` (`bg-edu-error/15 text-edu-error-text`, the *lighter* error hue), and `--edu-error-dark`/`--edu-error-dark-light` tokens already exist in `tokens.css` (used raw by `parentLinks`' `declined` consent badge) but are not wired into `StatusBadge`. | **Extend, don't fork.** Add one tone to the `StatusTone` union + `TONE_CLASS`: `"error-dark": "bg-edu-error-dark-light text-edu-error-dark"` (same dark-on-light-tint shape as the existing tones, tokens already exist — **no new token, no ADR**, this is the primitive-variant-edit path in `component-organization.md` §1). Flag to `fe-lead`/`fe-tech-lead-reviewer` as a one-line addition to `status-badge.tsx` + its `.stories.tsx` (add a `Revoked`/`error-dark` story) before `revoked`-status rows are built. |
| `components/shared/tag-chips-input` (`TagChipsInput`) | "extend for email-format validation styling if it doesn't already support valid/invalid chip variants, do NOT fork" | Current component validates only **length** (`maxTagLength`) and **duplicates** — it has no email-format concept, no per-tag valid/invalid visual state (every committed tag renders identically: `bg-primary/12 text-primary`), and no way to mark an *individual* chip invalid (design-spec `chipInvalid` needs a distinct red-tinted chip style + `alertTriangle` icon **per chip**, not a single aggregate error line). | **Cannot reuse as-is without a prop-contract extension — extend, don't fork** (2nd consumer already exists per US-E11.9's promotion, so this is exactly the "extend the shared component via prop/variant" path, not a 3rd fork). Add an **optional** `validate?: (tag: string) => boolean` prop (defaults to `undefined` = today's behavior, fully backward-compatible for `lesson-plan`/`question-bank`'s existing non-email use) that the component calls per committed tag to choose the chip's visual variant (`chipValid` vs `chipInvalid` classes) and whether to render the inline `alertTriangle` icon inside that specific chip. Duplicate/max-length behavior is unchanged. `InvitationsScreen`'s wrapper passes an RFC-5322-lite email regex as `validate`. This is a genuine "screen needs a difference → extend via prop" case per `component-organization.md`, not a fork — flag the exact diff to `fe-lead` before `fe-nextjs-engineer` touches the shared file (edits go in `components/shared/tag-chips-input/tag-chips-input.tsx` directly, `you-own-the-code`-style, plus new stories: `ValidChip`, `InvalidChipInline`, `PasteMultipleMixedValidity`). |
| `components/shared/destructive-confirm-dialog` (`DestructiveConfirmDialog`) | "reuse directly for revoke" | Confirmed existing, generic, controlled (`open/title/body/confirmLabel/isLoading/errorSlot/onConfirm/onCancel`) — no email-specific slot needed; `body` is caller-supplied plain string, so the "link becomes invalid immediately; new invite can be sent anytime" copy (design-spec `revokeConfirmDialog.body`) is just an i18n string passed straight through. `errorSlot` (added US-E19.2) already covers the not-found race (`tone:"transient"`, since revoke can be retried by re-opening — no, actually **not-found is not retryable from the same dialog** since the row disappears on refetch; see §3 note) and network error (`tone:"transient"`, retryable). | **Reuse directly, zero changes.** No wrapper component (unlike `question-bank`'s `QBStatusChip`-style thin wrappers, which exist only because those badges needed feature-specific tone *lookup tables*, not because reuse itself needed a wrapper). `InvitationsScreen` constructs `title`/`body`/`confirmLabel`/`errorSlot.message` from `invitations.revokeDialog.*`/`invitations.toast.*` i18n keys inline where the dialog is rendered. |
| `components/shared/empty-state` (`EmptyState`) | not named directly in plan.md (plan.md's "`EduEmpty(2 variants)`" is the **mockup's** own inline name, `INVEmpty` in `design_src/edu/invitations.jsx` — not a real repo component, same false-cognate `fe-component-architect` flagged for `question-bank`'s `EduSkeleton`/`EduError`) | `EmptyState` (icon/title/body/cta, `role="status"`, already-translated strings, no internal i18n) matches both empty variants (`noInvitations` CTA / `noMatch` clearFilters) exactly — CTA is optional and swaps label/icon per variant. | **Reuse directly**, two call sites (different `icon`/`title`/`body`/`cta`), no wrapper. |
| Skeleton / error state (design-spec's `EduSkeleton`/`EduError`) | plan.md's Phase-3 tree literally names `EduSkeleton(rows=5)` / `EduError(retry)` | **No generic `EduSkeleton`/`EduError` shared component exists anywhere in `components/shared/` or `components/ui/`** (grepped — only `stat-card-skeleton` exists, a different shape). Every sibling admin/teacher screen (`teacher-classes-screen.tsx`, `academic-record-screen.tsx`, etc.) implements its own tiny inline `ErrorState`/skeleton function scoped to that screen file — same false-cognate as `question-bank`'s finding. | **New, feature-local, NOT shared** (2nd/3rd/4th "generic error banner + retry" instance already exists across the codebase per the grep above — this is arguably a promotion trigger per `component-organization.md`, but re-litigating that cross-cutting promotion is out of this story's scope; flagging it, same as `question-bank`'s §1.1 flag, rather than silently forking *or* silently promoting unscoped). `InvitationsErrorState`/`InvitationsSkeleton` are small components in this feature's `presentation/invitations-screen/` folder, matching the inline-function convention every sibling screen uses. |

**Flag to `fe-lead` (2 items, both minimal, no ADR needed — tokens/pattern already exist):**
1. `StatusBadge`'s `StatusTone` union gains `"error-dark"` (one line + one story).
2. `TagChipsInput`'s prop surface gains one optional `validate?: (tag: string) => boolean` prop (backward-compatible; existing 2 consumers pass nothing and are unaffected).

Also flagging, not executing (same posture as `question-bank`'s §1.1): the
now-**3rd** instance of a bespoke inline error-state pattern (`lesson-plan`,
`question-bank`, and now `invitations`) is a legitimate promotion candidate
(`components/shared/error-state/` generic `{title, body, retryLabel, onRetry}`)
— left as a conscious, explicit deferral for `fe-lead` to decide when/whether
to promote, not silently repeated a 4th time without comment.

---

## 1. Architecture Summary

- **Net-new feature scope**: `src/features/admin/invitations/presentation/invitations-screen/` —
  **one** screen (no tabs/sub-screens the way `staffing` has 3), a container
  root + ~14 flat presentational/controlled files, matching the
  `staffing`/`class-management` "flat files under one screen folder" shape
  (no `components/` subfolder).
- **New vs reused**: 3 shared components reused (`StatusBadge` extended,
  `TagChipsInput` extended, `DestructiveConfirmDialog` reused as-is,
  `EmptyState` reused as-is) — everything else is new and feature-local
  (single consumer today).
- **Missing shadcn primitives**: none. `Tabs`/`TabsList`/`TabsTrigger` (status
  tabs — used as a **visual** tablist even though there's no per-tab panel
  content swap, same "Tabs primitive, non-panel-switching usage" pattern
  `fe-component-architect` already noted for `lms-lesson-player`'s tab groups),
  `Input` (search), `Dialog` (send-invite — **not** `AlertDialog`; it's a
  constructive form dialog, not a destructive confirm), `RadioGroup` (role
  select), `Select` (expiry), `Table`/`TableHeader`/`TableBody`/`TableRow`/`TableCell`
  (desktop), `Button`, `Skeleton` (row shimmer), `Badge` (underlies
  `StatusBadge`) — all already exist in `components/ui/`.
- **Container/hook boundary**: `InvitationsScreen` is itself the container
  (owns the TanStack Query list read + 3 mutations inline, no separate hook
  file — matches `staffing-screen.tsx`'s directness at this scale; `fe-state-engineer`
  owns the exact query/mutation mechanics, this doc only names the boundary).
- **Key decisions**:
  1. `InvitationsTable` (≥820px) and `InvitationsCardList` (<820px) are
     **siblings that both consume the same `InvitationRowVM[]` + the same row
     action callback props** — never two divergent data shapes (FR-013
     mandate from the task). Both live in the same screen folder; the screen
     picks one via a `useMediaQuery`-style breakpoint hook (owned by
     `fe-state-engineer`/whoever wires responsive detection — out of scope
     here beyond "both get identical props").
  2. `ExpiryCountdownCell` is a pure, prop-only, zero-async component — called
     out per the task as its own testable unit (own `.tsx` + a slice of the
     stories file, per UC-007's 4 branches).
  3. `SendInvitationDialog` uses shadcn `Dialog` (constructive), the row
     revoke path uses `DestructiveConfirmDialog`'s `AlertDialog` (destructive)
     — matching this repo's established constructive-vs-destructive dialog
     split (`publish-confirm-dialog` vs `destructive-confirm-dialog`
     precedent from `question-bank`).
  4. No `INVDropdown`/`INVCombobox`-style wrapper for the expiry select or
     role radio group — `Select`/`RadioGroup` primitives used directly
     (mirrors `question-bank`'s "no `QBDropdown`" call).

---

## 2. Component Tree

```
src/features/admin/invitations/presentation/invitations-screen/

InvitationsScreen                                    'use client', CONTAINER
│  (owns: list query, status-tab state, search-term state, send/resend/revoke
│   mutation state, responsive breakpoint flag — all internal; see §4)
├── invitations-page-header.tsx
│   └── InvitationsPageHeader                        presentational, inline actions
│       (title + "Làm mới" secondary + "Gửi lời mời" primary buttons)
├── invitations-status-tabs.tsx
│   └── InvitationsStatusTabs                         presentational, CONTROLLED
│       (shadcn Tabs as a visual tablist — no per-tab panel swap; count
│        badges computed by the CONTAINER from the full raw list, passed in
│        as a prop map, never recomputed inside this component)
├── invitations-search-input.tsx
│   └── InvitationsSearchInput                        presentational, CONTROLLED
│       (owns its own debounce timer internally — mirrors TagChipsInput's
│        "ephemeral draft state stays local" precedent; committed value is
│        the controlled `value` prop, debounced `onChange` fires on
│        commit — screen never sees keystroke-level updates)
├── invitations-skeleton.tsx
│   └── InvitationsSkeleton                            presentational, NEW,
│                                                        feature-local (flagged §0),
│                                                        no props, fixed rows=5
├── invitations-error-state.tsx
│   └── InvitationsErrorState                           presentational, NEW,
│                                                        feature-local (flagged §0)
├── EmptyState (shared, REUSED as-is) × 2 call sites
│   ├── emptyNoInvitations (icon=mailPlus, cta="Gửi lời mời"→opens send dialog)
│   └── emptyNoMatch (icon=search, cta="Xoá bộ lọc"→onClearFilters)
├── invitations-table.tsx (≥820px)
│   └── InvitationsTable                                presentational, CONTROLLED
│       └── per row, SAME row-action props as card list:
│           ├── (email cell — inline, plain text)
│           ├── invitation-role-badge.tsx → InvitationRoleBadge   presentational,
│           │     thin wrapper over shared StatusBadge (role→tone lookup)
│           ├── (invitedBy cell — inline)
│           ├── (sentDate cell — inline, pre-formatted label from VM)
│           ├── expiry-countdown-cell.tsx → ExpiryCountdownCell    presentational,
│           │     PURE, own unit/story matrix (UC-007, 4 branches)
│           ├── invitation-status-badge.tsx → InvitationStatusBadge  presentational,
│           │     thin wrapper over shared StatusBadge (status→tone lookup,
│           │     incl. the new "error-dark" tone for revoked, §0)
│           └── invitation-row-actions.tsx → InvitationRowActions   presentational,
│                 (copyLink | resend | revoke buttons, gated by
│                  `actions.{copyLink,resend,revoke}` booleans from the VM —
│                  never re-derives gating from `status` itself)
├── invitations-card-list.tsx (<820px)
│   └── InvitationsCardList                             presentational, CONTROLLED
│       └── InvitationCard[] (invitations-card.tsx → InvitationCard)
│           — renders the SAME fields + reuses InvitationRoleBadge /
│           ExpiryCountdownCell / InvitationStatusBadge / InvitationRowActions
│           as the table (composition, not a stripped re-implementation —
│           satisfies FR-013)
├── send-invitation-dialog.tsx
│   └── SendInvitationDialog                            'use client' CONTROLLED
│       (shadcn Dialog, constructive — NOT AlertDialog)
│       ├── invitation-email-chips-input.tsx → InvitationEmailChipsInput
│       │     presentational, thin wrapper over shared TagChipsInput (§0 —
│       │     passes `validate={isValidEmail}`, `maxTags` soft cap per plan.md
│       │     §4 open-question OQ-C, `maxTagLength` generous e.g. 254)
│       ├── invitation-role-radio-group.tsx → InvitationRoleRadioGroup
│       │     presentational, CONTROLLED (shadcn RadioGroup, 5 options,
│       │     role-tinted active style per design-spec `roleRadioGroup.activeStyle`)
│       ├── invitation-expiry-select.tsx → InvitationExpirySelect
│       │     presentational, CONTROLLED (shadcn Select, 7/14/30, default 14)
│       └── (submit button — inline, count-aware label, `aria-busy`)
└── (revoke) DestructiveConfirmDialog (shared, REUSED as-is, §0)
    — rendered inline in InvitationsScreen, no feature-local wrapper file
```

File list (all under `src/features/admin/invitations/presentation/invitations-screen/`):

```
invitations-screen.tsx                  (container)
invitations-screen.i-vm.ts
invitations-screen.stories.tsx
invitations-page-header.tsx
invitations-status-tabs.tsx
invitations-search-input.tsx
invitations-skeleton.tsx
invitations-error-state.tsx
invitations-table.tsx
invitations-card-list.tsx
invitations-card.tsx
invitation-role-badge.tsx
invitation-status-badge.tsx
expiry-countdown-cell.tsx
invitation-row-actions.tsx
send-invitation-dialog.tsx
invitation-email-chips-input.tsx
invitation-role-radio-group.tsx
invitation-expiry-select.tsx
```

Plus the `presentation/`-root `shared.i-vm.ts` is **not needed** here (unlike
`question-bank`'s 2-screen split) — this feature has exactly one screen, so
`invitations-screen.i-vm.ts` is the single, complete contract.

---

## 3. ViewModel + Prop Interfaces

All types reference `domain/entities` (this feature's own, per `plan.md`
Phase 1) — nothing here imports `infrastructure/` or `bootstrap/di/`.

### 3.1 `invitations-screen.i-vm.ts`

```ts
import type { LucideIcon } from "lucide-react";
import type {
  Invitation,
  InvitationRole,
  InvitationStatus,
} from "../../domain/entities/invitation.entity";
import type {
  InviteRoleOption,
  SendInvitationBatchInput,
} from "../../domain/entities/invitation.entity";
import type { InvitationFailure } from "../../domain/failures/invitation.failure";

/** Per-email reconciliation, unwrapped for presentation (mirrors the
 * use-case/repo's `SendBatchOutcome` 1:1 — re-declared here so this file has
 * zero import from `domain/repositories`, keeping the VM boundary self-contained
 * per `presentation/` layer rules — entities only). */
export interface SendBatchOutcomeVM {
  succeeded: { email: string; invitationId: string }[];
  failed: { email: string; failureKey: InvitationFailure["type"] }[];
}

export type SendBatchActionResult =
  | { ok: true; outcome: SendBatchOutcomeVM }
  | { ok: false; errorKey: InvitationFailure["type"] };

export type MutationActionResult =
  | { ok: true }
  | { ok: false; errorKey: InvitationFailure["type"] };

export type CountdownVariant = "normal" | "urgent" | "expired" | "na";

/** Fully pre-resolved — presentation builds this once per row, ExpiryCountdownCell
 * never re-derives urgency from `expiresAt` itself (keeps the cell pure/prop-only). */
export interface CountdownVM {
  variant: CountdownVariant;
  /** Already-translated text, e.g. "Còn 2 ngày" / "Hết hạn 12/07/2026" / "—". */
  text: string;
  /** Present for "urgent" (AlertTriangle) and "expired" (CalendarX) only —
   * undefined for "normal"/"na" (no icon rendered, matches design-spec:
   * countdown is never color-only, but "normal" state doesn't warrant an
   * icon per the mockup — icon presence itself is not the a11y signal here,
   * the bold+icon PAIR together for the urgent case is). */
  icon?: LucideIcon;
}

/** Row-level view-model — the ONLY shape both `InvitationsTable` and
 * `InvitationsCardList` accept (FR-013: identical data + actions on both
 * layouts). All label/i18n resolution already done by the VM-building step
 * in the container (never inside `domain/`). */
export interface InvitationRowVM {
  id: string;
  email: string;
  role: InvitationRole;
  roleLabel: string;
  status: InvitationStatus;
  statusLabel: string;
  invitedBy: string;
  sentAtLabel: string;
  countdown: CountdownVM;
  actions: {
    copyLink: boolean; // pending only
    resend: boolean; // expired only
    revoke: boolean; // pending only
  };
  /** Row-level in-flight flag — container sets true while THIS row's resend
   * or revoke mutation is pending (not a query-cache field, a local derived
   * flag; see state-architecture.md for the exact mechanism). Presentational
   * components use it only to show a spinner / disable the row's own buttons. */
  isRowMutating: boolean;
}

export type InvitationsStatusFilter =
  | "all"
  | "pending"
  | "accepted"
  | "expired"
  | "revoked";

/** Per-tab counts — computed by the container from the full raw list,
 * `InvitationsStatusTabs` only renders what it's given. */
export type InvitationsStatusCounts = Record<InvitationsStatusFilter, number>;

export interface InvitationsScreenProps {
  /** RSC-seeded first page (initialData for the list query). */
  initialInvitations: Invitation[];
  /** True when the initial RSC fetch itself failed (distinct from a later
   * client-side refetch failure — both render the same InvitationsErrorState,
   * this flag just seeds the query's initial error state). */
  initialLoadFailed: boolean;
  roleOptions: InviteRoleOption[]; // ["teacher","student","parent","manager","admin"], fixed order
  expiryOptions: (7 | 14 | 30)[]; // fixed [7,14,30], default 14 owned by the dialog's local state
  maxBatchEmails: number; // soft client cap, plan.md §4 OQ-C (e.g. 20)

  onRefresh: () => Promise<MutationActionResult>;
  onSendBatch: (input: SendInvitationBatchInput) => Promise<SendBatchActionResult>;
  onResend: (invitationId: string) => Promise<MutationActionResult>;
  onRevoke: (invitationId: string) => Promise<MutationActionResult>;
  /** Client-only — no Server Action. Constructs the invite URL from data
   * already present in the row VM (no extra round-trip); returns false if
   * `navigator.clipboard` write is denied so the container can show the
   * `clipboardDenied` toast variant. */
  onCopyLink: (row: InvitationRowVM) => Promise<boolean>;
}
```

### 3.2 New sub-component prop interfaces

```ts
// invitations-page-header.tsx
export interface InvitationsPageHeaderProps {
  title: string;
  refreshLabel: string;
  sendLabel: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  onOpenSendDialog: () => void;
}

// invitations-status-tabs.tsx
export interface InvitationsStatusTabsProps {
  value: InvitationsStatusFilter;
  counts: InvitationsStatusCounts;
  labels: Record<InvitationsStatusFilter, string>;
  onChange: (value: InvitationsStatusFilter) => void;
}

// invitations-search-input.tsx
export interface InvitationsSearchInputProps {
  value: string; // committed (debounced) value — controlled from outside for "clear filters"
  placeholder: string;
  ariaLabel: string;
  onChange: (value: string) => void; // fires debounced, not per-keystroke
}

// invitations-skeleton.tsx — no props, fixed rows=5 (mirrors QBSkeleton's no-prop shape)

// invitations-error-state.tsx
export interface InvitationsErrorStateProps {
  title: string;
  retryLabel: string;
  onRetry: () => void;
}

// invitations-table.tsx / invitations-card-list.tsx — IDENTICAL prop shape
// (FR-013 — enforced at the type level by sharing one interface)
export interface InvitationsRowsProps {
  rows: InvitationRowVM[];
  onCopyLink: (row: InvitationRowVM) => void;
  onResend: (id: string) => void;
  onRevokeRequest: (row: InvitationRowVM) => void; // opens confirm dialog, doesn't revoke directly
}
export type InvitationsTableProps = InvitationsRowsProps;
export type InvitationsCardListProps = InvitationsRowsProps;

// invitations-card.tsx (single card, used by InvitationsCardList)
export interface InvitationCardProps {
  row: InvitationRowVM;
  onCopyLink: (row: InvitationRowVM) => void;
  onResend: (id: string) => void;
  onRevokeRequest: (row: InvitationRowVM) => void;
}

// invitation-role-badge.tsx (thin wrapper over shared StatusBadge)
export interface InvitationRoleBadgeProps {
  role: InvitationRole;
  label: string;
}

// invitation-status-badge.tsx (thin wrapper over shared StatusBadge)
export interface InvitationStatusBadgeProps {
  status: InvitationStatus;
  label: string;
}

// expiry-countdown-cell.tsx — PURE, no async, own unit/story matrix (UC-007)
export interface ExpiryCountdownCellProps {
  countdown: CountdownVM;
}

// invitation-row-actions.tsx
export interface InvitationRowActionsProps {
  actions: InvitationRowVM["actions"];
  isRowMutating: boolean;
  copyLabel: string;
  resendLabel: string;
  revokeLabel: string;
  rowActionsGroupLabel: string; // aria-label for the actions group, interpolates email
  onCopyLink: () => void;
  onResend: () => void;
  onRevokeRequest: () => void;
}

// send-invitation-dialog.tsx
export interface SendInvitationDialogProps {
  open: boolean;
  roleOptions: InviteRoleOption[];
  expiryOptions: (7 | 14 | 30)[];
  maxBatchEmails: number;
  isSubmitting: boolean;
  /** Set by the container after a partial/total failure — cleared on
   * re-open/dismiss (same "host owns clearing it" rule as DestructiveConfirmDialog's
   * errorSlot). Keyed by email so InvitationEmailChipsInput can mark specific
   * chips invalid post-submit (server-side duplicate rejection), distinct
   * from the input's own client-side format validation. */
  serverRejectedEmails?: Record<string, InvitationFailure["type"]>;
  onSubmit: (input: SendInvitationBatchInput) => void;
  onClose: () => void;
}

// invitation-email-chips-input.tsx (thin wrapper over shared TagChipsInput, §0)
export interface InvitationEmailChipsInputProps {
  emails: string[];
  maxBatchEmails: number;
  serverRejectedEmails?: Record<string, InvitationFailure["type"]>;
  onChange: (emails: string[]) => void;
}

// invitation-role-radio-group.tsx
export interface InvitationRoleRadioGroupProps {
  value: InviteRoleOption;
  options: { value: InviteRoleOption; label: string }[];
  groupLabel: string;
  onChange: (value: InviteRoleOption) => void;
}

// invitation-expiry-select.tsx
export interface InvitationExpirySelectProps {
  value: 7 | 14 | 30;
  options: { value: 7 | 14 | 30; label: string }[]; // ICU-plural-resolved labels
  triggerAriaLabel: string;
  onChange: (value: 7 | 14 | 30) => void;
}
```

**Revoke confirm dialog** — no new prop interface; `InvitationsScreen`
constructs `DestructiveConfirmDialogProps` inline at the call site:
`open` (revoke-target row is set), `title`/`body`/`confirmLabel` from
`invitations.revokeDialog.*`, `errorSlot` populated only on a failed
revoke attempt — `tone: "transient"` for network errors (retryable: re-click
confirm) and **also** `tone: "transient"` for the not-found race
(AC-006.6) since the dialog itself doesn't need a `"forbidden"`-style
permanent block — the race just means the row is already gone; the
container's `onRetry` for that case is "close dialog + the already-scheduled
refetch will drop the stale row", not a literal re-send of the same revoke
call. `fe-state-engineer` to confirm this retry semantics detail doesn't
require a 3rd `errorSlot.tone`.

---

## 4. State Ownership (contract level)

Full query-key/invalidation mechanics are `fe-state-engineer`'s call — this
table only maps which layer/component owns each piece of state so the two
docs don't drift.

| State | Owner | Controlled prop or internal? |
| --- | --- | --- |
| Invitation list (TanStack Query) | `InvitationsScreen` | Internal to the container — not a prop anywhere in §2/§3 |
| Status-tab filter | `InvitationsScreen` | Internal (`useState`); passed down as controlled `value` to `InvitationsStatusTabs` |
| Search term (debounced) | Committed value: `InvitationsScreen`. Keystroke buffer: `InvitationsSearchInput` | Split — mirrors `TagChipsInput`'s "ephemeral draft stays local" precedent; container only sees the debounced commit |
| Filtered/derived row list + per-tab counts | `InvitationsScreen` (derived via the domain's `list-invitations` use-case filter logic, plan.md Phase 1) | Derived, passed down as `rows`/`counts` — never recomputed inside `InvitationsTable`/`InvitationsCardList`/`InvitationsStatusTabs` |
| Responsive breakpoint (≥820px vs <820px) | `InvitationsScreen` | Internal — picks which of `InvitationsTable`/`InvitationsCardList` to render; both get identical props (§1 decision 1) |
| Row-level mutation-in-flight flag (`isRowMutating`) | `InvitationsScreen` (from the resend/revoke mutation's own `isPending`, keyed by row id) | Derived per-row, passed down — not a query-cache patch |
| Send dialog open/closed | `InvitationsScreen` | Internal; passed to `SendInvitationDialog` as controlled `open` |
| Send-dialog form fields (emails/role/expiry) | `SendInvitationDialog` (or a small local hook if `fe-nextjs-engineer` prefers, mirrors `useQuestionBankBuilder`-style extraction at this complexity — architect's call deferred to implementation, not a hard requirement here since this form is smaller than the builder's) | Internal `useState`, no react-hook-form (plan.md §2 Phase 3 already decided this) |
| Email-chip draft text (uncommitted) | `TagChipsInput` (shared) | Internal, unchanged by the `validate` prop extension (§0) |
| Revoke-target row + confirm-dialog open/loading/error | `InvitationsScreen` | Internal; `DestructiveConfirmDialog` receives fully controlled props |
| Toast state | Wherever the codebase's existing toast convention lives (sonner, per `question-bank`/other precedent) | Not owned by any component in this tree — fire-and-forget calls from the container's mutation callbacks |

**Hand-off note to `fe-state-engineer`**: this doc assumes (a) one root list
query keyed `["admin-invitations", tenantId]` per plan.md §2 Phase 3, with
`initialData` seeded from `InvitationsScreenProps.initialInvitations`; (b)
`onSendBatch`/`onResend`/`onRevoke` each invalidate that one query on
settle (success or the specific races named in plan.md), never a
per-row query; (c) `isRowMutating` is derived from whichever
mutation-tracking mechanism you choose (e.g. a `Map<id, boolean>` from
`useMutation`'s `variables`/`isPending`, or a small `Set<string>` of
in-flight ids) — the **shape at the VM boundary** is just a boolean per row,
however it's computed underneath. Please confirm the `errorSlot.tone`
question flagged at the end of §3.2 (revoke not-found race) — I assumed
`"transient"` is fine since it's not permanently blocking, but you own the
actual retry wiring semantics.

---

## 5. Composition & Variant Strategy

- **No compound-component/slot pattern needed.** Every new component takes
  flat, explicit props — no `asChild`/`Slot` usage (nothing here
  polymorphically changes its rendered root element). Matches
  `staffing`/`class-management`/`question-bank` precedent throughout.
- **`cva` variants**: none needed for new components. The two `StatusBadge`
  wrappers (`InvitationRoleBadge`/`InvitationStatusBadge`) each resolve a
  fixed `role`/`status` → `tone` lookup `Record` internally (same shape as
  `question-bank`'s `QBTypeBadge`/`QBStatusChip`) and hand the result to
  `StatusBadge`'s existing `tone` prop — no new variant axis on the shared
  primitive **beyond** the one tone addition in §0.
- **Design-system pattern reuse**: `StatusBadge` (icon+text badge pattern,
  extended per §0), `TagChipsInput` (extended per §0),
  `DestructiveConfirmDialog` (reused as-is), `EmptyState` (reused as-is).
  `Tabs`/`Input`/`Dialog`/`RadioGroup`/`Select`/`Table`/`Button`/`Skeleton`
  primitives used directly, no wrappers beyond the thin badge wrappers above.
- **Extension points (no over-abstraction until 3+ instances)**:
  `InvitationsSkeleton`/`InvitationsErrorState` stay feature-local for now
  (flagged §0 as a legitimate 3rd-instance promotion candidate, deliberately
  not executed here — same posture `question-bank`'s doc took for its own
  1st-flagged item). `InvitationRoleBadge`/`InvitationStatusBadge` stay
  feature-local — single consumer today; a 2nd consumer anywhere else in the
  codebase needing role-tinted or invitation-status-tinted badges would
  trigger promotion per `component-organization.md`.
- **Constructive vs destructive dialog split is intentional**:
  `SendInvitationDialog` (shadcn `Dialog`) vs the revoke flow
  (`DestructiveConfirmDialog`'s `AlertDialog`) — do not merge these into one
  dialog abstraction; they have different semantics (form entry vs a single
  yes/no destructive confirm) and the repo already treats this split as
  canonical (`publish-confirm-dialog` vs `destructive-confirm-dialog`).

---

## 6. Accessibility contract

| Interactive node | Role/label | Keyboard |
| --- | --- | --- |
| `InvitationsStatusTabs` | shadcn `Tabs` → native `role="tablist"`/`role="tab"`/`aria-selected` (Radix-inherited); count badge text is part of the tab's accessible name (not a separate decorative-only number) | Arrow keys move between tabs (Radix Tabs default), Enter/Space activates focused tab |
| `InvitationsSearchInput` | `<Input>` with `aria-label` (design-spec placeholder doubles as visible label via `placeholder`, but an explicit `aria-label` is still required per `accessibility.md`'s "every input has a linked label" — placeholder alone doesn't satisfy that) | Standard text input |
| `InvitationsPageHeader` refresh/send buttons | Native `<button>` via `Button`; refresh shows `aria-busy` while `isRefreshing` | Tab-reachable, Enter/Space activates |
| `InvitationRowActions` buttons (copy/resend/revoke) | Each button has its own `aria-label` interpolating the row's email (mirrors `LPCard`'s `${action}: ${email}` pattern — never 20 identical "Sao chép"/"Gửi lại"/"Thu hồi" labels in a row); the group itself gets `role="group"` + `aria-label` (`rowActionsGroupLabel`) | Tab through each action button independently; revoke button opens the confirm dialog (doesn't destructively act on its own keypress) |
| `ExpiryCountdownCell` | Not interactive — plain text/icon. Icon `aria-hidden="true"`; urgency conveyed by bold weight + icon + text together, never color alone (UC-007, decision `0046`) | n/a |
| `InvitationRoleBadge` / `InvitationStatusBadge` | Icon `aria-hidden="true"`, label text always rendered alongside (badges are never icon-only) — inherits `StatusBadge`'s existing a11y contract | n/a (not focusable) |
| `SendInvitationDialog` | shadcn `Dialog` → `role="dialog"`, focus trap, `aria-labelledby`/`aria-describedby` (Radix-inherited); submit button `aria-busy` while `isSubmitting`, disabled until ≥1 valid email + role selected | Escape closes (guarded while submitting, mirrors `DestructiveConfirmDialog`'s loading-ignores-escape precedent); Tab cycles through chips input → role radios → expiry select → cancel/submit |
| `InvitationEmailChipsInput` | Inherits `TagChipsInput`'s existing contract (per-chip `aria-label` remove button, `role="alert"` inline error, 44×44px touch targets) — the new `validate` prop adds a per-chip `aria-invalid`-equivalent visual state; each invalid chip's remove button label should also convey "invalid" (e.g. `removeAriaLabelOf` already interpolates the chip text — engineer to confirm the invalid state is also announced, not just visually red) | Enter/comma/Space commits (unchanged), Tab reaches each remove button |
| `InvitationRoleRadioGroup` | shadcn `RadioGroup` → native `role="radiogroup"`, each option `role="radio"`/`aria-checked` (Radix-inherited); group has `aria-label` from `groupLabel` | Arrow keys move between options (Radix default), Space/click selects |
| `InvitationExpirySelect` | shadcn `Select` → `SelectTrigger aria-label` (`triggerAriaLabel`) | Native Radix Select keyboard nav (Space/Enter open, arrows navigate, Esc closes) |
| Revoke `DestructiveConfirmDialog` | Inherits Radix `AlertDialog`: `role="alertdialog"`, focus trap, initial focus on Cancel (existing contract, unchanged) | Escape/overlay-click → cancel (unless loading); Tab cycles cancel↔confirm |
| `InvitationsErrorState` retry button | Plain `<button>` inside a `role="alert"` (or `role="status"` — engineer's call matching the sibling inline-`ErrorState` convention already in the codebase, e.g. `teacher-classes-screen.tsx`'s `role="alert"`) | Tab-reachable, Enter/Space activates |
| Toasts (sent/duplicate/network/copied/clipboard-denied/resent/revoked/race errors) | Inherits whatever toast primitive's built-in `role="status"`/`aria-live` (sonner, per repo convention) | n/a |

All badges and the countdown cell pair icon+text per NFR-001/decision `0046`
— none render color-only.

---

## Cross-references

- `plan.md` §0 (ground-truth), §1 (canonical-home recap), §2 Phase 3
  (component sketch this doc finalizes), §4 (open questions — `maxBatchEmails`
  soft cap referenced in `InvitationsScreenProps`, `InvitationRole` vs
  `role-meta.ts`'s `UserRole` divergence referenced in §3.1's entity imports).
- `design-spec.jsonc` `screens.invitations` (~line 4393) — every color/icon/
  gating rule in §0/§3/§6 above is sourced from this entry verbatim.
- `design_src/edu/invitations.jsx` — `InvitationsScreen`/`INV*` helpers read
  in full before writing this doc; component names here are **not** 1:1
  copies of the `INV*` mockup names (this repo's admin/* siblings don't
  prefix feature-local files that way — see file list in §2).
- Extended shared components: `src/components/shared/status-badge/`,
  `src/components/shared/tag-chips-input/` (both need the 1-line/1-prop
  extensions in §0 before this feature's `.tsx` files can compile against
  them — flag to `fe-lead`/`fe-nextjs-engineer` to land first).
- Reused as-is: `src/components/shared/destructive-confirm-dialog/`,
  `src/components/shared/empty-state/`.
- Sibling precedent read in full before writing this doc:
  `src/features/admin/staffing/presentation/**`,
  `src/features/admin/class-management/presentation/**`,
  `src/features/question-bank/presentation/**` (most recent
  component-architecture.md of this shape).
