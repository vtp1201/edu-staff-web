# US-E19.2 — Component Architecture (fe-component-architect)

Scope: component tree + prop/ViewModel contracts only, per plan.md Phase 1 and
Phase 5. No implementation code. Reuse verified against `components/ui`,
`components/shared`, and `features/audit-log/presentation/audit-log-screen`
(structural precedent) before proposing anything new.

## 0. Flags back to fe-lead (read before implementing)

1. **`ReportContentDialog` prop shape — 2 refinements to plan.md Phase 1's draft:**
   - Drop `contentId` from the dialog's own props. The dialog is presentation-only
     (`{ kind, authorName, contentPreview }` is all it needs to render); the host
     already knows `contentId` because it invoked the dialog with it, so the host's
     own `onSubmit`-wrapping closure captures `contentId` when it calls its own
     `'use server'` action. Keeping `contentId` off the dialog's contract keeps it
     truly presentation-agnostic (no accidental coupling to how a caller identifies
     content).
   - Add a retry callback into `transientError` (plan.md's draft had
     `transientError?: {message}` with no way to retry, but AC-1922.4 requires "an
     inline error with retry"). Shape: `transientError?: { message: string; onRetry:
     () => void }`.
2. **plan.md Phase 2 is missing a filter entity.** `list-reports.use-case.ts` takes
   a `filter` param but no `report-queue-filter.entity.ts` is listed among Phase
   2's entities. Add one (see §3 `ReportQueueFilter`) — small, but the VM/query-key
   contract needs it and it should live in `domain/entities`, not be improvised
   ad-hoc in presentation.
3. **Confirm-remove dialog extension is CONFIRMED sound** (§2 below) — with one
   added behavior beyond plan.md's prop shape: when `errorSlot.tone === "forbidden"`,
   the component must also force the **confirm button itself disabled** (not just
   omit the retry button), otherwise a user can defeat "no retry" by simply
   re-clicking the original "Gỡ nội dung" button. This is a structural requirement,
   not just an omission — flagging because AC-1928.6/1928.9 are the story's central
   high-risk AC and this nuance is easy to miss in code review.
4. **Responsive table→card switch (≤760px) has no JS-hook precedent in `src/`**
   (`useViewportWidth` only exists in `design_src/edu/ui.jsx`, the mockup). Recommend
   a CSS-only switch (`hidden md:block` table / `block md:hidden` cards) — SSR-safe,
   no hydration mismatch, no extra JS. 760px doesn't map to a default Tailwind
   breakpoint (`sm`=640, `md`=768, `lg`=1024) or an existing `--breakpoint-*` token
   in `tokens.css`; nearest is `md` (768px), 8px off design-spec's 760px. Recommend
   accepting `md:` as the practical breakpoint (no new token) unless `fe-lead`/
   `uiux` wants a custom `--breakpoint-mod` token — flagging as a token question,
   not deciding it myself.
5. **Duplicate `ErrorBanner` pattern (4th instance).** `error-banner.tsx`-shaped
   inline components already exist independently in
   `features/audit-log/presentation/audit-log-screen/components/error-banner.tsx`,
   `features/grades/presentation/grade-book-screen/grade-book-screen.tsx`, and
   `features/exam/presentation/exam-taking/exam-detail-screen.tsx`. This story adds
   a 4th (queue-level + detail-sheet-level + audit-tab-level all need one). Per
   `component-organization.md`'s repeated-pattern rule, this is a promotion
   candidate (`components/shared/error-banner/`) — but promoting the *other 3*
   call sites is out of this story's scope. Recommendation: build this story's 3
   error-banner usages as ONE feature-local component
   (`features/moderation/presentation/moderation-screen/components/report-error-banner.tsx`,
   parameterized by `titleKey`/`errorKey`/`onRetry`/`showRetry`) reused across all
   3 surfaces in moderation only, and flag the cross-feature promotion as a
   separate follow-up story (not silently done here).

## 1. Architecture Summary

**Deliverable 1 — shared `ReportContentDialog`** (`components/shared/report-content-dialog/`):
pure presentational dialog, host-controlled open/async state (same ownership model
as `DestructiveConfirmDialog`). Zero new primitives needed — built on existing
`ui/dialog`, `ui/radio-group`, `ui/textarea`, `ui/button`. Consumed verbatim by
this story (none directly), US-E19.1 (feed), and later US-E10.6 (messaging) —
those callers each write their own thin `'use server'` action wrapping the shared
`bootstrap/di/moderation.di.ts::makeSubmitReportUseCase()`; the dialog itself never
imports DI.

**Deliverable 2 — `ModerationScreen`** (`features/moderation/presentation/moderation-screen/`):
container mirrors `audit-log-screen.tsx`'s RSC-seed + `useInfiniteQuery` +
URL-synced filter pattern (structurally, not the same entities/repository).
Reuses `StatCard`, `StatCardSkeleton`, `StatusBadge`, `EmptyState` verbatim.
Extends `DestructiveConfirmDialog` (new optional `errorSlot` prop) instead of
forking a confirm-remove dialog — confirmed sound, see §2 and flag #3 above.

**No new `ui/` primitives required.** `dialog`, `sheet`, `tabs`, `select`,
`radio-group`, `textarea`, `skeleton` all already exist in `components/ui/`.

## 2. Component Tree

### 2a. `ReportContentDialog` (new, `components/shared/report-content-dialog/`)

```
ReportContentDialog                          'use client' · presentational · controlled (open/async by host)
└── Dialog (ui/dialog, Radix)                 focus-trapped, role="dialog" aria-modal
    └── DialogContent
        ├── header: icon box (flag, warning tint) + DialogTitle
        ├── quoted preview (3-line clamp of `contentPreview`)
        ├── reason RadioGroup (ui/radio-group)  role="radiogroup" — internal state
        │   └── 5× RadioGroupItem (REPORT_REASONS ids, i18n labels)
        ├── note Textarea (ui/textarea)         shown only when reason === "other" — internal state
        ├── inline slot (mutually exclusive, by which error/info prop is set):
        │   ├── fieldError → inline field-error text (422)
        │   ├── transientError → inline error + Retry button (429/502/503/504)
        │   └── infoMessage → inline info-toned message (409 ALREADY_REPORTED)
        └── footer: Cancel (ghost) + Submit (primary, disabled until valid, aria-busy while isSubmitting)
```

Reused as-is: `ui/dialog`, `ui/radio-group`, `ui/textarea`, `ui/button`. No `shared/`
composed component reused here (this IS the new composed component).

### 2b. `ModerationScreen` (new, `features/moderation/presentation/moderation-screen/`)

```
(app)/principal/moderation/page.tsx           RSC — reads searchParams, calls DI use-cases, builds VM
└── ModerationScreen                           'use client' · CONTAINER (owns TanStack Query + URL state)
    ├── StatRow                                'use client' · presentational
    │   └── 3× StatCard (components/shared/stat-card, REUSED)   or 3× StatCardSkeleton while loading
    ├── ViewTabs (ui/tabs, REUSED)              "Hàng chờ báo cáo" | "Nhật ký kiểm duyệt" — controlled by container
    ├── [view === "queue"]
    │   ├── QueueFilterBar                      'use client' · presentational, controlled (draft prop + onChange)
    │   │   ├── status Tabs (ui/tabs, REUSED)
    │   │   ├── content-type Select (ui/select, REUSED)
    │   │   └── search Input (ui/input, REUSED) + refresh IconButton
    │   ├── ReportQueueResults                  'use client' · presentational · status-driven (loading/empty/error/success)
    │   │   ├── loading → 5× Skeleton row (ui/skeleton, REUSED)
    │   │   ├── empty-positive → EmptyState (components/shared/empty-state, REUSED, tone=success/checkSquare)
    │   │   ├── empty-filtered → EmptyState (REUSED, tone=neutral/search icon)
    │   │   ├── error → ReportErrorBanner (new, feature-local, see flag #5)
    │   │   └── success →
    │   │       ├── ReportTable (new)           hidden md:block — desktop
    │   │       │   └── row → StatusBadge ×2 (reason badge + status badge, components/shared/status-badge, REUSED)
    │   │       └── ReportCard × N (new)        block md:hidden — mobile, same fields stacked
    │   └── LoadMoreButton (pattern REUSED from audit-log's, feature-local copy — cursor pagination)
    ├── [view === "audit"]
    │   └── AuditTimelineTab (new)              'use client' · presentational · status-driven
    │       ├── loading → Skeleton rows (ui/skeleton, REUSED)
    │       ├── empty → EmptyState (REUSED, simple — no positive/filtered split)
    │       ├── error → ReportErrorBanner (new, shared w/ queue — see flag #5)
    │       └── success → timeline list, each row: actor + action StatusBadge (icon+text, REUSED) + content ref + timestamp + reason
    ├── ReportDetailSheet (new)                 'use client' · presentational · controlled (open + reportId prop)
    │   ├── Sheet (ui/sheet, REUSED, side="right", w-[440px])
    │   ├── loading → Skeleton block
    │   ├── error (404) → inline error, no stale render (component NEVER renders cached props while `status==="error"`)
    │   ├── error (transient) → ReportErrorBanner (retry)
    │   └── success →
    │       ├── content section (author + full content)
    │       ├── context section (original post | 3 nearby messages, highlighted)
    │       ├── report section (reporter/reason StatusBadge/note)
    │       ├── DuplicateReportList (new)        omitted/"0" when duplicateReports.length <= 1
    │       ├── [status === "pending"] footer: Dismiss (ghost) + "Gỡ nội dung" (destructive, principal-only)
    │       └── [status !== "pending"] resolve-info section (resolvedBy/resolvedAt/resolveNote) — REPLACES footer, not alongside it
    └── DestructiveConfirmDialog (components/shared/destructive-confirm-dialog, EXTENDED not forked)
        └── + errorSlot prop (new, optional) — forbidden/transient inline slot, see §2c
```

Reused verbatim (no changes needed): `StatCard`, `StatCardSkeleton`, `StatusBadge`,
`EmptyState`, `ui/tabs`, `ui/select`, `ui/skeleton`, `ui/sheet`, `ui/dialog`(via
the extended `DestructiveConfirmDialog`, which already wraps `ui/alert-dialog`).

New, feature-local (`features/moderation/presentation/moderation-screen/`, single
screen, no promotion trigger yet per `component-organization.md`'s "1 screen →
feature-local" rule): `StatRow`, `QueueFilterBar`, `ReportQueueResults`,
`ReportTable`, `ReportCard`, `AuditTimelineTab`, `ReportDetailSheet`,
`DuplicateReportList`, `ReportErrorBanner`, `LoadMoreButton` (feature-local copy of
the audit-log pattern — not shared because the two features' pagination result
shapes differ and premature abstraction was explicitly rejected in
`audit-log`'s own history per this repo's YAGNI convention).

### 2c. `DestructiveConfirmDialog` extension (existing component, `components/shared/destructive-confirm-dialog/`)

Confirmed sound: this is a composed component with ≥1 existing consumer already
(staff-leave reject flow, discipline actions — grep shows generic reuse), and the
new need ("show a role-specific inline error inside an otherwise-identical
confirm flow") is exactly what a `variant`/slot prop is for, not a new component.

**Exact prop addition (backward-compatible — optional, no existing caller breaks):**

```ts
export interface DestructiveConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  isLoading?: boolean;
  /** NEW — inline error slot rendered between body and footer. Absent = no
   *  behavior change from today. */
  errorSlot?: {
    tone: "forbidden" | "transient";
    /** Already-resolved (i18n'd by caller) message text. */
    message: string;
    /** Retry callback. STRUCTURALLY ignored when tone === "forbidden" — the
     *  component's own render logic never mounts a retry control for that
     *  tone, regardless of whether onRetry is passed. Passing onRetry with
     *  tone="forbidden" is a no-op, not a caller error, but callers SHOULD
     *  omit it for that tone to avoid implying it does something. */
    onRetry?: () => void;
  };
  onConfirm: () => void;
  onCancel: () => void;
}
```

**Required behavior (beyond the prop shape — a11y/security-critical, must be
specified to the implementer, not left to a "sounds right" interpretation):**

- `errorSlot` renders as a `role="alert"` block, tone-differentiated by BOTH icon
  and text color (never color-only, NFR-102): `forbidden` → a "blocked" icon
  (e.g. `ShieldAlert`/`Ban`) + `text-edu-error-text`; `transient` → `AlertTriangle`
  + a distinct (non-error-red) tone so the two are visually distinguishable from
  each other, not just from the "no error" state.
  - Reuse the tone-mapping convention already established in `StatusBadge`'s
    `statusToneClass` (AA-checked tokens) rather than inventing new color pairs.
- `tone === "forbidden"` → NO retry button rendered, EVER (structural, see above)
  — **AND** the dialog's own confirm button (`DestructiveDialogActions`'s confirm
  `<Button>`) must be forced `disabled` while this tone is showing, independent of
  `isLoading`. Rationale (flag #3): without this, a user can bypass "no retry" by
  clicking the original "Gỡ nội dung" button again — the errorSlot's absence of a
  retry control is meaningless if the primary action button still works. Cancel
  stays enabled (the only way out of a forbidden-state dialog is to close it).
- `tone === "transient"` → retry button rendered (calls `errorSlot.onRetry`); the
  original confirm button MAY remain enabled too (both effectively retry the same
  operation) — no special disabling needed for this tone.
- The host is responsible for clearing `errorSlot` (passing `undefined`) when
  re-opening the dialog fresh or after a successful confirm — the component does
  not auto-clear it (same "host owns async state" rule as `isLoading`).

## 3. ViewModel + Prop Interfaces

### 3a. `report-content-dialog.i-vm.ts` → actually a plain props file (no server↔client
boundary of its own — this component receives everything from its host's own VM/state, not directly from an RSC). Per repo convention this ships as
`report-content-dialog.i-props.ts` (see plan.md Phase 1's own file list) rather
than `.i-vm.ts`, since `.i-vm.ts` is reserved for the screen-level server↔client
contract (`CLAUDE.md` naming table). Contract:

```ts
// src/components/shared/report-content-dialog/report-content-dialog.i-props.ts
export type ReportContentKind = "post" | "comment" | "message";

/** Wire-enum ids (integration.md) — NOT design_src's ids (language/bully/misinfo). */
export type ReportReasonId =
  | "spam"
  | "inappropriate-language"
  | "bullying"
  | "misinformation"
  | "other";

export interface ReportContentDialogProps {
  open: boolean;
  kind: ReportContentKind;
  /** Author of the reported content — display only, framing copy. */
  authorName: string;
  /** Already-resolved plain text/markup-free preview — clamped to 3 lines by CSS. */
  contentPreview: string;
  isSubmitting: boolean;
  /** 422 — inline, non-retryable (user must fix input, not retry the same call). */
  fieldError?: { message: string };
  /** Retryable transient failure (429/502/503/504). */
  transientError?: { message: string; onRetry: () => void };
  /** 409 ALREADY_REPORTED — informational tone, not an error. */
  infoMessage?: string;
  onSubmit: (input: { reason: ReportReasonId; note?: string }) => void;
  onCancel: () => void;
}
```

Internal (uncontrolled) UI state owned BY the component, not lifted to the host:
selected `reason` and `note` text. Reset when `open` transitions `false → true`
(a re-open must start from a clean radiogroup/note, never show the previous
submission's leftover selection). `fieldError`/`transientError`/`infoMessage` are
mutually exclusive by construction (host sets at most one per render — mirrors
how `audit-log`'s `AuditLogResultsStatus` enforces single-state-at-a-time; document
this invariant in the component's JSDoc so `fe-nextjs-engineer` doesn't render two
simultaneously.

### 3b. `moderation-screen.i-vm.ts`

```ts
// src/features/moderation/presentation/moderation-screen/moderation-screen.i-vm.ts
import type { UserRole } from "@/features/auth/domain/entities/auth-user.entity";
import type { AuditEntryEntity } from "../../domain/entities/audit-entry.entity";
import type { ModerationFailure } from "../../domain/failures/moderation.failure";
import type { ModerationStatsEntity } from "../../domain/entities/moderation-stats.entity";
import type { ReportDetailEntity } from "../../domain/entities/report-detail.entity";
import type { ReportEntity } from "../../domain/entities/report.entity";

/** ADDITION to plan.md Phase 2 — see flag #2. Small value entity, no own file
 *  needed beyond domain/entities convention. */
export type ReportStatusTab = "pending" | "resolved" | "all";
export type ReportContentTypeFilter = "all" | "post" | "comment" | "message";
export interface ReportQueueFilter {
  status: ReportStatusTab;
  contentType: ReportContentTypeFilter;
  search: string;
}

export interface ReportQueuePage {
  reports: ReportEntity[];
  nextCursor: string | null;
  hasMore: boolean;
}

/** Stable failure key + retryable flag — no i18n at this boundary (i18n.md). */
type Fail = { ok: false; errorKey: ModerationFailure["type"]; retryable: boolean };

export type ListReportsActionResult =
  | { ok: true; data: ReportQueuePage; stats: ModerationStatsEntity }
  | Fail;

export type GetReportDetailActionResult =
  | { ok: true; data: ReportDetailEntity }
  | Fail;

export type DismissReportActionResult = { ok: true } | Fail;

export interface RemoveContentInput {
  kind: "post" | "comment";
  contentId: string;
  reportId: string;
  /** [OPEN QUESTION per spec.md §8 / plan.md — required-ness TBC with BE.] */
  resolveNote?: string;
}
export type RemoveContentActionResult = { ok: true } | Fail;

export interface AuditLogPage {
  entries: AuditEntryEntity[];
  nextCursor: string | null;
  hasMore: boolean;
}
export type GetModerationAuditLogActionResult =
  | { ok: true; data: AuditLogPage }
  | Fail;

/**
 * Server → client boundary contract for ModerationScreen (US-E19.2). RSC
 * pre-fetches page 1 of the queue (for the default/deep-linked filter) + stats
 * + (only if `tab=audit` deep-linked) page 1 of the audit log; the client
 * container re-fetches on every filter/tab change and cursor "load more" through
 * the same Server Action refs — mirrors `AuditLogScreenVM`.
 */
export interface ModerationScreenVM {
  initialFilter: ReportQueueFilter;
  initialQueuePage: ReportQueuePage;
  initialStats: ModerationStatsEntity;
  /** Non-null only if the RSC-side fetch itself failed (page still renders,
   *  container shows the error state immediately — same pattern as
   *  AuditLogScreenVM.initialErrorKey). */
  initialErrorKey: ModerationFailure["type"] | null;
  /**
   * Defensive-only — the ROUTE is the real gate ((app)/principal/moderation is
   * reached by principal alone in practice); this prop lets the Remove entry
   * point be hidden client-side too (AC-1928.1's "any other role reaching this
   * screen by any means" defense-in-depth), and lets Storybook prove the
   * non-principal case without needing a second route/layout.
   */
  viewerRole: UserRole;

  listReportsAction: (
    filter: ReportQueueFilter,
    cursor: string | null,
  ) => Promise<ListReportsActionResult>;
  getReportDetailAction: (
    reportId: string,
  ) => Promise<GetReportDetailActionResult>;
  dismissReportAction: (reportId: string) => Promise<DismissReportActionResult>;
  removeContentAction: (
    input: RemoveContentInput,
  ) => Promise<RemoveContentActionResult>;
  getModerationAuditLogAction: (
    scopeId: string,
    cursor: string | null,
  ) => Promise<GetModerationAuditLogActionResult>;
}

export type ModerationScreenProps = ModerationScreenVM;
```

## 4. State Ownership (contract level)

| State | Owner | Notes |
| --- | --- | --- |
| `reason`, `note` (report dialog) | `ReportContentDialog` (internal) | Reset on `open` false→true transition. Never lifted — host doesn't need mid-selection visibility. |
| `open` (both dialogs) | Host (container) | Same ownership model as existing `DestructiveConfirmDialog` — host is the single source of truth for visibility. |
| `isSubmitting` / `isLoading` | Host, via `useMutation.isPending` | Passed down as a prop; dialogs never track their own network state. |
| `fieldError`/`transientError`/`infoMessage` (report dialog) | Host | Derived from the mutation's last error; host clears on next open/submit attempt. |
| `errorSlot` (confirm-remove) | Host | Same — host clears on re-open/success. |
| Status/type/search filter (queue) | Container (`ModerationScreen`), URL-synced | Mirrors `AuditLogScreen`'s draft-in-state + debounced-to-URL pattern; `fe-state-engineer` owns exact debounce/query-key mechanics. |
| Active view tab (queue/audit) | Container | Local `useState`, OR URL-synced (`?tab=`) — deferring the exact mechanism to `fe-state-engineer`, but SHOULD be URL-synced for deep-linkability (consistent with the rest of the filter state already being URL-synced). |
| Selected `reportId` (detail sheet open) | Container | Local `useState<string | null>`; sheet's `open` = `reportId !== null`. |
| Queue/detail/audit data | TanStack Query (via `fe-state-engineer`'s `moderationKeys`) | NOT this document's concern — see hand-off note below. |
| `viewerRole` | RSC → VM prop → container → `ReportDetailSheet` | Read-only, never mutated client-side. |

**Hand-off to `fe-state-engineer`:** query-key shapes (`moderationKeys.list/detail/audit`)
and the invalidation graph (dismiss/remove → `lists()` + `detail(reportId)` +
(remove only) `audit(scopeId)`) are explicitly NOT decided here — plan.md already
assigns this to `fe-state-engineer`. This document only fixes the VM's shape (what
data/actions cross the RSC→client boundary), not how TanStack Query caches it.

## 5. Composition & Variant Strategy

- **`ReportContentDialog`**: no compound/slot API needed — it's a fixed-shape
  form dialog (reason + optional note + one of 3 mutually-exclusive inline
  message slots). No `cva` variants; tone differentiation for the 3 message
  slots is handled by 3 distinct optional props, not a single `variant` enum,
  because at most one is ever set and each has a different shape (`fieldError`
  has no retry, `transientError` requires one, `infoMessage` is a bare string) —
  a single discriminated-union prop (e.g. `error?: {kind, message, onRetry?}`)
  was considered but REJECTED in favor of 3 separate optional props: it keeps
  each call site's intent obvious without a runtime type-narrow, and matches
  the existing `DestructiveConfirmDialog` precedent of one concern per prop.
- **`DestructiveConfirmDialog` extension**: `errorSlot.tone` is exactly a `cva`-style
  variant discriminant (2 values) — implement the tone→icon/color mapping the same
  way `StatusBadge`'s `TONE_CLASS` record does (lookup table, not `cva()` itself
  since there's no Tailwind class-merging complexity here, just icon+color pairs).
- **`ReportTable` / `ReportCard`**: NOT two independently-built components with
  duplicated formatting logic — both consume the same row-shape formatting
  helpers (reason label, status tone, duplicate-count suffix) so a design change
  to e.g. the reason-badge tone map only needs one edit. Structure this as a
  shared `formatReportRow(report)` pure function (feature-local, colocated) that
  both `ReportTable` and `ReportCard` call, rather than each re-deriving badge
  tones inline.
- **`Radix Slot`/`asChild`**: not needed anywhere in this story's new components
  — no case here where a component needs to render "as" an arbitrary host element.
- **Extension point discipline (no over-abstraction until 3+ instances):**
  `ReportErrorBanner` is built feature-local for THIS story's 3 internal call
  sites (queue/detail/audit), per the "don't promote a pattern with <3 real
  instances outside a single feature" convention seen in `audit-log`'s own
  history — see flag #5 for the cross-feature promotion note.

## 6. Accessibility Contract

| Element | Role/label | Keyboard |
| --- | --- | --- |
| `ReportContentDialog` | `role="dialog"` `aria-modal="true"` `aria-labelledby` → dialog title (via `ui/dialog`'s Radix wiring) | Focus-trapped (Tab loop); Escape closes via `onCancel`; focus returns to invoking trigger on close (Radix default, verify not overridden) |
| Reason radiogroup | `role="radiogroup"` with an accessible group label (i18n); each `RadioGroupItem` has a visible `<label>` | Arrow keys move selection (Radix `RadioGroup` default); Tab enters/exits the group as one stop |
| Note `Textarea` (when shown) | `<label>`/`aria-label` "Mô tả lý do báo cáo"; `aria-required="true"` while reason="other" | Standard text input |
| Inline error/info slots | `aria-live="polite"` region (or `aria-describedby` linking the field) so screen readers announce validation/transient/info state without a focus shift | N/A (no interactive control except the Retry button) |
| Submit button | `aria-busy={isSubmitting}`; `disabled` until valid | Enter/Space activates when focused |
| Cancel button | plain button, no special role | Enter/Space/Escape (Escape via dialog-level handler) |
| `ReportDetailSheet` | `ui/sheet`'s Radix `Dialog` primitive → `role="dialog"` `aria-modal`, focus-trapped, Escape + return-focus-on-close inherited | Tab loop within sheet; row-trigger button gets an accessible name "Mở chi tiết báo cáo {id}" (per spec.md's row action column) |
| Dismiss/Remove buttons (sheet footer) | Icon+label buttons (never icon-only without `aria-label`); Remove uses the `destructive` `Button` variant (visually AND semantically distinct, NFR-102) | Standard button activation |
| `DestructiveConfirmDialog` (extended) | Inherited `role="alertdialog"`, focus-trapped, initial focus moved to Cancel (existing behavior, unchanged) | Tab loop; Escape → `onCancel` |
| `errorSlot` block | `role="alert"` (assertive announcement is appropriate — this is a failed destructive action, high salience) | Retry button (transient only) is a normal focusable `<button>`, reachable in Tab order after the message |
| Status/reason/action badges (`StatusBadge`, reused) | Icon + text children (never color-only, per NFR-102 and the existing `StatusBadge` convention) | N/A (non-interactive) |
| `ReportTable` rows | Entire row is one `<button>`/`role="button"` per spec's "rowClickable" — must NOT create nested-interactive violations (no nested `<button>` inside the row's own click target; badges inside are non-interactive spans) | Enter/Space opens detail sheet |
| Audit timeline entries | Read-only — explicitly NO button/control anywhere in this subtree (AC-1929.6); action badge still icon+text | N/A |
| Responsive breakpoint (≤760px card switch) | Both variants render the SAME semantic content/labels — screen-reader users get identical information regardless of viewport | N/A |

Both dialogs' full focus-trap/Escape/return-focus behavior should be verified by
`fe-accessibility-auditor` per NFR-102 — this table specifies the contract these
audits check against, not a substitute for the actual audit.
