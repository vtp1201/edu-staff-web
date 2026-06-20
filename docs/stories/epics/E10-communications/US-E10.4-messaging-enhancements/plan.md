# Implementation Plan — US-E10.4 Messaging Enhancements (DR-008)

**Design authority**: `docs/product/design-spec.jsonc` → `messaging.groupChat`  
**Design mockup**: `design_src/edu/messaging.jsx` lines 364–1139  
**Extends**: `src/features/messaging/` only — no new feature module, no new route  
**BE**: mock-first (`social` service, decision 0017); `NEXT_PUBLIC_USE_MOCK=true`  
**Done when**: 27 Storybook stories pass · 7 use-case unit test suites green · `bun build + tsc` clean · design-review gate pass · WCAG 2.1 AA confirmed

---

## Summary

Additive build on US-E10.1 (already `implemented`). Two capability layers:

- **A. Group lifecycle** — CreateGroupModal (2-step Radix Dialog), GroupInfoPanel (320px slide-in), rename/add/remove-member/leave/delete-group
- **B. Message interactions** — MessageContextMenu (right-click/long-press), reply/quote, pin, copy, soft-delete with confirm dialog

All strings consume the 47 keys already staged in `messaging` namespace. Five new `messaging.errors.*` keys needed (gap vs current 4 error keys).

Key decisions:
- `MessageContextMenu` wraps existing `components/ui/context-menu/` primitive (run `bun ui:add context-menu` if not present) — no fork (decision 0026)
- `ReplyStrip` is a sub-section of existing `MessageInput` — no separate component file
- Quoted block is a `replyTo` prop extension of existing `ChatBubble` — no fork
- `GroupEntity` introduced as new entity alongside extended `ConversationEntity` fields
- Admin gate enforced at domain use-case level (NFR-014) in addition to presentation gate

---

## Phase 1 — Domain extensions

**Goal**: extend entities, failure union, and add 7 new use-cases with tests.

### Files to create

| File | Action |
|---|---|
| `src/features/messaging/domain/entities/group.entity.ts` | NEW — `GroupEntity`, `GroupMember` types |
| `src/features/messaging/domain/use-cases/create-group.use-case.ts` | NEW |
| `src/features/messaging/domain/use-cases/create-group.use-case.test.ts` | NEW (red first) |
| `src/features/messaging/domain/use-cases/update-group.use-case.ts` | NEW |
| `src/features/messaging/domain/use-cases/update-group.use-case.test.ts` | NEW (red first) |
| `src/features/messaging/domain/use-cases/remove-group-member.use-case.ts` | NEW |
| `src/features/messaging/domain/use-cases/remove-group-member.use-case.test.ts` | NEW (red first) |
| `src/features/messaging/domain/use-cases/leave-group.use-case.ts` | NEW |
| `src/features/messaging/domain/use-cases/leave-group.use-case.test.ts` | NEW (red first) |
| `src/features/messaging/domain/use-cases/delete-group.use-case.ts` | NEW |
| `src/features/messaging/domain/use-cases/delete-group.use-case.test.ts` | NEW (red first) |
| `src/features/messaging/domain/use-cases/pin-message.use-case.ts` | NEW |
| `src/features/messaging/domain/use-cases/pin-message.use-case.test.ts` | NEW (red first) |
| `src/features/messaging/domain/use-cases/delete-message.use-case.ts` | NEW |
| `src/features/messaging/domain/use-cases/delete-message.use-case.test.ts` | NEW (red first) |

### Files to modify

| File | Change |
|---|---|
| `src/features/messaging/domain/entities/message.entity.ts` | Add `replyTo?: { messageId: string; senderName: string; excerpt: string }`, `isPinned?: boolean`, `isDeleted?: boolean`, `sentAt?: string` (ISO timestamp for 1-hour gate) |
| `src/features/messaging/domain/entities/conversation.entity.ts` | Add `selfIsGroupAdmin?: boolean`, `groupKind?: 'class' \| 'dept' \| 'club' \| 'other'`, `pinnedMessageIds?: string[]`, `lastSenderName?: string` |
| `src/features/messaging/domain/failures/messaging.failure.ts` | Add 5 new union members: `create-group-failed`, `group-mutation-failed`, `pin-failed`, `delete-message-failed`, `not-group-admin` |
| `src/features/messaging/domain/repositories/i-messaging.repository.ts` | Add method signatures: `getGroupInfo(groupId)`, `createGroup(...)`, `updateGroup(...)`, `addGroupMembers(...)`, `removeGroupMember(...)`, `leaveGroup(...)`, `deleteGroup(...)`, `pinMessage(...)`, `deleteMessage(...)`, `getPinnedMessages(conversationId)` |

### Key implementation notes

- `GroupEntity` carries `id, name, description, kind, color, members: GroupMember[], pinnedMessageIds: string[]`. Keep separate from `ConversationEntity` — linked by `id`. Panel uses `getGroupInfo(groupId)` returning `GroupEntity`.
- `GroupMember`: `{ userId: string; name: string; role: 'admin' | 'member'; initials: string; color: string; isOnline?: boolean; avatarUrl?: string }`
- All use-cases accept an `IMessagingRepository` interface (via constructor injection) — tests use a hand-rolled mock of the interface, not `MockMessagingRepository`.
- `DeleteMessageUseCase` takes `{ messageId, sentAt: string (ISO), from: MessageOrigin }` — returns `delete-message-failed` if `from !== 'me'` or `Date.now() - new Date(sentAt).getTime() > 3_600_000`.
- `PinMessageUseCase` takes `{ conversationId, messageId, isGroup: boolean, selfIsGroupAdmin: boolean }` — returns `not-group-admin` when `isGroup && !selfIsGroupAdmin`.
- `RemoveGroupMemberUseCase` takes `{ groupId, targetUserId, selfUserId, selfIsAdmin, targetIsAdmin }` — returns `not-group-admin` when `!selfIsAdmin`, failure when `targetUserId === selfUserId` or `targetIsAdmin`.
- `DeleteGroupUseCase` / `UpdateGroupUseCase` return `not-group-admin` when `!selfIsGroupAdmin`.
- Use `result.ts` `ok()`/`fail()` pattern consistent with US-E10.1.
- Inject deterministic clock via parameter (no `Date.now()` raw call) so tests are deterministic.

### Test coverage (TDD red→green)

| Test file | Variants |
|---|---|
| `create-group.use-case.test.ts` | ok / no-name / name-too-short (<2) / no-members |
| `update-group.use-case.test.ts` | ok / name-too-short / not-admin |
| `remove-group-member.use-case.test.ts` | ok / not-admin / remove-self / remove-another-admin |
| `delete-message.use-case.test.ts` | ok / not-own / >1h expired |
| `pin-message.use-case.test.ts` | ok (DM) / ok (group+admin) / group-non-admin → not-group-admin |
| `leave-group.use-case.test.ts` | ok |
| `delete-group.use-case.test.ts` | ok / not-admin |

### Done when

All 7 use-case test suites green; `tsc --noEmit` clean on domain layer.

### Risks

- `sentAt` ISO string must be added to `MessageEntity` and populated in fixtures/mock. Without it the 1-hour gate cannot be tested.
- Adding methods to `IMessagingRepository` will cause TypeScript compile errors in `MockMessagingRepository` and `MessagingRepository` until Phase 2 stubs them — phase order is intentional; accept red build until Phase 2 lands.

---

## Phase 2 — Infrastructure (mock repository + endpoint constants)

**Goal**: stub all new repository methods, add endpoint constants, seed per-role group fixtures.

### Files to create

| File | Action |
|---|---|
| `src/features/messaging/infrastructure/dtos/group-response.dto.ts` | NEW — `GroupResponseDto`, `GroupMemberDto`, `PinnedMessageDto` |
| `src/features/messaging/infrastructure/dtos/create-group-request.dto.ts` | NEW — request shape for `POST /social/api/v1/groups` |
| `src/features/messaging/infrastructure/mappers/group.mapper.ts` | NEW — `GroupResponseDto → GroupEntity` |

### Files to modify

| File | Change |
|---|---|
| `src/bootstrap/endpoint/messaging.endpoint.ts` | Add 7 constants: `createGroup`, `addGroupMembers`, `removeGroupMember` (fn), `deleteGroup` (fn), `pinMessage` (fn), `unpinMessage` (fn), `deleteMessage` (fn) |
| `src/features/messaging/infrastructure/repositories/mocks/fixtures.ts` | Add `MOCK_GROUPS` (per-role: teacher homeroom admin + dept, principal BGH admin, student class non-admin, parent DM-only); extend `MOCK_MESSAGES` entries with `sentAt` ISO, seed 2–3 messages with `replyTo`, 1 with `isPinned:true`; extend `MOCK_CONVERSATIONS` with group-specific fields (`selfIsGroupAdmin`, `groupKind`, `memberCount`, `lastSenderName`) |
| `src/features/messaging/infrastructure/repositories/mocks/messaging.mock.repository.ts` | Implement all new `IMessagingRepository` methods: in-memory mutations on `this.conversations` / `this.groups` / `this.messages`; `getGroupInfo` returns clone of `MOCK_GROUPS[groupId]`; `createGroup` prepends; `updateGroup` patches name/desc; `addGroupMembers` pushes; `removeGroupMember` filters; `leaveGroup`/`deleteGroup` removes conversation; `pinMessage` sets `isPinned` + adds to `pinnedMessageIds`; `deleteMessage` sets `isDeleted:true` |
| `src/features/messaging/infrastructure/repositories/messaging.repository.ts` | Add stub implementations for new methods (compile-only stubs calling `MESSAGING_EP` constants — NOT wired to real HTTP yet since service is not shipped; return `fail({type:'group-mutation-failed'})` as placeholder) |
| `src/features/messaging/infrastructure/mappers/messaging.mapper.ts` | Extend `toMessageEntity` to map `replyTo`, `isPinned`, `isDeleted`, `sentAt`; extend `toConversationEntity` to map `selfIsGroupAdmin`, `groupKind`, `pinnedMessageIds`, `lastSenderName` |
| `src/bootstrap/di/messaging.di.ts` | No structural change — factory already wires `MockMessagingRepository`; type errors should clear once mock implements new methods |

### Endpoint constants to add

```ts
createGroup: '/social/api/v1/groups',
addGroupMembers: (id: string) => `/social/api/v1/groups/${id}/members`,
removeGroupMember: (id: string, userId: string) => `/social/api/v1/groups/${id}/members/${userId}`,
deleteGroup: (id: string) => `/social/api/v1/groups/${id}`,
pinMessage: (convoId: string, msgId: string) => `/social/api/v1/conversations/${convoId}/messages/${msgId}/pin`,
unpinMessage: (convoId: string, msgId: string) => `/social/api/v1/conversations/${convoId}/messages/${msgId}/pin`,
deleteMessage: (convoId: string, msgId: string) => `/social/api/v1/conversations/${convoId}/messages/${msgId}`,
```

### Mock fixture seeding (per FR-024)

| Role | Groups |
|---|---|
| Teacher | `conv-g-homeroom` (selfIsGroupAdmin: true, 12 members), `conv-g-dept` (selfIsGroupAdmin: false, 8 members) |
| Principal | `conv-g-bgh` (selfIsGroupAdmin: true, 5 members), `conv-g-full` (selfIsGroupAdmin: false, 20 members) |
| Student | `conv-g-class` (selfIsGroupAdmin: false, 35 members) |
| Parent | (no group conversations; DM only) |

Role is resolved from `NEXT_PUBLIC_MOCK_ROLE` env var (same pattern as US-E10.1 mock seeding).

### Integration test coverage

| Test file | Cases |
|---|---|
| `messaging.mock.repository.test.ts` (extend) | `createGroup` prepends to list; `removeGroupMember` removes; `pinMessage` sets flag + pinnedMessageIds; `deleteMessage` soft-delete; per-role group seeding correctness |

### Done when

`tsc --noEmit` fully green (all new methods implemented); integration tests green.

---

## Phase 3 — Presentation: new components

**Goal**: build `CreateGroupModal` and `GroupInfoPanel` (+ sub-sections).

### Files to create

| File | Notes |
|---|---|
| `src/features/messaging/presentation/create-group-modal/create-group-modal.i-vm.ts` | Props interface: `open`, `onClose`, `contacts: ContactEntity[]`, `onSubmit(name, desc, kind, color, memberIds)`, `isSubmitting`, `error?` |
| `src/features/messaging/presentation/create-group-modal/create-group-modal.tsx` | `'use client'`; Radix Dialog; `useState<1\|2>` for step; react-hook-form + zod for step 1 (name min 2/max 60, desc max 140); step indicator; avatar preview; color picker (8 swatches); member search + chip area in step 2 |
| `src/features/messaging/presentation/create-group-modal/index.ts` | re-export |
| `src/features/messaging/presentation/create-group-modal/create-group-modal.stories.tsx` | Stories: Step1_Empty, Step1_Valid, Step1_ValidationError, Step2_NoMembers, Step2_WithMembers, Submit_Loading, Submit_Error |
| `src/features/messaging/presentation/group-info-panel/group-info-panel.i-vm.ts` | Props: `groupId`, `selfUserId`, `selfIsGroupAdmin`, `onClose`, `onScrollToMessage(messageId)` |
| `src/features/messaging/presentation/group-info-panel/group-info-panel.tsx` | `'use client'`; TanStack Query for `['messaging','group',groupId]`; slide-in translateX animation (motion-safe); edit mode state; leave/delete footer CTAs with confirmations |
| `src/features/messaging/presentation/group-info-panel/index.ts` | re-export |
| `src/features/messaging/presentation/group-info-panel/group-info-panel.stories.tsx` | Stories: Open, AdminView, NonAdminView, DeleteConfirm, PinnedMessages |

### Key implementation notes

**CreateGroupModal**:
- Radix `<Dialog>` provides focus trap + `aria-labelledby` automatically. Use `<DialogTitle>` (visually shown as step header).
- Step indicator: 3 states per dot — active (`bg-primary`, 800 label), done (`bg-edu-success`, check icon), inactive (border + muted label). Map via `cn()`.
- Color picker: 8 hex strings from design-spec `messaging.groupChat.colorPalette`; selected swatch has `2.5px solid var(--edu-text-primary)` border + `2px ring` in `selectedColor`. No new token needed — uses inline style for dynamic `selectedColor` ring only.
- Avatar preview: derive initials from first 2 words of name (max 3 chars). Background = `selectedColor + '20'` via `style={{ background: hex+'20' }}`. Border `selectedColor + '55'`.
- Member search: filter `contacts` by name substring (client-side, no new API call). Exclude already-selected members from list. Custom checkbox: `18px`, `border-radius 5`, `bg-primary` when checked — use existing `<Checkbox>` primitive from `components/ui/checkbox/`.
- `onSubmit` prop receives the resolved form data; parent (`MessagingScreen`) owns the TanStack mutation.

**GroupInfoPanel**:
- Positioned `fixed right-0 top-0 h-full w-[320px]` with `translateX(100%) → translateX(0)` CSS transition `0.22s ease-out`. Gate in `@media (prefers-reduced-motion: reduce)` → `transition: none`.
- Header: `<button aria-label={t('groupInfo.title')}` close; admin-only penLine edit icon.
- Members section: map `GroupEntity.members`; per-member: show `(Bạn)` suffix for self; Admin badge; remove button only when `selfIsGroupAdmin && target.role !== 'admin' && target.userId !== selfUserId`. Remove button `aria-label="Xóa {name} khỏi nhóm"`.
- Pinned section: map `GroupEntity.pinnedMessageIds` → pinned rows. Empty state when `pinnedMessageIds.length === 0`.
- Footer delete: two-step inline — `useState<boolean>` for confirm visible. "Xoá nhóm" button renders only when `selfIsGroupAdmin`.
- Leave confirmation: Radix `<AlertDialog>` (standard pattern — reuse `components/ui/alert-dialog/`).

### Token notes

All colors in `src/app/tokens.css`. Dynamic color values (group avatar bg `groupColor+'20'`) use inline `style` with hex string since Tailwind cannot know runtime color. This is the same pattern as `avatar-tone.ts` in E10.1.

### Done when

Both components render their primary stories without type errors; `tsc --noEmit` clean on presentation layer.

---

## Phase 4 — Presentation: extend existing components

**Goal**: wire context menu, reply strip, quoted bubble, ChatWindow local state, MessagingScreen Groups tab.

### Files to modify

| File | Change |
|---|---|
| `src/features/messaging/presentation/chat-bubble/chat-bubble.tsx` | Add `replyTo?: { messageId: string; senderName: string; excerpt: string }` prop; render quoted block above message text; `isDeleted?` prop renders placeholder; add `data-message-id` attribute for scroll targeting; add `onContextMenu` + `onTouchStart`/`onTouchEnd` props for context menu trigger |
| `src/features/messaging/presentation/chat-window/chat-window.tsx` | Add `useState` for: `contextMenu: { open, x, y, messageId, from, sentAt, isPinned, isGroup, selfIsGroupAdmin } \| null`; `replyState: { messageId, senderName, excerpt } \| null`; `groupInfoPanelOpen: boolean`; `highlightedMessageId: string \| null`. Wire context-menu open on bubble right-click/long-press. Pass `replyState` + `onCancelReply` + `onScrollToMessage` to `MessageInput`. Pass `onGroupHeaderClick` to header. Render `MessageContextMenu` when `contextMenu !== null`. Render `GroupInfoPanel` when `groupInfoPanelOpen`. Implement `scrollToMessage(messageId)` via `useRef` on message container + `element.scrollIntoView`. Pin highlight: set `highlightedMessageId` for 3000ms then clear; gate animation via CSS class + `@media (prefers-reduced-motion: no-preference)` |
| `src/features/messaging/presentation/message-input/` (existing file) | Add `replyState?: ReplyState \| null` and `onCancelReply?: () => void` props. Render ReplyStrip sub-section inside the component (above the text area): left border 4px `pColor`, "Đang trả lời {name}" uppercase 10.5px, excerpt single-line ellipsis, cancel X `aria-label={t('reply.cancelAriaLabel')}`. Show reply strip only when `replyState !== null`. Entry animation 0.15s — gate with `@media (prefers-reduced-motion: reduce)`. Modify `onSend` to include `replyTo` in message when `replyState` is active |
| `src/features/messaging/presentation/messaging-screen/messaging-screen.tsx` | Add `createGroupModal` open state (`useState<boolean>`); render `<CreateGroupModal>` (conditionally); pass TanStack `createGroup` mutation to modal; Groups tab: render empty state when `conversations.filter(c=>c.type==='group').length === 0`; pass `onOpenCreateGroup` to `ConversationList` |
| `src/features/messaging/presentation/conversation-list/conversation-list.tsx` | Add `onOpenCreateGroup?` prop; render "+ Tạo nhóm" CTA sub-header above group list entries (only when on Groups tab); group rows: display `memberCount` chip, use `senderName` in last-message preview |
| `src/features/messaging/presentation/conversation-item/conversation-item.tsx` | Support group avatar variant: rounded-square (radius 12, `groupColor+'20'` bg, initials max 3 chars); no online dot for groups; unread badge uses `bg-edu-error` (already tokens); show `memberCount` chip when `type === 'group'` |

### MessageContextMenu — context-menu primitive

Check whether `components/ui/context-menu/` already exists. If not: `bun ui:add context-menu`. The `MessageContextMenu` wraps the primitive with 4 items. It is NOT a new component in `shared/` or `features/` — it lives inline in `ChatWindow` or as a thin wrapper file at `features/messaging/presentation/chat-window/message-context-menu.tsx` (private sub-component, single-screen use per decision 0026 rule 3).

Menu items:
- Reply: `<ContextMenuItem>` always enabled
- Pin: `aria-disabled={!canPin}` when disabled; hint via `aria-describedby` on a hidden span
- Copy: always enabled; calls `navigator.clipboard.writeText(text)` (silent-fail on unavailable)
- Delete: shown only when `from === 'me'`; `aria-disabled={!canDelete}` when >1h; styled as danger (error color, separator above)

Long-press detection: `onTouchStart` records timer (500ms); `onTouchEnd`/`onTouchMove` clears it. No external library.

### Done when

Storybook interaction stories in Phase 5 drive this — component renders correctly for all context-menu and reply scenarios. `tsc` clean.

### Risk

- Viewport-clamped positioning for context menu: `x + menuWidth > window.innerWidth → x = window.innerWidth - menuWidth`. Implement in the open handler inside `ChatWindow`.
- `scrollToMessage` requires that message DOM nodes carry `data-message-id`; this imposes a discipline on `ChatBubble` rendering.

---

## Phase 5 — Storybook stories (27 stories)

**Goal**: all 27 stories per §9 of spec passing with interaction tests.

### Files to create/modify

| File | Stories |
|---|---|
| `src/features/messaging/presentation/create-group-modal/create-group-modal.stories.tsx` | `Step1_Empty`, `Step1_Valid`, `Step1_ValidationError`, `Step2_NoMembers`, `Step2_WithMembers`, `Submit_Loading`, `Submit_Error` |
| `src/features/messaging/presentation/group-info-panel/group-info-panel.stories.tsx` | `Open`, `AdminView`, `NonAdminView`, `DeleteConfirm`, `PinnedMessages`, `Pin_PanelRow` |
| `src/features/messaging/presentation/chat-bubble/chat-bubble.stories.tsx` (extend) | `Reply_Quote_OwnBubble`, `Reply_Quote_OtherBubble`, `DeletedMessageBubble` |
| `src/features/messaging/presentation/chat-window/chat-window.stories.tsx` (extend or new) | `ContextMenu_OwnMessage_Admin`, `ContextMenu_OwnMessage_NonAdmin`, `ContextMenu_OtherMessage`, `ContextMenu_OwnMessage_Expired`, `Reply_Strip_Active`, `LoadingSkeleton`, `DeleteMessageConfirm_Dialog`, `MemberOffline` |
| `src/features/messaging/presentation/messaging-screen/messaging-screen.stories.tsx` (extend) | `EmptyGroups`, Mobile viewport variants (key stories at 375px) |

### Interaction test notes

- `CreateGroup_Step1_ValidationError`: `userEvent.blur()` name field after typing 1 char → error shown, Next disabled.
- `CreateGroup_Step2_WithMembers`: `userEvent.click()` 3 member checkboxes → chips render → Submit enabled.
- `ContextMenu_OwnMessage_Admin`: right-click bubble → menu renders with 4 items; Pin enabled; Delete enabled.
- `Reply_Strip_Active`: after selecting Reply → strip visible above input; `userEvent.click(cancelBtn)` → strip gone.
- Mobile viewport stories: use Storybook `parameters.viewport.defaultViewport = 'mobile1'` (375px).

### Done when

`bun storybook` builds; all 27 story renders pass without console errors; `fe-qa-playwright` can run interactions.

---

## Phase 6 — i18n sync

**Goal**: add 5 missing error keys; verify all 47 keys present.

### Files to modify

| File | Change |
|---|---|
| `src/bootstrap/i18n/messages/vi.json` | Add under `messaging.errors`: `create-group-failed`, `group-mutation-failed`, `pin-failed`, `delete-message-failed`, `not-group-admin` |
| `src/bootstrap/i18n/messages/en.json` | Mirror all 5 keys |

### Verification

Current state: 4 keys in `messaging.errors` — the 5 new failure types from the extended `MessagingFailure` union have no corresponding i18n keys yet. These must be added before `tsc --noEmit` will pass the type check (i18n type augmentation in `messages.d.ts` will catch missing keys at compile time).

No other keys are missing: the 47 keys across `messaging.group` (21), `messaging.groupInfo` (11), `messaging.contextMenu` (7), `messaging.reply` (3), `messaging.deleteDialog` (5) are already staged.

Run after adding keys: `bunx tsc --noEmit` to confirm zero i18n type errors.

### Done when

`bunx tsc --noEmit` clean; grep for diacritical literals in `src/features/messaging/presentation/**/*.tsx` (excluding `*.stories.tsx` and `*.test.*`) returns zero hits.

---

## Phase 7 — TSD / QA

**Goal**: full gate pass before `implemented` status.

### Steps

1. `bun vitest run src/features/messaging/` — all unit + integration tests green
2. `bun lint:fix` — Biome clean (auto-sort classes)
3. `bunx tsc --noEmit` — zero type errors
4. `bun build` — production build clean (no server-only leaks into client bundle)
5. `bun storybook` + `fe-qa-playwright` interaction run — 27 stories pass
6. Design-review gate: `/impeccable audit` on CreateGroupModal, GroupInfoPanel, ChatBubble (reply), ContextMenu
7. WCAG 2.1 AA manual checks: modal focus trap (Tab cycles within modal), context menu keyboard nav (Arrow + Enter + Escape), GroupInfoPanel motion-safe (disable animation in OS, panel appears instantly), pin highlight gated

### Files to update after gate

| File | Change |
|---|---|
| `docs/stories/epics/E10-communications/US-E10.4-messaging-enhancements/story.md` | Status → `implemented`; Evidence section filled |
| `docs/TEST_MATRIX.md` | Row US-E10.4 → `implemented` with proof links |

---

## Component + State Sketch

```
MessagingScreen
├── useState: createGroupModalOpen (bool)
├── <ConversationList onOpenCreateGroup>
│   └── "+ Tạo nhóm" CTA → opens modal
│   └── <ConversationItem> group variant (rounded-sq avatar, memberCount chip)
│   └── <EmptyGroupsState> when no groups
├── <CreateGroupModal open={createGroupModalOpen} onSubmit→mutation>
│   ├── useState: step (1|2)
│   ├── useForm (react-hook-form + zod, step 1)
│   ├── useState: selectedMemberIds
│   └── TanStack createGroup mutation lives in MessagingScreen, passed as prop
└── <ChatWindow conversation={active}>
    ├── useState: contextMenu | null
    ├── useState: replyState | null
    ├── useState: groupInfoPanelOpen (bool)
    ├── useState: highlightedMessageId | null
    ├── useQuery(['messaging','group',groupId]) — only when groupInfoPanelOpen
    ├── <MessageContextMenu> (inline sub-component or thin wrapper)
    ├── <GroupInfoPanel> (conditional)
    │   ├── useQuery(['messaging','group',groupId])
    │   ├── useState: editMode (bool)
    │   └── useState: deleteGroupConfirmVisible (bool)
    ├── <ChatBubble> × N — extended with replyTo, isDeleted, highlight
    └── <MessageInput replyState onCancelReply>
        └── ReplyStrip (inline sub-section)
```

State classification:
- **Server state** (TanStack Query): `conversations`, `messages`, `group` (GroupEntity)
- **URL state**: none new (route unchanged)
- **Local form**: step 1 (react-hook-form + zod), selectedMemberIds (useState)
- **Local UI**: all `useState` entries above — no Zustand, no context

---

## Risks, Dependencies, Open Questions

### Dependencies

- US-E10.1 must be merged to `main` before this branch is cut (declared in story.md).
- `components/ui/context-menu/` primitive must exist (check before Phase 4; run `bun ui:add context-menu` if absent).
- `components/ui/alert-dialog/` must exist (used for Leave Group confirm; likely already present from prior stories — verify).

### Risks

- **Dark mode quoted bubble**: `rgba(255,255,255,0.18)` for own-bubble quoted block is hardcoded white. If dark mode is active, this becomes invisible. Check `src/app/tokens.css` for a suitable semi-transparent token. If none exists → flag for ADR before Phase 4 (potential new token `--messaging-quote-own-bg`). **Do not use raw rgba — add token first.**
- **Long-press on mobile**: touch event handler approach avoids library dependency. Must cancel on `touchmove > 10px` to avoid conflicts with scroll. Vitest cannot test touch events — cover via Storybook interaction story with mock `onContextMenu` prop.
- **GroupInfoPanel at 375px** (OQ-1 from spec): design-spec does not specify mobile layout. Recommendation: panel takes `w-full` on `< 400px` viewport with a close button and `z-50` overlay. Flag this as a minor design decision in the implementation — no ADR needed (token-free layout choice).
- **Scroll to out-of-window message** (OQ-2 from spec): implement scroll-within-loaded-messages only for this story. If `messageId` not found in current DOM, no-op (no message load triggered). Document this limitation in story Evidence.

### Open questions (resolved for plan)

- OQ-1 mobile panel: full-width overlay at `< 400px` (see Risks above).
- OQ-2 scroll boundary: scroll within loaded messages only; out-of-window = no-op for this story.

### ADR flags

- **Dark-mode quoted bubble token** (`--messaging-quote-own-bg`): if the token does not exist in `src/app/tokens.css`, engineer must flag to `fe-lead` before using it. Potential ADR ≥ 0045. Do not proceed with raw rgba.
