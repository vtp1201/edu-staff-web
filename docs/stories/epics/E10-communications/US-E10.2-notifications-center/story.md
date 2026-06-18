# US-E10.2 Notifications Center

## Status

implemented

## Lane

normal

## Dependencies

- Depends on: US-E08.5 (profile — SSE connection established), decision 0009 (SSE proxy)
- Blocks: US-E10.3 (announcements fan-out appears in notifications center)
- Feature module(s) cham: `src/features/notification/` (new, wraps existing SSE hook from decision 0009)
- Shared contract/file: `bootstrap/endpoint/notification.endpoint.ts` (new); SSE channel (decision 0009)

## Product Contract

Trung tam thong bao toan phan (`/notifications`): xem tat ca thong bao, loc theo
loai, danh dau da doc, nhan thong bao moi qua SSE. Tat ca roles (teacher, principal,
admin, student, parent) co quyen truy cap.

**Phan loai thong bao (type taxonomy):**
- `grade`: Diem so — icon chart, mau success — click -> grades section
- `attendance`: Diem danh — icon calendar, mau primary -> attendance section
- `discipline`: Ky luat — icon alertTriangle, mau warning -> discipline section
- `announcement`: Thong bao truong — icon megaphone, mau info -> messaging section
- `system`: He thong — icon bell, mau textMuted — khong navigate

**Filter tabs:** Tat ca / Chua doc / Diem so / Diem danh / Ky luat / Thong bao truong

**Danh sach thong bao:**
- Moi row: icon type, tieu de (bold neu chua doc), noi dung (2 dong ellipsis), thoi gian, badge loai.
- Unread row: left border 3px primary + background primary/8.
- Click row -> danh dau da doc + navigate den section lien quan (neu co).
- "Danh dau tat ca da doc" button (disabled khi unread = 0).

**Load-more (cursor-based):** "Xem them N thong bao" button; "Da hien thi tat ca" khi het.

**SSE realtime:** Nhan `notification.new` event -> prepend vao danh sach + hien thi
Sonner toast (bottom-right, 4.5s, co nut dong). Unread badge tren header cap nhat.

**Loading state:** Skeleton rows (4 rows, shimmer animation) trong 400ms.

Mock-first: `noti` service chua ship; SSE simulation = setTimeout 16s (design).

## Relevant Product Docs

- `docs/product/screens.md` — All roles section "Notifications" row
- `design_src/edu/notifications.jsx` — NotificationsCenterScreen + sub-components (1506, DR-006)
- Epic overview: `docs/stories/epics/E10-communications/EPIC-OVERVIEW.md`
- Decision 0009 (SSE proxy); decision 0017 (noti service)

## Acceptance Criteria

- AC-1 (loading): Skeleton rows (4 rows, shimmer) hien thi trong 400ms dau; sau do hien danh sach.
- AC-2 (list success): Thong bao hien thi dung: icon type mau dung, tieu de bold neu unread, noi dung 2 dong ellipsis, thoi gian, badge loai; unread row co left border + background nhe.
- AC-3 (filter tabs): Click tab loc -> danh sach thu hep chinh xac; tab "Chua doc" chi hien unread; count trong pill cap nhat theo thuc te.
- AC-4 (mark read — single): Click vao row -> danh dau da doc (border bien mat, bg ve card, tieu de khong bold); navigate den section.
- AC-5 (mark all read): Click "Danh dau tat ca da doc" -> tat ca rows chuyen da doc; button disabled; toast "Da danh dau tat ca la da doc".
- AC-6 (load-more): Click "Xem them N thong bao" -> load them 8 rows; sau khi het hien "Da hien thi tat ca".
- AC-7 (SSE realtime): SSE event `notification.new` -> row moi prepend dau danh sach voi animation; Sonner toast xuat hien bottom-right 4.5s co nut dong; unread counter tren header tang len 1.
- AC-8 (empty state — unread filter): Tab "Chua doc" khi tat ca da doc -> empty state "Tat ca da doc".
- AC-9 (empty state — no notifications): Chua co thong bao nao -> empty state voi icon + huong dan.
- AC-10 (a11y): List co role="log" aria-live="polite"; moi row la button co aria-label ro rang; toast co nut dong keyboard-accessible; WCAG AA contrast.
- AC-11 (i18n): Tat ca strings qua namespace `notifications`.

## Design Notes

- Route: `/notifications`
- Design file: `design_src/edu/notifications.jsx` — NotificationsCenterScreen, FilterPills, NotificationRow, SkeletonRows, EmptyState, SonnerToast
- Commands: `markNotificationRead`, `markAllNotificationsRead`
- Queries: `getNotifications` (cursor-paged, filter by type), `getUnreadCount`
- API (mock-first — noti service planned):
  - `GET  /noti/api/v1/notifications?type=&cursor=&limit=8`
  - `GET  /noti/api/v1/notifications/unread-count`
  - `PATCH /noti/api/v1/notifications/:id/read`
  - `PATCH /noti/api/v1/notifications/read-batch`
- SSE channel: `notification.new` event (decision 0009); payload shape: `{ type, titleVi, titleEn, bodyVi, bodyEn, ts }`
- Domain rules: Unread count badge in header must re-derive from `/notifications/unread-count` after mark-all-read action. Load-more page size = 8.
- UI surfaces: FilterPills; NotificationRow; SkeletonRows (4 rows shimmer); EmptyState (unread vs all variant); SonnerToast; LoadMoreButton

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | markNotificationRead use-case (ok/not-found); markAllRead; getNotifications with type filter + cursor |
| Integration | NotificationRepository mock (list cursor-paged, mark-read, mark-all-read, unread-count) |
| E2E | Storybook: Loading / Populated_AllTab / UnreadFilter / MarkSingleRead / MarkAllRead / SSEPrepend / EmptyUnread / EmptyAll |
| Platform | bun build + tsc clean |
| Release | design-review gate pass |

## Harness Delta

- `docs/TEST_MATRIX.md`: add row US-E10.2 (planned)
- `docs/product/screens.md`: Notifications row -> design-ready
