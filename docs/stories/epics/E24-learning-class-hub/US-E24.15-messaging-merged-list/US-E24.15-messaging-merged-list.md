# US-E24.15 Messaging: gộp Direct + Group thành một danh sách, nút "Tạo nhóm" icon ở header list

## Status

planned

## Lane

normal

> UI-only trong `features/messaging/presentation`; không đổi domain/repo/BE. Chọn normal (không tiny)
> vì đổi cấu trúc ARIA (bỏ tablist) + prune i18n + Storybook regression.

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm: `src/features/messaging/presentation/conversation-list/**` (+ stories),
  `conversation-item/conversation-item.tsx` (marker nhóm), `messaging-screen/messaging-screen.tsx`
  (prop `onCreateGroup` đã có — chỉ đổi vị trí nút), `messaging-screen/empty-messaging-state.tsx` (nếu
  copy nhắc "tab Nhóm").
- Shared contract/file: `messages/{vi,en}.json` namespace `messaging` (prune `messaging.tabs.*`,
  `messaging.search.noGroups`; giữ `messaging.group.*` cho modal/empty), `design-spec.jsonc#screens.messaging`.

## Hiện trạng FE (grep 2026-09-06)

- `conversation-list.tsx`: header = title "Tin nhắn" + pill `totalUnread` + **1 nút icon `Plus`**
  (`onNewMessage`, `aria-label messaging.newMessage.button`); search; **tablist `direct | groups`**
  (`role=tab`, `aria-selected`, `aria-controls` panel); tab Groups có strip CTA "Tạo nhóm mới"
  (`group.emptyCreateCta`, chỉ khi `onCreateGroup`) + empty state riêng (`group.emptyTitle/
  emptySubtitle`) ; tab Direct empty `search.noResults`.
- `messaging-screen.tsx` truyền `onCreateGroup` theo gate `canCreateGroup` (`group-creation-gate.ts`,
  US-E10.4 — role-gated) → `CreateGroupModal` (đã có, 2-step). `ConversationEntity.type =
  'direct'|'group'`; `conversation-item.tsx` render cả 2 loại (avatar/tone qua `avatar-tone.ts`).
- `conversation-list.stories.tsx` có stories theo tab → phải viết lại.
- i18n có: `messaging.tabs.{direct,groups}`, `messaging.group.{createButton,createTitle,emptyCreateCta,
  emptyTitle,emptySubtitle,...}`, `messaging.newMessage.button`, `messaging.search.{placeholder,
  noResults,noGroups}`.

## Product Contract

Design v3: `design_src/edu/messaging.jsx` → left pane (lines ~1549–1592): header có **2 icon button**
(32×32 radius 9): `users` "Tạo nhóm mới" (nền `T.bg` + border) và `plus` "Tin nhắn mới" (nền
primary/15 + border primary/30); search; **một list**: direct rồi group (không tab); empty "Không tìm
thấy". design-spec `screens.messaging` (2584+) cần cập nhật phần list (fe sync).

- Bỏ tablist + panel; list = `<ul>` một danh sách. Thứ tự: **[OPEN QUESTION Q1]** design xếp direct
  trước, group sau; hộp thư thực tế nên theo `lastMessageAt` desc. Mặc định: **sort theo thời gian tin
  cuối desc** (unread lên không bắt buộc), fallback design order khi thiếu timestamp; ghi deviation.
- Header: thêm nút icon `Users` (lucide) "Tạo nhóm mới" — `aria-label` `messaging.group.createTitle`
  (reuse), tone `bg-muted border-border text-muted-foreground`; chỉ render khi `onCreateGroup`
  (`canCreateGroup`). Nút "Tin nhắn mới" giữ (primary tint). Cả 2 ≥44px touch trên mobile (size-9 →
  kèm padding/hit-area, hoặc size-11 ở `<640`).
- Search lọc trên cả 2 loại. Empty (có search) → `search.noResults`; empty tuyệt đối (0 hội thoại) →
  giữ `EmptyMessagingState` hiện có ở pane phải + list hiển thị 1 dòng gợi ý (reuse `group.emptySubtitle`
  nếu `canCreateGroup`).
- Row nhóm phải phân biệt được không chỉ bằng hình avatar: `conversation-item` thêm sr-only "Nhóm" +
  icon `Users` nhỏ cạnh tên (đã có? — kiểm tra; nếu có badge member count thì đủ) — a11y decision 0013
  (không chỉ màu/hình).
- Prune i18n: xoá `messaging.tabs.*`, `messaging.search.noGroups`, `messaging.group.emptyTitle`
  (nếu không còn dùng) ở vi + en; `tsc` bắt dead/missing.
- Deep-link `?conversation=` giữ; mobile pane logic (`pane-visibility.ts`) không đổi.

## Relevant Product Docs

- `docs/product/design-spec.jsonc#screens.messaging` (list section), `docs/product/screens.md` hàng Messaging
- `docs/stories/epics/E10-*/US-E10.4-*` (group creation gate), DR-008 (group chat)
- `.claude/rules/component-organization.md`, `accessibility.md`

## Acceptance Criteria

- List render cả direct + group không tab; `role=tablist` không còn trong DOM; `ul>li` với
  `ConversationItem` như cũ; sort theo tin cuối desc (unit test comparator, deterministic).
- Search "10A1" trả cả nhóm "Nhóm lớp 10A1" và contact tên khớp.
- `canCreateGroup=true` → header có 2 icon button (aria-label đúng, Tab order: Tạo nhóm → Tin nhắn mới
  → search); `false` → chỉ "Tin nhắn mới"; click "Tạo nhóm" mở `CreateGroupModal` (test hiện có của
  messaging-screen xanh, chỉ đổi selector nút).
- Row nhóm có accessible name chứa "Nhóm" (sr-only) hoặc marker text; screen reader không phụ thuộc hình.
- `totalUnread` pill giữ; unread per-row giữ.
- Storybook `conversation-list.stories.tsx`: default (mixed) / only-direct / only-groups / search-empty /
  loading / error / no-create-permission / viewport 375.
- i18n: key chết đã xoá ở vi + en, `bunx tsc --noEmit` sạch; không thêm key trùng nghĩa với
  `group.createTitle`.
- Gate xanh; design-review + a11y.

## Design Notes

- UI: `conversation-list.tsx` (bỏ state `tab`), `conversation-list.sort.ts` (pure comparator),
  `conversation-item.tsx` (group marker).
- State: không đổi query (`["messaging","conversations"]`).
- Không đổi `ConversationListProps` ngoài việc `onCreateGroup` giờ dùng ở header.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | sort comparator; filter search cross-type |
| Integration | messaging-screen test: create-group nút ở header |
| E2E | Storybook states + keyboard order |
| Platform | tsc/vitest/build (i18n prune) |
| Release | design-review + a11y |

## Harness Delta

None (design-spec messaging list section sync trong commit).

## Evidence

(chưa có — planned)
