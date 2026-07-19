# Component Architecture — US-E20.1 Admin Parent–Student Link Management

Written by `fe-component-architect`. Finalizes `plan.md` §2 Phase 4 / §3's
component sketch into concrete file paths, prop/ViewModel contracts, and the
two explicit open questions the planner flagged. No implementation code below
— contracts and structure only, per this role's mandate. Read in full before
writing: `plan.md`, `spec.md`, `story.md`, `design-spec.jsonc` `screens.parentLinks`
(line ~4198), `design_src/edu/parent-links.jsx` (`ParentLinksScreen`/`PLCombobox`/
`PLCreateDialog`), and the shared components this doc extends/reuses
(`status-badge`, `empty-state`, `destructive-confirm-dialog`), plus the most
recent sibling precedent `docs/stories/epics/E21-tenant-invitations/US-E21.1-admin-invitations/component-architecture.md`
(folder shape: flat files directly under `presentation/<screen>/`, no
`components/` subfolder — followed here) and
`src/features/admin/invitations/presentation/invitations-screen/**` (actual
code matching that doc).

---

## 0. Reuse-vs-extend-vs-new decisions (grep/read-verified)

| Shared component | plan.md said | Grep/read finding | Decision |
| --- | --- | --- | --- |
| `components/shared/status-badge` (`StatusBadge`, `StatusTone`) | "map relationship/consent badge tones to existing `StatusBadge` tones — no new token" | `TONE_CLASS` (read in full) already has `info`/`purple`/`muted`/`teal`/`warning`/`error-dark` — **every tone this screen needs**: relationship `father→info`, `mother→purple`, `guardian→muted`; consent `agreed→teal`, `pending→warning`, `declined→error-dark`. `error-dark` was added by US-E21.1 (revoked-invitation tone) and is already AA-compliant (`bg-edu-error-dark-light text-edu-error-dark`) — no 2nd extension needed here, this screen is simply this tone's 2nd consumer. | **Reuse directly, zero changes to `status-badge.tsx`.** Two thin feature-local wrapper components (`pl-relation-badge.tsx`, `pl-consent-badge.tsx`) each resolve a fixed lookup `Record` (role/consent → tone + icon) and hand off to `StatusBadge`, mirroring `InvitationRoleBadge`/`InvitationStatusBadge`'s exact shape from US-E21.1. Icon is rendered by the wrapper (badge children = `<Icon/> {label}`), since `StatusBadge`'s `children: ReactNode` already supports arbitrary content — no new prop needed on `StatusBadge` itself. |
| `components/shared/empty-state` (`EmptyState`) | "reuse for both `PLEmpty` variants" | `EmptyState` (`icon`/`title`/`body`/`cta{label,icon,onClick,variant}`, `role="status"`, already-translated strings) — read in full. Matches both variants exactly: no-filter (`icon=link`, `cta={label:"Tạo liên kết", onClick: openCreateDialog}`), filtered (`icon=search` or `filter`, `cta={label:"Xoá bộ lọc", variant:"secondary", onClick: onClearFilters}`). | **Reuse directly**, two call sites inside `pl-empty.tsx` (a thin dispatcher, not a fork — see §2). |
| `components/shared/destructive-confirm-dialog` (`DestructiveConfirmDialog`) | **Open question 2**: "confirm zero-new-props or needs an addition" | Read `destructive-confirm-dialog.tsx` in full. Prop surface: `open, title, body, confirmLabel, isLoading?, errorSlot?: {tone:"forbidden"|"transient", message, onRetry?}, onConfirm, onCancel`. Every AC this screen's Unlink flow needs is already covered: `body` is a caller-supplied plain string (the `{parent}/{student}/{class}`-interpolated consequence copy from spec.md §"High-Risk Security Enforcement" pt.4 is just an i18n `t()` call with params, built by the caller, same as US-E21.1's revoke-dialog body); danger-styled confirm + focus trap + focus-return (AC-005.2/.9) are inherited from `AlertDialog`; `errorSlot.tone:"forbidden"` structurally suppresses retry (maps 1:1 to AC-005.6's 403 case — role/tenant re-auth failure, **not** retryable, matches the "forbidden" tone's contract exactly: no retry control at all); `errorSlot.tone:"transient"` covers the network-error case (AC-005.8, retryable). The 404-race (AC-005.7) is **not** an error-slot case at all — it resolves as a **success-shaped** outcome (toast "đã được gỡ trước đó" + dialog closes + list refetch drops the row), not a dialog-stays-open error, so it never touches `errorSlot`. | **Confirmed: zero new props needed. Pure composition, no fork.** `PLUnlinkDialog` is a thin wrapper (own prop interface, see §3.2) that (a) builds `title`/`body`/`confirmLabel` from `parentLinks.unlinkDialog.*` i18n keys with `{parent, student, class}` interpolation params, (b) maps the mutation's failure branch to `errorSlot.tone: "forbidden"` (403/role-or-tenant-mismatch, AC-005.6) or `"transient"` (network/5xx, AC-005.8) — **never** constructs an `errorSlot` for the 404 case, and (c) passes everything else straight through. |
| **No combobox/typeahead primitive** (`components/ui/`, `components/shared/`, all features grepped — confirmed empty for `combobox`/`Combobox`/`typeahead`) | "design `PLCombobox` from scratch, backed by `bun ui:add command` + existing `Popover`" | Confirmed: `src/components/ui/` has `popover/` (Radix `Popover.Root/Trigger/Content/Anchor`, read in full) but no `command/`. Grepped every other planned/backlog screen (`E12.5-timetable-builder.md`, `E12.9-staffing-ui.md`, and a full-repo grep of `combobox\|typeahead\|autocomplete`) — **no other screen names a searchable-select/combobox requirement**; the only other "search+list" UI patterns in the repo are plain `Input`-driven filter bars (`audit-log`'s `filter-bar.tsx`) which filter an already-loaded local list, not an async debounced candidate lookup with a listbox popup — a different, simpler pattern that does not need this component. | **New primitive-composition, `components/shared/search-combobox/` (generic, NOT `pl-combobox` / not feature-prefixed) — see §1/§3.3 for the full design.** Placed in `shared/` now (not feature-local-then-promote) because it is used **twice within this one screen already** (student + parent variants), which independently satisfies the ≥2-use bar per `component-organization.md` §2, **and** because its prop contract is fully domain-agnostic (candidates/labels/subLabels, no `Student`/`Parent` types anywhere in its own file) — it is architecturally a reusable primitive-composition, not a `parent-links`-specific component, so naming/placing it as `pl-combobox` inside the feature would misrepresent its reuse shape from day one. Backed by `bun ui:add command` (shadcn/cmdk `Command`) + the existing `Popover` (see §3.3 for exactly how they compose). |

**Flag to `fe-lead` (1 item, new primitive, no ADR needed — no new design token, `bun ui:add command` is a standard shadcn add):**
1. `bun ui:add command` must run before `fe-nextjs-engineer` starts Phase 4 (adds `components/ui/command/` — cmdk-based `Command`/`CommandInput`/`CommandList`/`CommandItem`/`CommandEmpty`/`CommandGroup`). `components/shared/search-combobox/` is then built on top of it + `Popover` — this is the "composed component, `components/shared/`" path in `component-organization.md`, not a `ui/` primitive itself (it has opinionated debounce/candidate/subLabel contract layered over the raw primitives), so it does NOT replace `command/`'s own folder — both exist, `search-combobox` depends on `command`.

No design-system token gap — all badge tones already exist in `StatusBadge` (confirmed above), and `SearchComboboxCandidate`'s avatar rendering reuses the existing `Avatar`/`AvatarFallback` primitive (no new visual pattern).

---

## 1. Architecture Summary

- **Net-new feature scope**: `src/features/admin/parent-links/presentation/parent-links-screen/` — one screen, flat files under one screen folder (no `components/` subfolder), matching `invitations`/`staffing`/`class-management` precedent.
- **New vs reused**: 3 shared components touched — `StatusBadge` reused as-is (zero changes, both needed tones already exist), `EmptyState` reused as-is, `DestructiveConfirmDialog` reused as-is (confirmed zero new props, §0). **1 new shared component**: `components/shared/search-combobox/` (`SearchCombobox`), backed by a new shadcn primitive `components/ui/command/`.
- **Missing shadcn primitives**: `command` (→ `bun ui:add command`, backs `SearchCombobox`). Everything else already exists: `Popover`, `Select` (relationship + class filter), `Textarea` (note), `Table`/`TableHeader`/`TableBody`/`TableRow`/`TableCell` (desktop), `DropdownMenu` (row menu), `Avatar`, `Skeleton` (row shimmer), `Badge` (underlies `StatusBadge`), `AlertDialog` (underlies `DestructiveConfirmDialog`), `Dialog` (create + detail — constructive, not destructive), `Input` (search bar).
- **Container/hook boundary**: `ParentLinksScreen` is the container (owns the `useInfiniteQuery` list read, URL-synced filter draft, 2 mutations, dialog-open/target state) — mirrors `audit-log-screen.tsx`'s directness (per plan.md), no separate hook file at this scale. `fe-state-engineer` owns the exact query/mutation mechanics; this doc only names the boundary.
- **Key decisions**:
  1. `PLTable` (≥760px) and `PLCardList` (<760px) are **siblings that both consume the same `ParentLinkRowVM[]` + identical row-action callback props** — never two divergent data shapes (mirrors US-E21.1's `InvitationsTable`/`InvitationsCardList` FR-013 pattern; this story's spec.md §5 "full data parity" requirement for UC-007 is the equivalent mandate here).
  2. `SearchCombobox` is a genuinely new, domain-agnostic shared component (§0) — placed in `components/shared/` immediately, not feature-local-then-promote, because 2 in-screen consumers already exist.
  3. `PLUnlinkDialog` and `PLCreateDialog`/`PLDetailDialog` follow the repo's established constructive-vs-destructive dialog split: Unlink uses `DestructiveConfirmDialog`'s `AlertDialog`; Create and Detail use plain shadcn `Dialog` (constructive/informational, not a yes/no destructive confirm).
  4. `PLRowMenu` is a thin wrapper over shadcn `DropdownMenu` (2 items: "Xem chi tiết", "Gỡ liên kết" danger-styled) — no bespoke menu component.
  5. No `PLDropdown`-style wrapper for the relationship `Select` or class-filter `Select` — primitives used directly (mirrors `invitations`' "no `INVDropdown`" call, and `question-bank`'s "no `QBDropdown`" call before it).

---

## 2. Component Tree

```
src/features/admin/parent-links/presentation/parent-links-screen/

ParentLinksScreen                                    'use client', CONTAINER (RSC page.tsx renders this)
│  (owns: list useInfiniteQuery, URL-synced q+classId filter draft, responsive
│   breakpoint flag, create/unlink mutation state, which dialog is open + which
│   linkId is targeted — all internal; see §4)
├── pl-page-header.tsx
│   └── PLPageHeader                                  presentational
│       (title + "Tạo liên kết" primary button, filtered-count suffix "(đã lọc)")
├── pl-filter-bar.tsx
│   └── PLFilterBar                                    presentational, CONTROLLED
│       (search Input — debounced internally, mirrors InvitationsSearchInput's
│        "keystroke buffer stays local, committed value is the controlled prop"
│        precedent — + class Select, "Xoá bộ lọc" action when any filter active)
├── pl-skeleton.tsx
│   └── PLSkeleton                                      presentational, NEW,
│                                                          feature-local, no props,
│                                                          fixed rows=5 (reuses the
│                                                          existing shimmer pattern
│                                                          other admin tables use —
│                                                          no generic shared
│                                                          `Skeleton`-row component
│                                                          exists repo-wide, same
│                                                          false-cognate finding
│                                                          US-E21.1 made for
│                                                          `EduSkeleton`)
├── pl-error.tsx
│   └── PLError                                         presentational, NEW,
│                                                          feature-local (same
│                                                          false-cognate finding —
│                                                          no generic shared
│                                                          error-state component
│                                                          exists; flagged, not
│                                                          executed, as a 4th
│                                                          promotion-candidate
│                                                          instance per §5)
├── EmptyState (shared, REUSED as-is) × 2 call sites, dispatched by:
│   pl-empty.tsx
│   └── PLEmpty                                          presentational, thin
│       (variant: "no-filter" | "filtered" → picks icon/title/body/cta, both
│        already-translated by the container)
├── pl-table.tsx (≥760px)
│   └── PLTable                                          presentational, CONTROLLED
│       └── per row, SAME row-action props as card list:
│           ├── (student cell — Avatar + name + className, inline)
│           ├── (parent cell — Avatar + name + phone, inline)
│           ├── pl-relation-badge.tsx → PLRelationBadge     presentational,
│           │     thin wrapper over shared StatusBadge (relationship→tone+icon)
│           ├── pl-consent-badge.tsx → PLConsentBadge       presentational,
│           │     thin wrapper over shared StatusBadge (consentStatus→tone+icon)
│           ├── (linkedOn cell — inline, pre-formatted label from VM)
│           └── pl-row-menu.tsx → PLRowMenu                 presentational,
│                 thin wrapper over shadcn DropdownMenu ("Xem chi tiết" /
│                 "Gỡ liên kết" danger-styled), gated by `actions` booleans
│                 from the VM (both true for every row today — no per-row
│                 permission variance in this spec — but kept as an explicit
│                 VM field, not re-derived, matching InvitationRowActions'
│                 precedent for future-proofing)
├── pl-card-list.tsx (<760px)
│   └── PLCardList                                        presentational, CONTROLLED
│       └── PLCard[] (pl-card.tsx → PLCard)
│           — renders the SAME fields + reuses PLRelationBadge / PLConsentBadge /
│           PLRowMenu as the table (composition, not a stripped
│           re-implementation — satisfies UC-007/NFR-004's full-data-parity mandate)
├── pl-create-dialog.tsx
│   └── PLCreateDialog                                    'use client' CONTROLLED
│       (shadcn Dialog, constructive — NOT AlertDialog, maxWidth 470 per design-spec)
│       ├── SearchCombobox (shared, student variant — className subLabel)
│       ├── SearchCombobox (shared, parent variant — phone subLabel, role="parent"-scoped
│       │     server-side; NFR-008 — this component only renders results,
│       │     scoping is enforced by `searchParentCandidatesAction`, not here)
│       ├── (relationship — shadcn Select, father/mother/guardian)
│       ├── (note — shadcn Textarea, optional, rows=2)
│       └── (submit button — inline, `aria-busy` while pending)
├── pl-unlink-dialog.tsx
│   └── PLUnlinkDialog                                    'use client' CONTROLLED,
│         thin wrapper over shared DestructiveConfirmDialog (§0 — zero new props
│         on the shared dialog itself; this wrapper's OWN props are below §3.2)
└── pl-detail-dialog.tsx
    └── PLDetailDialog                                     'use client' CONTROLLED
        (shadcn Dialog, read-only, maxWidth 440, label-value rows + a lazy
         consent sub-fetch section with its OWN scoped skeleton/error, FR-006/
         AC-004.3/.4 — no edit control anywhere, FR-012)
        └── pl-consent-detail-section.tsx → PLConsentDetailSection
              presentational, receives its own {status:"loading"|"error"|"success",
              data?, onRetry} slice — never the whole dialog's state
```

File list (all under `src/features/admin/parent-links/presentation/parent-links-screen/`):

```
parent-links-screen.tsx                 (container)
parent-links-screen.i-vm.ts
parent-links-screen.stories.tsx
pl-page-header.tsx
pl-filter-bar.tsx
pl-skeleton.tsx
pl-error.tsx
pl-empty.tsx
pl-table.tsx
pl-card-list.tsx
pl-card.tsx
pl-relation-badge.tsx
pl-consent-badge.tsx
pl-row-menu.tsx
pl-create-dialog.tsx
pl-unlink-dialog.tsx
pl-detail-dialog.tsx
pl-consent-detail-section.tsx
```

Plus the new shared component (own top-level home, per `component-organization.md`):

```
src/components/shared/search-combobox/
  search-combobox.tsx
  search-combobox.i-types.ts        (or inline in .tsx — engineer's call, small enough)
  index.ts
  search-combobox.stories.tsx
```

And the new shadcn primitive (via `bun ui:add command`, not hand-written):

```
src/components/ui/command/
  command.tsx
  index.ts
  command.stories.tsx
```

---

## 3. ViewModel + Prop Interfaces

All types reference `domain/entities` (this feature's own, per `plan.md` Phase
1) — nothing here imports `infrastructure/` or `bootstrap/di/`.

### 3.1 `parent-links-screen.i-vm.ts`

```ts
import type {
  ParentStudentLink,
  RelationshipType,
} from "../../domain/entities/parent-student-link.entity";
import type { ParentStudentConsent } from "../../domain/entities/parent-student-consent.entity";
import type { LinkCandidate } from "../../domain/entities/link-candidate.entity";
import type { ParentStudentLinkFailure } from "../../domain/failures/parent-student-link.failure";

export type MutationActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; errorKey: ParentStudentLinkFailure["type"]; fields?: { field: string; message: string }[] };

export interface ParentLinksPage {
  items: ParentStudentLink[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ParentLinksFilter {
  q: string;
  classId: string | null;
}

export interface ClassOption {
  id: string;
  label: string;
}

/**
 * Screen-level ViewModel — the server↔client contract. RSC `page.tsx` seeds
 * `initialFilter`/`initialPage`/`initialErrorKey` from the URL + first
 * `listLinksAction` call; the client container re-fetches on filter/cursor
 * change via the same action ref (see fe-state-engineer's query-key doc for
 * the exact `useInfiniteQuery`/`initialData` wiring — out of scope here).
 */
export interface ParentLinksScreenProps {
  initialFilter: ParentLinksFilter;
  initialPage: ParentLinksPage;
  /** Set only when the RSC's own first fetch failed — distinct from a later
   * client refetch failure (both render the same PLError; this flag just
   * seeds the query's initial error state). Never silently coerced to an
   * empty-page render (preserve error-vs-empty distinction). */
  initialErrorKey?: ParentStudentLinkFailure["type"];
  classOptions: ClassOption[];

  // Server Action refs — all 'use server', Result<T> shape per admin/grades
  // precedent (plan.md Phase 5).
  listLinksAction: (
    filter: ParentLinksFilter,
    cursor?: string,
  ) => Promise<MutationActionResult<ParentLinksPage>>;
  createLinkAction: (input: {
    studentId: string;
    parentId: string;
    relationship: RelationshipType;
    note?: string;
  }) => Promise<MutationActionResult<ParentStudentLink>>;
  unlinkLinkAction: (linkId: string) => Promise<MutationActionResult<undefined>>;
  getLinkConsentDetailAction: (
    studentId: string,
    parentId: string,
  ) => Promise<MutationActionResult<ParentStudentConsent>>;
  searchStudentCandidatesAction: (
    q: string,
    classId?: string,
  ) => Promise<MutationActionResult<LinkCandidate[]>>;
  searchParentCandidatesAction: (
    q: string,
  ) => Promise<MutationActionResult<LinkCandidate[]>>;
}

/** Row-level view-model — the ONLY shape both PLTable and PLCardList accept
 * (mirrors US-E21.1's InvitationRowVM "identical data on both layouts" rule). */
export interface ParentLinkRowVM {
  linkId: string;
  student: { memberId: string; fullName: string; avatarUrl?: string; className: string };
  parent: { memberId: string; fullName: string; avatarUrl?: string; phone: string };
  relationship: RelationshipType;
  relationshipLabel: string;
  consentStatus: ParentStudentLink["consentStatus"];
  consentLabel: string;
  note?: string;
  linkedOnLabel: string; // pre-formatted, e.g. "12/07/2026"
  actions: { viewDetail: boolean; unlink: boolean }; // both true today; kept explicit, not re-derived
}
```

### 3.2 New sub-component prop interfaces (feature-local)

```ts
// pl-page-header.tsx
export interface PLPageHeaderProps {
  title: string;
  createLabel: string;
  filteredCountLabel?: string; // e.g. "12 liên kết (đã lọc)" — undefined when no filter active
  onOpenCreateDialog: () => void;
}

// pl-filter-bar.tsx
export interface PLFilterBarProps {
  q: string; // committed (debounced) value — controlled from outside
  classId: string | null;
  classOptions: ClassOption[];
  searchPlaceholder: string;
  searchAriaLabel: string;
  clearFiltersLabel: string;
  hasActiveFilter: boolean;
  onQChange: (q: string) => void; // fires debounced, not per-keystroke
  onClassChange: (classId: string | null) => void;
  onClearFilters: () => void;
}

// pl-skeleton.tsx — no props, fixed rows=5

// pl-error.tsx
export interface PLErrorProps {
  title: string;
  retryLabel: string;
  onRetry: () => void;
}

// pl-empty.tsx
export interface PLEmptyProps {
  variant: "no-filter" | "filtered";
  noFilterTitle: string;
  noFilterCreateLabel: string;
  filteredTitle: string;
  filteredClearLabel: string;
  onOpenCreateDialog: () => void;
  onClearFilters: () => void;
}

// pl-table.tsx / pl-card-list.tsx — IDENTICAL row-facing prop shape
// (mirrors InvitationsRowsProps — enforced at the type level by sharing one interface)
export interface PLRowsProps {
  rows: ParentLinkRowVM[];
  onViewDetail: (linkId: string) => void;
  onUnlinkRequest: (row: ParentLinkRowVM) => void; // opens confirm dialog, doesn't unlink directly
}
export type PLTableProps = PLRowsProps;
export type PLCardListProps = PLRowsProps;

// pl-card.tsx (single card, used by PLCardList)
export interface PLCardProps {
  row: ParentLinkRowVM;
  onViewDetail: (linkId: string) => void;
  onUnlinkRequest: (row: ParentLinkRowVM) => void;
}

// pl-relation-badge.tsx (thin wrapper over shared StatusBadge)
export interface PLRelationBadgeProps {
  relationship: RelationshipType; // "father" | "mother" | "guardian"
  label: string;
}

// pl-consent-badge.tsx (thin wrapper over shared StatusBadge)
export interface PLConsentBadgeProps {
  status: ParentStudentLink["consentStatus"]; // "agreed" | "pending" | "declined"
  label: string;
}

// pl-row-menu.tsx (thin wrapper over shadcn DropdownMenu)
export interface PLRowMenuProps {
  row: ParentLinkRowVM;
  viewDetailLabel: string;
  unlinkLabel: string;
  triggerAriaLabel: string; // interpolates student+parent name, e.g. "Hành động: Nguyễn Văn A – Trần Thị B"
  onViewDetail: () => void;
  onUnlinkRequest: () => void;
}

// pl-create-dialog.tsx
export interface PLCreateDialogProps {
  open: boolean;
  isSubmitting: boolean;
  /** Duplicate-pair / 422 / network failure surfaced after submit — cleared
   * on re-open/dismiss (same "host owns clearing it" rule as
   * DestructiveConfirmDialog's errorSlot / InvitationsScreen's serverRejectedEmails). */
  submitError?: {
    kind: "already-linked" | "validation" | "network-error";
    message: string; // already-i18n'd, role="alert" surface
    fieldErrors?: { field: "studentId" | "parentId" | "relationship" | "note"; message: string }[];
  };
  relationshipOptions: { value: RelationshipType; label: string }[];
  onSearchStudents: (q: string) => Promise<LinkCandidate[]>; // wraps searchStudentCandidatesAction
  onSearchParents: (q: string) => Promise<LinkCandidate[]>; // wraps searchParentCandidatesAction
  onSubmit: (input: {
    studentId: string;
    parentId: string;
    relationship: RelationshipType;
    note?: string;
  }) => void;
  onClose: () => void;
}

// pl-unlink-dialog.tsx — NOTE: this wrapper's own props, NOT
// DestructiveConfirmDialogProps directly (§0 confirms zero new props on the
// shared dialog; this interface is what PLUnlinkDialog itself accepts before
// it builds DestructiveConfirmDialogProps internally).
export interface PLUnlinkDialogProps {
  open: boolean;
  /** Minimal slice needed for consequence-copy interpolation — not the full row. */
  target: Pick<ParentLinkRowVM, "linkId"> & {
    parentName: string;
    studentName: string;
    className: string;
  } | null;
  isLoading: boolean;
  /** "forbidden" → 403 role/tenant re-auth failure (AC-005.6, no retry).
   * "transient" → network/5xx (AC-005.8, retryable). The 404-race (AC-005.7)
   * is NEVER represented here — it resolves as a toast + dialog-close +
   * refetch, not an error-slot state. */
  errorSlot?: { tone: "forbidden" | "transient"; message: string; onRetry?: () => void };
  onConfirm: () => void;
  onCancel: () => void;
}

// pl-detail-dialog.tsx
export interface PLDetailDialogProps {
  open: boolean;
  row: ParentLinkRowVM | null; // null while closing/transitioning
  closeLabel: string;
  consent: PLConsentDetailSectionProps; // sub-fetch state, scoped (see below)
  onClose: () => void;
}

// pl-consent-detail-section.tsx — scoped async slice, own skeleton/error
// (AC-004.3/.4 — never bubbles to the whole dialog)
export interface PLConsentDetailSectionProps {
  status: "loading" | "error" | "success";
  data?: ParentStudentConsent;
  errorMessage?: string;
  onRetry: () => void;
  labels: {
    disciplineAlerts: string;
    absenceAlerts: string;
    gradeAlerts: string;
  };
}
```

### 3.3 `components/shared/search-combobox/` — `SearchCombobox` (new shared primitive-composition)

**Backing**: shadcn `Command` (`bun ui:add command`, cmdk-based — provides
`role="combobox"`-adjacent listbox semantics, built-in arrow-nav/Enter/Escape,
and filter-as-you-type list rendering) mounted inside the existing `Popover`
(`PopoverTrigger` = the visible input-shaped trigger button; `PopoverContent`
= the listbox surface, `align="start"`, matched width via `w-(--radix-popover-trigger-width)`).
This is the "Popover + Command" composition the plan called for — not a
fresh build from Radix primitives.

**Fully domain-agnostic** — no `Student`/`Parent` types anywhere in this
file; the student-vs-parent distinction is entirely the caller's
(`PLCreateDialog`'s) responsibility via which `candidates`/labels it passes
in, matching `renderSub`/`subLabelKey`-style parameterization the plan asked
for.

```ts
export interface SearchComboboxCandidate {
  id: string;
  /** e.g. full name. */
  primaryLabel: string;
  /** e.g. className for the student variant, phone for the parent variant. */
  subLabel?: string;
  avatarUrl?: string;
  /** Fallback initials for Avatar when avatarUrl is absent — caller-computed,
   * this component does no name-parsing logic itself. */
  avatarInitials?: string;
}

export type SearchComboboxStatus = "idle" | "loading" | "error" | "success";

export interface SearchComboboxProps {
  /** Controlled selection — null = nothing selected. */
  value: SearchComboboxCandidate | null;
  onValueChange: (candidate: SearchComboboxCandidate | null) => void;

  /**
   * Controlled search text — the debounce/query-state lives OUTSIDE this
   * component (in the screen/dialog's state layer via fe-state-engineer's
   * design), not internally. This component only renders `query` and reports
   * every keystroke immediately via `onQueryChange`; the caller decides when
   * to actually fire a search (debounced) and updates `candidates`/`status`
   * in response. This mirrors the plan's explicit requirement ("query state
   * controlled from outside so the debounce lives in the state layer").
   */
  query: string;
  onQueryChange: (query: string) => void;

  /** Fully resolved candidate list for the CURRENT query — this component
   * never filters/fetches itself, it only renders what it's given. */
  candidates: SearchComboboxCandidate[];
  status: SearchComboboxStatus;
  /** Already-i18n'd, shown inside the popover when status === "error". */
  errorMessage?: string;
  onRetry?: () => void;

  label: string;
  placeholder: string;
  /** Already-i18n'd, shown when status === "success" && candidates.length === 0. */
  emptyMessage: string;
  clearSelectionAriaLabel: string;
  /** aria-label for the listbox itself (e.g. "Kết quả tìm học sinh"). */
  listboxAriaLabel: string;

  /** Caller-driven invalid state (e.g. duplicate-pair error on the parent
   * combobox, AC-003.4) — this component renders the error border/
   * aria-invalid, the caller owns the actual inline error TEXT (rendered
   * next to the combobox by the caller, same "host owns the message" split
   * as DestructiveConfirmDialog.errorSlot). */
  invalid?: boolean;
  describedById?: string; // links to the caller's own inline error <p id=...>
  disabled?: boolean;
  id?: string; // for <label htmlFor>
}
```

**Keyboard/a11y contract (NFR-002/AC-003.8)**: `Command`'s built-in behavior
supplies arrow-up/down to move the active option, `Enter` to select the
active option (fires `onValueChange` then closes via `onQueryChange("")` +
internal popover close), `Escape` to close without selecting. The trigger
button itself carries `aria-expanded`/`aria-controls`/`aria-haspopup="listbox"`
(Radix `Popover` + `Command`'s own ARIA wiring, inherited — no manual ARIA
needed beyond what `bun ui:add command` ships). When a candidate IS selected,
the trigger renders as a "chip" (avatar + name + subLabel + a clear "x"
button) rather than the search input — the clear button gets
`clearSelectionAriaLabel` and returns focus to the search input on clear
(mirrors the mockup's `PLCombobox` selected-state shape in
`design_src/edu/parent-links.jsx`, now built on real Radix/cmdk primitives
instead of a hand-rolled `mousedown` document listener).

**Placement re-confirmation**: `components/shared/search-combobox/` — composed
(Popover+Command), 2 consumers already exist in this single screen
(satisfies the ≥2-use bar per `component-organization.md` §2 even before a
2nd screen exists), fully domain-agnostic contract. Not a `components/ui/`
primitive itself (it carries an opinionated debounce-friendly/candidate/
subLabel contract beyond what `Command`/`Popover` provide raw) and not
feature-local (its own prop file has zero `parent-links` domain knowledge).

---

## 4. State Ownership (contract level)

Full query-key/invalidation mechanics are `fe-state-engineer`'s call (already
flagged explicitly in plan.md §3) — this table only maps which layer/component
owns each piece of state so the two docs don't drift.

| State | Owner | Controlled prop or internal? |
| --- | --- | --- |
| Links list (`useInfiniteQuery`) | `ParentLinksScreen` | Internal to the container — not a prop anywhere in §2/§3 |
| `q` / `classId` filter (URL-synced) | Committed value: `ParentLinksScreen` (URL search params). Keystroke buffer: `PLFilterBar`'s search `Input` | Split — mirrors `InvitationsSearchInput`'s "ephemeral draft stays local" precedent; container only sees the debounced commit |
| Cursor (pagination) | `ParentLinksScreen` (`useInfiniteQuery` internal) | Internal — never a prop, never part of the query key (plan.md §3 "cursor not in key" rule) |
| Responsive breakpoint (≥760px vs <760px) | `ParentLinksScreen` | Internal — picks which of `PLTable`/`PLCardList` to render; both get identical `PLRowsProps` (§1 decision 1) |
| Row-derived VM (`ParentLinkRowVM[]`) | `ParentLinksScreen` (mapped once per fetch from `ParentStudentLink[]` + i18n label resolution) | Derived, passed down as `rows` — never recomputed inside `PLTable`/`PLCardList`/`PLCard` |
| Create-dialog open/closed | `ParentLinksScreen` | Internal; passed to `PLCreateDialog` as controlled `open` |
| Create-dialog field values (student/parent selection, relationship, note) | `PLCreateDialog` | Internal `useState`, reset on open/close — plain local-form state, no react-hook-form (mirrors `SendInvitationDialog`'s decision) |
| Create-dialog's 2 combobox query/candidates/status | Query text + debounce timer: each `SearchCombobox` instance's caller (`PLCreateDialog`, one `useState` per combobox). Candidates + loading/error: TanStack `useQuery` per combobox, `enabled: debouncedQ.length > 0` (2 independent debounce+enabled gates inside one dialog, per plan.md §3) | `SearchCombobox` itself holds NO server state — fully controlled via `query`/`candidates`/`status` props (§3.3) |
| Detail-dialog open/closed + target `linkId` | `ParentLinksScreen` | Internal; passed to `PLDetailDialog` as controlled `open`/`row` |
| Consent sub-fetch (detail dialog) | `ParentLinksScreen` (`useQuery`, `enabled: detailDialogOpen`) | Derived into `PLConsentDetailSectionProps` — `PLDetailDialog`/`PLConsentDetailSection` never fetch themselves |
| Unlink-target row + confirm-dialog open/loading/error | `ParentLinksScreen` | Internal; `PLUnlinkDialog` receives fully controlled props, which itself builds `DestructiveConfirmDialogProps` internally |
| Unlink mutation — **explicitly NO `onMutate`/optimistic `setQueryData`** | `ParentLinksScreen`'s mutation hook | Row stays visible until 2xx (AC-005.4) — a hook-design constraint, not a component prop, but must be visible in `fe-state-engineer`'s hook contract so `fe-nextjs-engineer` doesn't default to optimistic-by-habit (plan.md §3 already flags this) |
| Toast state | Wherever the codebase's existing toast convention lives (sonner, per `invitations`/other precedent) | Not owned by any component in this tree — fire-and-forget calls from the container's mutation callbacks |

**Hand-off note to `fe-state-engineer`** (in addition to plan.md §3's own
call-outs): please confirm (a) `SearchCombobox`'s controlled `query`/
`candidates`/`status` shape (§3.3) is sufficient for the debounce+`enabled`
gate design you pick for both comboboxes — I deliberately kept zero internal
async state in the shared component so this is 100% your call; (b) the
`errorSlot.tone` mapping I assigned in `PLUnlinkDialogProps` (`forbidden` for
403 role/tenant mismatch, `transient` for network/5xx, **no** errorSlot at
all for the 404 race) matches your planned mutation-state machine — flag if
you'd rather model the 404 race as a 3rd errorSlot tone instead of a
separate toast+close path.

---

## 5. Composition & Variant Strategy

- **No compound-component/slot pattern needed** for feature-local components
  — every one takes flat, explicit props, matching `invitations`/`staffing`/
  `class-management` precedent. No `asChild`/`Slot` usage.
- **`SearchCombobox` is the one genuine composition** in this story:
  `Popover` (positioning/open-state) wrapping `Command` (filter/listbox/
  keyboard semantics) — `PopoverTrigger` renders either the search-input-shaped
  trigger (no selection) or the "chip" (selection present); `PopoverContent`
  hosts `CommandInput`/`CommandList`/`CommandEmpty`/`CommandGroup`/`CommandItem`.
  No `asChild` needed on `PopoverTrigger` itself (it renders a real `<button>`,
  not a polymorphic wrap of an arbitrary child).
- **`cva` variants**: none needed for new components. `PLRelationBadge`/
  `PLConsentBadge` each resolve a fixed lookup `Record` internally (same shape
  as `InvitationRoleBadge`/`InvitationStatusBadge`) and hand the result to
  `StatusBadge`'s existing `tone` prop — no new variant axis on the shared
  primitive (confirmed §0, all 6 needed tones already exist).
- **Design-system pattern reuse**: `StatusBadge` (icon+text badge pattern,
  reused as-is), `EmptyState` (reused as-is), `DestructiveConfirmDialog`
  (reused as-is, zero new props). `Select`/`Textarea`/`Table`/`DropdownMenu`/
  `Avatar`/`Dialog`/`Popover` primitives used directly; `Command` is the one
  net-new primitive (`bun ui:add command`).
- **Extension points (no over-abstraction until 3+ instances)**: `PLSkeleton`/
  `PLError` stay feature-local for now — this is the **3rd–4th** instance of
  a bespoke inline skeleton/error-state pattern across the codebase
  (`lesson-plan`, `question-bank`, `invitations`, now `parent-links`);
  flagging (not executing) the same generic-`components/shared/error-state/`
  promotion candidate `invitations`' doc already flagged — a real decision
  for `fe-lead`, not silently repeated a 5th time without comment.
  `PLRelationBadge`/`PLConsentBadge`/`PLRowMenu` stay feature-local — single
  consumer today; a 2nd consumer elsewhere needing relationship/consent-tinted
  badges or this exact row-menu shape would trigger promotion per
  `component-organization.md`. `SearchCombobox` is the one component
  promoted to `shared/` on day one, per §0/§3.3's justification (2 in-screen
  consumers + domain-agnostic contract).
- **Constructive vs destructive dialog split is intentional**:
  `PLCreateDialog`/`PLDetailDialog` (shadcn `Dialog`) vs `PLUnlinkDialog`
  (`DestructiveConfirmDialog`'s `AlertDialog`) — do not merge; matches the
  repo's established split (`send-invitation-dialog` vs `destructive-confirm-dialog`
  precedent from `invitations`).

---

## 6. Accessibility contract

| Interactive node | Role/label | Keyboard |
| --- | --- | --- |
| `PLFilterBar` search `Input` | `<Input>` with explicit `aria-label` (placeholder alone insufficient per `accessibility.md`) | Standard text input |
| `PLFilterBar` class `Select` | shadcn `Select` → `SelectTrigger aria-label` | Native Radix Select keyboard nav (Space/Enter open, arrows navigate, Esc closes) |
| `PLFilterBar` "Xoá bộ lọc" button | Native `<button>`, only rendered/enabled when `hasActiveFilter` | Tab-reachable, Enter/Space activates |
| `PLPageHeader` "Tạo liên kết" button | Native `<button>` via `Button` | Tab-reachable, Enter/Space activates |
| `PLRowMenu` trigger | shadcn `DropdownMenu` → `role="button" aria-haspopup="menu" aria-expanded`; `triggerAriaLabel` interpolates student+parent name (never 20 identical "Hành động" labels in a table) | `DropdownMenu` default: Enter/Space/Arrow-Down opens, Arrow-Up/Down navigates items, Enter selects, Escape closes and returns focus to trigger |
| `PLRelationBadge` / `PLConsentBadge` | Icon `aria-hidden="true"`, label text always rendered alongside (badges never icon-only, NFR-001) — inherits `StatusBadge`'s existing a11y contract | n/a (not focusable) |
| `SearchCombobox` trigger (unselected = search input state) | `aria-haspopup="listbox"`, `aria-expanded`, `aria-controls` pointing at the `CommandList` (Radix Popover + cmdk `Command` inherited wiring) | Typing filters the list live; Arrow-Down/Up moves the active `CommandItem`; Enter selects the active item; Escape closes without selecting |
| `SearchCombobox` selected-state "chip" clear button | `aria-label` = `clearSelectionAriaLabel` (interpolates the selected candidate's name) | Tab-reachable, Enter/Space clears and returns focus to the (now visible again) search input |
| `SearchCombobox` listbox | `role="listbox"` (cmdk default) with `aria-label` = `listboxAriaLabel`; each result is a `CommandItem` (`role="option"`) | Covered above — full flow (open → filter → arrow-navigate → select) completes with no mouse, satisfying AC-003.8/NFR-002 |
| `PLCreateDialog` | shadcn `Dialog` → `role="dialog"`, focus trap, `aria-labelledby`/`aria-describedby` (Radix-inherited); submit button `aria-busy` while `isSubmitting`, disabled until student+parent+relationship all selected | Escape closes (guarded while submitting); Tab cycles: student combobox → parent combobox → relationship select → note textarea → cancel/submit |
| `PLCreateDialog` duplicate/validation inline error | `role="alert"` (AC-003.3's exact requirement) — rendered next to the parent combobox, `describedById` wired to `SearchCombobox`'s `aria-describedby` | n/a (announced on appearance) |
| `PLUnlinkDialog` | Inherits `DestructiveConfirmDialog`'s existing contract unchanged: `role="alertdialog"` (Radix `AlertDialog`), focus trap, initial focus on Cancel, focus returns to the triggering row-menu item on close (AC-005.2/.9) | Escape/overlay-click → cancel (unless loading); Tab cycles cancel↔confirm |
| `PLDetailDialog` | shadcn `Dialog` → `role="dialog"`, focus trap (Radix-inherited); only interactive control is "Đóng" (Close) — no edit control anywhere (FR-012, AC-004.5) | Escape closes; Tab reaches the Close button only (label-value rows are static text) |
| `PLConsentDetailSection` | Its own `role="status"` while loading, `role="alert"` on error with a retry `<button>` — scoped to this section only, never the whole dialog (AC-004.3/.4) | Retry button Tab-reachable, Enter/Space activates |
| `PLCardList` / `PLCard` action affordances | Same `PLRowMenu` component as the table — identical a11y contract, no separate mobile-only interaction pattern (UC-007's "action menu keyboard-operable identically to desktop") | Same as `PLRowMenu` above |
| Toasts (create success/duplicate/network, unlink success/"already removed"/network) | Inherits whatever toast primitive's built-in `role="status"`/`aria-live` (sonner, per repo convention) | n/a |

All badges pair icon+text per NFR-001 — none render color-only. `SearchCombobox`
is flagged (plan.md §4) as the highest a11y-risk surface in this story;
`fe-accessibility-auditor` should test its keyboard flow before the
create-dialog composition test (bottom-up), per that flag.

---

## Cross-references

- `plan.md` §0 (ground-truth precedent), §2 Phase 4 (component sketch this
  doc finalizes), §3 (component + state sketch, both explicit specialist
  call-outs this doc resolves), §4 (risks — `SearchCombobox` a11y risk,
  security-critical `authCtx` note that this doc does not touch).
- `spec.md` §"High-Risk Security Enforcement" — `PLUnlinkDialog`'s
  consequence-copy requirement (pt. 4) is why `body` must be the
  DR-014-verbatim interpolated string, not a generic confirm.
- `design-spec.jsonc` `screens.parentLinks` (line ~4198) — every color/icon/
  maxWidth/badge-tone rule in §0/§2/§3 above is sourced from this entry
  verbatim.
- `design_src/edu/parent-links.jsx` — `ParentLinksScreen`/`PLCombobox`/
  `PLCreateDialog` read in full before writing this doc. Component names here
  are **not** 1:1 copies of the mockup's `PL*` names for `PLCombobox`
  specifically (renamed to the domain-agnostic `SearchCombobox` and moved to
  `components/shared/`, §0/§3.3) — all other `PL*` names are kept as this
  repo's admin/* convention (feature-local, screen-prefixed).
- New shared component: `src/components/shared/search-combobox/` (net-new,
  depends on the net-new `src/components/ui/command/` — run `bun ui:add
  command` first).
- Reused as-is: `src/components/shared/status-badge/`,
  `src/components/shared/empty-state/`,
  `src/components/shared/destructive-confirm-dialog/`.
- Sibling precedent read in full before writing this doc:
  `docs/stories/epics/E21-tenant-invitations/US-E21.1-admin-invitations/component-architecture.md`
  and its matching `src/features/admin/invitations/presentation/invitations-screen/**`.
