# US-E19.1 — Social Feed — Component Architecture

Status: draft (architecture-only, no code). Author: `fe-component-architect`.
Sources read in full: `story.md`, `spec.md`, `use-cases.md`, `plan.md` (§0 Reuse
ledger + Phase 2–5 + "Component + state sketch"), `design_src/edu/feed.jsx`
(`FeedScreen`), `docs/product/design-spec.jsonc` → `screens.feed` (~line 3753),
`ReportContentDialog`/`DestructiveConfirmDialog` source, existing `src/components/ui/*`
+ `src/components/shared/*`, and 3 close structural precedents in this repo:
`notifications-center-container.tsx` (container/screen split + query-key factory),
`moderation-screen.tsx` (single-dialog-at-root pattern, `LoadMoreButton`,
`ReportErrorBanner`), `ChildSelector.tsx` (hand-rolled `role=tablist` pill tabs with
manual-activation arrow-key nav — the closest existing precedent for `ScopeTabs`).

## 0. Corrections to plan.md's ground truth (read before building)

1. **`EduSkeleton`/`EduEmpty`/`EduError` do NOT exist as named components in `src/`.**
   Plan.md's Reuse ledger #7 names them as "existing shared state primitives" — that
   is `design_src/edu/states.jsx` naming only. The real, current canonical pieces are:
   - **Empty** → `components/shared/empty-state` (`EmptyState`, props
     `{icon, title, body?, cta?, className?}`) — genuinely canonical, reuse directly.
   - **Loading** → no shared skeleton component exists; every feature composes its
     own skeleton rows from the `ui/skeleton` (`Skeleton`) primitive
     (`notifications-center.tsx`'s `SkeletonRows`, `principal/reports`'
     `chart-skeleton.tsx`). Feed should do the same: a feature-local
     `feed-skeleton-rows.tsx`, not a new shared component (no 3rd caller yet to
     justify promotion).
   - **Error** → no shared error-state component exists either. Three
     near-identical feature-local implementations already exist (`RegionErrorState`
     in `principal/reports`, `ReportErrorBanner` in `moderation`, both `role="alert"`
     + icon + title + message + optional retry). Feed will be a **4th** occurrence.
     Copy `ReportErrorBanner`'s prop shape exactly (pre-translated strings, no
     `useTranslations` inside the component — most decoupled of the two) as
     `feed-error-state.tsx`, feature-local for now. **Flag to `fe-lead`**: this is
     now 3–4 occurrences of the same shape — a good candidate for a fast-follow
     promotion to `components/shared/inline-error-state/` (out of this story's
     scope; don't block on it here per YAGNI/no-over-abstraction-until-3+-instances,
     but it has now crossed that threshold across the codebase as a whole).
2. **`LoadMoreButton` (`moderation-screen/components/load-more-button.tsx`) IS a
   promotion candidate RIGHT NOW** (not "flag for later" — this story is exactly the
   2nd caller). Its prop shape (`hasMore`, `isLoadingMore`, `onLoadMore`, `hasError?`)
   is generic pagination UI with zero moderation-specific logic and maps 1:1 onto
   feed's AC-1908.1–.5. **`fe-nextjs-engineer` should move (not copy)** this file to
   `components/shared/load-more-button/` (+ `index.ts` + `.stories.tsx`), update
   moderation's import, and have feed import from the shared location — per
   component-organization.md's "promote, don't copy" rule. Do not create a second
   `feed-load-more-button.tsx`.
3. **Comment-item menu scope — resolving a design_src vs. use-cases discrepancy.**
   `design_src/edu/feed.jsx`'s `FeedComments` and `design-spec.jsonc`'s
   `commentThread.menu` show a comment menu with **Remove** ("Gỡ bình luận", author
   or moderator, danger) in addition to Report. However `use-cases.md`/`spec.md`
   (UC-1905/UC-1910/FR-006/FR-012) only define role-gating AC for **posts**; no AC
   exists anywhere for comment removal, and the task brief for this architecture
   pass explicitly directs: *"comment-item ... report-only per UC-1905 — comments
   never show pin/remove."* This document follows that directive (authoritative for
   this story's scope) over the design_src mock. `FeedMenu` on a comment therefore
   only ever computes `canReport` (never `canPin`/`canRemove`). **Flagging to
   `fe-lead`**: if comment-remove is actually wanted, it needs its own AC in
   `use-cases.md` first (own-comment-author self-remove is a distinct rule from
   moderator-remove, and neither exists in the story's AC table today) — treat as
   an explicit out-of-scope note in the Evidence section when implemented, not a
   silent gap.
4. **`ReportContentDialog` and `DestructiveConfirmDialog` do NOT use
   `use-dialog-return-focus.ts`.** Confirmed by reading both source files — neither
   imports the hook, and both are invoked with **no mounted `<DialogTrigger>`/
   `<AlertDialogTrigger>`** (host renders bare `<Dialog open=.. onOpenChange=..>` /
   `<AlertDialog open=.. onOpenChange=..>`), which is exactly the failure mode the
   hook's own doc comment describes (`context.triggerRef` stays `null` → focus falls
   to `<body>` on close instead of returning to the "…" trigger button that opened
   the menu that opened the dialog). Per plan.md Phase 5's own directive: **do not
   patch this inside US-E19.1's scope.** Flag to `fe-lead` as a fast-follow on
   US-E19.2's two shared dialogs (add `useDialogReturnFocus(open)` →
   `onCloseAutoFocus` inside `DialogContent`/`AlertDialogContent` in those two
   files). Feed's own `FeedMenu` (built on `DropdownMenu` with a real
   `DropdownMenuTrigger asChild` wrapping a `<Button>`, per the `ExamCard`
   precedent) does NOT need the hook itself — Radix's native trigger-ref focus
   restore already works there, because a real `<Trigger>` is mounted.

## 1. Architecture Summary

**Scope**: `(app)/(shared)/feed`, all 4 roles. Net-new `src/features/feed/`
presentation tree under `src/features/feed/presentation/feed-screen/`, matching
plan.md's file sketch.

**New components** (all feed-local unless marked shared/promoted):
`FeedScreen` (presentational), `FeedScreenContainer` (query/mutation owner),
`ScopeTabs`, `FeedComposer`, `FeedSkeletonRows`, `FeedErrorState`, `FeedPostCard`,
`FeedImageGrid`/`FeedImg`, `FeedReactionBar`, `FeedMenu`, `FeedPinBadge`,
`FeedComments` (query-owning leaf), `FeedCommentItem`.

**Reused, not rebuilt**: `EmptyState` (shared), `ReportContentDialog` (shared,
US-E19.2), `DestructiveConfirmDialog` (shared, US-E19.2), `Skeleton`/`Avatar`/
`Badge`/`Button`/`DropdownMenu`/`Popover`/`Textarea` (all `ui/`, already present —
**no `bun ui:add` needed**, see §2 for the full list).

**Promoted during this story**: `LoadMoreButton` moderation → `components/shared/`
(see §0.2).

**Missing primitives**: none. Every primitive this screen needs already exists
under `src/components/ui/`. The one genuinely novel piece of UI — the "class
scope has a nested `role=listbox` when the user belongs to >1 class" — has no
existing `Listbox` primitive in this codebase; it is built feature-local on top
of the existing `Popover` primitive (dismiss/positioning) with hand-rolled
`role="listbox"`/`role="option"` markup inside, matching the one precedent for a
hand-rolled ARIA pattern in this repo (`ChildSelector`'s hand-rolled `tablist`).
Do not request a new `ui/listbox` primitive for a single call site — flag as a
candidate only if a 3rd screen needs the same shape.

**Key decisions**:
- `ScopeTabs` is a hand-rolled `role=tablist` component (NOT the shadcn `Tabs`
  primitive) — Radix `Tabs`' default automatic-activation model does not match
  AC-1901.7's explicit manual-activation requirement ("arrow keys move focus;
  Enter/Space activates"), whereas `ChildSelector` already implements exactly
  this manual-activation pattern by hand. Reuse that shape, not the primitive.
- `FeedMenu` is **one** component used for both post-level (all 3 items possible)
  and comment-level (report-only) menus, via optional props — never two menu
  components (component-organization.md).
- Pinned-sort and menu-visibility are pure domain-policy functions
  (`sort-posts.ts`, `menu-visibility.ts`, per plan.md Phase 0) called ONLY inside
  `FeedScreenContainer`; every presentational component receives already-sorted
  arrays and already-computed `{canPin, canRemove, canReport}` booleans as props.
- All TanStack Query/mutation ownership is centralized in `FeedScreenContainer`
  for the top-level feed list and its actions — **except** `FeedComments`, which
  owns its own per-post `useQuery`/mutation (justified in §4 — N independently
  mounted/unmounted instances is a different shape than the single
  `moderation-screen` audit tab, which centralizes because there's only one).
- Exactly one `ReportContentDialog` instance and one `DestructiveConfirmDialog`
  instance are mounted at the container root (mirrors `moderation-screen.tsx`'s
  single-dialog-at-root pattern) — never one per card/comment row.

## 2. Component Tree

```
app/[locale]/t/[tenant]/(app)/(shared)/feed/page.tsx          RSC
  (resolves role, myClasses, current-user identity; passes as FeedScreenVM props
   + Server Action refs to the container — no business logic here)
 └─ FeedScreenContainer                                        'use client', CONTAINER
     (src/features/feed/presentation/feed-screen/feed-screen-container.tsx)
     owns: useInfiniteQuery(feed list per scope), useMutation(react/create-post/
     pin-toggle), sort-posts.ts + menu-visibility.ts calls, dialog-open state
     (reportTarget, removeTarget), scope/activeClassId local state
     │
     ├─ ScopeTabs                                              presentational, controlled
     │    (components/scope-tabs.tsx)
     │    role=tablist; "Toàn trường" tab + "Lớp <tên>" tab; nested role=listbox
     │    popover (built on ui/Popover) when myClasses.length > 1
     │
     ├─ FeedComposer                                            presentational + own
     │    (components/feed-composer.tsx)                        local textarea/attach
     │    rendered ONLY when container computes canPost(role, activeScope) true —
     │    absent from tree otherwise (AC-1902.1/.2), not merely hidden
     │
     ├─ [state switch — exactly one branch renders, AC-1901.*]
     │    ├─ FeedSkeletonRows          (components/feed-skeleton-rows.tsx) — 3 rows
     │    ├─ FeedErrorState            (components/feed-error-state.tsx) — retryable
     │    │                              vs non-retryable (forbidden/scope-not-found)
     │    ├─ EmptyState (REUSED, components/shared/empty-state) — cta only if canPost
     │    └─ FeedPostCard[]            (components/feed-post-card.tsx), sorted
     │         (pinned-first then createdAt desc — computed in container, NEVER here)
     │         │
     │         ├─ FeedImageGrid → FeedImg[]      presentational, pure
     │         │    (components/feed-image-grid.tsx)
     │         │
     │         ├─ FeedPinBadge (only when post.pinned)   presentational
     │         │    (components/feed-pin-badge.tsx)
     │         │
     │         ├─ FeedReactionBar                        presentational, controlled
     │         │    (components/feed-reaction-bar.tsx)
     │         │
     │         ├─ FeedMenu (post variant: canPin/canRemove/canReport)  presentational
     │         │    (components/feed-menu.tsx) — Radix DropdownMenu, real
     │         │    DropdownMenuTrigger asChild (ExamCard precedent)
     │         │    ├─ onReport  → bubbles to container → opens the ONE
     │         │    │              <ReportContentDialog> mounted at container root
     │         │    └─ onRemove  → bubbles to container → opens the ONE
     │         │                   <DestructiveConfirmDialog> mounted at container root
     │         │
     │         └─ FeedComments (expand-on-demand)          LEAF CONTAINER, 'use client'
     │              (components/feed-comments.tsx)          owns its OWN useQuery +
     │              addComment useMutation, keyed by postId (see §4 for why this one
     │              leaf owns query state instead of the top container)
     │              └─ FeedCommentItem[]                    presentational
     │                   (components/feed-comment-item.tsx)
     │                   └─ FeedMenu (comment variant: canReport ONLY — never
     │                        canPin/canRemove, see §0.3)
     │                        └─ onReport → bubbles up through FeedComments →
     │                           FeedScreenContainer → same single
     │                           <ReportContentDialog> instance (kind: "comment")
     │
     ├─ LoadMoreButton (PROMOTED to components/shared/, see §0.2)   presentational
     │    — absent entirely when !hasMore (AC-1908.3), not disabled
     ├─ [end-of-feed marker]  inline JSX in FeedScreenContainer/FeedScreen — divider +
     │    label, too trivial for its own component/contract
     │
     ├─ <ReportContentDialog>            REUSED (US-E19.2) — single instance, root-mounted
     └─ <DestructiveConfirmDialog>       REUSED (US-E19.2) — single instance, root-mounted
```

**RSC vs client boundary**: everything under `FeedScreenContainer` is client
(`'use client'`); `page.tsx` is the only RSC, and it does nothing but resolve
identity/role/classes server-side and hand Server Action refs + that VM data to
the container (mirrors `(shared)/messages` and `(shared)/notifications` route
shape, per plan.md's reuse ledger #11).

**Presentational vs container**:
- **Pure presentational (props-only, no query/mutation hooks)**: `ScopeTabs`,
  `FeedComposer` (owns only its own draft-text/attach UI state, not server state),
  `FeedSkeletonRows`, `FeedErrorState`, `FeedPostCard`, `FeedImageGrid`/`FeedImg`,
  `FeedReactionBar`, `FeedMenu`, `FeedPinBadge`, `FeedCommentItem`.
- **Container**: `FeedScreenContainer` (top-level query/mutation owner).
- **Leaf container** (owns its own scoped query, still presentation-layer legal
  since it only touches Server Action refs + TanStack Query, never
  infrastructure/DI directly): `FeedComments`.
- **`FeedScreen`** (optional pure-presentational wrapper matching plan.md Phase 2's
  file list, `feed-screen.tsx`) is the render-only shell that `FeedScreenContainer`
  delegates to — same split as `NotificationsCenterContainer` →
  `NotificationsCenterScreen`. Whether `fe-nextjs-engineer` keeps this as two files
  or inlines `FeedScreen`'s JSX directly into the container is an implementation
  call with no contract impact — the props boundary below is what matters.

## 3. ViewModel + Prop Interfaces

Types reference `domain/entities` only (per presentation-layer import rule).
`ReactionType`, `FeedPostEntity`, `FeedCommentEntity` are as scoped in plan.md
Phase 0. `UserRole` is `@/features/auth/domain/entities/auth-user.entity`.

### 3.1 `feed-screen.i-vm.ts` (screen-level VM — RSC → client boundary)

```ts
import type { UserRole } from "@/features/auth/domain/entities/auth-user.entity";
import type {
  FeedCommentEntity,
  FeedPostEntity,
  ReactionType,
} from "../../domain/entities/feed-post.entity"; // + feed-comment.entity, reaction.entity

export interface FeedClassOption {
  classId: string;
  className: string;
}

export type FeedScope = "school" | "class";

/** One page of the feed list (client flattens across pages, mirrors ReportQueuePage). */
export interface FeedPage {
  posts: FeedPostEntity[];
  nextCursor: string | null;
  hasMore: boolean;
}

/** Stable failure key + retryable flag — no i18n at this boundary (i18n.md). */
type FeedFail = { ok: false; errorKey: FeedFailureType; retryable: boolean };
// FeedFailureType = FeedFailure["type"] from domain/failures/feed.failure.ts

export type FetchFeedPageResult = { ok: true; data: FeedPage } | FeedFail;
export type CreatePostResult = { ok: true; data: FeedPostEntity } | FeedFail;
export type ReactToPostResult = { ok: true; data: FeedPostEntity } | FeedFail;
export type ListCommentsResult =
  | { ok: true; data: { comments: FeedCommentEntity[]; nextCursor: string | null; hasMore: boolean } }
  | FeedFail;
export type AddCommentResult = { ok: true; data: FeedCommentEntity } | FeedFail;
/** Always ok:true — mock-first, cannot fail per AC-1909's own test note (§0). */
export type TogglePinResult = { ok: true; data: { postId: string; pinned: boolean } };
export type ReportContentResult = { ok: true } | FeedFail; // FeedFail here = ModerationFailure["type"]
export type RemoveContentResult = { ok: true } | FeedFail; // ditto

export interface FeedScreenVM {
  role: UserRole;
  /** Current user's id — needed by menu-visibility.ts's author check. */
  meId: string;
  meDisplayName: string;
  meAvatarInitials: string;
  myClasses: FeedClassOption[];

  fetchFeedPageAction: (input: {
    scope: FeedScope;
    scopeId?: string; // classId, only when scope === "class"
    cursor?: string | null;
  }) => Promise<FetchFeedPageResult>;
  createPostAction: (input: {
    scope: FeedScope;
    scopeId?: string;
    content: string;
    hasAttachment: boolean;
  }) => Promise<CreatePostResult>;
  reactToPostAction: (input: {
    postId: string;
    reactionType: ReactionType | null; // null = remove
  }) => Promise<ReactToPostResult>;
  listCommentsAction: (input: {
    postId: string;
    cursor?: string | null;
  }) => Promise<ListCommentsResult>;
  addCommentAction: (input: {
    postId: string;
    content: string;
  }) => Promise<AddCommentResult>;
  togglePinMockAction: (input: {
    postId: string;
    pinned: boolean;
  }) => Promise<TogglePinResult>;
  /** Reuse ledger #2 — thin wrapper over makeSubmitReportUseCase(). */
  reportContentAction: (input: {
    kind: "post" | "comment";
    contentId: string;
    reason: string; // ReportReasonId, from report-content-dialog.i-props.ts
    note?: string;
  }) => Promise<ReportContentResult>;
  /** Reuse ledger #3 — thin wrapper over makeRemoveContentUseCase(). */
  removeContentAction: (input: {
    kind: "post" | "comment";
    contentId: string;
  }) => Promise<RemoveContentResult>;
}
```

`FeedScreenContainerProps = FeedScreenVM` (same shape, no extra fields — mirrors
`ModerationScreenProps = ModerationScreenVM`).

### 3.2 `scope-tabs.tsx` — `ScopeTabsProps`

```ts
export interface ScopeTabsProps {
  myClasses: FeedClassOption[];
  /** "school" | classId — already-resolved active tab id. */
  activeScope: "school" | string;
  onSelectScope: (scope: "school" | string) => void;
  /** Already-translated labels — presentation resolves via next-intl, not this component's caller. */
  schoolTabLabel: string;
  classTabLabel: (className: string) => string;
  tablistAriaLabel: string;
  classListboxAriaLabel: string;
}
```
Pure presentational, controlled (no internal "active" state — only internal
listbox-open state for the nested popover). Manual-activation arrow-key nav
(`ChildSelector` pattern): arrow keys move focus only, Enter/Space/click activates.

### 3.3 `feed-composer.tsx` — `FeedComposerProps`

```ts
export interface FeedComposerProps {
  meAvatarInitials: string;
  /** Drives placeholder copy ("Share with the whole school…" vs "…class X…"). */
  activeScopeLabel: { kind: "school" } | { kind: "class"; className: string };
  isSubmitting: boolean;
  /** 422 — inline, content preserved (AC-1902.5). */
  fieldError?: { message: string };
  /** 403 — distinct copy from validation (AC-1902.6). */
  forbiddenError?: { message: string };
  /** Retryable transient (AC-1902.7). */
  transientError?: { message: string; onRetry: () => void };
  onSubmit: (input: { content: string; hasAttachment: boolean }) => void;
}
```
Owns internal draft-text + attach-toggle UI state only (never server state).
`ref`-forwarded focus target for the empty-state CTA ("Đăng bài viết đầu tiên"
→ focuses the composer's textarea), matching design_src's `composerRef`.

### 3.4 `feed-skeleton-rows.tsx` — `FeedSkeletonRowsProps`

```ts
export interface FeedSkeletonRowsProps {
  count?: number; // default 3, per AC-1901.1
}
```

### 3.5 `feed-error-state.tsx` — `FeedErrorStateProps`

```ts
export interface FeedErrorStateProps {
  title: string;
  message: string;
  /** false for forbidden/scope-not-found (AC-1901.4) — no retry control rendered at all. */
  showRetry: boolean;
  retryLabel?: string;
  onRetry?: () => void;
}
```
Structurally identical to `ReportErrorBanner` (see §0.1) — copy that shape.

### 3.6 `feed-post-card.tsx` — `FeedPostCardProps`

```ts
export interface FeedPostCardProps {
  post: FeedPostEntity; // includes reactions.counts, reactions.myReaction, pinned, commentCount
  authorRoleLabel: string; // already-resolved "Giáo viên"/"Teacher" etc.
  scopeLabel: string; // "Toàn trường" | "Lớp 11A2"
  relativeTime: string; // already-computed, not an i18n key (spec.md assumption)
  absoluteTimeTitle: string; // full timestamp for the title attr
  isLongText: boolean; // text.length > 320 — computed once, passed down (or computed inline; pure fn either way)
  menuVisibility: { canPin: boolean; canRemove: boolean; canReport: boolean };
  pinToggleLabel: string; // "Ghim bài viết" | "Bỏ ghim" — context-sensitive, resolved by caller
  notPersistedLabel: string; // AC-1909.3 caption text (feed.pin.notPersisted)
  reactionAriaLabel: (reasonLabel: string, count: number) => string;
  onReact: (reactionType: ReactionType | null) => void;
  onTogglePin: () => void;
  onReport: () => void;
  onRemove: () => void;
  /** FeedComments is embedded here but owns its own query — see FeedCommentsProps below. */
  commentsVm: FeedCommentsProps;
}
```

### 3.7 `feed-image-grid.tsx` — `FeedImageGridProps`

```ts
export interface FeedImageAttachment {
  /** Mock-only placeholder caption + required alt (NFR-001/a11y). */
  label: string;
  alt: string;
}
export interface FeedImageGridProps {
  images: FeedImageAttachment[]; // layout (1/2/3/4+) is a pure function of images.length
}
```
`FeedImg` is an internal sub-component of this file (not exported separately) —
same relationship as design_src's `FeedImg` inside `FeedImageGrid`, no separate
contract needed.

### 3.8 `feed-reaction-bar.tsx` — `FeedReactionBarProps`

```ts
export interface FeedReactionOption {
  type: ReactionType;
  emoji: string;
  label: string; // "Thích" | "Like" — already-translated
}
export interface FeedReactionBarProps {
  reactions: FeedReactionOption[]; // the 4 fixed options, in order
  counts: Record<ReactionType, number>;
  myReaction: ReactionType | null;
  ariaLabel: (option: FeedReactionOption, count: number) => string;
  addReactionAriaLabel: string;
  onReact: (reactionType: ReactionType) => void; // click on an already-mine chip = toggle-off, handled by caller
}
```
The container computes toggle semantics (add/replace/remove) inside its
mutation handler — this component only ever emits "user clicked reaction X",
never decides add-vs-remove-vs-replace itself (that's the optimistic-update
boundary, see §4).

### 3.9 `feed-menu.tsx` — `FeedMenuProps` (ONE component, post AND comment variants)

```ts
export interface FeedMenuProps {
  ariaLabel: string; // "Tuỳ chọn cho bài viết của {author}" | "...bình luận..."
  canReport: boolean;
  onReport: () => void;
  /** Post variant only — omitted entirely (undefined) for comment usage (§0.3). */
  pin?: { pinned: boolean; label: string; onToggle: () => void };
  remove?: { label: string; onRemove: () => void };
}
```
Trigger renders `null` when `!canReport && !pin && !remove` (AC-1905.5 — the
"…" trigger itself absent, not an empty menu). Built on `DropdownMenu` +
`DropdownMenuTrigger asChild` (real trigger mounted, per `ExamCard` precedent —
gives native Escape/outside-click/focus-return for free, no custom hook needed).
`remove` item uses `DropdownMenuItem variant="destructive"` (already supports
this — see `ui/dropdown-menu`'s `data-variant=destructive` styling, no new
variant work needed).

### 3.10 `feed-pin-badge.tsx` — `FeedPinBadgeProps`

```ts
export interface FeedPinBadgeProps {
  label: string; // "Đã ghim"
  notPersistedLabel: string; // AC-1909.3 — always shown alongside, while pinned
}
```
Icon + text only (never color-only, AC-1907.3/NFR-001).

### 3.11 `feed-comments.i-vm.ts` — `FeedCommentsProps` (leaf container)

```ts
export interface FeedCommentsProps {
  postId: string;
  meId: string;
  meAvatarInitials: string;
  /** Post-level moderator flag — comments' Remove is OUT of scope (§0.3), this
   *  flag is currently unused by FeedCommentItem but kept here so a future
   *  in-scope comment-remove doesn't require a new prop threaded from scratch. */
  canModeratePost: boolean;
  listCommentsAction: FeedScreenVM["listCommentsAction"];
  addCommentAction: FeedScreenVM["addCommentAction"];
  /** Bubbles to the container's single shared dialog (§1). */
  onReportComment: (comment: FeedCommentEntity) => void;
}
```
Owns: `useQuery(["feed", "comments", postId])`, enabled only once expanded
(internal `expanded` boolean is this component's own UI state — see §4), and
`useMutation` for `addCommentAction`. Sub-section states are NOT `EduSkeleton`/
`EduEmpty` — inline skeleton rows + inline "Chưa có bình luận" text
(AC-1904.1/.2), each small enough to inline in this file, not separate
components/contracts.

### 3.12 `feed-comment-item.tsx` — `FeedCommentItemProps`

```ts
export interface FeedCommentItemProps {
  comment: FeedCommentEntity;
  authorRoleColorClass: string; // resolved by caller from a role→tone map (existing status-badge tone pattern)
  relativeTime: string;
  absoluteTimeTitle: string;
  canReport: boolean; // !== comment.authorId === meId
  onReport: () => void;
}
```

## 4. State Ownership

| State | Owner | Notes |
| --- | --- | --- |
| Feed list (per scope+scopeId, paginated) | `FeedScreenContainer` `useInfiniteQuery` | Key `["feed", scope, scopeId ?? "school"]`, mirrors `notificationKeys`/`moderationKeys` factory shape. |
| Pinned-first sort | `FeedScreenContainer`, via `sort-posts.ts` (domain) applied to the flattened+deduped page array with `useMemo` | Never inside `FeedPostCard`/`FeedScreen`. |
| Menu visibility (`canPin`/`canRemove`/`canReport`) | `FeedScreenContainer`, via `menu-visibility.ts` (domain), computed per post at render/`useMemo` time | Presentational `FeedMenu` only receives the resulting booleans. |
| Reaction optimistic toggle | `FeedScreenContainer` `useMutation` with `onMutate`/`onError` rollback via `queryClient.setQueryData` on the feed-list query | Silent rollback (no toast, AC-1903.4); 404 → also removes the post from cache (AC-1903.5). `FeedReactionBar` only reports "user clicked X". |
| Pin/unpin toggle | `FeedScreenContainer` — **synchronous** `queryClient.setQueryData` flip + re-sort (no pending/rollback state at all, since AC-1909 has no failure path), plus a fire-and-forget call to `togglePinMockAction` purely to keep the "every mutation goes through a Server Action" architectural convention — the Action's response is NOT awaited before updating UI and is not authoritative; the client cache is. | This is the "mock-first optimistic boundary" the prompt asks about — resolved here, not in any presentational component. |
| Composer draft text / attach-toggle | `FeedComposer` (local `useState`) | Never lifted to the container — only the final `{content, hasAttachment}` crosses the prop boundary on submit. |
| Comment thread (per post, expand-on-demand) | `FeedComments` itself (`useQuery`/`useMutation`), NOT the top container | **Why not centralize like `moderation-screen`'s single audit tab**: that screen has exactly ONE audit query, always mounted, toggled by a single URL-driven tab state — trivial to hoist. Feed can have **N simultaneously-expanded comment threads**, each independently mounted/unmounted by user interaction per post. Hoisting N independent queries into one container means either an array of `useQuery` calls (hooks-in-a-loop, illegal) or `useQueries` with a manually-tracked "which posts are expanded" array — materially more container complexity for zero Clean-Architecture benefit, since `FeedComments` already only touches Server Action refs + TanStack Query (the sanctioned client-data pattern, same rule `NotificationsCenterContainer` operates under), never infra/DI directly. Flagging this explicitly per the prompt's ask — `fe-state-engineer` should confirm the query-key shape (`["feed","comments",postId]`) and staleTime, but the ownership-location call is made here. |
| Expand/collapse comment section | `FeedPostCard` or `FeedComments` itself (implementation detail — either is fine; not server state) | Matches `showComments` local state in design_src. |
| Active scope tab + active classId | `FeedScreenContainer` local `useState`, default `"school"` | Per spec.md's open question, URL-persistence is NOT decided yet — flagged to `fe-state-engineer` as a design choice (candidate: searchParam), not blocking this contract. If `fe-state-engineer` decides to move it to the URL, only `FeedScreenContainer`'s internal wiring changes — `ScopeTabsProps` (`activeScope`/`onSelectScope`, both controlled) is agnostic to where that state actually lives. |
| Report dialog open/target | `FeedScreenContainer` (`reportTarget: {kind, contentId, authorName, contentPreview} | null`) | Single `<ReportContentDialog>` instance at container root (§1), never per-row. |
| Remove confirm dialog open/target | `FeedScreenContainer` (`removeTarget: {kind, contentId} | null`) | Single `<DestructiveConfirmDialog>` instance at container root. |
| Class-scope listbox open (when >1 class) | `ScopeTabs` internal `useState` | Purely a UI disclosure, not server state. |

**Hand-off to `fe-state-engineer`**: please confirm (1) the top-level feed
query-key factory shape (`["feed", scope, scopeId]` vs. richer shape), (2) the
`FeedComments` query key/staleTime, (3) the stale-response-guard strategy for
rapid scope-tab switching (spec.md's open question — this doc assumes TanStack
Query's automatic query-key-change cancellation is sufficient, no explicit
`AbortController`), and (4) whether active-scope state moves to a URL
searchParam — none of these affect the prop contracts above.

## 5. Composition & Variant Strategy

- **No new `cva` variants needed anywhere in `ui/`.** `DropdownMenuItem`'s
  existing `variant="destructive"` covers the Remove menu item; `Badge`'s
  existing variants + the `StatusBadge` tone map cover role/pinned badges (reuse
  `StatusBadge`'s tone resolver for the author role badge —
  `teacher→primary, principal→success, student→warning, parent→purple` is
  identical to `status-badge.tsx`'s `StatusTone` set, just resolved by feed's own
  `feedRoleTone(role)` mapping function living in the presentation layer next to
  `FeedPostCard`, not a new shared component).
- **Compound pattern**: `FeedMenu` is the compound/optional-slot component
  described in §3.9 — `pin`/`remove` are optional named slots, not boolean flags
  plus separate label props, so a caller either supplies the whole slot object
  (with its own label + handler) or omits it entirely. This keeps "is this item
  even shown" and "what does it say/do" atomic per slot, avoiding partial/invalid
  combinations (e.g. `canPin=true` with no `pinLabel`).
- **`Slot`/`asChild`**: `DropdownMenuTrigger asChild` wraps a real `<Button
  variant="ghost" size="icon">` (exact `ExamCard` precedent) — gives the 44×44
  touch target via existing `Button` sizing + native Radix trigger-ref focus
  management, no custom trigger markup.
- **`FeedImageGrid`**: pure function of `images.length` (1/2/3/4+ layouts per
  design-spec) — a `cva`-free conditional-render component, no variant prop
  needed since the "variant" is fully derived from data, never author-chosen.
- **`ScopeTabs`' nested listbox**: composition of the existing `Popover`
  primitive (trigger/content/dismiss/positioning) + hand-rolled `role="listbox"`/
  `role="option"` children (see §1's "missing primitives" note — no existing
  `ui/listbox`, and one call site doesn't justify minting one).
- **Extension points, deliberately NOT built now** (no 3rd instance yet):
  a shared `InlineErrorState`/`InlineEmptyBanner` promotion (§0.1) and a shared
  `Listbox` primitive (§1) — both noted for `fe-lead` as future ADR-free
  promotions, not built speculatively here (design-system.md "no
  over-abstraction until 3+ instances").

## 6. Accessibility Contract

| Element | Role/attrs | Keyboard | Notes |
| --- | --- | --- | --- |
| `ScopeTabs` root | `role="tablist"`, `aria-label` (feed.scopeTabs.ariaLabel) | ArrowLeft/ArrowRight move focus only; Enter/Space (or click) activates (manual-activation pattern, `ChildSelector` precedent) | AC-1901.7. |
| Each scope tab button | `role="tab"`, `aria-selected`, `tabIndex={isActive ? 0 : -1}` | — | Roving tabindex, same as `ChildSelector`. |
| Class listbox trigger (>1 class) | `aria-haspopup="listbox"`, `aria-expanded` | Enter/Space/click opens; Escape closes | — |
| Class listbox popover | `role="listbox"`, `aria-label` | ArrowUp/Down optional enhancement; Escape/outside-click close (via `Popover`) | Options `role="option"` + `aria-selected`. |
| Composer textarea | `<label>`/`aria-label` ("Nội dung bài viết") | — | UC-1902 NFR. |
| Composer submit button | `aria-busy` while pending | — | AC-1902.4. |
| Reaction chips | `aria-pressed={mine}`, `aria-label` = reaction name + live count (Vietnamese) | — | AC-1903.6/NFR-001; interpolated via next-intl (`t("feed.reactions.ariaLabel", {reaction, count})`) — confirm ICU interpolation precedent exists elsewhere before assuming (flagged in plan.md's open questions). |
| Add-reaction picker trigger | `aria-haspopup="true"`, `aria-expanded` | Escape/outside-click close | — |
| "…" menu trigger (`FeedMenu`) | `aria-label` ("Thêm tùy chọn cho bài viết của {author}" / "...bình luận...") | Native Radix `DropdownMenuTrigger` | Absent entirely (not `aria-hidden`, not disabled) when zero items (AC-1905.5). |
| "…" menu content | `role="menu"`, items `role="menuitem"` | Escape closes + focus returns to trigger (native Radix, no custom hook — §0.4); arrow-key roving | AC-1905.6/.7. |
| Pinned badge | icon (`Pin`, `aria-hidden`) + text "Đã ghim" | — | Never color-only (AC-1907.3). |
| "Not yet persisted" caption | plain text, `aria-hidden` icon if any | — | Non-blocking, non-toast, non-color-only (AC-1909.3). |
| Comment thread toggle | `aria-expanded` | Enter/Space (native `<button>`) | UC-1904 NFR. |
| Comment input | `<label>`/`aria-label` ("Viết bình luận") | Enter submits (matches design_src) | — |
| Comment send button | `aria-label` ("Gửi bình luận"), `disabled` when empty | — | — |
| Images (`FeedImg`) | `role="img"`, `alt` required and descriptive | — | Mock placeholders still need real `alt` text (a11y rule, not decorative). |
| Load more button (promoted `LoadMoreButton`) | `aria-busy` while pending | — | AC-1908.5; absent (not disabled) when `!hasMore` (AC-1908.2/.3). |
| End-of-feed marker | plain text between two `aria-hidden` divider lines | — | AC-1908.2. |
| Report/Remove dialogs | inherited from `ReportContentDialog`/`DestructiveConfirmDialog` (US-E19.2's own a11y contract) | — | Not re-specified here (AC-1906.3 explicitly forbids re-asserting dialog internals); focus-restore gap is §0.4's flagged fast-follow, not this story's fix. |

All interactive elements above resolve to a real `<button>`/Radix primitive —
none are `<div onClick>`. Focus ring relies on existing `--ring` token /
`focus-visible` utility classes already used throughout `ui/` primitives — no
new focus styling needed.
