# US-E10.1 Messaging: 2-Pane Inbox + 1:1 + Group Chat

## Status

planned

## Lane

normal

## Dependencies

- Depends on: US-E01.2 (login SSO — user identity for chat), US-E08.5 (profile — avatar)
- Blocks: none
- Feature module(s) cham: `src/features/messaging/` (new feature)
- Shared contract/file: `bootstrap/endpoint/messaging.endpoint.ts` (new); SSE channel (decision 0009)

## Product Contract

Man hinh tin nhan 2 khoang (`/messages`): trai la danh sach cuoc hoi thoai (Direct /
Groups tabs), phai la cua so chat. Tat ca roles (teacher, principal, admin, student,
parent) deu co quyen truy cap.

**Pane trai — Conversation list:**
- Tab "Truc tiep" (Direct) va tab "Nhom" (Groups).
- Tim kiem cuoc hoi thoai (client-side search theo ten nguoi / ten nhom).
- Moi item: avatar, ten, last message preview (2 dong), thoi gian, unread count badge.
- Online indicator dot (green) khi nguoi dung dang online (mock: co dinh mot so nguoi).

**Pane phai — Chat window:**
- Header: avatar + ten nguoi / nhom + online status.
- Message bubbles: tin nhan minh (phai, mau primary) / tin nhan nguoi khac (trai, mau card).
- Date dividers giua cac nhom tin nhan theo ngay.
- System messages (italic, centered): "Nguyen Van A da them Tran Thi B vao nhom".
- Typing indicator (3 dots animation) khi dang cho.
- Input: text input + Send button + attachment placeholder.
- New-message modal: chon nguoi nhan / ten nhom, tao cuoc hoi thoai moi.

**Real-time:** SSE channel (decision 0009) nhan `message.new` event de prepend tin nhan
moi vao cua so chat dang mo (mock-first: setTimeout simulation trong design).

RBAC: Tat ca roles co quyen nhan tin. [ASSUMPTION] Admin co the xem tat ca nhom.
BE mock-first: `social` service chua ship (decision 0017).

## Relevant Product Docs

- `docs/product/screens.md` — All roles section "Messaging" row
- `design_src/edu/messaging.jsx` — MessagingScreen (1506 handoff)
- Epic overview: `docs/stories/epics/E10-communications/EPIC-OVERVIEW.md`
- Decision 0009 (SSE), decision 0017 (service map — social)

## Acceptance Criteria

- AC-1 (loading): Skeleton loader khi load danh sach cuoc hoi thoai.
- AC-2 (conversation list): Danh sach hoi thoai hien thi avatar, ten, last message, thoi gian, unread badge; tab Direct/Groups chuyen dung.
- AC-3 (chat window): Click vao hoi thoai -> hien thi bubbles theo thu tu thoi gian; date dividers dung; system messages italic centered.
- AC-4 (send message): Nhap text + nhan Send -> tin nhan xuat hien ngay (optimistic) trong bubble phai; xoa input sau khi gui.
- AC-5 (real-time): SSE mock prepend tin nhan moi vao chat dang mo trong < 1s (setTimeout simulation).
- AC-6 (new conversation): Click "Tin nhan moi" -> modal chon nguoi / nhom -> confirm -> cuoc hoi thoai moi xuat hien dau danh sach.
- AC-7 (online indicator): Nguoi dang online hien thi green dot; offline khong hien thi.
- AC-8 (empty state): Chua co tin nhan -> empty state co CTA "Bat dau cuoc hoi thoai".
- AC-9 (error state): Load loi -> error banner trong pane trai.
- AC-10 (responsive): 2-pane layout tren >= 768px; mobile (< 768px) hien thi 1 pane tai mot thoi diem (list hoac chat).
- AC-11 (a11y): Chat window co role="log" aria-live="polite"; bubble list keyboard scrollable; input co label.
- AC-12 (i18n): Tat ca strings qua namespace `messaging`.

## Design Notes

- Route: `/messages`
- Design file: `design_src/edu/messaging.jsx` — MessagingScreen, ConversationList, ChatWindow components
- Commands: `sendMessage`, `createConversation`, `markConversationRead`
- Queries: `getConversations`, `getMessages` (cursor-paginated)
- API (mock-first — social service planned):
  - `GET  /social/api/v1/conversations`
  - `GET  /social/api/v1/conversations/:id/messages`
  - `POST /social/api/v1/conversations/:id/messages`
  - `POST /social/api/v1/conversations`
- Domain rules: Message bubbles: own = right align + primary color; others = left + card bg. Typing dots: 3-dot animation CSS (motion-safe). Date dividers: "Hom nay", "Hom qua", dd/mm/yyyy.
- UI surfaces: 2-pane layout; ConversationItem; MessageBubble; DateDivider; SystemMessage; TypingIndicator; NewConversationModal

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | sendMessage use-case (ok/empty-body/max-length); createConversation (ok/no-recipients) |
| Integration | MessagingRepository mock (getConversations, getMessages cursor-paged, sendMessage) |
| E2E | Storybook: Loading / DirectTabPopulated / GroupTabPopulated / ChatWindowOpen / SendMessage_Optimistic / EmptyState |
| Platform | bun build + tsc clean |
| Release | design-review gate pass |

## Harness Delta

- `docs/TEST_MATRIX.md`: add row US-E10.1 (planned)
- `docs/product/screens.md`: Messaging row -> design-ready
