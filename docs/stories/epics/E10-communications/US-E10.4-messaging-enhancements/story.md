# US-E10.4 Messaging Enhancements (DR-008): Group Lifecycle + Message Interactions

## Status

planned

## Lane

normal

## Dependencies

- Depends on: **US-E10.1** (base messaging — 2-pane inbox, 1:1 + group chat, send, SSE mock). US-E10.4 mở rộng trên feature module đã có.
- Blocks: none
- Feature module(s) chạm: `src/features/messaging/` (extends — KHÔNG tạo module mới)
- Shared contract/file: `bootstrap/endpoint/messaging.endpoint.ts` (thêm endpoint group lifecycle + pin), `social` SSE channel (decision 0009)

## Bối cảnh — vì sao tách khỏi US-E10.1

Quyết định 2026-06-19 (ADR 0044 follow-up): DR-008 (edustaff_5 handoff, `messaging.jsx`
+1390 dòng) là lớp tính năng bổ sung đáng kể trên base messaging. US-E10.1 đã `implemented`
với proof đầy đủ; gộp DR-008 vào sẽ phình scope một story đã đóng. Tách thành US-E10.4 để:
- giữ US-E10.1 ổn định ở `implemented`,
- DR-008 có branch + proof riêng (1 US = 1 branch — `parallel-workflow.md`),
- FE team build sau khi base merge mà không đụng vào proof của E10.1.

## Product Contract

Mở rộng màn `/messages` (base US-E10.1) với group lifecycle và message interactions.
Design source: `edustaff_5/edu/messaging.jsx` (MessagingScreen + DR-008 components).
Mock-first: `social` service chưa ship (decision 0017).

### A. Group features

**Danh sách nhóm nâng cao (tab Groups):**
- Avatar nhóm (màu từ palette 8 màu), số thành viên, last activity, unread badge riêng cho nhóm.

**"Tạo nhóm" — modal 2 bước:**
- Bước 1: tên nhóm, mô tả, loại nhóm (Lớp học / Bộ môn / Câu lạc bộ / Khác), chọn màu avatar.
- Bước 2: tìm kiếm + chọn thành viên (multi-select với checkbox).
- Submit → nhóm mới xuất hiện đầu tab Groups (optimistic prepend).

**Group info panel (320px slide-in từ phải):**
- Danh sách thành viên + badge admin.
- Tin nhắn đã ghim (pinned messages).
- Nút rời nhóm / xóa nhóm (admin-only — role-gated destructive UI).

### B. Message interactions

**Context menu (right-click / long-press) trên bubble:**
- Trả lời / Ghim tin nhắn / Sao chép / Xóa (Xóa: chỉ tin của mình, trong 1 giờ).

**Reply / Quote:**
- Strip "Đang trả lời [Tên]" phía trên input khi chọn reply.
- Bubble được reply hiển thị quoted-strip nhỏ phía trên nội dung.

**Pin:**
- Tin nhắn ghim xuất hiện trong group info panel.
- Click pinned → scroll đến tin nhắn gốc + highlight 3s.

### C. Per-role group seeding (mock data)

- Teacher ↔ nhóm bộ môn, nhóm lớp chủ nhiệm.
- Principal ↔ nhóm BGH.
- Student ↔ nhóm lớp học.
- Parent ↔ DM với GVCN.

## Relevant Product Docs

- `docs/product/screens.md` — All-roles Messaging row (DR-008 enhancements note)
- Design source: `edustaff_5/edu/messaging.jsx` (DR-008 group + interaction components)
- ADR 0044 — design handoff edustaff_5 baseline
- US-E10.1 — base messaging (parent story)
- Decision 0009 (SSE), 0017 (service map — social), 0026 (component placement)

## Acceptance Criteria

- AC-1 (group list): Tab Groups hiển thị avatar nhóm (màu palette), số thành viên, last activity, unread badge.
- AC-2 (create group — step 1): Click "Tạo nhóm" → modal bước 1: nhập tên (required), mô tả, chọn loại nhóm, chọn màu avatar; Next bị disable khi thiếu tên.
- AC-3 (create group — step 2): Bước 2: tìm kiếm + multi-select thành viên (checkbox); cần ≥1 thành viên để submit.
- AC-4 (create group — submit): Submit → nhóm mới prepend đầu tab Groups (optimistic); rollback + error banner nếu thất bại.
- AC-5 (group info panel): Click header nhóm → panel 320px slide-in: thành viên + badge admin, pinned messages; rời/xóa nhóm chỉ hiện cho admin của nhóm.
- AC-6 (context menu): Right-click / long-press bubble → menu Trả lời / Ghim / Sao chép / Xóa; "Xóa" chỉ hiện cho tin của mình trong vòng 1 giờ.
- AC-7 (reply/quote): Chọn "Trả lời" → strip "Đang trả lời [Tên]" trên input; gửi → bubble hiển thị quoted-strip; click quoted-strip → scroll tới tin gốc.
- AC-8 (pin): Ghim tin → xuất hiện trong group info panel; click pinned → scroll + highlight 3s (motion-safe).
- AC-9 (empty/loading/error): Group list rỗng → empty state; tạo nhóm đang chạy → loading; lỗi → banner.
- AC-10 (a11y): Modal 2 bước có focus trap + tiêu đề; context menu thao tác được bằng keyboard (menu role + arrow keys); panel slide-in motion-safe; pin highlight gated `prefers-reduced-motion`.
- AC-11 (i18n): Tất cả strings mới qua namespace `messaging` (mở rộng catalog hiện có).
- AC-12 (role-gated): Nút xóa/rời nhóm chỉ render cho role hợp lệ (admin của nhóm) — không chỉ ẩn bằng CSS.

## Design Notes

- Route: `/messages` (reuse base; không thêm route)
- Design source: `edustaff_5/edu/messaging.jsx` — CreateGroupModal (2-step), GroupInfoPanel, MessageContextMenu, ReplyStrip, PinnedMessages
- Commands (mở rộng): `createGroup`, `addGroupMembers`, `removeGroupMember`, `leaveGroup`, `deleteGroup`, `replyMessage`, `pinMessage`, `unpinMessage`, `deleteMessage`
- Queries (mở rộng): `getGroupInfo(groupId)`, `getPinnedMessages(conversationId)`
- API (mock-first — social service planned):
  - `POST   /social/api/v1/groups`
  - `POST   /social/api/v1/groups/:id/members`
  - `DELETE /social/api/v1/groups/:id/members/:userId`
  - `DELETE /social/api/v1/groups/:id` (admin)
  - `POST   /social/api/v1/conversations/:id/messages/:msgId/pin`
  - `DELETE /social/api/v1/conversations/:id/messages/:msgId`
- Component placement (decision 0026):
  - `CreateGroupModal` → `features/messaging/presentation/create-group-modal/` (compound với Radix Dialog; multi-step state local)
  - `GroupInfoPanel` → `features/messaging/presentation/group-info-panel/`
  - `MessageContextMenu` → reuse `components/ui/context-menu/` nếu có, hoặc `dropdown-menu` primitive — KHÔNG fork
  - `ReplyStrip` → `features/messaging/presentation/message-input/` (mở rộng MessageInput đã có, không tạo component trùng)
  - Reply quoted-strip → mở rộng `ChatBubble` bằng variant/prop (decision 0026 — extend, không fork)
- Domain (mở rộng `features/messaging/domain/`):
  - Entity: `GroupEntity { id, name, description, kind, color, members: GroupMember[], pinnedMessageIds: string[] }`, `GroupMember { userId, name, role: 'admin' | 'member' }`
  - Message entity thêm: `replyTo?: { messageId, senderName, excerpt }`, `isPinned?: boolean`
  - Failure mở rộng: `'create-group-failed' | 'group-mutation-failed' | 'pin-failed' | 'delete-message-failed' | 'not-group-admin'`

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `CreateGroupUseCase` (ok / no-name / no-members); `DeleteMessageUseCase` (ok / not-own / >1h → fail); `PinMessageUseCase`; `removeGroupMember` (ok / not-admin → not-group-admin) |
| Integration | `MockMessagingRepository` group lifecycle (createGroup prepend, add/removeMember, deleteGroup), pin/unpin, deleteMessage; per-role group seeding |
| E2E | Storybook: `CreateGroup_Step1`, `CreateGroup_Step2_Submit`, `GroupInfoPanel_Open`, `GroupInfoPanel_AdminActions`, `ContextMenu_OwnMessage`, `ContextMenu_OtherMessage`, `Reply_Quote`, `Pin_ScrollHighlight`, `EmptyGroups`, `ErrorState` + mobile |
| Platform | bun build + tsc clean |
| Release | design-review gate pass; WCAG 2.1 AA (modal focus, keyboard context-menu, motion-safe) |

## Harness Delta

- `docs/TEST_MATRIX.md`: add row US-E10.4 (planned)
- `docs/product/screens.md`: Messaging row — DR-008 enhancements → đang thực hiện ở US-E10.4
- Copy `edustaff_5/edu/messaging.jsx` → `design_src/edu/messaging.jsx` (refresh DR-008 source) khi story bắt đầu (ADR 0044 follow-up)

## Evidence

(empty — fill after implementation)
