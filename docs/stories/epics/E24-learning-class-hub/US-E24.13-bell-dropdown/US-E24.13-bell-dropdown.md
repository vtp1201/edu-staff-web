# US-E24.13 Bell dropdown 3 tab (Tất cả / Chưa đọc / Hệ thống) + mark-all-read + "Xem tất cả thông báo"

## Status

in-progress

## Lane

normal

> Read + mutation idempotent (mark-read / read-batch) đã real từ US-E18.25; không contract mới.

## Dependencies

- Depends on: **US-E24.12 merge trước** (cùng `header.tsx` — tuần tự trong worktree A)
- Blocks: none
- Feature module(s) chạm: `src/components/layout/app-shell/header/**` (bell → Popover), `src/features/
  notification/presentation/**` (promote `NotificationRow` ra `presentation/shared/`, thêm
  `notification-dropdown/`), `(app)/layout.tsx` (thêm 3 Server Action props), `(shared)/notifications/
  actions.ts` (reuse/move action ra `(app)/notification-actions.ts` nếu cần dùng chung).
- Shared contract/file: `header.tsx` (E24.12), `notificationKeys` (query key `unreadCount` dùng chung
  với centre — giữ shape `{count}`), `messages` namespace `notifications`, `shell.header`.

## Hiện trạng FE (grep 2026-09-06)

- `header.tsx`: bell là `Button asChild` → `Link` `/notifications`, badge `UnreadBadge` từ
  `useQuery(notificationKeys.unreadCount())` với `onFetchUnreadCount` Server Action (invalidate bởi SSE
  `notification.new`, `bootstrap/realtime/event-invalidation.ts`). **Không có dropdown**.
- `features/notification`: entity `NotificationEntity` (titleKey/bodyKey + params — dịch ở presentation,
  ADR 0066), `NotificationFilter = all|unread|grade|attendance|discipline|announcement` (**chưa có
  `system`** dù `NotificationType` có `system`), repo real `NotificationRepository` (list `type=` /
  `read=false`, `markRead`, `markAllRead` vòng lặp ≤500/lần), `PAGE_SIZE = 8`, DI `USE_MOCK` gate.
  Centre `notifications-center.tsx` có `NotificationRow` (local, **không export**), `relativeTime`,
  `use-notification-new-event.ts`.
- i18n `notifications.*` đã có: `title`, `filterAll`, `filterUnread`, `type_system`, `markAllRead`,
  `markAllReadToast`, `emptyAllTitle/Body`, `emptyUnreadTitle/Body`, `unreadCountAriaLabel`, `titles.*`,
  `bodies.*` → reuse; thiếu `viewAll`, `dropdownAriaLabel`, `emptySystem`.
- BE (`notification/docs/openapi.yaml`): `GET /noti/api/v1/notifications?type=system` **được chấp nhận
  nhưng chưa có producer → luôn rỗng**; `read=false` hỗ trợ (không kết hợp với `type` — 400
  `NOTIFICATION_FILTER_CONFLICT`). Comment trong `NOTIFICATION_EP.list` ("KHÔNG có unread filter") đã
  lỗi thời — repo đã map `unread → read=false`; sửa comment.

## Product Contract

Design v3: `design_src/edu/ui.jsx` → `NotifDropdown` (lines ~308–390): panel 360px, radius 14, header
"Thông báo" + link "Đánh dấu đã đọc" (chỉ khi unread>0), tab underline Tất cả / Chưa đọc (+ pill count)
/ Hệ thống, list maxHeight 340 (row: icon box 32 theo type, title 12.5 bold nếu unread, relative time,
dot unread), empty "Không có thông báo nào", footer "Xem tất cả thông báo" → `/notifications`.

- Bell → `Popover` (Radix) trigger; **không** dùng `DropdownMenu`/`role=menu` như design (tablist bên
  trong menu sai ARIA) → `role="dialog"` `aria-label` "Thông báo", tablist thật (`role=tab`,
  `aria-selected`, arrow keys). Escape đóng + focus về bell. `<640px` → bell vẫn là Link tới
  `/notifications` (không popover), giữ hành vi hiện tại.
- Tabs → `NotificationFilter`: Tất cả = `all`; Chưa đọc = `unread` (`read=false`); Hệ thống = **thêm
  `"system"` vào union** (`type=system`) — repo/mapper chỉ thêm 1 nhánh; centre không bắt buộc hiện tab
  này (**[OPEN QUESTION Q1]**: thêm filter "Hệ thống" vào centre luôn cho nhất quán? mặc định: có,
  tái dùng `type_system`).
- Data: `useQuery(["notifications","preview",filter])` limit 8 (`PAGE_SIZE`), `staleTime` ngắn, fetch
  khi mở (`enabled: open`), invalidate cùng prefix `["notifications"]` khi SSE `notification.new` (đã có
  cho unread-count → mở rộng prefix). Mark-read 1 item: optimistic `read=true` + giảm `unreadCount`
  cache `{count}` (giữ shape), rollback khi lỗi. Mark-all: gọi action, invalidate preview + unreadCount.
- Row = `NotificationRow` promote ra `features/notification/presentation/shared/notification-row.tsx`
  với prop `variant: "full" | "compact"` (decision 0026 — **move, không copy**; centre import lại). Icon
  theo type dùng token `text-edu-*`/`bg-edu-*-light`, không hex design.
- Click row: mark-read rồi điều hướng nếu có deep-link (giữ logic centre; nếu centre chưa có deep-link →
  chỉ mark-read, đóng popover).
- "Xem tất cả thông báo" → `Link` `/notifications` (tenantUrl), đóng popover.

## Relevant Product Docs

- `docs/product/design-spec.jsonc#layout.header.notificationBell`, `#screens.notifications`
- `docs/product/screens.md` hàng Notifications Center (US-E10.2/E18.25, ADR 0066)
- `../edu-api/services/notification/docs/openapi.yaml` `GET /api/v1/notifications` (type/read params)
- `docs/decisions/0066-*` (i18n-key notifications), `.claude/rules/api-integration.md`

## Acceptance Criteria

- Desktop: click bell mở popover (không điều hướng); tab mặc định "Tất cả"; unread pill = `unreadCount`
  từ cache dùng chung (test: cùng query key, shape `{count}` không đổi — kiểm bằng test hiện có của header).
- Tab "Chưa đọc" gọi list với `filter="unread"` (repo test: `read=false`, không có `type`); tab "Hệ
  thống" → `type=system` và với BE hiện tại render empty "Không có thông báo hệ thống" (không lỗi).
- Click 1 row unread → `markRead(id)`; row mất bold + dot, badge bell giảm 1 ngay (optimistic), rollback
  + toast khi action lỗi.
- "Đánh dấu đã đọc" chỉ hiện khi unread>0; click → action markAllRead → badge 0, tab "Chưa đọc" rỗng;
  toast `markAllReadToast`.
- "Xem tất cả thông báo" → `/notifications`, popover đóng, focus không mất (landing h1).
- Keyboard: Tab vào bell → Enter mở → focus vào tablist → Escape đóng, focus về bell; tab arrow keys.
- Mobile `<640`: bell là Link (hành vi cũ), không popover (Storybook viewport 375).
- Centre vẫn xanh sau promote `NotificationRow` (stories + tests hiện có không đổi hành vi).
- i18n vi+en: thêm `notifications.viewAll`, `notifications.dropdownAriaLabel`, `notifications.emptySystem`;
  không regenerate key có sẵn.
- Gate xanh; design-review + a11y.

## Design Notes

- UI: `features/notification/presentation/notification-dropdown/{notification-dropdown.tsx,
  notification-dropdown.i-vm.ts, stories}`; header nhận props `onFetchNotificationsPreview(filter)`,
  `onMarkRead(id)`, `onMarkAllRead()` (Server Action refs) — optional, default "feature absent" như
  các prop E23.1 để stories/tests cũ không đổi.
- Queries: `notificationKeys.preview(filter)`; invalidate prefix `notificationKeys.all`.
- Domain: `NotificationFilter` += `"system"`; `GetNotificationsUseCase` không đổi.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | filter → query param mapping (`system`), optimistic reducer cho unreadCount |
| Integration | header + dropdown với mock actions; repo `type=system`; centre regression |
| E2E | Storybook: open → switch tab → mark one → mark all → view all; Escape/focus return |
| Platform | tsc/vitest/build |
| Release | design-review + a11y |

## Plan

Code-verified 2026-09-06 against this worktree (`header.tsx` post-E24.12, `notifications-center.tsx`,
`notification.repository.ts`, `event-invalidation.ts`, `(app)/layout.tsx`, `(shared)/notifications/
actions.ts`, `messages/{vi,en}.json`, `design_src/edu/ui.jsx` `NotifDropdown` lines 308–388). `bun
ui:add tabs` and `bun ui:add popover` are **not needed** — both primitives already exist at
`src/components/ui/{tabs,popover}/`.

### 1. Viewport split — reuse the sidebar's existing pattern (CSS-only, no matchMedia hook)

`header.tsx`'s bell today is one `Button asChild={tenantId!==undefined}` wrapping either a `Link` or
bare icon — there's no existing "two different components swapped by viewport" precedent in this repo
(the sidebar's mobile variant is a `Sheet` triggered by the hamburger, a genuinely different
interaction, not a same-slot swap). The header itself already does viewport-conditional class-only
hide/show elsewhere (`search` input: `hidden ... md:block`; mobile hamburger: `lg:hidden`) — **follow
that established idiom**: render BOTH triggers unconditionally and gate with Tailwind breakpoint
classes, not a `matchMedia`/`useMediaQuery` hook (would need a client-mount guard to avoid
hydration mismatch — the `mounted` state already exists for a different reason (theme) and gating a
second concern on it would conflate them).

- `<span className="sm:hidden">` → today's `Button asChild → Link` bell (unchanged JSX, unchanged
  aria-label/`UnreadBadge`) — **exact same behavior kept for `<640px`** (AC).
- `<span className="hidden sm:block">` → new `Popover` wrapping a `PopoverTrigger asChild` `Button`
  (plain button, not `asChild` Link) + `UnreadBadge`, and `PopoverContent` = new
  `NotificationDropdown`. `role="dialog"` `aria-label={tNoti("dropdownAriaLabel")}` set on
  `PopoverContent` (Radix `Popover.Content` already renders `role="dialog"` by default — verify no
  override needed, just supply the `aria-label`).
- Both spans keep independent `Bell` + `UnreadBadge` reads off the SAME `unreadCount` query (no
  duplicate fetch — the `useQuery` call stays once at `Header` level, value passed down).
- Storybook viewport story: use the existing `viewport` addon parameter (grep other stories using
  `parameters.viewport` for the convention) set to a 375px preset to assert the mobile span renders
  and the popover one doesn't (Tailwind `sm:` breakpoint is 640px — both spans present in the DOM
  regardless of viewport is fine for interaction tests **only if** the hidden one is
  `visibility:hidden`-equivalent via Tailwind `hidden`, which removes it from the accessibility tree
  too — confirm via `display:none` semantics, not `opacity`).

**Risk flagged**: US-E24.12's header restructure changed the bell's wrapping `Button asChild=
{tenantId!==undefined}` conditional — the NEW popover trigger must NOT reuse that same `asChild`
conditional (a `PopoverTrigger asChild` wrapping a `Button` wrapping a `Link` makes no sense, there's
no href to navigate to when the popover opens). Keep the desktop trigger a plain icon `Button`
regardless of `tenantId`; only the mobile-Link branch needs the `tenantId !== undefined` guard (same
as today — if `tenantId` is undefined, mobile bell must still render, non-interactive, matching
current `HeaderPlaceholder`/no-tenant fallback behavior already in the file).

### 2. Tablist inside the popover — build on existing `ui/tabs`, verify ARIA shape first

`src/components/ui/tabs/` (shadcn Radix Tabs) already ships `role="tablist"`/`role="tab"`/
`aria-selected`/arrow-key nav out of the box (Radix `Tabs.Root` + `Tabs.List` + `Tabs.Trigger`) — do
**not** hand-roll a second tab implementation like `notifications-center.tsx`'s ad-hoc `<button
role="tab">` pills (that predates `ui/tabs` and is a known duplication the promotion in step 5 does
NOT need to fix, out of scope — flag only, don't touch). Use `Tabs`/`TabsList`/`TabsTrigger` from
`components/ui/tabs` for the new dropdown; do not add a `TabsContent` per tab (content is one shared
list re-rendered per `activeFilter`, same pattern as the centre).

Escape-closes + focus-return: **reuse the Popover's own built-in behavior** — Radix `Popover.Content`
already returns focus to its trigger on close (Escape or outside-click) with no extra wiring, same
mechanism the packet's own dialog citations (`TenantSwitchDialog`'s `onCloseAutoFocus`) exist to
**override** only because that dialog opens asynchronously after a different primitive unmounts (see
`header.tsx`'s `openSwitchDialog` comment). The bell's Popover has no such cross-primitive dance — it
opens/closes directly off its own trigger — so **no custom `onCloseAutoFocus` needed**, trust Radix's
default. Only add explicit focus handling if manual QA shows the default insufficient.

### 3. Domain — `NotificationFilter` += `"system"`, confirmed zero other domain changes

- `domain/entities/notification.entity.ts`: add `| "system"` to `NotificationFilter` (currently
  `all|unread|grade|attendance|discipline|announcement`; `NotificationType` already has `system`).
- `GetNotificationsUseCase.execute` (read) is a pure pass-through of `{filter,cursor,limit}` to
  `repo.listNotifications` — confirmed **zero changes** needed, packet's claim verified.
- `NotificationRepository.listNotifications`: the `if (filter==="unread") ... else if (filter!=="all")
  queryParams.type = filter` branch is already generic over the type union — confirmed **zero repo
  code change**, adding `"system"` to the union alone makes `type=system` flow through.
- `MockNotificationRepository.listNotifications`: same — `item.type === filter` generic match, zero
  change. `fixtures.ts` already seeds ≥1 `type:"system"` row (lines 48, 100) so the mock dropdown's
  "Hệ thống" tab has content to render (repo mode legitimately renders empty per BE contract below).
- `PAGE_SIZE = 8` in `i-notification.repository.ts` already matches the AC's "limit 8" — no change.

### 4. Data — preview query, invalidation widening, optimistic mutations

- New key: `notificationKeys.preview: (filter: NotificationFilter) => ["notifications","preview",
  filter] as const` in `presentation/notification-keys.ts` (sibling to `list`/`unreadCount`).
- `useQuery({ queryKey: notificationKeys.preview(filter), enabled: open, staleTime: 15_000, queryFn:
  () => onFetchNotificationsPreview({ filter, limit: 8 }) })` — short `staleTime` (vs. centre's
  `30_000`) since the dropdown is opened ad-hoc and should feel fresh; `enabled: open` avoids fetching
  before the user opens it (`open` = Popover's own `onOpenChange` state, lifted to `Header`).
- SSE widening (`bootstrap/realtime/event-invalidation.ts`, `case "notification.new"`): the existing
  array enumerates `["notifications","list","all"]`, `["...,"list","unread"]`,
  `["...,"list",event.payload.type]`, `["...,"unread-count"]`. **Add one line**:
  `["notifications","preview"]` (a partial/prefix key — `queryClient.invalidateQueries({queryKey})`
  defaults to `exact:false`, confirmed by reading `use-realtime-events.ts`'s
  `onInvalidate: (keys) => { for (const queryKey of keys) queryClient.invalidateQueries({queryKey}) }`
  — a 2-segment prefix invalidates all 3 `preview(filter)` variants in one entry, no need to enumerate
  each filter like the older `list` keys do). Minimal, additive, no restructuring of the existing case.
- Mark-read (1 item), reuse the **exact same mutation shape** as
  `notifications-center-container.tsx`'s `markReadMutation` (call action → on success
  `invalidateQueries({queryKey: notificationKeys.all})` — that prefix already covers `preview` once
  step 4's key is added) **plus** the dropdown-specific optimistic piece the centre doesn't do today:
  before the mutation settles, `setQueryData(notificationKeys.unreadCount(), (old) => old ? {count:
  Math.max(0, old.count-1)} : old)` (shape kept `{count}`, matching the header's own comment "MUST
  stay `{count}`") and flip the item's `read:true` inside the cached `preview(filter)` page via
  `setQueryData`. Roll back both on error inside `onError` (capture the previous values via
  `onMutate`'s returned context, standard TanStack optimistic-update recipe — the centre doesn't need
  this because it just invalidates+refetches, but the dropdown's badge must decrement **instantly**
  per AC).
- Mark-all-read: no optimistic diffing needed (AC only requires badge→0 + toast, same as centre) —
  reuse `markAllReadMutation`'s pattern verbatim (invalidate `notificationKeys.all` + toast
  `markAllReadToast` on success, toast `errors.network-error` on failure).

### 5. `NotificationRow` promotion — exact prop/behavior diff (full vs. compact)

Current `NotificationRow` (local, unexported, `notifications-center.tsx` lines 130–227) props:
`{ item: NotificationEntity; onMarkRead: (id: string) => void }`. Behavior: 40px (`size-10`) icon box
colored by `TYPE_COLOR_CLASS[item.type]`; title `line-clamp-1` bold-if-unread; 2-line
`line-clamp-2` body text (translated via `titles.*`/`bodies.*` keys + `renderableParams`); relative
`<time>` top-right; a bottom **type badge pill** (`t(typeLabelKey)`); an unread **left-border stripe**
(`absolute inset-y-0 left-0 w-[3px] bg-primary`) + `bg-primary/[0.08]` row tint when unread; full
`aria-label` via `rowAriaLabel`.

Design `NotifDropdown` (`design_src/edu/ui.jsx:361-377`) compact row differs: 32px icon box (not 40),
**single-line title only** (no separate 2-line body — the design's `n.vi`/`n.en` string plays both
title+body's role, but our real entity has separate `titleKey`/`bodyKey`; compact variant should show
only the title line to match the 360px-panel real-estate, dropping body per row density — confirm in
implementation phase with design-review, not a blocking guess here), relative time only (no absolute
`title=` tooltip needed at this density), **no type badge pill**, unread signaled by a **trailing dot**
(`size-2 rounded-full bg-primary`) instead of the left-border stripe, and no bottom border needed
per-row inside the popover's own `divide-y` container (same as centre — reuse `divide-y divide-border`
wrapper, not a border per row).

Promotion plan: move to `features/notification/presentation/shared/notification-row.tsx`, export
`NotificationRow` with:
```
interface NotificationRowProps {
  item: NotificationEntity;
  onMarkRead: (id: string) => void;
  variant?: "full" | "compact"; // default "full" — centre's call sites unchanged
}
```
Internally branch icon size (`size-10`/`size-8`), whether to render the body `<p>`, whether to render
the type badge, and whether unread renders as left-border-stripe (`full`) vs. trailing dot
(`compact`). `TYPE_ICON`/`TYPE_COLOR_CLASS`/`relativeTime`/`renderableParams` move alongside it (all
currently module-scope in `notifications-center.tsx`, used only by the row). `notifications-center.tsx`
updates its import to `../shared/notification-row` and drops the now-dead local copies — **regression
guard**: existing `notifications-center.stories.tsx` + `notification.mapper.test.ts`-adjacent tests
must stay green with zero behavior change (call sites pass no `variant`, defaults to `"full"`,
byte-identical rendered output).

### 6. New `notification-dropdown/` component

- `notification-dropdown.i-vm.ts`: view-model `{ items, unreadCount, activeFilter, isLoading, error }`
  + actions `{ onFilterChange, onMarkRead, onMarkAllRead, onViewAll? }` (no `onViewAll` handler needed
  server-side — "Xem tất cả" is a plain `Link`, closes popover via Radix's own outside-click-on-navigate
  or an explicit `onOpenChange(false)` in the `onClick`).
- `notification-dropdown.tsx` (`"use client"`): owns the `Tabs` (all/unread/system), the preview
  `useQuery` (step 4), the mark-read/mark-all mutations (step 4), renders `NotificationRow
  variant="compact"` per item, empty state (`emptyAllTitle`/`emptyUnreadTitle`/new `emptySystem`),
  loading skeleton (can reuse a trimmed version of the centre's `SkeletonRows`, or a 3-row inline
  skeleton sized for 360px — decide at implementation, not architecturally significant), footer `Link`
  `tenantUrl(tenantId, "/notifications")` labelled `viewAll` (new key).
- `header.tsx` gets 3 new **optional** props, matching the exact "feature absent by default" idiom
  `onSwitchTenant`/`memberships`/`currentTenantId` established in US-E23.1 (verified by reading
  `HeaderProps` — every US-E23.1 addition is `prop?: T` with a comment `// NEW (US-E23.1) — all
  optional...`, and `mounted` gates nothing about them, so existing stories/tests that omit them keep
  compiling/passing):
  ```
  onFetchNotificationsPreview?: (params: { filter: NotificationFilter; limit?: number }) =>
    Promise<NotificationPage | { errorKey: string }>;
  onMarkRead?: (id: string) => Promise<{ errorKey?: string }>;
  onMarkAllRead?: () => Promise<{ errorKey?: string }>;
  ```
  Popover (desktop trigger) only renders `NotificationDropdown` when
  `onFetchNotificationsPreview !== undefined` (same "feature absent → hide" gate as `canSwitch`);
  otherwise desktop falls back to today's `Link`-bell behavior unconditionally (so a caller that never
  wires the 3 new props sees zero behavior change — safe default).
- `AppShell` (`components/layout/app-shell/app-shell.tsx`): add matching pass-through optional props
  (mirrors the existing `onFetchUnreadCount`/`onSwitchTenant` pass-through at lines ~50/141 — same
  file, same idiom, one more prop trio).
- `(app)/layout.tsx`: wire the 3 props using the **already-exported** actions in
  `(shared)/notifications/actions.ts` — **no new action file needed** (the packet's own "reuse/move
  action ra `(app)/notification-actions.ts` nếu cần" question resolves to "not needed", verified by
  reading the file): `onMarkRead={markReadAction}` and `onMarkAllRead={markAllReadAction}` pass
  directly (signatures already match 1:1). `onFetchNotificationsPreview` needs `fetchPageAction`'s
  signature (`{filter,cursor}`) reshaped to `{filter,limit}` — since a plain non-`"use server"` arrow
  function CANNOT cross the server→client prop boundary as a callable (Next.js requires the crossing
  function itself be a Server Action), **do not wrap `fetchPageAction` in a closure**; instead give
  `onFetchNotificationsPreview` the identical param shape `{filter,cursor?}` as `fetchPageAction` (drop
  the `limit` param from the dropdown i-vm, always send `cursor: undefined` — PAGE_SIZE=8 default
  already matches) and pass `fetchPageAction` directly, unwrapped.

### 7. i18n — confirmed by grep, not by trusting the packet's prose

Genuinely missing (grepped `messages/vi.json` `"notifications"` block, ~53 keys present): `viewAll`,
`dropdownAriaLabel`, `emptySystem`. Add these 3 to both `vi.json` and `en.json` under the existing
`notifications` namespace. Everything else the packet lists as reusable is **confirmed present**:
`title`, `filterAll`, `filterUnread`, `type_system`, `markAllRead`, `markAllReadToast`,
`emptyAllTitle`/`emptyAllBody`, `emptyUnreadTitle`/`emptyUnreadBody`, `unreadCountAriaLabel`,
`titles.*`/`bodies.*` (incl. `unknown` fallback), `errors.*`. No `filterSystem` key exists yet either —
reuse `type_system` for the tab label (packet's own plan), not a new `filterSystem` key.

### 8. BE contract detail (from FE-side grep of `NOTIFICATION_EP` + repo — `../edu-api` not present in
this worktree, so this section documents what the CURRENT web repo already encodes as the contract,
consistent with the packet's own "Hiện trạng FE" claims; re-verify against `openapi.yaml` at
implementation time if `edu-api` is checked out there)

- `notification.endpoint.ts`'s `list` doc-comment currently reads: *"There is NO `unread`/`read`
  filter — the 'Unread' tab drains client-side (ADR 0066, cross-repo ask #42)"* — this is the **stale
  comment** the packet's Harness Delta flags. It contradicts the repository's own code 3 lines below
  (`if (filter === "unread") queryParams.read = "false"`), which already sends a real `read=false`
  query param. Fix: rewrite the comment to state `read=false` IS supported (mutually exclusive with
  `type`, matching the mutual-exclusivity comment already correct in `notification.repository.ts`
  lines 65-72).
- Mutual exclusivity is already correctly encoded in `notification.repository.ts`: `unread` → `read`
  only, any other non-`"all"` value → `type` only, never both — the dropdown's "Hệ thống" tab sending
  `filter:"system"` automatically produces `type=system` with no `read` param (no new mapping code,
  confirmed step 3).
- `type=system` returning always-empty (no BE producer yet) is a **product-accepted state**, not a
  bug to work around — AC explicitly says render `emptySystem` copy, not an error.

### 9. Open Question Q1 — resolved yes (per packet default)

Add a `system` filter pill to `notifications-center.tsx`'s existing `FILTER_TABS` array (`{id:
"system", labelKey: "type_system"}` — reuses the same key as the dropdown, no `filterSystem` key
invented) as a **small, isolated addition** — the centre's ad-hoc pill-tabs (not `ui/tabs`, see step 2
note) stay untouched otherwise. Confirm the centre's empty-state branch needs a 3rd case
(`activeFilter === "system" ? t("emptySystem") : ...`) alongside the existing `unread`/`all` ternary.

### 10. Order of work (minimize churn, each step independently testable)

1. i18n additions (3 keys, vi+en) + `NotificationFilter += "system"` — cheap, unit-testable in
   isolation (mapper/repo tests already parametrize over the filter union).
2. `NotificationRow` promotion to `presentation/shared/` with `variant` prop — mechanical, regression-
   guarded by existing centre stories/tests (must stay green, zero visual diff for `variant="full"`
   default).
3. `notification-dropdown/` component (i-vm + tsx + stories) + `notificationKeys.preview` + SSE
   invalidation widening (1-line add) — new, isolated, testable via Storybook interaction with mock
   action props before touching `header.tsx`.
4. `header.tsx` + `app-shell.tsx` + `(app)/layout.tsx` wiring — the viewport-split trigger + the 3 new
   optional props + Popover mount. Last, since it depends on step 3's component existing.
5. `notifications-center.tsx` "Hệ thống" tab addition (Q1) — small, independent, can land any time
   after step 1.
6. Fix the stale `notification.endpoint.ts` comment (Harness Delta) — trivial, any time.
7. Storybook interaction proof (step 11 below) + a11y pass + design-review gate.

### 11. Test plan (maps to Validation table)

- **Unit**: `NotificationFilter` → query-param mapping including `"system"` (extend
  `notification.repository.test.ts`'s existing parametrized cases, do not duplicate the test file);
  optimistic `unreadCount` reducer as a small pure function if extracted (e.g.
  `decrementUnreadCount(cache, by=1)`) — test it directly rather than only through the mutation,
  mirroring the `derive-tenant-menu.test.ts` "pure derivation, unit-tested" convention `header.tsx`
  already cites for `deriveTenantMenu`.
- **Integration**: `header.test.ts` (or a new `notification-dropdown.test.tsx`) renders `Header`/
  `NotificationDropdown` with mock action props, asserts: popover opens desktop-only, tab clicks call
  the mock preview action with the right filter param, mark-read/mark-all call their mock actions;
  `notification.repository.test.ts` extended for `type=system` (no `read` param sent, matching the
  existing "never both" assertions already in that file for other type values); `notifications-center`
  regression — existing stories/tests for the centre must pass unchanged after the `NotificationRow`
  promotion (no new assertions needed, just confirm nothing broke).
- **E2E (Storybook)**: `notification-dropdown.stories.tsx` interaction play-function: open → switch
  tab (all→unread→system) → mark one row read (badge decrements, row loses bold+dot) → mark-all-read
  (badge→0, toast) → click "Xem tất cả thông báo" (navigates, popover closes) → Escape closes + focus
  returns to bell trigger. Separate story/viewport parameter at 375px asserting the mobile `Link`-bell
  renders and no popover trigger/dialog is present in the DOM.
- **Platform**: `bun vitest run`, `tsc --noEmit`, `bun build` (pre-push gate, no `--no-verify`).
- **Release**: design-review gate (`docs/DESIGN_REVIEW.md`) + `fe-accessibility-auditor` pass
  (contrast of the compact row's trailing dot, focus ring on Popover content, 44px touch targets on
  the tab triggers even in the 360px-wide panel).

### Handoff notes

- `fe-component-architect`: not required as a separate specialist run — the component tree here is
  small and prop contracts are pinned above (i-vm shapes for `NotificationDropdown`, the `variant`
  prop on the promoted `NotificationRow`); `fe-nextjs-engineer` can implement directly from this plan.
- `fe-state-engineer`: the TanStack Query additions (1 new key, 1 SSE-invalidation line, one optimistic
  mutation) are simple enough to fold into the main implementation pass — flag for a dedicated
  state-engineer run only if the optimistic-rollback plumbing (step 4) proves gnarlier than expected
  once coded.
- No new design-system token needed — all colors/spacing reuse existing `--edu-*` tokens already used
  by `notifications-center.tsx`'s `TYPE_COLOR_CLASS` map and `ui/popover`/`ui/tabs` primitives.

## Harness Delta

Sửa comment lỗi thời trong `bootstrap/endpoint/notification.endpoint.ts` (read=false đã hỗ trợ).

## Evidence

Implementation complete on `feat/us-e24.13-bell-dropdown` (5 commits, not merged).

| Proof | Result |
| --- | --- |
| `bunx tsc --noEmit` | clean |
| `bun lint` | clean (1 pre-existing warning + 1 info in `messaging/message-context-menu.tsx`, untouched) |
| `bun vitest run` | 580 files / 4823 tests passed |
| `bun vitest --config vitest.storybook.mts run` | 167 files / 1374 tests passed |
| `NEXT_PUBLIC_USE_MOCK=true bun run build` | compiled successfully |

New proof added by this story:

- Unit — `notification.repository.test.ts` (`type=system` alone, never with
  `read`), `notification-keys.test.ts` (preview key scoping), `unread-count-cache.test.ts`
  (optimistic reducer keeps the `{count}` shape, never mutates the rollback value),
  `event.test.ts` (SSE `notification.new` invalidates the `preview` prefix),
  `layout.help-href.test.ts` (the 3 Server Action refs reach `AppShell` UNWRAPPED —
  identity assertion, because a reshaping closure fails only at runtime).
- Storybook — `notification-dropdown.stories.tsx` (13 stories: loading / error /
  empty / tab-switch→filter param / arrow-key tablist / mark-one optimistic /
  rollback+toast / mark-all / view-all closes / closed-does-not-fetch),
  `header.stories.tsx` (`BellDropdownDesktop`: button-not-link, `dialog` +
  tablist, no navigation, Escape→focus back on the bell; `BellMobileStaysALink`
  at a real 375px viewport), `notifications-center.stories.tsx`
  (`SystemFilter_Empty`).
- Regression — the centre's 13 pre-existing stories stayed green through the
  `NotificationRow` promotion and the new tab (14 now).

Open for review: `dropdownAriaLabel` names both the dialog and its visible `<h2>`
(one key, one string — deliberately no duplicate `panelTitle`).
