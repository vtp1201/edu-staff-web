# US-E24.13 Bell dropdown 3 tab (Tất cả / Chưa đọc / Hệ thống) + mark-all-read + "Xem tất cả thông báo"

## Status

planned

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

## Harness Delta

Sửa comment lỗi thời trong `bootstrap/endpoint/notification.endpoint.ts` (read=false đã hỗ trợ).

## Evidence

(chưa có — planned)
