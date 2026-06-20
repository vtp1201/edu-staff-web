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

---

## Requirements

### 1. Requirements Summary

US-E10.4 extends the existing `src/features/messaging/` module with two capability layers on top of the base messaging screen delivered in US-E10.1: (A) group lifecycle — create, rename, add/remove members, leave, and delete groups via a 2-step modal and a 320px info panel; and (B) message interactions — context menu with reply/quote, pin, copy, and delete with confirmation. All four system roles (teacher, principal, student, parent) can create groups; group admin is an **in-feature role flag** (`selfIsGroupAdmin`) on the group entity, not a system RBAC role. The feature is mock-first (`social` service not yet shipped); all UI strings consume the 47 keys already staged in the `messaging` namespace. Non-functional baselines: WCAG 2.1 AA (focus trap, keyboard nav, motion-safe), responsive to 375px, skeleton loading ≤ 320ms, i18n vi+en.

---

### 2. Technical Requirements (JSON)

```json
{
  "requirementId": "TR-E10.4",
  "title": "Messaging Enhancements — Group Lifecycle + Message Interactions",
  "status": "Draft",
  "actors": [
    {
      "role": "teacher",
      "capabilities": [
        "Create a group (becomes group admin)",
        "Manage group info/members as group admin on own groups",
        "Reply, pin, copy, and delete (own, within 1h) messages",
        "Leave any group",
        "View GroupInfoPanel for all groups"
      ]
    },
    {
      "role": "principal",
      "capabilities": [
        "Create a group (becomes group admin)",
        "Manage group info/members as group admin on own groups",
        "Reply, pin, copy, and delete (own, within 1h) messages",
        "Leave any group",
        "View GroupInfoPanel for all groups"
      ]
    },
    {
      "role": "student",
      "capabilities": [
        "Create a group (becomes group admin on own group)",
        "Reply, copy messages in any group",
        "Delete own messages within 1 hour",
        "Leave any group",
        "View GroupInfoPanel (no admin actions on seeded groups)"
      ]
    },
    {
      "role": "parent",
      "capabilities": [
        "Create a group (becomes group admin on own group)",
        "Reply, copy messages",
        "Delete own messages within 1 hour",
        "DM-only seeded view (no seeded group admin)"
      ]
    }
  ],

  "functionalRequirements": [

    {
      "id": "FR-001",
      "priority": "Must",
      "description": "The system SHALL display the Groups tab with a list of group conversations, each row showing: a square avatar (42px, border-radius 12px) with the group's color background at 20% opacity and 2-letter initials at 14px/800; group name (13.5px, 800 when unread / 600 when read); timestamp (11px muted); last-activity line (sender label 700 + preview text, single-line ellipsis); member-count chip (users icon + count, 10px/700); and an unread badge using `var(--edu-error)` background (distinct from the direct-message badge).",
      "trigger": "User navigates to the Nhóm tab on the /messages screen.",
      "preconditions": ["User is authenticated.", "Messaging screen base (US-E10.1) is rendered."],
      "postconditions": ["Group list rows render with correct data per the design-spec groupList token values."],
      "errorConditions": ["If group list fails to load, the system SHALL display an error banner using `messaging.errors.load-conversations-failed`."]
    },

    {
      "id": "FR-002",
      "priority": "Must",
      "description": "The system SHALL render a '+ Tạo nhóm' CTA sub-header above the group list. Clicking it SHALL open the 2-step CreateGroupModal. The CTA SHALL use `pColor + '08'` background, `pColor + '12'` on hover, 13px/800 text, and a 22×22px icon box (border-radius 6, `pColor` background, white icon).",
      "trigger": "User clicks '+ Tạo nhóm' CTA.",
      "preconditions": ["User is on the Groups tab."],
      "postconditions": ["CreateGroupModal opens at Step 1."],
      "errorConditions": []
    },

    {
      "id": "FR-003",
      "priority": "Must",
      "description": "The system SHALL render CreateGroupModal Step 1 (Thông tin nhóm) with: (a) a step indicator showing Step 1 active (pColor dot, 800 label) and Step 2 inactive (border dot, muted label); (b) a live avatar preview (56px, border-radius 14, selectedColor+20 bg, selectedColor+55 border) showing up to 3 initials derived from the first 2 words of the entered name; (c) a name field (required, minLength 2, maxLength 60, label `messaging.group.nameLabel`); (d) a description textarea (optional, maxLength 140, 3 rows, vertical-resize, label `messaging.group.descLabel`); (e) a group-type selector in a 2-column radio grid with 4 types: Lớp học / Bộ môn / Câu lạc bộ / Khác (icons: users / briefcase / sparkles / message); (f) a color picker of 8 swatches drawn from design tokens (`--edu-primary`, `--edu-success`, `--edu-warning`, `--edu-error`, `--edu-purple`, `--edu-teal`, `#6366F1`, `#FB923C`) with 24px swatch size, border-radius 7, selected state: 2.5px solid `--edu-text-primary` border + 2px ring in selectedColor; (g) a 'Tiếp theo' button disabled when name is absent or shorter than 2 characters.",
      "trigger": "CreateGroupModal opens.",
      "preconditions": ["Modal is open at Step 1."],
      "postconditions": ["All fields are present and validated. 'Tiếp theo' becomes enabled only when name length >= 2."],
      "errorConditions": ["Name field SHALL show an inline validation message when the user attempts to advance with an empty or too-short name."]
    },

    {
      "id": "FR-004",
      "priority": "Must",
      "description": "The system SHALL render CreateGroupModal Step 2 (Thêm thành viên) with: (a) a selected-member chip area showing each chosen member as a pill (memberColor+14 bg, memberColor+33 border, mini avatar, name, remove button); (b) a search field with a magnifier icon and placeholder `messaging.group.searchMembersPlaceholder`; (c) a bordered user list (border-radius 10, dividers) where each row shows a custom checkbox (18px, border-radius 5, pColor when checked), a 32px avatar, name (13px/700), and role (11px muted); (d) an empty search state with the string `messaging.group.noMembersFound`; (e) a 'Tạo nhóm' submit button disabled until at least 1 member is selected.",
      "trigger": "User advances from Step 1 of CreateGroupModal.",
      "preconditions": ["Step 1 fields are valid (name >= 2 chars)."],
      "postconditions": ["Step 2 is rendered. Step indicator shows Step 1 as 'done' (success dot with check) and Step 2 as active."],
      "errorConditions": ["If no members are selected, the submit button remains disabled and SHALL NOT be clickable."]
    },

    {
      "id": "FR-005",
      "priority": "Must",
      "description": "The system SHALL, on CreateGroupModal submit, optimistically prepend the new group to the top of the Groups tab list using the entered name, selected color, and member count, then close the modal. If the mutation fails, the system SHALL rollback the optimistic item and display an error banner using the `messaging.errors` key for `create-group-failed`.",
      "trigger": "User clicks 'Tạo nhóm' with at least 1 member selected.",
      "preconditions": ["Step 2 is valid (>= 1 member)."],
      "postconditions": ["New group appears at top of Groups tab with correct avatar color, name, member count. Modal is closed."],
      "errorConditions": ["On API failure: optimistic item is removed, error banner is shown, modal remains dismissible."]
    },

    {
      "id": "FR-006",
      "priority": "Must",
      "description": "The system SHALL render the GroupInfoPanel as a 320px right-side slide-in panel (animation: translateX(100%)→0, 0.22s ease-out, gated by `prefers-reduced-motion`) when the user clicks the group conversation header. The panel SHALL contain, in order: (a) header with group name, 'Thông tin nhóm' title, close button, and an admin-only edit icon button (penLine, 28×28px, border-radius 7); (b) avatar section with 80px square avatar (border-radius 20, groupColor+22 bg, groupColor+33 border 3px) and an admin-only overlay edit badge (28px circle, pColor bg); (c) group name (16px/800) and description (12px muted); (d) member count pill (users icon, 11px/700, border `--edu-border`); (e) MEMBERS section; (f) PINNED MESSAGES section; (g) footer with leave/delete CTAs.",
      "trigger": "User clicks the header area of an open group conversation.",
      "preconditions": ["A group conversation is open in the chat pane."],
      "postconditions": ["GroupInfoPanel slides in from the right. Chat window remains visible behind the panel (or narrows, per layout)."],
      "errorConditions": []
    },

    {
      "id": "FR-007",
      "priority": "Must",
      "description": "The system SHALL render the MEMBERS section inside GroupInfoPanel listing all group members. Each member row SHALL show: a 32px avatar (memberColor+22 bg), online dot (9px, `--edu-success`, 2px white border) when online, name (12.5px/700), role label (10.5px muted), an 'Admin' badge (error-light bg, error color) when the member is a group admin, and a '(Bạn)' suffix on the self row. The system SHALL render a remove button (22px, border-radius 5, x icon in error color) on each row that is NOT the current user and NOT another admin, and SHALL only show this button when `selfIsGroupAdmin` is true.",
      "trigger": "GroupInfoPanel is open.",
      "preconditions": ["GroupInfoPanel is rendered for a group conversation."],
      "postconditions": ["All members are listed; role badges, admin badges, and remove buttons are conditionally rendered per the rules above."],
      "errorConditions": []
    },

    {
      "id": "FR-008",
      "priority": "Must",
      "description": "The system SHALL, when an admin clicks the rename/edit button in GroupInfoPanel, switch the avatar section into edit mode: name becomes a centered editable input (16px/800), description becomes a 2-row resizable textarea (12.5px), and save/cancel buttons appear. On save, the system SHALL call the rename mutation and update the group name in the list and panel header. On cancel, the panel reverts to view mode with no changes.",
      "trigger": "Group admin clicks the edit (penLine) icon in GroupInfoPanel header or avatar section.",
      "preconditions": ["Current user's `selfIsGroupAdmin` is true.", "GroupInfoPanel is in view mode."],
      "postconditions": ["Edit mode renders. On save: group name/description updated in panel and conversation list. On cancel: no change."],
      "errorConditions": ["On save failure, the system SHALL display an inline error and revert to the pre-save value."]
    },

    {
      "id": "FR-009",
      "priority": "Must",
      "description": "The system SHALL, when an admin clicks '+ Thêm thành viên' in the GroupInfoPanel MEMBERS section header, open a search + select flow (same search/checkbox UX as CreateGroupModal Step 2) and add the selected members to the group on confirm. The system SHALL exclude already-current members from the search results.",
      "trigger": "Group admin clicks '+ Thêm thành viên' in GroupInfoPanel.",
      "preconditions": ["`selfIsGroupAdmin` is true.", "GroupInfoPanel is open."],
      "postconditions": ["Selected members are added to the group member list in the panel."],
      "errorConditions": ["On failure, an error message is displayed; no members are added."]
    },

    {
      "id": "FR-010",
      "priority": "Must",
      "description": "The system SHALL, when an admin clicks the remove button on a non-admin, non-self member row, display an inline confirmation (or toast confirm) and on confirmation call the remove member mutation, then remove that member from the panel's member list. The system SHALL NOT render a remove button on the current user's own row or on rows of other admins.",
      "trigger": "Group admin clicks the remove (x) button on an eligible member row.",
      "preconditions": ["`selfIsGroupAdmin` is true.", "Target member is not the current user and is not an admin."],
      "postconditions": ["Member is removed from the list in the panel. Member count decrements."],
      "errorConditions": ["On failure, the member row is restored and an error is displayed."]
    },

    {
      "id": "FR-011",
      "priority": "Must",
      "description": "The system SHALL render a 'Rời nhóm' button in GroupInfoPanel footer for ALL group members (warning tone: warning-light bg, warning color border). On click, the system SHALL show a confirmation dialog and on confirm call the leave group mutation, close the panel, and remove the group from the conversation list.",
      "trigger": "Any member clicks 'Rời nhóm' in GroupInfoPanel footer.",
      "preconditions": ["GroupInfoPanel is open.", "Current user is a group member."],
      "postconditions": ["User is removed from the group. Group disappears from the conversation list."],
      "errorConditions": ["On failure, an error banner is shown and the user remains in the group."]
    },

    {
      "id": "FR-012",
      "priority": "Must",
      "description": "The system SHALL render a 'Xoá nhóm' button in GroupInfoPanel footer ONLY when `selfIsGroupAdmin` is true (error tone: error-light bg, error color border). Clicking it SHALL replace the footer with a two-step inline confirmation showing the warning text `messaging.groupInfo.deleteWarning`, a ghost cancel button, and a danger confirm button labeled `messaging.groupInfo.deleteGroup`. On confirm, the system SHALL call the delete group mutation, close the panel, and remove the group from the conversation list. This button SHALL NOT render for non-admin members.",
      "trigger": "Group admin clicks 'Xoá nhóm' in GroupInfoPanel footer.",
      "preconditions": ["`selfIsGroupAdmin` is true.", "GroupInfoPanel is open."],
      "postconditions": ["Group is deleted. Panel closes. Group removed from conversation list."],
      "errorConditions": ["On failure, the panel returns to normal footer and an error is displayed."]
    },

    {
      "id": "FR-013",
      "priority": "Must",
      "description": "The system SHALL render the PINNED MESSAGES section in GroupInfoPanel listing all pinned messages for the conversation. Each pinned row SHALL show: a star icon box (22px circle, warning+22 bg, star/10px warning icon), sender name (11px/800), timestamp (11px muted/600), and a text preview (12px secondary, single-line ellipsis). The row SHALL be clickable. If no messages are pinned, the section SHALL show the empty-state string `messaging.groupInfo.noPinned` (12px italic muted, centered, padding 18px).",
      "trigger": "GroupInfoPanel is open with a group that has pinned messages (or none).",
      "preconditions": ["GroupInfoPanel is rendered."],
      "postconditions": ["Pinned messages list or empty state is shown."],
      "errorConditions": []
    },

    {
      "id": "FR-014",
      "priority": "Must",
      "description": "The system SHALL, when the user clicks a pinned message row in GroupInfoPanel, close or collapse the panel and scroll the chat window to the original message, then apply a 3-second highlight animation to that message bubble. The highlight animation SHALL be gated by `prefers-reduced-motion`: when reduced motion is preferred, the scroll SHALL happen but the highlight SHALL be omitted or replaced by a static border.",
      "trigger": "User clicks a pinned message row in GroupInfoPanel.",
      "preconditions": ["GroupInfoPanel is open.", "The original message exists in the loaded message list."],
      "postconditions": ["Chat scrolls to the original message. Message is highlighted for 3 seconds (if motion is allowed)."],
      "errorConditions": ["If the original message is not in the loaded window, the system SHALL attempt to fetch and scroll to it; on failure, no action beyond closing the panel."]
    },

    {
      "id": "FR-015",
      "priority": "Must",
      "description": "The system SHALL display a context menu on right-click (desktop) or long-press (mobile/touch) on any ChatBubble. The menu SHALL be a 200px card (border-radius 10, card bg, `--edu-border` border, shadow) positioned at the event coordinates and clamped to viewport bounds. The menu SHALL contain 4 items in order: Reply (always enabled, arrowLeft icon), Pin (star icon, enabled per FR-016 conditions), Copy (fileText icon, always enabled), Delete (x icon, danger item, enabled per FR-017 conditions). The menu SHALL close on Escape key or backdrop click. Keyboard navigation SHALL follow the ARIA `menu` role with arrow keys.",
      "trigger": "User right-clicks or long-presses a ChatBubble.",
      "preconditions": ["A conversation is open in the chat pane."],
      "postconditions": ["Context menu appears positioned at the trigger point, clamped within viewport."],
      "errorConditions": []
    },

    {
      "id": "FR-016",
      "priority": "Must",
      "description": "The system SHALL enable the 'Ghim tin nhắn' (Pin) item in the context menu when: the conversation is a direct (1:1) message (always enabled), OR the conversation is a group AND `selfIsGroupAdmin` is true. When the Pin item is disabled (group message, non-admin), it SHALL remain visible but rendered at 40% opacity with the hint text `messaging.contextMenu.pinAdminOnly`. Selecting Pin (when enabled) SHALL add the message to the pinned list in GroupInfoPanel and call the pin mutation.",
      "trigger": "User selects 'Ghim tin nhắn' from the context menu.",
      "preconditions": ["Pin item is enabled per the condition above."],
      "postconditions": ["Message appears in GroupInfoPanel pinned section."],
      "errorConditions": ["On mutation failure, the message is removed from the pinned list and an error is shown."]
    },

    {
      "id": "FR-017",
      "priority": "Must",
      "description": "The system SHALL enable the 'Xóa' (Delete) item in the context menu ONLY when `message.from === 'me'` AND the message was sent within the last 1 hour. When disabled, the item SHALL remain visible at 40% opacity. Selecting Delete (when enabled) SHALL open a confirmation dialog with title `messaging.deleteDialog.title`, body `messaging.deleteDialog.body`, cancel button (`messaging.deleteDialog.cancel`), and confirm button (`messaging.deleteDialog.confirm`). On confirm, the system SHALL replace the message bubble content with the placeholder `messaging.deleteDialog.deletedLabel` and call the delete mutation.",
      "trigger": "User selects 'Xóa' from the context menu.",
      "preconditions": ["Delete item is enabled: message.from === 'me' and sent within 1 hour."],
      "postconditions": ["Message bubble shows 'Tin nhắn đã bị xoá' placeholder."],
      "errorConditions": ["On mutation failure, the message is restored and an error is shown."]
    },

    {
      "id": "FR-018",
      "priority": "Must",
      "description": "The system SHALL enable the 'Sao chép văn bản' (Copy) item in the context menu for all messages at all times. Selecting it SHALL copy the message text to the system clipboard. No confirmation UI is required.",
      "trigger": "User selects 'Sao chép văn bản' from the context menu.",
      "preconditions": [],
      "postconditions": ["Message text is copied to clipboard."],
      "errorConditions": ["If clipboard API is unavailable, the system SHALL silently fail (no error shown to user)."]
    },

    {
      "id": "FR-019",
      "priority": "Must",
      "description": "The system SHALL, when the user selects 'Trả lời' from the context menu, close the context menu and render a reply strip above the message input area. The reply strip SHALL show: label `messaging.reply.replyingTo` interpolated with the sender's name (or 'Bạn' for own messages), a single-line ellipsis preview of the quoted text, and a cancel button (`messaging.reply.cancelAriaLabel`). The input placeholder SHALL switch to `messaging.reply.placeholder`. Cancelling the strip SHALL restore normal input state.",
      "trigger": "User selects 'Trả lời' from the context menu.",
      "preconditions": ["A conversation is open."],
      "postconditions": ["Reply strip is shown above the input. The message field is focused."],
      "errorConditions": []
    },

    {
      "id": "FR-020",
      "priority": "Must",
      "description": "The system SHALL, when a reply message is sent (reply strip is active), send the message with a `replyTo` reference containing the quoted message's `messageId`, `senderName`, and an `excerpt` (truncated preview). The sent bubble SHALL display a quoted block above the message text: for own bubbles — semi-transparent white bg with white-ish border-left 3px; for others' bubbles — `var(--edu-bg)` with `pColor` border-left 3px. The quoted block SHALL show sender name (11px/800) and preview text (12px/500, single-line ellipsis). The quoted block SHALL be clickable.",
      "trigger": "User sends a message while reply strip is active.",
      "preconditions": ["Reply strip is active with a `replyTo` reference."],
      "postconditions": ["Sent bubble contains a quoted block. Reply strip is dismissed. Input returns to normal."],
      "errorConditions": ["On send failure, the reply state is preserved so the user can retry."]
    },

    {
      "id": "FR-021",
      "priority": "Must",
      "description": "The system SHALL, when the user clicks the quoted block inside a ChatBubble, scroll the chat window to the original quoted message. This behavior SHALL apply to all bubbles containing a `replyTo` reference.",
      "trigger": "User clicks the quoted block inside a ChatBubble.",
      "preconditions": ["The clicked bubble has a `replyTo.messageId` reference."],
      "postconditions": ["Chat scrolls to the original message."],
      "errorConditions": ["If the original message is not in the visible window and cannot be fetched, no scroll occurs."]
    },

    {
      "id": "FR-022",
      "priority": "Must",
      "description": "The system SHALL display an empty state in the Groups tab when the user has no group conversations. The empty state SHALL show: a users icon (36px, `--edu-border`, strokeWidth 1.4), a title (13px/700 secondary), a subtitle (11.5px muted), and an inline primary 'Tạo nhóm mới' button (sm, plus icon) using `messaging.group.emptyCreateCta`. Clicking this button SHALL open the CreateGroupModal.",
      "trigger": "Groups tab is active and no group conversations exist for the current user.",
      "preconditions": ["User is on the Groups tab."],
      "postconditions": ["Empty state is shown with the CTA button."],
      "errorConditions": []
    },

    {
      "id": "FR-023",
      "priority": "Must",
      "description": "The system SHALL display a skeleton loading state (5 staggered bubbles, 320ms duration, shimmer animation) in the chat pane when switching between conversations. Bubbles SHALL alternate left/right alignment per the pattern: left-220, left-160, right-200, left-240, right-140 (widths in px), with left radius 16/16/16/4 and right radius 16/16/4/16. Skeleton SHALL be dismissed when message data is available.",
      "trigger": "User selects a different conversation in the list.",
      "preconditions": ["Messaging screen is open."],
      "postconditions": ["Skeleton shows for up to 320ms, then replaced by actual messages."],
      "errorConditions": ["If loading fails beyond 320ms, the skeleton is replaced by an error state."]
    },

    {
      "id": "FR-024",
      "priority": "Must",
      "description": "The system SHALL seed mock group data per role when `NEXT_PUBLIC_USE_MOCK=true`: Teacher — homeroom group (selfIsGroupAdmin: true) + dept group; Principal — BGH admin group (selfIsGroupAdmin: true) + one additional group; Student — class group (selfIsGroupAdmin: false); Parent — DM with homeroom teacher only (no group). This seeding SHALL be implemented in the mock repository fixture only and SHALL NOT affect any domain or infrastructure code.",
      "trigger": "Mock mode is active and the Groups tab is loaded.",
      "preconditions": ["`NEXT_PUBLIC_USE_MOCK=true`."],
      "postconditions": ["Each role sees appropriate seeded groups with correct selfIsGroupAdmin values."],
      "errorConditions": []
    },

    {
      "id": "FR-025",
      "priority": "Should",
      "description": "The system SHALL extend the `MessagingFailure` union with the following new failure types (stable keys that map to `messaging.errors.*` i18n entries to be added): `create-group-failed`, `group-mutation-failed`, `pin-failed`, `delete-message-failed`, `not-group-admin`. The presentation layer SHALL translate these keys; domain and infrastructure SHALL not.",
      "trigger": "Any group lifecycle or message interaction mutation fails.",
      "preconditions": [],
      "postconditions": ["Failure type is surfaced as an error banner or inline message in the presentation layer."],
      "errorConditions": []
    },

    {
      "id": "FR-026",
      "priority": "Should",
      "description": "The system SHALL extend `MessageEntity` with optional fields: `replyTo?: { messageId: string; senderName: string; excerpt: string }` and `isPinned?: boolean`. The system SHALL extend `ConversationEntity` (or introduce `GroupEntity`) with: `selfIsGroupAdmin?: boolean`, `groupKind?: 'class' | 'dept' | 'club' | 'other'`, `pinnedMessageIds?: string[]`. These extensions SHALL be additive (existing fields remain unchanged).",
      "trigger": "Domain entity is read by any group-related use case or presentation component.",
      "preconditions": [],
      "postconditions": ["Existing use cases continue to function. New use cases consume the new fields."],
      "errorConditions": []
    },

    {
      "id": "FR-027",
      "priority": "Should",
      "description": "The system SHALL add the following new endpoint constants to `MESSAGING_EP` at `src/bootstrap/endpoint/messaging.endpoint.ts`: `createGroup` (`POST /social/api/v1/groups`), `addGroupMembers` (`POST /social/api/v1/groups/:id/members`), `removeGroupMember` (`DELETE /social/api/v1/groups/:id/members/:userId`), `deleteGroup` (`DELETE /social/api/v1/groups/:id`), `pinMessage` (`POST /social/api/v1/conversations/:id/messages/:msgId/pin`), `unpinMessage` (`DELETE /social/api/v1/conversations/:id/messages/:msgId/pin`), `deleteMessage` (`DELETE /social/api/v1/conversations/:id/messages/:msgId`). All endpoints target the `social` service.",
      "trigger": "Any group lifecycle or message interaction mutation is executed.",
      "preconditions": ["Mock-first: real service is not yet available (decision 0017)."],
      "postconditions": ["Constants are defined and used by repositories (no magic strings)."],
      "errorConditions": []
    },

    {
      "id": "FR-028",
      "priority": "Could",
      "description": "The system COULD render an offline indicator (grayscale 20% avatar, 0.6 opacity row) for group members whose online status is false in the GroupInfoPanel member list, matching the design-spec `memberOffline` state.",
      "trigger": "GroupInfoPanel member list renders a member with online status false.",
      "preconditions": ["Member online status data is available in the mock fixture."],
      "postconditions": ["Offline members display at reduced opacity with grayscale avatar."],
      "errorConditions": []
    }
  ],

  "nonFunctionalRequirements": [
    {
      "id": "NFR-001",
      "category": "Accessibility",
      "requirement": "CreateGroupModal SHALL implement a focus trap (Radix Dialog or equivalent) with an accessible dialog title (`aria-labelledby`). Focus SHALL move to the first focusable field on open and return to the trigger element on close.",
      "measurableTarget": "WCAG 2.1 AA: 2.1.2 No Keyboard Trap (Focus Trap correct — focus does NOT escape the modal). 4.1.3 Status Messages. Screen reader announces dialog title on open."
    },
    {
      "id": "NFR-002",
      "category": "Accessibility",
      "requirement": "The context menu SHALL implement the ARIA `menu` role pattern. Arrow Up/Down keys navigate items. Enter/Space activates the focused item. Escape closes the menu and returns focus to the trigger bubble.",
      "measurableTarget": "WCAG 2.1 AA: 2.1.1 Keyboard. All 4 menu items reachable and activatable by keyboard only."
    },
    {
      "id": "NFR-003",
      "category": "Accessibility",
      "requirement": "All disabled context menu items (Pin when non-admin, Delete when ineligible) SHALL remain visible and focusable with `aria-disabled='true'` (not `disabled`). Their hint text SHALL be surfaced via `aria-describedby` or a tooltip accessible to screen readers.",
      "measurableTarget": "WCAG 2.1 AA: 4.1.2 Name, Role, Value. Disabled items have discernible purpose text accessible to AT."
    },
    {
      "id": "NFR-004",
      "category": "Accessibility",
      "requirement": "Member chips in CreateGroupModal Step 2 SHALL have an `aria-label` of the form 'Xoá {memberName} khỏi nhóm' on their remove button. Icon-only buttons in GroupInfoPanel (edit, close, avatar-edit badge, member remove) SHALL each have a Vietnamese `aria-label` matching the `messaging.groupInfo` keys.",
      "measurableTarget": "WCAG 2.1 AA: 1.3.1 Info and Relationships. All icon buttons pass automated accessible name check."
    },
    {
      "id": "NFR-005",
      "category": "Accessibility",
      "requirement": "All destructive actions (Remove member, Leave group, Delete group, Delete message) SHALL be behind a confirmation step before the irreversible mutation fires.",
      "measurableTarget": "WCAG 2.1 AA: 3.3.4 Error Prevention. At minimum one confirmation step for every destructive action."
    },
    {
      "id": "NFR-006",
      "category": "Accessibility",
      "requirement": "GroupInfoPanel slide-in animation (translateX, 0.22s) and the 3-second pin highlight animation SHALL be gated by `@media (prefers-reduced-motion: reduce)`. Under reduced motion: panel appears instantly; highlight is omitted or replaced by a static 1-frame border state.",
      "measurableTarget": "WCAG 2.1 AA: 2.3.3 Animation from Interactions. Zero motion rendered when prefers-reduced-motion is active."
    },
    {
      "id": "NFR-007",
      "category": "Accessibility",
      "requirement": "CreateGroupModal animations (msg-fadein, 0.18s) and context menu animations (msg-ctx-in, 0.12s) and reply strip animation (msg-reply-in, 0.15s) SHALL all be wrapped in a `@media (prefers-reduced-motion: reduce)` guard that sets animation to `none`.",
      "measurableTarget": "WCAG 2.1 AA: 2.3.3 Animation from Interactions. All three micro-animations absent under reduced motion."
    },
    {
      "id": "NFR-008",
      "category": "Accessibility",
      "requirement": "Contrast ratios for all text elements introduced in this story SHALL meet AA minimums: normal text (< 18px or < 14px bold) >= 4.5:1; large text and UI controls >= 3:1. Specifically: muted text on card bg, admin badge (error color on error-light bg), and warning button (warning color on warning-light bg) SHALL each be verified.",
      "measurableTarget": "WCAG 2.1 AA: 1.4.3 Contrast (Minimum). All text/UI at or above required ratio."
    },
    {
      "id": "NFR-009",
      "category": "Performance",
      "requirement": "The chat pane skeleton loading state SHALL be displayed within 320ms of a conversation switch and SHALL be replaced by actual messages when data resolves.",
      "measurableTarget": "Skeleton visible within 320ms. No blank/flash state between skeleton and messages."
    },
    {
      "id": "NFR-010",
      "category": "Performance",
      "requirement": "CreateGroupModal optimistic prepend SHALL update the Groups tab list synchronously (before the API response) so the user sees the new group immediately on submit.",
      "measurableTarget": "Perceived latency from submit click to list update: 0ms (synchronous optimistic update)."
    },
    {
      "id": "NFR-011",
      "category": "Responsive",
      "requirement": "The full feature set (Groups tab, CreateGroupModal, GroupInfoPanel, context menu, reply strip) SHALL remain functional and free of layout breakage at 375px viewport width. The GroupInfoPanel at 320px width SHALL not overlap or obscure critical chat controls on 375px screens (it MAY take full width or overlay with close affordance).",
      "measurableTarget": "No horizontal scroll, no overflow clipping of interactive controls at 375px. Tested at 375/768/1280px breakpoints."
    },
    {
      "id": "NFR-012",
      "category": "Responsive",
      "requirement": "The CreateGroupModal SHALL have a max-height of 92vh and SHALL scroll its body content internally when content exceeds available height, to avoid overflow on small screens.",
      "measurableTarget": "Modal body scrollable; no content unreachable on 375px height-constrained viewports."
    },
    {
      "id": "NFR-013",
      "category": "i18n",
      "requirement": "All UI strings introduced by this story SHALL use keys from the `messaging` namespace already present in `src/bootstrap/i18n/messages/{vi,en}.json` — specifically the sub-namespaces: `messaging.group`, `messaging.groupInfo`, `messaging.contextMenu`, `messaging.reply`, `messaging.deleteDialog`. No string literals in TSX outside message files. New failure-type keys for `messaging.errors` (`create-group-failed`, `group-mutation-failed`, `pin-failed`, `delete-message-failed`, `not-group-admin`) SHALL be added to both `vi.json` and `en.json` simultaneously.",
      "measurableTarget": "Zero diacritical (tiếng Việt) literals in `.tsx` files outside `*.test.*` / `*.stories.*` / mock fixtures. `bunx tsc --noEmit` passes. All 5 new error keys present in both locale files."
    },
    {
      "id": "NFR-014",
      "category": "Security",
      "requirement": "Group admin gate (`selfIsGroupAdmin`) SHALL be enforced in the domain use-case layer, not only in the presentation layer. Use cases for `removeGroupMember`, `deleteGroup`, `pinMessage` (group context), and `editGroupInfo` SHALL return a `not-group-admin` failure when called without admin rights, in addition to the UI not rendering the controls.",
      "measurableTarget": "Unit tests for each use case verify that non-admin callers receive `not-group-admin` failure (not a rendered action)."
    }
  ],

  "uiStates": ["loading", "empty", "error", "success"],

  "dataDependencies": [
    {
      "source": "mock",
      "entity": "GroupEntity (group conversations, members, selfIsGroupAdmin flag)",
      "sensitivity": "Internal"
    },
    {
      "source": "mock",
      "entity": "MessageEntity (replyTo, isPinned extensions)",
      "sensitivity": "Internal"
    },
    {
      "source": "social",
      "entity": "POST /social/api/v1/groups — create group",
      "sensitivity": "Internal"
    },
    {
      "source": "social",
      "entity": "POST /social/api/v1/groups/:id/members — add members",
      "sensitivity": "Internal"
    },
    {
      "source": "social",
      "entity": "DELETE /social/api/v1/groups/:id/members/:userId — remove member",
      "sensitivity": "Internal"
    },
    {
      "source": "social",
      "entity": "DELETE /social/api/v1/groups/:id — delete group",
      "sensitivity": "Internal"
    },
    {
      "source": "social",
      "entity": "POST /social/api/v1/conversations/:id/messages/:msgId/pin — pin message",
      "sensitivity": "Internal"
    },
    {
      "source": "social",
      "entity": "DELETE /social/api/v1/conversations/:id/messages/:msgId — delete message",
      "sensitivity": "Internal"
    }
  ],

  "scope": {
    "inScope": [
      "Group list rows with color avatar, member count, unread badge (error color)",
      "'+ Tạo nhóm' CTA and CreateGroupModal (2-step: info + member-select)",
      "Optimistic prepend on group create with rollback on failure",
      "GroupInfoPanel (320px slide-in): avatar/name/desc, member list, pinned section, footer CTAs",
      "Inline group name/description edit (admin only)",
      "Add members flow from GroupInfoPanel (admin only)",
      "Remove member per-row action (admin only, not self, not other admins)",
      "Leave group (any member, with confirmation)",
      "Delete group (admin only, two-step inline confirm)",
      "Context menu: Reply / Pin / Copy / Delete with role-gated enablement",
      "Reply/quote: reply strip + quoted block in ChatBubble + scroll-to-original",
      "Pin: pinned list in GroupInfoPanel + click-to-scroll + 3s highlight (motion-safe)",
      "Delete message: confirm dialog + placeholder bubble",
      "Skeleton loading (5-bubble shimmer, 320ms)",
      "Empty state for Groups tab",
      "Per-role mock data seeding (teacher/principal/student/parent)",
      "Domain entity extensions (MessageEntity.replyTo, MessageEntity.isPinned, GroupEntity)",
      "MessagingFailure union extension (5 new failure types)",
      "MESSAGING_EP constant additions (7 new endpoints)",
      "i18n key additions for new error types in messaging.errors"
    ],
    "outOfScope": [
      "Real-time SSE delivery of group events (decision 0009 — mock-first only for this story)",
      "Attachment/file sharing within group messages",
      "Promoting a non-admin member to admin (designate additional admins — seeded only, no UI mutation)",
      "Group avatar image upload (color swatch only; no file upload for avatar)",
      "Push notifications for group events",
      "Message search within a group conversation",
      "Thread/channel sub-grouping",
      "Unpin message action (not in DR-008 scope)",
      "Any new route or new feature module — this story extends src/features/messaging/ only",
      "Changes to the auth/RBAC system — selfIsGroupAdmin is an in-feature flag only"
    ],
    "externalDependencies": [
      "social service (mock-first per decision 0017 — real endpoints defined but not yet shipped)",
      "US-E10.1 base messaging implementation (must be merged to main before this story branches)",
      "Design source: design_src/edu/messaging.jsx DR-008 section",
      "i18n catalog: messaging.group / messaging.groupInfo / messaging.contextMenu / messaging.reply / messaging.deleteDialog keys (already staged in vi.json + en.json)"
    ]
  },

  "assumptions": [
    "[ASSUMPTION] The `social` service is not yet available; all mutations in this story are implemented against the mock repository. The endpoint constants are defined ready for real wiring when the service ships.",
    "[ASSUMPTION] 'Group admin' (`selfIsGroupAdmin`) is an in-feature flag on the group entity and is NOT a system-level RBAC role. It does not require a new auth surface or ADR.",
    "[ASSUMPTION] Designating an additional admin (beyond the creator) is seeded in mock data but has no UI mutation in this story scope — the 'promote to admin' action is out of scope.",
    "[ASSUMPTION] Avatar color selection uses the 8-swatch palette from design tokens only; no custom color input and no group avatar image upload in this story.",
    "[ASSUMPTION] The pin action creates a pinned reference in the `GroupInfoPanel` pinned section; there is no 'unpin' UI in this story (not present in DR-008).",
    "[ASSUMPTION] The context menu is implemented by extending or wrapping the existing `components/ui/dropdown-menu/` or `context-menu/` primitive (decision 0026), not forked as a new component.",
    "[ASSUMPTION] The 47 i18n keys referenced are already present in `vi.json` and `en.json` as of the story start; the FE team need only add the 5 new `messaging.errors.*` keys for the new failure types."
  ],

  "openQuestions": [
    "OQ-1: When GroupInfoPanel is open on a 375px mobile viewport, should it overlay the chat window at full width with a close button, or should the chat window slide off-screen? The design-spec does not specify a mobile breakpoint layout for the panel — FE team should confirm with BA/design before implementation.",
    "OQ-2: Should clicking the quoted block in a ChatBubble (FR-021) trigger a load of older messages if the original message is above the current scroll window, or simply scroll within already-loaded messages? The lazy-load boundary behavior needs to be agreed before FE implements the scroll hook."
  ]
}
```

---

### 3. Prioritized Requirements Summary (MoSCoW)

| ID | Requirement | Priority | Rationale |
|----|-------------|----------|-----------|
| FR-001 | Group list rows (avatar, member count, unread badge) | Must | Baseline UI — user cannot see groups without this |
| FR-002 | '+ Tạo nhóm' CTA + modal open | Must | Entry point for group creation |
| FR-003 | CreateGroupModal Step 1 (name, desc, type, color picker, avatar preview) | Must | First half of core group-create flow |
| FR-004 | CreateGroupModal Step 2 (member search + chip select) | Must | Second half; submit disabled without this |
| FR-005 | Optimistic create + rollback | Must | Core UX quality; without optimistic prepend the flow feels broken |
| FR-006 | GroupInfoPanel (slide-in, avatar section, structure) | Must | Required container for all admin actions and pinned messages |
| FR-007 | Members list with admin badge + remove button (gated) | Must | Admin management capability; AC-5 / AC-12 |
| FR-008 | Inline group rename/edit (admin only) | Must | AC-5 admin action; required for group lifecycle |
| FR-009 | Add members from GroupInfoPanel (admin only) | Must | Core group lifecycle action |
| FR-010 | Remove member (admin only, not self, not other admins) | Must | Core group admin action; AC-12 role gate |
| FR-011 | Leave group (all members, with confirmation) | Must | Basic user autonomy; AC-5 |
| FR-012 | Delete group (admin only, two-step confirm) | Must | AC-5 / AC-12; destructive action requires gate |
| FR-013 | Pinned messages section (list + empty state) | Must | AC-8 visible in panel |
| FR-014 | Click pinned → scroll + 3s highlight (motion-safe) | Must | AC-8; requires motion-safe handling |
| FR-015 | Context menu (right-click / long-press, keyboard nav, ARIA menu) | Must | AC-6; entry point for reply/pin/copy/delete |
| FR-016 | Pin item — gated by `!isGroup \|\| selfIsGroupAdmin` | Must | AC-6 / AC-8 / AC-12 |
| FR-017 | Delete item — gated by `isMine && withinOneHour`, confirm dialog | Must | AC-6 / AC-12; requires domain enforcement |
| FR-018 | Copy item — always enabled, clipboard API | Must | AC-6; always-available action |
| FR-019 | Reply strip above input (with cancel) | Must | AC-7 reply initiation |
| FR-020 | Sent bubble with quoted block + replyTo reference | Must | AC-7 full reply flow |
| FR-021 | Click quoted block → scroll to original | Must | AC-7 navigation |
| FR-022 | Groups tab empty state with create CTA | Must | AC-9 required state |
| FR-023 | Skeleton loading (5-bubble shimmer, 320ms) | Must | AC-9 / NFR-009 perceived performance |
| FR-024 | Per-role mock data seeding | Must | Enables all Storybook stories and per-role AC validation |
| FR-025 | MessagingFailure union extension (5 new failure types) | Should | Clean error surfacing; not a UI blocker but required for correct error messages |
| FR-026 | Domain entity extensions (replyTo, isPinned, selfIsGroupAdmin) | Should | Type-safe extension; implementation dependency |
| FR-027 | MESSAGING_EP constant additions (7 new endpoints) | Should | Required for real wiring; mock-first allows deferral but best done in same story |
| FR-028 | Offline member indicator in GroupInfoPanel | Could | Cosmetic enhancement; not required for any AC |
| NFR-001–NFR-005 | A11y: focus trap, keyboard nav, disabled states, aria-labels, confirmations | Must | WCAG 2.1 AA is a "done" criterion |
| NFR-006–NFR-007 | Motion-safe animations | Must | WCAG 2.3.3; panel, highlight, menu, modal, reply strip |
| NFR-008 | Contrast ratios | Must | WCAG 1.4.3; admin badge, warning btn verified |
| NFR-009–NFR-010 | Performance: skeleton ≤ 320ms, optimistic prepend | Must | AC-9 + perceived quality baseline |
| NFR-011–NFR-012 | Responsive: 375px, modal max-height 92vh | Must | Product baseline |
| NFR-013 | i18n: all strings through messaging namespace, 5 new error keys | Must | Rule: i18n.md enforced at compile time |
| NFR-014 | Security: domain-layer admin gate for destructive mutations | Must | AC-12; defense-in-depth beyond UI gate |

---

### 4. Handoff Notes

**For `ba-integration-analyst`:**
All 7 new endpoints target the `social` service (not yet shipped — mock-first per decision 0017). The endpoint path pattern follows the existing `social` service convention (`/social/api/v1/...`). The integration analyst should confirm:
- Whether `getGroupInfo(groupId)` and `getPinnedMessages(conversationId)` are served by separate endpoints or embedded in the conversation detail response, and document in the service map.
- Response envelope for group list pagination (cursor vs offset) — should follow the standard `meta.pagination.nextCursor + hasMore` pattern per `api-integration.md`.
- The `selfIsGroupAdmin` field: confirm whether it is returned by the API in the conversation/group list response or derived from a separate group-members endpoint that includes role flags.

**For `ba-use-case-modeler`:**
The following use cases require full Given/When/Then AC with all four states (loading/empty/error/success) and role variants:
1. `CreateGroupUseCase` — variants: ok / no-name (< 2 chars) / no-members / API failure
2. `DeleteMessageUseCase` — variants: ok / `from !== 'me'` → fail / sent > 1 hour → fail
3. `PinMessageUseCase` — variants: direct-message (always ok) / group + admin (ok) / group + non-admin → `not-group-admin`
4. `RemoveGroupMemberUseCase` — variants: ok / `!isAdmin` → `not-group-admin` / target is self → fail / target is another admin → fail
5. `LeaveGroupUseCase` and `DeleteGroupUseCase` — variants: ok / non-admin delete → fail / API failure
6. `EditGroupInfoUseCase` — variants: ok / non-admin → `not-group-admin`

Role variants for E2E / Storybook stories:
- Teacher as group admin (homeroom group): sees all admin actions
- Student as group member (class group): sees leave only, no admin actions
- Parent (DM only): sees context menu on DM messages but no group admin panel
