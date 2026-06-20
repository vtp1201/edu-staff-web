# Engineering-Ready Spec — US-E10.4 Messaging Enhancements (DR-008)
# Group Lifecycle + Message Interactions

**Status**: planned — DO NOT mark implemented until FE proof is complete  
**Lane**: normal  
**Produced by**: BA Team (ba-lead pipeline: requirements → integration → use-case → spec)  
**Design authority**: `docs/product/design-spec.jsonc` → `messaging.groupChat` section  
**Design source mockup**: `design_src/edu/messaging.jsx` (lines 411–1494)  
**Extends**: `src/features/messaging/` — no new feature module  
**i18n**: 47 keys already staged in `src/bootstrap/i18n/messages/{vi,en}.json`  
**BE service**: `social` — MOCK-FIRST (decision 0014, 0017)

---

## 1. Scope Boundary

This spec covers **only the additive layer** on top of US-E10.1 (base messaging, implemented). It extends:
- Domain entities and failures in `src/features/messaging/domain/`
- Infrastructure DTOs, mappers, and mock repository in `src/features/messaging/infrastructure/`
- Endpoint constants in `src/bootstrap/endpoint/messaging.endpoint.ts`
- Presentation components in `src/features/messaging/presentation/`

It does NOT:
- Create a new feature module
- Change the `/messages` route
- Touch the auth/IAM service
- Modify US-E10.1 domain use cases (CreateConversation, SendMessage, GetConversations, GetMessages, GetContacts)
- Write Go backend code

---

## 2. Actors and Roles

| Actor | System Role | Group Role | Notes |
|---|---|---|---|
| Teacher | `teacher` | can be group admin | selfIsAdmin=true on homeroom/dept groups they created |
| Principal | `principal` | can be group admin | selfIsAdmin=true on BGH group they own |
| Student | `student` | member only | selfIsAdmin=false on all seeded groups |
| Parent | `parent` | member only | only has DMs; can create groups but no seeded admin |

Group admin is determined by the `role: 'admin'` field in `GroupMember`, NOT by the system RBAC role. Any user who creates a group becomes admin. Additional admins can be designated (future). The system role (teacher/principal/student/parent) controls only mock data seeding.

---

## 3. Technical Requirements

### 3.1 Functional Requirements

**TR-001** [MUST] The Groups tab in the conversation list MUST display each group with: a rounded-square avatar (42×42, radius 12) whose background is `groupColor + '20'` with initials (max 3 chars, first 2 word initials), group name, last activity line ("Sender: preview…" single-line ellipsis), member-count chip (users icon + count), timestamp, and unread badge (var(--edu-error) background, distinct from direct-chat badge). No online dot on group avatars.

**TR-002** [MUST] A "+ Tạo nhóm" sub-header CTA MUST appear above the group list. Clicking it opens the CreateGroupModal.

**TR-003** [MUST] CreateGroupModal MUST be a 2-step Radix Dialog (max-width 460px, max-height 92vh, backdrop blur). Step 1 collects: group name (required, min 2 chars, max 60, `messaging.group.nameLabel`), description (optional, max 140, `messaging.group.descLabel`), group kind (class/dept/club/other — 2-col radio grid), avatar color (8-swatch palette from design tokens: `--edu-primary`, `--edu-success`, `--edu-warning`, `--edu-error`, `--edu-purple`, `--edu-teal`, `#6366F1`, `#FB923C`). A live avatar preview (56×56, radius 14) updates as name/color changes.

**TR-004** [MUST] The "Tiếp theo" (Next) button in Step 1 MUST be disabled when name is absent or fewer than 2 characters. Validation fires on field blur and on Next attempt.

**TR-005** [MUST] Step 2 MUST display: a chip area (selected members rendered as dismissible chips with mini-avatar + name + remove X), a search field (placeholder `messaging.group.searchMembersPlaceholder`), and a bordered user list with custom checkboxes. Each user row shows avatar, name, role label. Submit is disabled when 0 members are selected.

**TR-006** [MUST] Step indicator MUST show active step (pColor dot + label), done step (success dot + check icon), and inactive step (bg/border dot + muted label) consistent with design-spec step-indicator spec.

**TR-007** [MUST] On submit, the new group MUST be optimistically prepended to the top of the Groups tab list. If the mutation fails, the optimistic entry is removed and an error banner appears (`messaging.errors.create-group-failed`).

**TR-008** [MUST] The creator of a group MUST automatically receive `role: 'admin'` in the GroupMember list.

**TR-009** [MUST] Clicking the group name/header in the chat window header MUST open the GroupInfoPanel (320px, right side, slide-in animation from translateX(100%)→0, 0.22s ease-out, backdrop blur).

**TR-010** [MUST] GroupInfoPanel MUST display:
- Header: group title + admin-only edit icon (28×28, penLine icon)
- Avatar section (groupColor tinted bg): group avatar (80×80, radius 20), name, description, member-count pill
- Edit mode (admin only): clicking edit icon transforms name/desc into inline inputs; Save/Cancel buttons
- Members section: section header "THÀNH VIÊN" (uppercase, 10.5px, muted), "+ Thêm thành viên" link (admin only), member rows
- Pinned section: section header "TIN NHẮN ĐÃ GHIM" (uppercase), rows or empty state "Chưa có tin nhắn được ghim." (`messaging.groupInfo.noPinned`)
- Footer: "Rời nhóm" button (warning color, full-width), "Xoá nhóm" button (error color, full-width, admin only)

**TR-011** [MUST] Each member row in GroupInfoPanel MUST show: avatar (32×32), name, "(Bạn)" suffix for self, role label (10.5px muted), "Admin" badge (error-light bg + error color) if role is admin, and a remove button (22×22, x icon, error hover) that is: visible only to admins AND hidden when the target is self OR another admin.

**TR-012** [MUST] "Xoá nhóm" MUST trigger an inline two-step confirmation inside the panel footer: warning text (`messaging.groupInfo.deleteWarning`) + cancel (ghost) + confirm danger button (`messaging.deleteDialog.confirm`).

**TR-013** [MUST] "Rời nhóm" MUST trigger a confirmation dialog before executing.

**TR-014** [MUST] Right-click or long-press on any chat bubble MUST open the MessageContextMenu (200px wide, radius 10, viewport-clamped positioning, animation 0.12s). The menu contains 4 items in order: Reply, Pin, Copy, Delete.

**TR-015** [MUST] Context menu item states:
- Reply: always enabled
- Pin: enabled always for direct messages; for group messages, enabled only when `selfIsGroupAdmin === true`; when disabled, show hint text "Chỉ admin mới có thể ghim" (`messaging.contextMenu.pinAdminOnly`) at 0.4 opacity
- Copy: always enabled; copies message text to clipboard
- Delete: shown only for own messages (`from === 'me'`); enabled only when message is within 1 hour of `sentAt`; when disabled (>1 hour), show "Đã quá 1 giờ" (`messaging.contextMenu.deleteExpired`) at 0.4 opacity; requires confirm dialog before executing. Styled as danger item (error color, error-light hover, top separator line)

**TR-016** [MUST] Selecting "Trả lời" from context menu MUST:
- Close the context menu
- Display ReplyStrip above the message input: left border 4px pColor, shows "Đang trả lời {name}" label (uppercase, pColor) + message preview (single-line ellipsis) + cancel X button
- Cancel X clears the reply state without sending

**TR-017** [MUST] When a reply message is sent (with active reply strip), the resulting `MessageEntity` MUST carry `replyTo: { messageId, senderName, excerpt }`. The `ChatBubble` component MUST render a quoted block above the message text: for own messages (from=me) using white semi-transparent bg + white border; for other messages using `var(--edu-bg)` + pColor left border. The quoted block MUST be clickable and scroll to the original message.

**TR-018** [MUST] Selecting "Ghim tin nhắn" MUST add the message to the pinned list in GroupInfoPanel. Pinned rows show: star icon box (warning tinted), sender name, time, message excerpt. Clicking a pinned row scrolls to the original message in the chat window and applies a 3-second CSS highlight animation (gated behind `@media (prefers-reduced-motion: no-preference)`).

**TR-019** [MUST] Selecting "Xóa" and confirming in the delete dialog MUST soft-delete the message: the bubble is replaced with the placeholder "Tin nhắn đã bị xoá" (`messaging.deleteDialog.deletedLabel`) and the message entity gains `isDeleted: true`.

**TR-020** [MUST] The delete confirm dialog (`role="alertdialog"`) MUST show: title (`messaging.deleteDialog.title`), body (`messaging.deleteDialog.body`), cancel button (`messaging.deleteDialog.cancel`), and confirm danger button (`messaging.deleteDialog.confirm`).

**TR-021** [MUST] All group-admin-only UI elements (edit icon, add-member CTA, remove-member buttons, delete-group button) MUST be conditionally rendered based on `selfIsGroupAdmin` — not hidden via CSS alone.

**TR-022** [MUST] The empty state for Groups tab (no groups) MUST show: users icon (36px, var(--edu-border)), title (`messaging.group.emptyTitle`), subtitle (`messaging.group.emptySubtitle`), and a primary "Tạo nhóm mới" CTA button (`messaging.group.emptyCreateCta`).

**TR-023** [MUST] Loading skeleton for chat pane MUST show 5 staggered shimmer bubbles (alternating left/right, heights 28px) during a 320ms switch. Each bubble has the shimmer gradient animation. Shimmer animation is NOT gated behind reduced-motion (decorative loading — not interactive animation).

**TR-024** [SHOULD] Offline member rows in GroupInfoPanel MUST show opacity 0.6, avatar grayscale(20%), no online dot.

**TR-025** [MUST] Per-role mock data seeding:
- Teacher: 2 groups (dept group + homeroom group), selfIsAdmin=true on homeroom group
- Principal: 2 groups (BGH admin group + another), selfIsAdmin=true on both
- Student: 1 group (class group), selfIsAdmin=false
- Parent: no seeded groups (only DM with homeroom teacher)

### 3.2 Non-Functional Requirements

**TR-026** [MUST] CreateGroupModal: Radix Dialog with focus trap (`aria-modal="true"`, `role="dialog"`, `aria-labelledby` → step title). Escape closes and returns focus to the "Tạo nhóm" trigger. Tab cycling stays inside the modal.

**TR-027** [MUST] MessageContextMenu: `role="menu"` on container, `role="menuitem"` on each item. Arrow Up/Down navigate between items. Escape closes and returns focus to the triggering bubble. Backdrop click closes.

**TR-028** [MUST] GroupInfoPanel: focus is trapped inside when open. Escape key closes. Backdrop click closes. Close restores focus to the element that triggered the panel.

**TR-029** [MUST] Delete confirm dialog: `role="alertdialog"`, focus trap, Escape cancels.

**TR-030** [MUST] Member chip remove buttons in step 2: each has `aria-label` = "Xóa {name}" (localized: "Xóa {name}") — the aria-label is descriptive, not just "×".

**TR-031** [MUST] GroupInfoPanel slide-in animation and context menu fade-in animation MUST be gated behind `@media (prefers-reduced-motion: no-preference)`. Under reduced-motion, elements appear immediately.

**TR-032** [MUST] Pin highlight animation (3s CSS highlight on the scrolled-to message) MUST be gated behind `@media (prefers-reduced-motion: no-preference)`. Under reduced-motion, scroll happens but no highlight animation plays.

**TR-033** [MUST] All UI strings introduced in US-E10.4 MUST use the 47 pre-staged i18n keys in `src/bootstrap/i18n/messages/{vi,en}.json` under `messaging.group`, `messaging.groupInfo`, `messaging.contextMenu`, `messaging.reply`, and `messaging.deleteDialog`. No new keys should be needed unless a gap is found — if a gap is found, add the key to BOTH `vi.json` and `en.json` simultaneously.

**TR-034** [MUST] The layout MUST function at 375px mobile width. GroupInfoPanel at 375px takes full-width (320px → 100vw at breakpoint). Context menu is viewport-clamped so it never overflows off-screen.

**TR-035** [SHOULD] Optimistic mutations (create group, pin message, delete message) MUST use TanStack Query `onMutate`/`onError`/`onSettled` pattern with rollback on failure.

---

## 4. Integration Map (Mock-First — Social Service)

All endpoints listed here are **MOCK-FIRST**. The `social` service is not built (decision 0014, 0017). The mock repository at `src/features/messaging/infrastructure/repositories/mocks/` MUST implement these contracts so the FE can be developed and tested without the live backend.

Auth on all endpoints: `Authorization: Bearer <accessToken>` via `createServerHttpClient()` (httpOnly cookie). No endpoint is public.

### 4.1 Endpoint Constants to Add to `MESSAGING_EP`

```ts
// Additions to src/bootstrap/endpoint/messaging.endpoint.ts
groups: "/social/api/v1/groups",
groupById: (groupId: string) => `/social/api/v1/groups/${groupId}`,
groupMembers: (groupId: string) => `/social/api/v1/groups/${groupId}/members`,
groupMemberById: (groupId: string, userId: string) => `/social/api/v1/groups/${groupId}/members/${userId}`,
conversationLeave: (conversationId: string) => `/social/api/v1/conversations/${conversationId}/leave`,
messagePin: (conversationId: string, messageId: string) => `/social/api/v1/conversations/${conversationId}/messages/${messageId}/pin`,
messageById: (conversationId: string, messageId: string) => `/social/api/v1/conversations/${conversationId}/messages/${messageId}`,
```

### 4.2 Endpoint Contracts

**INT-001 — Create Group**
- Method: `POST /social/api/v1/groups`
- Auth: Bearer
- Request body:
  ```jsonc
  {
    "name": "string",          // required, 2–60 chars
    "description": "string",   // optional, max 140
    "kind": "class|dept|club|other",
    "color": "string",         // token name or hex from the 8-swatch palette
    "memberIds": ["string"]    // required, ≥1 userId
  }
  ```
- Response `data`:
  ```jsonc
  {
    "id": "string",
    "name": "string",
    "description": "string",
    "kind": "class|dept|club|other",
    "color": "string",
    "memberCount": 0,
    "conversationId": "string",
    "createdAt": "ISO8601"
  }
  ```
- Error codes: `GROUP_NAME_REQUIRED`, `GROUP_NAME_TOO_SHORT`, `GROUP_NAME_TOO_LONG`, `MEMBER_NOT_FOUND`, `INSUFFICIENT_PERMISSIONS`
- Cache impact: invalidates `['messaging', 'conversations']` query; prepends new ConversationEntity (group type) optimistically
- Failure key: `create-group-failed`

**INT-002 — Get Group Info**
- Method: `GET /social/api/v1/groups/:groupId`
- Auth: Bearer
- Response `data`:
  ```jsonc
  {
    "id": "string",
    "name": "string",
    "description": "string",
    "kind": "class|dept|club|other",
    "color": "string",
    "conversationId": "string",
    "members": [
      {
        "userId": "string",
        "name": "string",
        "initials": "string",
        "color": "string",
        "role": "admin|member",
        "isOnline": true
      }
    ],
    "pinnedMessages": [
      {
        "messageId": "string",
        "senderId": "string",
        "senderName": "string",
        "excerpt": "string",
        "sentAt": "ISO8601"
      }
    ]
  }
  ```
- Error codes: `GROUP_NOT_FOUND`, `NOT_GROUP_MEMBER`
- Cache key: `['messaging', 'group', groupId]`
- Failure key: `group-mutation-failed`

**INT-003 — Update Group Info (admin only)**
- Method: `PATCH /social/api/v1/groups/:groupId`
- Auth: Bearer
- Request body: `{ "name"?: "string", "description"?: "string", "color"?: "string" }` (partial)
- Response `data`: same shape as INT-002 `data`
- Error codes: `GROUP_NOT_FOUND`, `NOT_GROUP_ADMIN`, `GROUP_NAME_TOO_SHORT`, `GROUP_NAME_TOO_LONG`
- Cache impact: invalidates `['messaging', 'group', groupId]`
- Failure key: `group-mutation-failed`

**INT-004 — Add Members (admin only)**
- Method: `POST /social/api/v1/groups/:groupId/members`
- Auth: Bearer
- Request body: `{ "memberIds": ["string"] }` — array of userIds to add
- Response `data`: `{ "added": ["string"], "alreadyMember": ["string"] }`
- Error codes: `GROUP_NOT_FOUND`, `NOT_GROUP_ADMIN`, `MEMBER_NOT_FOUND`
- Cache impact: invalidates `['messaging', 'group', groupId]`
- Failure key: `group-mutation-failed`

**INT-005 — Remove Member (admin only)**
- Method: `DELETE /social/api/v1/groups/:groupId/members/:userId`
- Auth: Bearer
- No request body
- Response `data`: `{ "removed": "string" }` (userId removed)
- Error codes: `GROUP_NOT_FOUND`, `NOT_GROUP_ADMIN`, `CANNOT_REMOVE_SELF`, `CANNOT_REMOVE_ADMIN`, `MEMBER_NOT_FOUND`
- Cache impact: invalidates `['messaging', 'group', groupId]`
- Failure key: `group-mutation-failed`

**INT-006 — Leave Group (any member)**
- Method: `POST /social/api/v1/conversations/:conversationId/leave`
- Auth: Bearer
- No request body
- Response `data`: `{ "left": true }`
- Error codes: `CONVERSATION_NOT_FOUND`, `NOT_GROUP_MEMBER`
- Cache impact: invalidates `['messaging', 'conversations']`; removes the conversation from the list
- Failure key: `leave-group-failed`

**INT-007 — Delete Group (admin only)**
- Method: `DELETE /social/api/v1/groups/:groupId`
- Auth: Bearer
- No request body
- Response `data`: `{ "deleted": true }`
- Error codes: `GROUP_NOT_FOUND`, `NOT_GROUP_ADMIN`
- Cache impact: invalidates `['messaging', 'conversations']`; removes group conversation from list
- Failure key: `group-mutation-failed`

**INT-008 — Pin Message**
- Method: `POST /social/api/v1/conversations/:conversationId/messages/:messageId/pin`
- Auth: Bearer
- No request body
- Response `data`: `{ "pinned": true, "messageId": "string" }`
- Error codes: `CONVERSATION_NOT_FOUND`, `MESSAGE_NOT_FOUND`, `NOT_GROUP_ADMIN` (for group conversations), `ALREADY_PINNED`
- Cache impact: invalidates `['messaging', 'group', groupId]` (to refresh pinnedMessages list); updates `['messaging', 'messages', conversationId]` message entity `isPinned: true`
- Failure key: `pin-failed`

**INT-009 — Unpin Message**
- Method: `DELETE /social/api/v1/conversations/:conversationId/messages/:messageId/pin`
- Auth: Bearer
- No request body
- Response `data`: `{ "unpinned": true }`
- Error codes: `CONVERSATION_NOT_FOUND`, `MESSAGE_NOT_FOUND`, `NOT_PINNED`, `NOT_GROUP_ADMIN`
- Cache impact: same as INT-008
- Failure key: `pin-failed`

**INT-010 — Delete Message (own, within 1 hour)**
- Method: `DELETE /social/api/v1/conversations/:conversationId/messages/:messageId`
- Auth: Bearer
- No request body
- Response `data`: `{ "deleted": true, "messageId": "string" }`
- Error codes: `CONVERSATION_NOT_FOUND`, `MESSAGE_NOT_FOUND`, `NOT_MESSAGE_OWNER`, `MESSAGE_DELETE_WINDOW_EXPIRED`
- Cache impact: optimistically updates `['messaging', 'messages', conversationId]` → message entity gains `isDeleted: true`, text replaced with `messaging.deleteDialog.deletedLabel` in presentation; on failure rollback
- Failure key: `delete-message-failed`

### 4.3 New Domain Entities

**GroupEntity** (new — `features/messaging/domain/entities/group.entity.ts`):
```ts
export type GroupKind = 'class' | 'dept' | 'club' | 'other';

export type GroupMember = {
  userId: string;
  name: string;
  initials: string;
  /** Semantic color key (primary | success | warning | error | info | purple | teal). */
  color: string;
  role: 'admin' | 'member';
  isOnline: boolean;
};

export type PinnedMessage = {
  messageId: string;
  senderId: string;
  senderName: string;
  excerpt: string;
  sentAt: string; // ISO8601
};

export type GroupEntity = {
  id: string;
  name: string;
  description: string;
  kind: GroupKind;
  /** Semantic color key or hex from the 8-swatch palette. */
  color: string;
  conversationId: string;
  members: GroupMember[];
  pinnedMessages: PinnedMessage[];
};
```

**Extended MessageEntity** (modify `features/messaging/domain/entities/message.entity.ts` — additive):
```ts
// Add to existing MessageEntity:
replyTo?: {
  messageId: string;
  senderName: string;
  excerpt: string;
};
isPinned?: boolean;
isDeleted?: boolean;
/** ISO8601 timestamp for delete-window enforcement (isMine && within 1 hour). */
sentAt?: string;
```

**Extended ConversationEntity** (modify `features/messaging/domain/entities/conversation.entity.ts` — additive):
```ts
// Add to existing ConversationEntity:
/** Group only — name of last message sender for "Sender: preview…" display. */
lastSenderName?: string;
```

### 4.4 Extended Failure Union

Extend `features/messaging/domain/failures/messaging.failure.ts`:
```ts
// Add to existing MessagingFailure union:
| { type: 'create-group-failed'; cause?: string }
| { type: 'group-mutation-failed'; action?: string; cause?: string }
| { type: 'leave-group-failed'; cause?: string }
| { type: 'pin-failed'; cause?: string }
| { type: 'delete-message-failed'; cause?: string }
| { type: 'not-group-admin' }
```

### 4.5 New DTOs (infrastructure layer)

| DTO file | Maps to entity |
|---|---|
| `group-response.dto.ts` | `GroupEntity` |
| `group-member-response.dto.ts` | `GroupMember` |
| `pinned-message-response.dto.ts` | `PinnedMessage` |

All DTO fields camelCase. Mappers: `group.mapper.ts`.

---

## 5. Use Cases

### 5.1 New Use Cases (domain)

**UC-CREATE-GROUP** (`create-group.use-case.ts`)
- Input: `{ name, description?, kind, color, memberIds: string[] }`
- Validates: name present + ≥2 chars; memberIds ≥1
- On validation failure: returns `Err({ type: 'create-group-failed', cause: 'validation' })`
- On success: returns `Ok(GroupEntity)` after repository call
- Test cases: ok path; no-name → fail; name <2 → fail; no-members → fail

**UC-UPDATE-GROUP** (`update-group.use-case.ts`)
- Input: `{ groupId, name?, description?, color? }`
- Validates: if name provided, ≥2 chars and ≤60; caller must be group admin (checked via repo response or pre-check)
- On NOT_GROUP_ADMIN error from repo: returns `Err({ type: 'not-group-admin' })`
- Test cases: ok; name too short; not admin → not-group-admin

**UC-ADD-MEMBERS** (`add-group-members.use-case.ts`)
- Input: `{ groupId, memberIds: string[] }`
- Returns `Ok` with added list or `Err({ type: 'group-mutation-failed' })`

**UC-REMOVE-MEMBER** (`remove-group-member.use-case.ts`)
- Input: `{ groupId, userId }`
- On NOT_GROUP_ADMIN or CANNOT_REMOVE_ADMIN: returns `Err({ type: 'not-group-admin' })`
- Test cases: ok; not-admin → fail; target is self → fail; target is other admin → fail

**UC-LEAVE-GROUP** (`leave-group.use-case.ts`)
- Input: `{ conversationId }`
- Returns `Ok(true)` or `Err({ type: 'leave-group-failed' })`

**UC-DELETE-GROUP** (`delete-group.use-case.ts`)
- Input: `{ groupId }`
- On NOT_GROUP_ADMIN: returns `Err({ type: 'not-group-admin' })`
- Test cases: ok; not admin → fail

**UC-PIN-MESSAGE** (`pin-message.use-case.ts`)
- Input: `{ conversationId, messageId }`
- Returns `Ok(true)` or `Err({ type: 'pin-failed' })`
- Test cases: ok; group + not-admin → not-group-admin

**UC-DELETE-MESSAGE** (`delete-message.use-case.ts`)
- Input: `{ conversationId, messageId, isMine: boolean, sentAt: string }`
- Validates: `isMine` must be true; `sentAt` must be within 1 hour of now (inject clock for determinism)
- On validation failure: returns `Err({ type: 'delete-message-failed', cause: 'not-own' | 'expired' })`
- Test cases: ok (own, within 1h); not-own → fail; >1h → fail

### 5.2 Extended Queries

| Query | Key | Source |
|---|---|---|
| Get group info | `['messaging', 'group', groupId]` | `GET /groups/:groupId` (INT-002) |
| Get conversations (already exists) | `['messaging', 'conversations']` | Existing — groups tab filters by `type === 'group'` |
| Get messages (already exists) | `['messaging', 'messages', conversationId]` | Existing — extended entity fields surfaced |

---

## 6. Detailed Use Cases and Given/When/Then Acceptance Criteria

### UC-001 — View Group List

**Primary actor**: any authenticated user  
**Precondition**: user is on `/messages`, Groups tab selected

**Main flow**:
1. MessagingScreen loads group conversations from `['messaging', 'conversations']` filtered by `type === 'group'`
2. Each item renders as ConversationItem with group-specific layout (avatar, member chip, last sender, unread badge)
3. "+ Tạo nhóm" CTA appears above list

**AC-001-1 (loaded)**
Given the user has ≥1 group conversation  
When the Groups tab is active  
Then each group row shows: rounded-square avatar (42×42) with `groupColor + '20'` background and initials, group name (bold if unread, 13.5px/800), member count chip (users icon), "Sender: preview…" last activity (single-line ellipsis), timestamp (11px muted), unread badge (var(--edu-error)) if unreadCount > 0. No online dot appears on group avatars.

**AC-001-2 (empty)**
Given the user has no group conversations  
When the Groups tab is active  
Then: users icon (36px, var(--edu-border)), `messaging.group.emptyTitle`, `messaging.group.emptySubtitle`, and "Tạo nhóm mới" primary button are displayed. Clicking the button opens CreateGroupModal.

**AC-001-3 (create CTA)**
Given the user has ≥1 group conversation  
When the Groups tab is active  
Then a "+ Tạo nhóm" sub-header CTA appears above the list in pColor style. Clicking it opens CreateGroupModal.

---

### UC-002 — Create Group Step 1 (info)

**Primary actor**: any authenticated user  
**Precondition**: CreateGroupModal is open, user is on Step 1

**AC-002-1 (name validation)**
Given step 1 is visible  
When the user clicks "Tiếp theo" without entering a name (or with <2 chars)  
Then: the "Tiếp theo" button remains disabled. Name field shows validation feedback (aria-invalid + aria-describedby error).

**AC-002-2 (avatar preview)**
Given the user types "Nhóm Toán" in the name field  
And selects the success color swatch  
Then the avatar preview (56×56, radius 14) shows "NT" initials with `var(--edu-success) + '20'` background and `var(--edu-success) + '55'` border.

**AC-002-3 (step indicator state)**
Given step 1 is active  
Then step dot 1 shows pColor background + white numeral. Step dot 2 shows bg/border inactive style with muted label.

**AC-002-4 (kind selection)**
Given step 1 is visible  
When the user clicks a kind option (e.g., "Lớp học")  
Then that option's card shows `activeBorder: 1.5px solid pColor` + `activeBackground: pColor + '12'`. Other options revert to inactive border.

**AC-002-5 (step advance)**
Given name is ≥2 chars  
When the user clicks "Tiếp theo"  
Then: the modal transitions to step 2; step 1 dot becomes "done" (success color + check icon); step 2 dot becomes active (pColor).

---

### UC-003 — Create Group Step 2 (member selection)

**Primary actor**: any authenticated user  
**Precondition**: CreateGroupModal on Step 2

**AC-003-1 (search + select)**
Given step 2 is visible and the user types "Lan" in the search field  
When matching users are returned  
Then matching rows appear with custom checkbox (18×18, radius 5). Clicking a row checks the checkbox and adds a chip to the chip area.

**AC-003-2 (chip rendering)**
Given 2 members are selected  
Then 2 chips appear in the chip area: each with mini-avatar (18×18), member name (12px/700, memberColor), and a remove X button (16×16). The chip area shows `messaging.group.selectedCount` with `{count}` = 2.

**AC-003-3 (chip remove)**
Given a chip is visible for member "Lan"  
When the user clicks the chip's remove X  
Then the chip is removed from the chip area and the corresponding list row becomes unchecked.

**AC-003-4 (submit disabled)**
Given 0 members are selected  
Then the "Tạo nhóm" submit button is disabled.

**AC-003-5 (empty search)**
Given the user types a name that matches no users  
Then the user list shows `messaging.group.noMembersFound` (12.5px muted, centered).

---

### UC-004 — Create Group Submit

**Primary actor**: any authenticated user  
**Precondition**: Step 2, ≥1 member selected

**AC-004-1 (optimistic prepend)**
Given the user clicks "Tạo nhóm"  
Then: the modal closes; a new group conversation item is optimistically prepended to the top of the Groups tab list immediately (before server response). A loading indicator appears on the new item.

**AC-004-2 (success)**
Given the server responds with success  
Then: the optimistic entry is confirmed with the real `id` from the server. Creator's `selfIsAdmin` is `true` for this group.

**AC-004-3 (failure rollback)**
Given the server responds with error  
Then: the optimistic entry is removed from the list; an error banner appears with the `messaging.errors.create-group-failed` message (mapped from `create-group-failed` failure key).

**AC-004-4 (creator is admin)**
Given the group is created successfully  
When the user opens GroupInfoPanel for the new group  
Then the user's own member row shows the "Admin" badge (`messaging.groupInfo.adminBadge`).

---

### UC-005 — Open/Close Group Info Panel

**Primary actor**: any authenticated user  
**Precondition**: user is in a group conversation

**AC-005-1 (open)**
Given the user is in a group conversation  
When the user clicks the group name in the chat window header  
Then: GroupInfoPanel slides in from the right (translateX(100%)→0, 0.22s ease-out under no-preference-reduced-motion) with 320px width and backdrop blur. Focus moves to the panel's close button or first interactive element.

**AC-005-2 (close via backdrop)**
Given GroupInfoPanel is open  
When the user clicks the backdrop area  
Then: the panel closes; focus returns to the element that triggered it.

**AC-005-3 (close via Escape)**
Given GroupInfoPanel is open  
When the user presses Escape  
Then: the panel closes; focus returns to the trigger.

**AC-005-4 (motion-safe)**
Given the user has `prefers-reduced-motion: reduce`  
When the panel opens  
Then: it appears immediately without the slide-in animation.

---

### UC-006 — Edit Group Info (admin only)

**Primary actor**: group admin  
**Precondition**: GroupInfoPanel open, current user is admin

**AC-006-1 (edit mode visible to admin)**
Given the current user is group admin  
Then: the edit icon (penLine, 28×28) is visible in the panel header. The avatar-edit badge (28×28, bottom-right of avatar, pColor) is also visible.

**AC-006-2 (edit mode hidden from non-admin)**
Given the current user is NOT group admin  
Then: neither the edit icon nor the avatar-edit badge is rendered (not hidden with CSS — conditional render).

**AC-006-3 (edit inline)**
Given the admin clicks the edit icon  
Then: the name and description areas transform into input/textarea fields centered in the avatar section. Save and Cancel buttons appear below.

**AC-006-4 (save)**
Given the admin edits the name to "Nhóm Lý 2026" and clicks Save  
Then: the mutation is dispatched (PATCH INT-003); on success, the panel refreshes with the new name; `['messaging', 'group', groupId]` is invalidated.

**AC-006-5 (validation)**
Given the admin clears the name field  
Then: Save button is disabled; the name field shows validation error.

---

### UC-007 — Add Member (admin only)

**Primary actor**: group admin  
**Precondition**: GroupInfoPanel open, admin view

**AC-007-1 (CTA visible)**
Given the current user is group admin  
Then: "+ Thêm thành viên" link (`messaging.groupInfo.addMembers`) appears to the right of the "THÀNH VIÊN" section header.

**AC-007-2 (CTA hidden)**
Given the current user is NOT admin  
Then: the "+ Thêm thành viên" link is not rendered.

**AC-007-3 (add flow)**
Given the admin clicks "+ Thêm thành viên"  
Then: a search + member-select interface appears (same pattern as CreateGroupModal step 2). Selecting members and confirming dispatches POST INT-004 and invalidates `['messaging', 'group', groupId]`.

---

### UC-008 — Remove Member (admin only)

**Primary actor**: group admin  
**Precondition**: GroupInfoPanel open, admin view, target is not self or other admin

**AC-008-1 (remove button visible)**
Given the current user is admin AND the member row is not self AND the member is not another admin  
Then: the remove button (22×22, x icon) is visible on the member row with error-light hover.

**AC-008-2 (remove button hidden)**
Given the current user is admin AND the member row is self OR target is another admin  
Then: the remove button is NOT rendered (not just hidden).

**AC-008-3 (remove button hidden for non-admin)**
Given the current user is NOT admin  
Then: remove buttons are NOT rendered on any member row.

**AC-008-4 (remove action)**
Given the admin clicks remove for a member  
When confirmed  
Then: DELETE INT-005 is dispatched; on success the member row is removed from the panel; `['messaging', 'group', groupId]` is invalidated.

---

### UC-009 — Leave Group

**Primary actor**: any group member  
**Precondition**: GroupInfoPanel open

**AC-009-1 (button visible)**
Given any member opens GroupInfoPanel  
Then: "Rời nhóm" button (`messaging.groupInfo.leaveGroup`) is visible in the footer, full-width, warning color style.

**AC-009-2 (confirmation)**
Given the user clicks "Rời nhóm"  
Then: a confirmation dialog appears (not inline — separate dialog). Canceling closes the dialog without action.

**AC-009-3 (leave success)**
Given the user confirms leaving  
Then: POST INT-006 is dispatched; on success, the group conversation is removed from the list and the panel closes; `['messaging', 'conversations']` is invalidated.

---

### UC-010 — Delete Group (admin only)

**Primary actor**: group admin  
**Precondition**: GroupInfoPanel open

**AC-010-1 (button visible admin only)**
Given the current user is admin  
Then: "Xoá nhóm" button (`messaging.groupInfo.deleteGroup`) is visible in the panel footer, full-width, error color style.

**AC-010-2 (button hidden for non-admin)**
Given the current user is NOT admin  
Then: "Xoá nhóm" button is NOT rendered.

**AC-010-3 (two-step inline confirm)**
Given the admin clicks "Xoá nhóm"  
Then: the footer transforms inline to show: `messaging.groupInfo.deleteWarning` text + a Cancel (ghost) button + a "Xác nhận xoá" (danger) button. This is inline within the panel footer, NOT a separate dialog.

**AC-010-4 (delete success)**
Given the admin confirms deletion  
Then: DELETE INT-007 is dispatched; on success the group is removed from the conversation list; the panel closes; `['messaging', 'conversations']` is invalidated.

---

### UC-011 — Open Context Menu on Message

**Primary actor**: any authenticated user  
**Precondition**: in any conversation (direct or group) with at least 1 message

**AC-011-1 (open via right-click)**
Given the user right-clicks a chat bubble  
Then: the MessageContextMenu (200px wide, radius 10, viewport-clamped) appears near the click position with animation (0.12s, opacity + translateY(-3px)→0 under no-preference-reduced-motion).

**AC-011-2 (open via long-press on mobile)**
Given the user long-presses a bubble on a touch device  
Then: the same context menu appears. No native context menu is triggered.

**AC-011-3 (backdrop dismiss)**
Given the context menu is open  
When the user clicks outside the menu  
Then: the menu closes.

**AC-011-4 (menu items — own message in group, non-admin)**
Given the message is from the current user, in a group where `selfIsGroupAdmin === false`, and `sentAt` is within 1 hour  
Then: Reply (enabled), Pin (disabled, 0.4 opacity, hint "Chỉ admin mới có thể ghim"), Copy (enabled), Delete (danger, enabled).

**AC-011-5 (menu items — others' message in group)**
Given the message is from another user  
Then: Reply (enabled), Pin (disabled for non-admin with hint, OR enabled for admin), Copy (enabled), Delete (danger, disabled at 0.4 opacity, hint "Chỉ xoá tin nhắn của bạn").

**AC-011-6 (delete expired)**
Given the message is from the current user AND `sentAt` > 1 hour ago  
Then: Delete is shown as danger item but disabled (0.4 opacity) with hint "Đã quá 1 giờ" (`messaging.contextMenu.deleteExpired`).

---

### UC-012 — Reply to Message

**Primary actor**: any authenticated user  
**Precondition**: context menu open

**AC-012-1 (strip appears)**
Given the user selects "Trả lời" from the context menu  
Then: the context menu closes; ReplyStrip appears above the message input with: 4px left border (pColor), "Đang trả lời {name}" label (uppercase, 10.5px, pColor, `messaging.reply.replyingTo` with name substituted), message excerpt (12px, var(--edu-text-secondary), single-line ellipsis), and cancel X button.

**AC-012-2 (cancel strip)**
Given the ReplyStrip is visible  
When the user clicks the cancel X  
Then: the ReplyStrip disappears; the reply state is cleared; the input returns to normal.

**AC-012-3 (send reply — own bubble)**
Given the ReplyStrip is active  
When the user types and sends a message  
Then: the sent `MessageEntity` has `replyTo: { messageId, senderName, excerpt }`. The bubble renders a quoted block above the text with white semi-transparent background + white left border. The quoted sender name and excerpt are legible.

**AC-012-4 (send reply — received bubble view)**
Given another user receives a reply message  
Then: the bubble shows a quoted block above the text with `var(--edu-bg)` background + pColor left border + pColor sender name.

**AC-012-5 (click quote scrolls)**
Given a bubble displays a quoted block  
When the user clicks the quoted block  
Then: the chat window scrolls to the original message (by `messageId`).

---

### UC-013 — Copy Message Text

**Primary actor**: any authenticated user  
**Precondition**: context menu open

**AC-013-1**
Given the user selects "Sao chép văn bản" from the context menu  
Then: the message text is written to the system clipboard via `navigator.clipboard.writeText()`. The context menu closes.

---

### UC-014 — Pin Message

**Primary actor**: group admin (for groups), any member (for direct messages)  
**Precondition**: context menu open on a non-pinned message

**AC-014-1 (direct message)**
Given the user is in a direct message conversation  
And selects "Ghim tin nhắn"  
Then: POST INT-008 is dispatched. On success, the message's `isPinned` becomes `true`; `['messaging', 'group', groupId]` is invalidated (for group context) or the pinned list is updated.

**AC-014-2 (group — admin)**
Given the user is a group admin  
And selects "Ghim tin nhắn" on a group message  
Then: POST INT-008 dispatched. On success, the message appears in GroupInfoPanel pinnedSection.

**AC-014-3 (group — non-admin)**
Given the user is NOT a group admin  
Then: "Ghim tin nhắn" is shown but disabled (0.4 opacity, hint text `messaging.contextMenu.pinAdminOnly`). Clicking has no effect.

**AC-014-4 (pinned section updates)**
Given a message is successfully pinned  
When the user opens GroupInfoPanel  
Then: the pinned section shows a row with star icon box, sender name, timestamp, and message excerpt.

---

### UC-015 — Delete Message

**Primary actor**: authenticated user (own messages only, within 1 hour)  
**Precondition**: context menu open, message is own and within 1 hour

**AC-015-1 (confirm dialog)**
Given the user selects "Xóa" from the context menu (enabled state)  
Then: the context menu closes; a delete confirm dialog (`role="alertdialog"`) appears with: `messaging.deleteDialog.title`, `messaging.deleteDialog.body`, `messaging.deleteDialog.cancel` button, and `messaging.deleteDialog.confirm` danger button.

**AC-015-2 (cancel)**
Given the confirm dialog is open  
When the user clicks Cancel  
Then: the dialog closes; the message is unchanged.

**AC-015-3 (confirm delete)**
Given the user clicks the confirm danger button  
Then: DELETE INT-010 is dispatched optimistically; the bubble immediately replaces its text content with "Tin nhắn đã bị xoá" (`messaging.deleteDialog.deletedLabel`) in muted italic style. `isDeleted: true` is set on the entity.

**AC-015-4 (rollback on failure)**
Given the DELETE mutation fails  
Then: the optimistic `isDeleted` is rolled back; the original message text is restored; an error banner shows.

---

### UC-016 — Click Quoted Block → Scroll to Original

**Primary actor**: any authenticated user  
**Precondition**: a bubble with `replyTo` is visible in the chat window

**AC-016-1**
Given a bubble displays a quoted block (from a reply)  
When the user clicks the quoted block  
Then: the chat window scrolls so the original message (matching `replyTo.messageId`) is visible. If the original message is not in the current loaded batch, a scroll + load action is triggered.

---

### UC-017 — Click Pinned Message → Scroll + Highlight

**Primary actor**: any authenticated user  
**Precondition**: GroupInfoPanel open, pinnedSection has ≥1 item

**AC-017-1 (scroll)**
Given the user clicks a pinned message row  
Then: GroupInfoPanel closes (or stays open); the chat window scrolls to the original message.

**AC-017-2 (highlight — motion-allowed)**
Given the user's system has `prefers-reduced-motion: no-preference`  
When the scroll lands on the original message  
Then: a 3-second CSS highlight animation plays on the message bubble (e.g., background flash from pColor tint to transparent).

**AC-017-3 (highlight — reduced-motion)**
Given the user's system has `prefers-reduced-motion: reduce`  
When the scroll lands on the original message  
Then: the scroll happens but NO highlight animation plays.

---

### UC-018 — Context Menu Keyboard Navigation

**Primary actor**: keyboard user  
**Precondition**: context menu is open

**AC-018-1 (arrow navigation)**
Given the context menu is open  
When the user presses Arrow Down  
Then: focus moves to the next `role="menuitem"`. When the user presses Arrow Up, focus moves to the previous item. Navigation wraps at the ends.

**AC-018-2 (Escape close)**
Given the context menu is open  
When the user presses Escape  
Then: the menu closes and focus returns to the chat bubble that triggered it.

**AC-018-3 (Enter activate)**
Given focus is on a menu item  
When the user presses Enter or Space  
Then: the menu item action is triggered (same as click).

**AC-018-4 (disabled item)**
Given focus is on a disabled menu item (opacity 0.4)  
When the user presses Enter  
Then: no action is taken. The disabled state and hint text are announced by screen reader via `aria-disabled="true"` + `aria-describedby` pointing to the hint.

---

### UC-019 — Group Info Panel Accessibility

**Primary actor**: keyboard/screen reader user

**AC-019-1 (focus trap)**
Given GroupInfoPanel is open  
When the user presses Tab repeatedly  
Then: focus cycles only within the panel's interactive elements. Focus does not escape to the page behind the backdrop.

**AC-019-2 (Escape from panel)**
Given GroupInfoPanel is open  
When the user presses Escape  
Then: the panel closes and focus returns to the element that triggered it (group chat header).

**AC-019-3 (member row remove button label)**
Given a remove button is visible on a member row for "Nguyễn Văn A"  
Then: the button has `aria-label="Xóa Nguyễn Văn A khỏi nhóm"` (or equivalent localized text). Not just "×".

---

### UC-020 — Create Group Modal Accessibility

**Primary actor**: keyboard/screen reader user

**AC-020-1 (modal ARIA)**
Given CreateGroupModal is open  
Then: the Dialog root has `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` pointing to the step title ("Thông tin nhóm" or "Thêm thành viên").

**AC-020-2 (focus trap)**
Given CreateGroupModal is open  
When the user presses Tab repeatedly  
Then: focus cycles within the modal's interactive elements only.

**AC-020-3 (Escape closes)**
Given CreateGroupModal is open  
When the user presses Escape  
Then: the modal closes; focus returns to the "+ Tạo nhóm" CTA trigger.

**AC-020-4 (step title announced)**
Given the user advances from step 1 to step 2  
Then: focus moves to the step 2 title ("Thêm thành viên"); screen readers announce the new step.

**AC-020-5 (name field validation)**
Given step 1 name field is invalid  
Then: the field has `aria-invalid="true"` and `aria-describedby` pointing to the error message. Error is announced to screen readers.

---

## 7. Component Architecture (Placement per decision 0026)

| Component | Location | Type | Notes |
|---|---|---|---|
| `CreateGroupModal` | `features/messaging/presentation/create-group-modal/` | new compound | Radix Dialog wrapper; multi-step state local (useState, not TanStack Query). Folder: component + index.ts + i-vm.ts + stories |
| `GroupInfoPanel` | `features/messaging/presentation/group-info-panel/` | new compound | Right-side panel; receives groupId prop; fetches via TanStack Query internally. Folder: component + index.ts + i-vm.ts + stories |
| `MessageContextMenu` | extends `components/ui/context-menu/` OR wraps `components/ui/dropdown-menu/` | extend primitive | Do NOT fork. Add keyboard nav + viewport clamping. If shadcn `context-menu` primitive is not yet added: `bun ui:add context-menu`. |
| `ReplyStrip` | extend `features/messaging/presentation/message-input/` | extend existing | Add `replyState?: { messageId, senderName, excerpt } \| null` prop. Do NOT create a separate ReplyStrip component file if it can live as a sub-section of MessageInput. |
| Quoted bubble block | extend `features/messaging/presentation/chat-bubble/` | extend existing | Add `replyTo?` prop to `ChatBubble`. Render quoted block inside existing component. Do NOT fork ChatBubble. |
| `PinnedMessages` (section in GroupInfoPanel) | inside `group-info-panel/` folder | sub-component | Not promoted to shared — only used inside GroupInfoPanel. |

---

## 8. State Design (TanStack Query)

### Query Key Taxonomy (additions to existing)

```
['messaging', 'conversations']          // existing — groups tab filters type==='group'
['messaging', 'messages', convoId]      // existing — MessageEntity[] extended with replyTo/isPinned/isDeleted
['messaging', 'group', groupId]         // NEW — GroupEntity (members + pinned messages)
['messaging', 'contacts']              // existing — used for member search in step 2
```

### Mutation + Invalidation Map

| Action | Mutation | Optimistic | Invalidates |
|---|---|---|---|
| createGroup | useMutation(createGroup) | prepend ConversationEntity (group) | `['messaging','conversations']` |
| updateGroup | useMutation(updateGroup) | update name/desc in panel view | `['messaging','group', gId]` |
| addMembers | useMutation(addMembers) | — | `['messaging','group', gId]` |
| removeMember | useMutation(removeMember) | remove member row | `['messaging','group', gId]` |
| leaveGroup | useMutation(leaveGroup) | remove conversation | `['messaging','conversations']` |
| deleteGroup | useMutation(deleteGroup) | remove conversation | `['messaging','conversations']` |
| pinMessage | useMutation(pinMessage) | set `isPinned:true` on message | `['messaging','group',gId]`, `['messaging','messages',cId]` |
| deleteMessage | useMutation(deleteMessage) | set `isDeleted:true`, replace text | `['messaging','messages',cId]` |

### Local State (NOT TanStack Query)

| State | Location | Mechanism |
|---|---|---|
| createGroupModal open/closed | `MessagingScreen` or `ConversationList` | `useState<boolean>` |
| createGroupModal current step (1/2) | `CreateGroupModal` internal | `useState<1\|2>` |
| step 1 form values (name, desc, kind, color) | `CreateGroupModal` internal | `useForm` (react-hook-form + zod) |
| step 2 selected members | `CreateGroupModal` internal | `useState<string[]>` |
| contextMenu open + position + target messageId | `ChatWindow` | `useState` |
| replyState (messageId + senderName + excerpt) | `ChatWindow` or `MessagingScreen` | `useState<ReplyState\|null>` |
| groupInfoPanel open + groupId | `ChatWindow` | `useState` |
| groupInfoPanel edit mode | `GroupInfoPanel` internal | `useState<boolean>` |
| deleteGroupConfirm visible | `GroupInfoPanel` internal | `useState<boolean>` |

---

## 9. Storybook Stories Required

| Story name | What it validates |
|---|---|
| `CreateGroup_Step1_Empty` | step 1 default, Next disabled, avatar preview |
| `CreateGroup_Step1_Valid` | name filled, color selected, Next enabled, avatar preview updates |
| `CreateGroup_Step1_ValidationError` | name <2 chars after blur, Next disabled, error shown |
| `CreateGroup_Step2_NoMembers` | chip area empty, Submit disabled |
| `CreateGroup_Step2_WithMembers` | 3 members selected, chips, Submit enabled |
| `CreateGroup_Submit_Loading` | optimistic item in list, spinner |
| `CreateGroup_Submit_Error` | rollback + error banner |
| `GroupInfoPanel_Open` | member list, pinned section (empty state), footer with leave |
| `GroupInfoPanel_AdminView` | edit icon + avatar badge, add-member CTA, remove buttons visible, delete button |
| `GroupInfoPanel_NonAdminView` | no edit, no remove buttons, no delete button |
| `GroupInfoPanel_DeleteConfirm` | inline two-step confirm in footer |
| `GroupInfoPanel_PinnedMessages` | pinned section with ≥1 message rows |
| `ContextMenu_OwnMessage_Admin` | all 4 items, pin enabled, delete enabled |
| `ContextMenu_OwnMessage_NonAdmin` | pin disabled + hint, delete enabled |
| `ContextMenu_OtherMessage` | pin conditionally, delete disabled + hint |
| `ContextMenu_OwnMessage_Expired` | delete disabled + expired hint |
| `Reply_Strip_Active` | strip above input, cancel X |
| `Reply_Quote_OwnBubble` | quoted block in own bubble (white semi-transparent) |
| `Reply_Quote_OtherBubble` | quoted block in other bubble (bg + pColor border) |
| `Pin_PanelRow` | pinned row in GroupInfoPanel |
| `EmptyGroups` | empty state with icon + title + subtitle + CTA |
| `LoadingSkeleton` | 5 staggered shimmer bubbles |
| `DeleteMessageConfirm_Dialog` | alertdialog with title/body/buttons |
| `DeletedMessageBubble` | bubble showing "Tin nhắn đã bị xoá" |
| `MemberOffline` | member row with opacity 0.6, grayscale avatar, no dot |
| Mobile viewport stories | key stories re-run at 375px width |

---

## 10. Design Token Reference

All values from `docs/product/design-spec.jsonc` messaging.groupChat. No raw colors or new tokens should be introduced — all required colors are already in `src/app/tokens.css`. Token usage:

| UI element | Token |
|---|---|
| Group avatar background | `groupColor + '20'` (resolved via `cn()` using semantic color vars) |
| Unread badge background | `var(--edu-error)` |
| Active group row | `pColor + '0F'` bg + `3px solid pColor` left border |
| Create CTA | `pColor + '08'` bg, `pColor` text |
| Admin badge | `var(--edu-error-light)` bg + `var(--edu-error)` text |
| Warning foreground | `var(--edu-warning)` (text on warning-light bg — contrast OK per decision 0013) |
| Error foreground | `var(--edu-error)` |
| Reply strip border | `4px solid pColor` left + `1px solid pColor + '33'` full |
| Delete button | `var(--edu-error)` color on `var(--edu-error-light)` bg |
| Pin icon | `var(--edu-warning)` in `var(--edu-warning) + '22'` box |

`pColor` = role-specific primary color resolved from `var(--edu-role-teacher)` / `var(--edu-role-principal)` / etc. at the presentation boundary.

---

## 11. i18n Keys Inventory

All 47 keys are pre-staged. The FE team MUST NOT add raw string literals to JSX. Key to message mapping:

| Key path | vi value |
|---|---|
| `messaging.group.createTitle` | "Tạo nhóm mới" |
| `messaging.group.stepInfo` | "Thông tin nhóm" |
| `messaging.group.stepMembers` | "Thêm thành viên" |
| `messaging.group.nameLabel` | "Tên nhóm" |
| `messaging.group.namePlaceholder` | "Nhập tên nhóm..." |
| `messaging.group.descLabel` | "Mô tả" |
| `messaging.group.descPlaceholder` | "Mô tả nhóm (tuỳ chọn)..." |
| `messaging.group.typeLabel` | "Loại nhóm" |
| `messaging.group.typeClass` | "Lớp học" |
| `messaging.group.typeDept` | "Bộ môn" |
| `messaging.group.typeClub` | "Câu lạc bộ" |
| `messaging.group.typeOther` | "Khác" |
| `messaging.group.colorLabel` | "Màu nhóm" |
| `messaging.group.searchMembersPlaceholder` | "Tìm thành viên..." |
| `messaging.group.noMembersFound` | "Không tìm thấy thành viên phù hợp." |
| `messaging.group.selectedCount` | "{count} đã chọn" |
| `messaging.group.memberCount` | "{count} thành viên" |
| `messaging.group.createButton` | "Tạo nhóm" |
| `messaging.group.emptyTitle` | "Bạn chưa tham gia nhóm nào." |
| `messaging.group.emptySubtitle` | "Tạo nhóm mới để cộng tác với đồng nghiệp." |
| `messaging.group.emptyCreateCta` | "Tạo nhóm mới" |
| `messaging.groupInfo.title` | "Thông tin nhóm" |
| `messaging.groupInfo.membersSection` | "THÀNH VIÊN" |
| `messaging.groupInfo.pinnedSection` | "TIN NHẮN ĐÃ GHIM" |
| `messaging.groupInfo.noPinned` | "Chưa có tin nhắn được ghim." |
| `messaging.groupInfo.adminBadge` | "Admin" |
| `messaging.groupInfo.addMembers` | "+ Thêm thành viên" |
| `messaging.groupInfo.removeMember` | "Xoá khỏi nhóm" |
| `messaging.groupInfo.leaveGroup` | "Rời nhóm" |
| `messaging.groupInfo.deleteGroup` | "Xoá nhóm" |
| `messaging.groupInfo.deleteWarning` | "Xoá nhóm là hành động không thể hoàn tác." |
| `messaging.groupInfo.editAvatar` | "Đổi ảnh đại diện nhóm" |
| `messaging.contextMenu.reply` | "Trả lời" |
| `messaging.contextMenu.pin` | "Ghim tin nhắn" |
| `messaging.contextMenu.pinAdminOnly` | "Chỉ admin mới có thể ghim" |
| `messaging.contextMenu.copy` | "Sao chép văn bản" |
| `messaging.contextMenu.delete` | "Xóa" |
| `messaging.contextMenu.deleteOwnOnly` | "Chỉ xoá tin nhắn của bạn" |
| `messaging.contextMenu.deleteExpired` | "Đã quá 1 giờ" |
| `messaging.reply.replyingTo` | "Đang trả lời {name}" |
| `messaging.reply.placeholder` | "Trả lời tin nhắn… (Enter để gửi)" |
| `messaging.reply.cancelAriaLabel` | "Huỷ trả lời" |
| `messaging.deleteDialog.title` | "Xoá tin nhắn này?" |
| `messaging.deleteDialog.body` | "Hành động không thể hoàn tác..." |
| `messaging.deleteDialog.cancel` | "Huỷ" |
| `messaging.deleteDialog.confirm` | "Xác nhận xoá" |
| `messaging.deleteDialog.deletedLabel` | "Tin nhắn đã bị xoá" |

---

## 12. Test Matrix (planned)

| Layer | Test | Status |
|---|---|---|
| Unit | `CreateGroupUseCase` — ok, no-name, name-too-short, no-members | planned |
| Unit | `UpdateGroupUseCase` — ok, name-too-short, not-admin | planned |
| Unit | `RemoveGroupMemberUseCase` — ok, not-admin, remove-self, remove-admin | planned |
| Unit | `DeleteMessageUseCase` — ok, not-own, >1h expired | planned |
| Unit | `PinMessageUseCase` — ok, group-non-admin fails | planned |
| Unit | `LeaveGroupUseCase` — ok | planned |
| Unit | `DeleteGroupUseCase` — ok, not-admin | planned |
| Integration | `MockMessagingRepository` createGroup — prepend to list | planned |
| Integration | `MockMessagingRepository` addMembers / removeMember | planned |
| Integration | `MockMessagingRepository` pin / unpin | planned |
| Integration | `MockMessagingRepository` deleteMessage — soft delete | planned |
| Integration | per-role group seeding (teacher admin, student non-admin) | planned |
| Storybook | All 27 stories listed in §9 | planned |
| A11y | Modal focus trap, context menu keyboard nav, panel Escape, delete alertdialog | planned |
| E2E | bun build + tsc clean on feature branch | planned |
| Design review | design-review gate pass (impeccable audit) | planned |

---

## 13. Traceability Matrix

| Requirement | Use Case | AC | Integration | Story AC |
|---|---|---|---|---|
| TR-001 Group list display | UC-001 | AC-001-1, AC-001-2 | INT-002 (members), existing conversations | story AC-1 |
| TR-002 Create CTA | UC-001 | AC-001-3 | — | story AC-2 |
| TR-003 Step 1 fields | UC-002 | AC-002-1 to AC-002-4 | INT-001 | story AC-2 |
| TR-004 Next button guard | UC-002 | AC-002-1 | — | story AC-2 |
| TR-005 Step 2 member select | UC-003 | AC-003-1 to AC-003-5 | INT-001 (memberIds), contacts query | story AC-3 |
| TR-006 Step indicator | UC-002, UC-003 | AC-002-3, AC-002-5 | — | story AC-2 |
| TR-007 Optimistic prepend | UC-004 | AC-004-1, AC-004-3 | INT-001 | story AC-4 |
| TR-008 Creator admin | UC-004 | AC-004-4 | INT-001 response | story AC-4 |
| TR-009 Panel open | UC-005 | AC-005-1 | INT-002 | story AC-5 |
| TR-010 Panel content | UC-005, UC-006 | AC-005-1, AC-006-3 | INT-002 | story AC-5 |
| TR-011 Member row | UC-008 | AC-008-1 to AC-008-3 | INT-005 | story AC-5 |
| TR-012 Delete group confirm | UC-010 | AC-010-3 | INT-007 | story AC-5, AC-12 |
| TR-013 Leave confirm | UC-009 | AC-009-2 | INT-006 | story AC-5 |
| TR-014 Context menu open | UC-011 | AC-011-1 to AC-011-3 | — | story AC-6 |
| TR-015 Context menu items | UC-011, UC-014, UC-015 | AC-011-4 to AC-011-6 | INT-008, INT-010 | story AC-6 |
| TR-016 Reply strip | UC-012 | AC-012-1, AC-012-2 | — | story AC-7 |
| TR-017 Quote bubble | UC-012, UC-016 | AC-012-3 to AC-012-5 | — | story AC-7 |
| TR-018 Pin + scroll | UC-014, UC-017 | AC-014-1 to AC-014-4, AC-017-1 to AC-017-3 | INT-008 | story AC-8 |
| TR-019 Soft delete | UC-015 | AC-015-3, AC-015-4 | INT-010 | story AC-6 |
| TR-020 Delete dialog | UC-015 | AC-015-1, AC-015-2 | — | story AC-6 |
| TR-021 Role-gated render | UC-006, UC-007, UC-008, UC-010 | AC-006-2, AC-007-2, AC-008-2, AC-010-2 | — | story AC-12 |
| TR-022 Empty groups | UC-001 | AC-001-2 | — | story AC-9 |
| TR-023 Loading skeleton | UC-001, UC-005 | — | — | story AC-9 |
| TR-026 Modal a11y | UC-020 | AC-020-1 to AC-020-5 | — | story AC-10 |
| TR-027 Context menu a11y | UC-018 | AC-018-1 to AC-018-4 | — | story AC-10 |
| TR-028 Panel a11y | UC-019 | AC-019-1 to AC-019-3 | — | story AC-10 |
| TR-031 Panel animation motion-safe | UC-005 | AC-005-4 | — | story AC-10 |
| TR-032 Pin highlight motion-safe | UC-017 | AC-017-3 | — | story AC-10 |
| TR-033 i18n coverage | all UCs | all ACs with text | — | story AC-11 |
| TR-034 Mobile 375px | all UCs | — | — | implied |
| TR-035 Optimistic mutations | UC-004, UC-015 | AC-004-1, AC-015-3 | INT-001, INT-010 | story AC-4 |

---

## 14. Open Items for FE Team

1. **Unpin MVP scope**: The context menu has no "Unpin" item. INT-009 (unpin) is defined but the UI trigger for unpin is not designed. FE team should check `design_src/edu/messaging.jsx` for any unpin affordance and flag if none exists — unpin may be a follow-up (US-E10.5) or can be placed in the pinned row in GroupInfoPanel (click to scroll, long-press to unpin). Do not block US-E10.4 delivery on this.

2. **Member search for add-member (admin flow)**: The add-member flow from GroupInfoPanel reuses the same search + select pattern as Step 2. It may share the member-select sub-component. `fe-component-architect` should decide if this warrants a shared sub-component or an inline re-use.

3. **`prefers-color-scheme` (dark mode)**: The quoted bubble isMe uses `rgba(255,255,255,0.18)` which is hardcoded and may not work in dark mode. FE team should verify against `src/app/tokens.css` and use a CSS variable if needed. Flag an ADR if a new token is needed.

4. **Context menu on mobile**: Long-press detection requires either a touch event handler or a library. FE team should decide the implementation approach and note it in the plan.

5. **SSE invalidation for group updates**: Decision 0009 covers SSE. When other users add/remove members or pin messages, the UI should receive an SSE event and invalidate `['messaging','group', groupId]`. This is a mock-first concern — wire the invalidation call but leave the SSE event source mocked.

---

## 15. Handoff to FE Team

**What to build**: Extend `src/features/messaging/` with group lifecycle (CreateGroupModal 2-step, GroupInfoPanel, rename/add-member/remove-member/leave/delete-group) and message interactions (MessageContextMenu, reply/quote, pin, delete-message). Route `/messages` unchanged. No new feature module.

**Spec file**: This document — `docs/stories/epics/E10-communications/US-E10.4-messaging-enhancements/spec.md`

**Story file**: `docs/stories/epics/E10-communications/US-E10.4-messaging-enhancements/story.md` (existing ACs + context)

**Design authority**: `docs/product/design-spec.jsonc` → `messaging.groupChat` section (lines 1983–2622). Pixel-accurate implementation required.

**Design mockup**: `design_src/edu/messaging.jsx` — CreateGroupModal (lines 518–833), GroupInfoPanel (lines 868–1139), MessageContextMenu (lines 411–476), ReplyStrip (lines 480–514), ChatBubble quoted block (lines 364–389).

**i18n**: 47 keys already in `src/bootstrap/i18n/messages/{vi,en}.json`. No new keys expected. If a gap is found, add to both files simultaneously.

**BE contract**: Mock-first. All INT-00N endpoints above must be implemented in the mock repository. Shapes are defined. The mock must be realistic enough to drive all Storybook stories and unit tests.

**Entry command**: `/fe` → `fe-lead` with this spec path + story path.

**Do NOT mark US-E10.4 as `implemented` until**:
- All 27 Storybook stories pass
- All unit tests (7 use cases) pass
- `bun build + tsc` clean on the feature branch
- Design review gate passes (`/impeccable audit`)
- WCAG 2.1 AA confirmed for modal focus, keyboard context-menu, motion-safe animations
