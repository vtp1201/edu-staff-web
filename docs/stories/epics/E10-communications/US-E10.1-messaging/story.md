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

---

## Component Architecture

### 1. Architecture Summary

**Feature scope:** New `messaging` feature module (`src/features/messaging/`). Single shared route at `(shared)/messages/`. All roles access the same screen — no role-specific layouts needed. Mock-first (`social` service planned, decision 0017).

**New vs reused:**

| Component | Status | Canonical home |
| --- | --- | --- |
| `MessagingScreenContainer` | NEW — client container | `features/messaging/presentation/messaging-screen/` |
| `ConversationListPane` | NEW — presentational | `features/messaging/presentation/conversation-list-pane/` |
| `ConversationItem` | NEW — presentational | `features/messaging/presentation/conversation-item/` |
| `ChatWindowPane` | NEW — presentational | `features/messaging/presentation/chat-window-pane/` |
| `ChatBubble` | NEW — presentational | `features/messaging/presentation/chat-bubble/` |
| `TypingIndicator` | NEW — presentational | `features/messaging/presentation/typing-indicator/` |
| `NewConversationModal` | NEW — presentational | `features/messaging/presentation/new-conversation-modal/` |
| `EmptyMessagingState` | NEW — presentational | `features/messaging/presentation/empty-messaging-state/` |
| `ConversationHeader` | NEW — presentational | `features/messaging/presentation/conversation-header/` |
| `MessageInput` | NEW — presentational | `features/messaging/presentation/message-input/` |

**Reused from codebase (no new installs):**
- `components/ui/dialog/` — `Dialog`, `DialogContent`, `DialogTitle` for `NewConversationModal` (Radix, keyboard trap + focus management built-in; `bun ui:add dialog` already done)
- `components/ui/tabs/` — tab trigger pattern reference for Direct/Groups tab; but the messaging tabs use a custom underline style, so `Tabs` primitive is not used directly — the tab markup is plain `<button>` elements with token classes (matches design spec)
- `components/ui/skeleton/` — skeleton rows in `ConversationListPane` during loading (AC-1)
- `components/ui/textarea/` — base for `MessageInput`
- `components/ui/avatar/` — `Avatar` + `AvatarFallback` for initials-based avatars (no images)
- `components/ui/badge/` — unread count pill in `ConversationItem`
- `components/ui/button/` — send button, new message button, action buttons
- `components/ui/input/` — search inputs in list pane and modal
- `components/shared/status-badge/` — NOT used; messaging has no status-badge pattern
- `components/shared/stat-card/` — NOT used

**Missing shadcn primitives:** None. `dialog`, `textarea`, `avatar`, `badge`, `button`, `input`, `skeleton` are all confirmed present in `components/ui/`.

**Key architectural decisions:**
1. All 10 components are feature-local (first screen only; promote to `components/shared/` when a second screen needs any of them per decision 0026).
2. `MessagingScreenContainer` is the sole `'use client'` container holding TanStack Query state. All children are **presentational** — they receive data via props and emit callbacks.
3. `ChatBubble` handles four render variants (`own`, `other`, `system`, `divider`) via a `variant` prop + `cva` — not four separate components (avoids proliferation).
4. Route resolution: **Option B** — `(shared)/messages/page.tsx` is the single RSC. Per-role nav-config hrefs remain as-is; redirect pages at `/teacher/messages`, `/student/messages`, etc. each do a `redirect('/messages')`. This matches the `notifications` pattern exactly and avoids updating nav-config in this story.
5. `TypingIndicator` animation MUST be gated by `@media (prefers-reduced-motion: reduce)` — CSS `@keyframes bounce` style scoped to the component, with the `reduce` override setting `animation: none`.
6. Chat window background `#F8FAFF` from the design is NOT in `tokens.css`. Flag: use `bg-background` (`--edu-bg: #F5F7FA`) as the closest token. The 2-point color difference is within tolerance; no new token needed. If design-review gate rejects this, flag for ADR ≥ 0023.

---

### 2. Component Tree

```
app/[locale]/t/[tenant]/(app)/(shared)/messages/page.tsx   [RSC]
  └─ MessagingScreenContainer                               ['use client', container]
       ├─ ConversationListPane                              [presentational]
       │    ├─ <search input>                               [ui/input reused]
       │    ├─ <tab buttons — Direct / Groups>              [plain button, token classes]
       │    ├─ <Skeleton rows × N>                          [ui/skeleton, isLoading=true]
       │    ├─ ConversationItem × N                         [presentational]
       │    │    ├─ <Avatar initials circle>                [ui/avatar reused]
       │    │    ├─ <online dot>                            [decorative div, aria-hidden]
       │    │    └─ <Badge unread count>                    [ui/badge reused]
       │    └─ <error banner>                               [inline, errorKey mapped]
       │
       ├─ ChatWindowPane                                    [presentational]
       │    ├─ ConversationHeader                           [presentational]
       │    │    ├─ <Avatar initials circle>                [ui/avatar reused]
       │    │    ├─ <online dot>                            [aria-hidden]
       │    │    └─ <action icon buttons>                   [ui/button reused]
       │    │
       │    ├─ <scroll container role="log" aria-live="polite">
       │    │    ├─ ChatBubble variant="divider" × N        [presentational]
       │    │    ├─ ChatBubble variant="system" × N         [presentational]
       │    │    ├─ ChatBubble variant="own" × N            [presentational]
       │    │    ├─ ChatBubble variant="other" × N          [presentational]
       │    │    └─ TypingIndicator                         [presentational, motion-safe]
       │    │
       │    └─ MessageInput                                 [presentational]
       │         ├─ <attach button>                         [ui/button, placeholder]
       │         ├─ <Textarea>                              [ui/textarea reused]
       │         └─ <send button>                           [ui/button reused]
       │
       ├─ EmptyMessagingState                               [presentational, no active conversation]
       │
       └─ NewConversationModal                              [presentational]
            ├─ <Dialog>                                     [ui/dialog reused, Radix]
            ├─ <search input>                               [ui/input]
            └─ <contact rows — Avatar + name + role>        [ui/avatar]
```

**Responsive note:** `MessagingScreenContainer` controls `mobilePane: 'list' | 'chat'` state. At `< md` breakpoint, only one pane is visible at a time. `ChatWindowPane` receives a `onBackToList` callback prop for the mobile back button.

---

### 3. ViewModel + Prop Interfaces

#### `messaging-screen.i-vm.ts` — screen ViewModel (RSC → client boundary)

```ts
// src/features/messaging/presentation/messaging-screen/messaging-screen.i-vm.ts

import type { ConversationEntity } from '@/features/messaging/domain/entities/conversation.entity'
import type { ContactEntity } from '@/features/messaging/domain/entities/contact.entity'
import type { MessagingFailure } from '@/features/messaging/domain/failures/messaging.failure'

/**
 * ViewModel produced by the RSC page from initial SSR fetches.
 * Injected into MessagingScreenContainer as props; seeded into TanStack Query cache.
 */
export interface MessagingScreenVm {
  /** SSR-fetched conversations; seeded as initialData for the conversations query. */
  initialConversations: ConversationEntity[]
  /** SSR-fetched contacts for NewConversationModal suggestion list. */
  initialContacts: ContactEntity[]
  /** Non-null when SSR load of conversations failed; presentation translates via t(errorKey). */
  errorKey: MessagingFailure['type'] | null
  /** Tenant id — passed to SSE subscription hook (decision 0009). */
  tenantId: string
}
```

#### `MessagingScreenContainer` props

```ts
// 'use client' container
// Props = MessagingScreenVm + server action refs

interface MessagingScreenContainerProps extends MessagingScreenVm {
  // Server Action refs (passed from RSC page — never imported in 'use client')
  sendMessageAction: (
    conversationId: string,
    text: string
  ) => Promise<{ errorKey?: MessagingFailure['type'] }>
  createConversationAction: (
    contactIds: string[],
    name?: string
  ) => Promise<{ newConversation?: ConversationEntity; errorKey?: MessagingFailure['type'] }>
}
```

#### `ConversationListPane` props (presentational)

```ts
interface ConversationListPaneProps {
  conversations: ConversationEntity[]      // filtered by tab already computed in container
  activeTab: 'direct' | 'groups'
  activeConversationId: string | null
  searchQuery: string
  isLoading: boolean
  errorKey: MessagingFailure['type'] | null
  // labels — all strings injected from parent (label injection pattern; no useTranslations in leaf)
  labels: {
    tabDirect: string
    tabGroups: string
    searchPlaceholder: string
    noResults: string
    noGroups: string
    errorMessage: string
    newMessageButtonLabel: string   // aria-label on the + button
  }
  // callbacks
  onTabChange: (tab: 'direct' | 'groups') => void
  onSearchChange: (query: string) => void
  onSelectConversation: (id: string, type: 'direct' | 'group') => void
  onNewConversation: () => void
}
```

#### `ConversationItem` props (presentational)

```ts
interface ConversationItemProps {
  conversation: ConversationEntity
  isActive: boolean
  // labels
  openLabel: string        // aria-label: "Mở cuộc trò chuyện với {name}"
  onlineLabel: string      // sr-only: "Đang online"
  membersLabel: string     // "{count} thành viên" — pre-formatted by parent
  // callbacks
  onClick: (id: string) => void
}
```

#### `ChatWindowPane` props (presentational)

```ts
interface ChatWindowPaneProps {
  messages: MessageGroupItem[]    // pre-grouped with dividers; see type below
  isLoadingMessages: boolean
  isTyping: boolean               // show TypingIndicator when true
  conversation: ConversationEntity | null
  isSending: boolean              // useMutation isPending
  // responsive
  isMobileView: boolean
  // labels
  labels: ChatWindowLabels        // see below
  // callbacks
  onSendMessage: (text: string) => void
  onBackToList: () => void        // mobile back button
  onLoadMore: () => void          // scroll-to-top triggers older messages
}

// Messages are delivered pre-processed by the container
type MessageGroupItem =
  | { kind: 'divider'; label: string; key: string }
  | { kind: 'message'; message: MessageEntity; key: string }

interface ChatWindowLabels {
  chatHistoryAriaLabel: string
  inputPlaceholder: string
  sendLabel: string
  attachLabel: string
  backToListLabel: string
  loadingLabel: string
}
```

#### `ConversationHeader` props (presentational)

```ts
interface ConversationHeaderProps {
  conversation: ConversationEntity
  isMobileView: boolean
  labels: {
    onlineLabel: string       // "Đang online"
    membersLabel: string      // "{count} thành viên" — pre-formatted
    searchLabel: string       // aria-label for search button
    notificationsLabel: string
    infoLabel: string
    backLabel: string         // mobile back button aria-label
  }
  onBack: () => void
}
```

#### `ChatBubble` props (presentational, cva variants)

```ts
type ChatBubbleVariant = 'own' | 'other' | 'system' | 'divider'

interface ChatBubbleProps {
  variant: ChatBubbleVariant
  // 'own' | 'other': message data
  text?: string
  time?: string
  // 'other' in a group conversation: show sender name + avatar
  isGroup?: boolean
  showSenderName?: boolean
  senderName?: string
  senderInitials?: string
  senderColorToken?: string    // CSS var name from entity, e.g. '--edu-primary'
  // 'divider': date label
  dividerLabel?: string
  // 'system': same text field
}
```

Design-system token mapping for `ChatBubble`:
- `variant='own'` → `bg-primary text-primary-foreground`; border-radius `rounded-2xl rounded-br-sm`
- `variant='other'` → `bg-card border border-border text-foreground`; border-radius `rounded-2xl rounded-bl-sm`
- `variant='system'` → `text-muted-foreground text-[11px] italic` centered pill with `border border-border bg-background`
- `variant='divider'` → `text-muted-foreground text-[11px] font-semibold` with horizontal rules via `before:` and `after:` pseudo-classes (or two `<div>` flex children)

#### `TypingIndicator` props (presentational)

```ts
interface TypingIndicatorProps {
  senderInitials: string
  senderColorToken: string     // CSS var name, e.g. '--edu-success'
  // a11y — sr-only text for screen readers
  label: string                // e.g. "Đang soạn tin nhắn..."
}
```

Animation: three dots with `animate-bounce` staggered via `[animation-delay:150ms]` and `[animation-delay:300ms]`. The CSS `@keyframes bounce` is scoped to this component. Motion-safe gate:
```css
@media (prefers-reduced-motion: reduce) {
  .typing-dot { animation: none; opacity: 0.4; }
}
```

#### `MessageInput` props (presentational)

```ts
interface MessageInputProps {
  value: string
  isSending: boolean
  // labels
  inputLabel: string        // sr-only label for <label htmlFor>
  placeholder: string
  sendLabel: string         // aria-label on send button
  attachLabel: string       // aria-label on attach button (placeholder, disabled)
  // callbacks
  onChange: (value: string) => void
  onSend: () => void
}
```

#### `NewConversationModal` props (presentational)

```ts
interface NewConversationModalProps {
  isOpen: boolean
  contacts: ContactEntity[]
  searchQuery: string
  isCreating: boolean
  labels: {
    title: string
    searchPlaceholder: string
    suggestionsLabel: string
    onlineLabel: string
    closeLabel: string         // aria-label on X button
  }
  onClose: () => void
  onSearchChange: (query: string) => void
  onSelectContact: (contactId: string) => void
}
```

#### `EmptyMessagingState` props (presentational)

```ts
interface EmptyMessagingStateProps {
  labels: {
    title: string
    subtitle: string
    ctaLabel: string
  }
  onStartConversation: () => void
}
```

---

### 4. State Ownership (contract level)

| State | Owner | Type | Notes |
| --- | --- | --- | --- |
| `conversations` list | `MessagingScreenContainer` via TanStack Query | server state | `useQuery`; seeded with `initialConversations` from RSC |
| `messages` per conversation | `MessagingScreenContainer` via TanStack Query | server state | `useInfiniteQuery`; cursor-based; optimistic update on send |
| `activeConversationId` | `MessagingScreenContainer` | local UI state (`useState`) | Also reflected in `?conversation=<id>` URL param via `useRouter` |
| `activeTab` | `MessagingScreenContainer` | local UI state (`useState`) | `'direct' \| 'groups'` |
| `searchQuery` | `MessagingScreenContainer` | local UI state (`useState`) | Client-side filter; no query |
| `inputText` | `MessagingScreenContainer` | local UI state (`useState`) | Controlled textarea value |
| `isModalOpen` | `MessagingScreenContainer` | local UI state (`useState`) | NewConversationModal open/close |
| `modalSearchQuery` | `MessagingScreenContainer` | local UI state (`useState`) | Search within NewConversationModal |
| `mobilePane` | `MessagingScreenContainer` | local UI state (`useState`) | `'list' \| 'chat'` for responsive |
| `isTyping` | `MessagingScreenContainer` | local UI state | SSE-driven (mock: `setTimeout` after SSE event received) |

**Hand-off note to `fe-state-engineer`:**
- Query key structure: `['messaging', 'conversations']` and `['messaging', 'messages', conversationId]` — confirm with fe-state-engineer before implementation.
- Optimistic `sendMessage`: prepend `MessageEntity` to `useInfiniteQuery` first-page cache via `queryClient.setQueryData`; rollback on error via `onError` + `context.previousMessages`.
- SSE integration: incoming `message.new` event → `queryClient.setQueryData` to prepend to the active conversation's message cache. This is a client-side concern (browser `EventSource`); the hook lives in `presentation/`, NOT in `infrastructure/`. Pattern: same as `use-notification-new-event.ts` in notifications feature.
- `markConversationRead`: implicit side-effect of `onSelectConversation` — fire-and-forget mutation, invalidate `conversations` query. Confirm with fe-state-engineer whether to invalidate or optimistically update `unreadCount` on the conversation entity.

---

### 5. Composition and Variant Strategy

**`ChatBubble` — cva variants:**
One component, four variants. No separate `DateDivider` or `SystemMessage` components — they are render branches inside `ChatBubble` driven by `variant` prop. This avoids 4 import paths in `ChatWindowPane` for the same list item pattern.

```ts
// cva sketch (implementation by fe-nextjs-engineer)
const chatBubbleVariants = cva('', {
  variants: {
    variant: {
      own:     'self-end bg-primary text-primary-foreground rounded-2xl rounded-br-sm',
      other:   'self-start bg-card border border-border text-foreground rounded-2xl rounded-bl-sm',
      system:  'self-center text-muted-foreground text-[11px] italic',
      divider: 'self-stretch text-muted-foreground text-[11px] font-semibold',
    },
  },
})
```

**`ConversationItem` — no cva needed.** Active state (`isActive` prop) drives a conditional class: `border-l-[3px] border-primary bg-primary/8` when active, `border-l-[3px] border-transparent` when not. This is a simple boolean prop — no cva variant axes.

**`Avatar` initials circle — NOT a new component.** Use `<Avatar>` + `<AvatarFallback>` from `components/ui/avatar/`. The initials and background color are passed as content + inline style (CSS variable reference: `style={{ background: 'color-mix(in srgb, var(--edu-primary) 20%, transparent)' }}`). Note: `background-color` with `color-mix` is a dynamic computed value — `style={}` is acceptable per Tailwind v4 rules for dynamic values.

**`NewConversationModal` — compound with Radix `Dialog`.** Uses `Dialog > DialogContent > DialogTitle + [search + list]`. No `asChild` / `Slot` needed — the trigger button is in `ConversationListPane` and the `isOpen` prop is controlled by the container.

**`ConversationListPane` tabs — plain `<button>` elements.** The messaging tab design uses a custom underline underline style that diverges from the `ui/tabs` shadcn pattern (which is pill/background). Plain `<button role="tab">` with `aria-selected` + `aria-controls` in a `role="tablist"` gives the same semantics without coupling to the shadcn `Tabs` token.

**Extension points for future stories:**
- `ChatBubble`: add `variant="attachment"` when file upload ships (no new component).
- `ConversationItem`: add `isPinned` prop for pinned conversations (future).
- `NewConversationModal`: extend `onSelectContact` to multi-select for group creation (current: single-select).

---

### 6. Route Resolution Recommendation

**Chosen: Option B — Single `(shared)/messages/page.tsx` + per-role redirect pages**

```
src/app/[locale]/t/[tenant]/(app)/(shared)/messages/
  page.tsx          — RSC; loads initial data; renders MessagingScreenContainer
  actions.ts        — 'use server'; sendMessageAction, createConversationAction

src/app/[locale]/t/[tenant]/(app)/teacher/messages/
  page.tsx          — `redirect('/messages')` (or locale-aware redirect)

src/app/[locale]/t/[tenant]/(app)/student/messages/
  page.tsx          — `redirect('/messages')`

src/app/[locale]/t/[tenant]/(app)/principal/messages/
  page.tsx          — `redirect('/messages')`

src/app/[locale]/t/[tenant]/(app)/parent/messages/
  page.tsx          — `redirect('/messages')`
```

**Rationale:**
- Nav-config hrefs do NOT need to change (no nav-config refactor in this story).
- Redirect pages are 3-line RSC files — minimal duplication.
- Matches the `notifications` pattern (already has `(shared)/notifications/`).
- Option A (update nav-config) touches a shared config file that could conflict with in-flight parallel stories. Option C (per-role pages importing same component) violates component-organization rule — the container would be imported in 4+ places from different pages, not promoted.
- Locale-aware redirect: use `import { redirect } from 'next/navigation'` with the locale prefix preserved (the existing `(shared)/notifications` page already shows this is resolved by the layout group, not explicit locale prefix in `redirect()`).

---

### 7. Accessibility Contract

| Node | Required role/label/keyboard |
| --- | --- |
| Conversation list scroll area | `role="list"` or implicit `<ul>`; each item `role="listitem"` |
| ConversationItem button | `aria-label={t('openConversation', { name })}`, `aria-current="true"` when active |
| Tab buttons (Direct/Groups) | `role="tablist"` on wrapper; each tab `role="tab"`, `aria-selected`, `aria-controls` pointing to panel id |
| Tab panel (conversation list body) | `role="tabpanel"` with matching `id`, `aria-labelledby` |
| Online indicator dot | `aria-hidden="true"` + adjacent `<span className="sr-only">{onlineLabel}</span>` |
| Unread badge | Included in `ConversationItem`'s `aria-label`; the visible `<Badge>` has `aria-hidden="true"` |
| Chat scroll container | `role="log"`, `aria-live="polite"`, `aria-label={chatHistoryAriaLabel}`, `tabIndex={0}` for keyboard scroll |
| Message input `<Textarea>` | `id="msg-input"`; `<Label htmlFor="msg-input" className="sr-only">{inputLabel}</Label>` |
| Send button | `aria-label={sendLabel}`, `disabled` when input empty, `aria-disabled="true"` when `isSending` |
| Attach button (placeholder) | `aria-label={attachLabel}`, `disabled` |
| NewConversationModal | Radix `Dialog` provides focus trap, `aria-modal="true"`, `role="dialog"` automatically; `DialogTitle` satisfies heading rule |
| Close button in modal | `aria-label={closeLabel}` |
| TypingIndicator | `aria-label={label}` on container; dots are `aria-hidden="true"`; motion gated by `prefers-reduced-motion` |
| Mobile back button | `aria-label={backToListLabel}` |
| Empty state CTA | `<button>` with meaningful label; focus managed when pane switches |

**Keyboard flows:**
1. `Tab` through conversation list → `Enter`/`Space` to open → focus moves to message input.
2. In input: `Enter` sends, `Shift+Enter` inserts newline.
3. `Tab` through header action buttons (search, notifications, info).
4. Modal: `Tab` cycles within dialog; `Escape` closes.
5. Mobile: back button returns focus to conversation list (use `ref` + `focus()` after pane switch).

---

### 8. Missing Primitive Flags

No `bun ui:add` calls needed. All required primitives (`dialog`, `textarea`, `avatar`, `badge`, `button`, `input`, `skeleton`) are confirmed present in `components/ui/`.

One potential shadcn candidate: `scroll-area` for the chat window and conversation list — `components/ui/scroll-area/` is confirmed present. Use `<ScrollArea>` from shadcn for the chat scroll container and conversation list to ensure consistent scrollbar styling across browsers.

---

## Implementation Plan

### Summary

Feature: 2-pane messaging screen (`/messages`). All roles. Mock-first (`social` service not yet shipped — decision 0017).
Branch: `feat/us-e10.1-messaging`. Lane: normal.
Done = AC-1 through AC-12 green + design-review gate pass + `bun build` clean.

Key decisions to surface to `fe-lead` for ADRs:
- **[ADR-FLAG]** SSE mock strategy: `setTimeout` simulation lives in `MockMessagingRepository.subscribe()` — when `social` SSE ships, replace with `EventSource` in a TanStack Query `useEffect`. Pattern already set by decision 0009; confirm SSE client lives in `presentation/` (not infra) since it is a browser-only concern.
- **[ADR-FLAG]** TanStack Query for messaging: `useInfiniteQuery` for `getMessages` (cursor-based) + `useMutation` with optimistic update for `sendMessage`. Confirm `queryClient.setQueryData` optimistic pattern is acceptable for chat (vs. socket-driven cache invalidation).
- **[ADR-FLAG]** Page route: `/messages` placed in `(shared)` route group (all roles share it). Confirm route guard — currently `(shared)` has `notifications` and `profile`; messaging requires valid session only.

---

### Phase 1 — Domain layer

**Goal:** Pure TypeScript entities, failure union, repository interface, use-cases. Zero framework deps.

**Files (layer: `features/messaging/domain/`):**

```
entities/
  conversation.entity.ts   — ConversationEntity
  message.entity.ts        — MessageEntity
  contact.entity.ts        — ContactEntity (used by NewConversationModal + mock)
failures/
  messaging.failure.ts     — MessagingFailure union
repositories/
  i-messaging.repository.ts — interface
use-cases/
  get-conversations.use-case.ts
  get-messages.use-case.ts
  send-message.use-case.ts
  create-conversation.use-case.ts
```

**Entity shapes (from design_src/edu/messaging.jsx + AC):**

`ConversationEntity`:
- `id: string`
- `type: 'direct' | 'group'`
- `name: string`
- `avatarInitials: string`
- `color: string` — token var name (`--edu-primary`, `--edu-success`, etc.)
- `lastMessage: string`
- `lastMessageTime: string`
- `unreadCount: number`
- `isOnline?: boolean` — direct only
- `memberCount?: number` — group only

`MessageEntity`:
- `id: string`
- `conversationId: string`
- `from: 'me' | 'other' | 'system'`
- `text: string`
- `time: string`
- `date: string` — used for date-divider grouping ("Hôm nay", "Hôm qua", "dd/mm/yyyy")
- `senderName?: string` — group 'other' messages
- `senderInitials?: string`
- `senderColor?: string`

`ContactEntity` (for NewConversationModal):
- `id: string`
- `name: string`
- `role: string`
- `avatarInitials: string`
- `color: string`
- `isOnline: boolean`

`MessagingFailure` union:
```ts
type MessagingFailure =
  | { type: 'load-conversations-failed'; cause?: string }
  | { type: 'load-messages-failed'; conversationId: string; cause?: string }
  | { type: 'send-message-failed'; cause?: string }
  | { type: 'create-conversation-failed'; cause?: string }
```

`IMessagingRepository` interface:
```ts
getConversations(): Promise<Result<ConversationEntity[], MessagingFailure>>
getMessages(conversationId: string, cursor?: string): Promise<Result<{ messages: MessageEntity[]; nextCursor?: string; hasMore: boolean }, MessagingFailure>>
sendMessage(conversationId: string, text: string): Promise<Result<MessageEntity, MessagingFailure>>
createConversation(contactIds: string[], name?: string): Promise<Result<ConversationEntity, MessagingFailure>>
getContacts(): Promise<Result<ContactEntity[], MessagingFailure>>
```

Note: `Result<T, E>` = `{ ok: true; value: T } | { ok: false; failure: E }` — use existing neverthrow/custom Result type pattern already in repo (check `features/auth/domain/` for pattern).

**Use-case rules:**
- `SendMessageUseCase.execute(conversationId, text)` — validates: text not empty, text.length <= 2000 → returns `send-message-failed` if invalid.
- `CreateConversationUseCase.execute(contactIds)` — validates: contactIds not empty → returns `create-conversation-failed` if empty.
- All other use-cases are thin orchestrators (call repo, return result).

**Test first (red → green):**
```
src/features/messaging/domain/use-cases/send-message.use-case.test.ts
  - ok: valid conversationId + text → delegates to repo → returns MessageEntity
  - fail: empty text → returns send-message-failed without calling repo
  - fail: text > 2000 chars → returns send-message-failed without calling repo

src/features/messaging/domain/use-cases/create-conversation.use-case.test.ts
  - ok: one contactId → delegates to repo → returns ConversationEntity
  - fail: empty contactIds array → returns create-conversation-failed without calling repo
```

Mock repository via `i-messaging.repository.ts` interface (jest/vitest mock). No HTTP in these tests.

**Done when:** unit tests green, `tsc --noEmit` clean on domain files.

---

### Phase 2 — Infrastructure layer (mock-first)

**Goal:** DTOs + mapper + mock repository returning design data. Real repository stub (calls would fail at runtime until `social` service ships).

**Files (layer: `features/messaging/infrastructure/`):**

```
dtos/
  conversation-response.dto.ts   — ConversationResponseDto (camelCase, mirrors BE contract)
  message-response.dto.ts        — MessageResponseDto
  conversations-list-response.dto.ts — { conversations: ConversationResponseDto[]; meta: { nextCursor?: string; hasMore: boolean } }
  contact-response.dto.ts        — ContactResponseDto
mappers/
  messaging.mapper.ts            — toConversationEntity(), toMessageEntity(), toContactEntity()
repositories/
  messaging.repository.ts        — MessagingRepository (import 'server-only'; real HTTP calls)
  mocks/
    messaging.mock.repository.ts — MockMessagingRepository (import 'server-only'; in-memory)
    fixtures.ts                  — MOCK_CONVERSATIONS, MOCK_MESSAGES, MOCK_CONTACTS (from messaging.jsx data)
```

**DTO shapes (camelCase, per decision api-integration rule):**
```ts
ConversationResponseDto: { id, type, name, avatarInitials, color, lastMessage, lastMessageTime, unreadCount, isOnline?, memberCount? }
MessageResponseDto: { id, conversationId, from, text, time, date, senderName?, senderInitials?, senderColor? }
```

**MockMessagingRepository:**
- `getConversations()`: returns fixtures data (DIRECT_CONVOS_BY_ROLE teacher as default, or all merged), `mockDelay(300)`.
- `getMessages(conversationId, cursor?)`: returns MOCK_MESSAGES[conversationId] paginated (page size 20), `mockDelay(200)`.
- `sendMessage(conversationId, text)`: appends to in-memory map, returns new MessageEntity, `mockDelay(100)`.
- `createConversation(contactIds, name?)`: creates new ConversationEntity, prepends to in-memory list, `mockDelay(200)`.
- `getContacts()`: returns MOCK_CONTACTS, `mockDelay(150)`.

**Real MessagingRepository** (shell only — methods throw `load-conversations-failed` with cause `'not-implemented'` until social service ships):
```ts
// Uses MESSAGING_EP from bootstrap/endpoint/messaging.endpoint.ts
// import 'server-only'
```

**Mapper test first (red → green):**
```
src/features/messaging/infrastructure/mappers/messaging.mapper.test.ts
  - toConversationEntity: maps all fields correctly; type='direct' for non-group dto
  - toMessageEntity: maps 'me'/'other'/'system' from field; optional fields nullable
  - toContactEntity: maps color, online, initials
```

**Mock repository integration test:**
```
src/features/messaging/infrastructure/repositories/mocks/messaging.mock.repository.test.ts
  - getConversations: returns non-empty array; each item has id, name, unreadCount
  - getMessages: cursor=undefined → first page, hasMore reflects fixture size; cursor provided → next page
  - sendMessage: appended message appears in subsequent getMessages call
```

**Done when:** mapper unit tests + mock repo integration tests green.

---

### Phase 3 — DI + Endpoints

**Goal:** Wire DI factories; define endpoint constants.

**Files (layer: `bootstrap/`):**

```
endpoint/
  messaging.endpoint.ts       — MESSAGING_EP constants
di/
  messaging.di.ts             — DI factories (import 'server-only')
```

**`messaging.endpoint.ts`:**
```ts
export const MESSAGING_EP = {
  conversations:        '/social/api/v1/conversations',
  conversationMessages: (id: string) => `/social/api/v1/conversations/${id}/messages`,
  sendMessage:          (id: string) => `/social/api/v1/conversations/${id}/messages`,
  createConversation:   '/social/api/v1/conversations',
  contacts:             '/social/api/v1/contacts',
} as const
```

**`messaging.di.ts`:**
```ts
import 'server-only'
// makeRepo() → USE_MOCK ? MockMessagingRepository : MessagingRepository(await createServerHttpClient())
export async function makeGetConversationsUseCase() { ... }
export async function makeGetMessagesUseCase() { ... }
export async function makeSendMessageUseCase() { ... }
export async function makeCreateConversationUseCase() { ... }
export async function makeGetContactsUseCase() { ... }  // needed by NewConversationModal initial SSR
```

**Update `bootstrap/di/index.ts`** to add `export * from "./messaging.di"`.

**No new tests in this phase** (DI factories are wiring glue; tested transitively via integration tests in phase 2 and E2E in phase 5). Confirm `import 'server-only'` present — pre-commit `tsc` will catch any client bundle leak.

**Done when:** `tsc --noEmit` clean; `bun build` passes without bundle errors.

---

### Phase 4 — Presentation layer + Page

**Goal:** Client components + RSC page. TanStack Query for data; optimistic send; URL deep-link; responsive layout.

**Files (layer: `features/messaging/presentation/` + `app/`):**

```
features/messaging/presentation/
  messaging-screen/
    messaging-screen.i-vm.ts        — ViewModel interface (server → client contract)
    messaging-screen.tsx            — 'use client'; top-level container
  conversation-list/
    conversation-list.tsx           — 'use client'; left pane (tabs + search + list)
  conversation-item/
    conversation-item.tsx           — 'use client'; single convo row (avatar, name, last msg, badge)
  chat-window/
    chat-window.tsx                 — 'use client'; right pane (role="log" aria-live="polite")
  chat-bubble/
    chat-bubble.tsx                 — 'use client'; own/other/system/divider variants
  typing-indicator/
    typing-indicator.tsx            — 'use client'; 3-dot bounce (motion-safe)
  new-conversation-modal/
    new-conversation-modal.tsx      — 'use client'; Dialog + contact search

app/[locale]/t/[tenant]/(app)/(shared)/messages/
  page.tsx                          — RSC; initial SSR fetch of conversations; passes to MessagingScreen
  actions.ts                        — 'use server'; sendMessageAction, createConversationAction
```

**ViewModel interface (`messaging-screen.i-vm.ts`):**
```ts
interface MessagingScreenVM {
  initialConversations: ConversationEntity[]   // SSR-fetched; hydrated into TanStack Query cache
  initialContacts: ContactEntity[]             // for NewConversationModal; SSR-fetched
}
```

**State design:**
- **Server state (TanStack Query):**
  - `useQuery(['messaging', 'conversations'])` — conversations list; seeded from `initialConversations` via `initialData`.
  - `useInfiniteQuery(['messaging', 'messages', conversationId])` — messages per conversation; cursor-based.
  - `useMutation` for `sendMessage` — optimistic: prepend `MessageEntity` to messages cache immediately; `onError` rollback via `context.previousMessages`.
  - `useMutation` for `createConversation` — optimistic: prepend `ConversationEntity` to conversations cache.
- **URL state:** `?conversation=<id>` searchParam → `useSearchParams()` → initial active conversation.
- **Local state (useState in MessagingScreen):**
  - `activeConversationId: string | null`
  - `activeTab: 'direct' | 'groups'`
  - `searchQuery: string`
  - `inputText: string`
  - `isModalOpen: boolean`
  - `mobilePane: 'list' | 'chat'` — for responsive < 768px (AC-10).

**Responsive layout:**
- `>= 768px`: flex row, left pane `w-[300px]` fixed, right pane `flex-1`.
- `< 768px`: `w-full`; show list or chat pane (toggle via `mobilePane` state); back button in chat header returns to list.

**Component details:**

`ChatBubble` variants:
- `from='me'`: right-aligned, `bg-primary text-primary-foreground`, border-radius `16px 16px 4px 16px`.
- `from='other'`: left-aligned, `bg-card border border-border`, border-radius `16px 16px 16px 4px`.
- `from='system'`: centered, `text-muted-foreground text-[11px]`, pill border.
- `type='divider'`: flex row with hr + date label `text-muted-foreground text-[11px] font-semibold`.

`TypingIndicator`: 3 divs with `animate-bounce` staggered via `animation-delay`; wrapped in `@media (prefers-reduced-motion: reduce) { animation: none }` CSS.

`ConversationList` tab toggle: underline tabs, `border-b-2 border-primary` active; `border-b-2 border-transparent` inactive.

**a11y (per AC-11):**
- Chat window scroll container: `role="log" aria-live="polite" aria-label={t('messaging.chatHistory')}`.
- Message input: `<label htmlFor="msg-input" className="sr-only">` + `id="msg-input"`.
- ConversationItem buttons: descriptive `aria-label={t('messaging.openConversation', { name })}`.
- Send button: `aria-label={t('messaging.send')}`.
- NewConversationModal: Radix `Dialog` (keyboard trap + focus management built in).
- Online dot: `aria-hidden="true"` (decorative) + tooltip or sr-only span "Đang online".
- Mobile back button: `aria-label={t('messaging.backToList')}`.

**Page RSC (`page.tsx`):**
```ts
// Calls makeGetConversationsUseCase + makeGetContactsUseCase (server-side, no client bundle leak)
// On failure → render ErrorBanner server-side (fallback: empty arrays + error flag in VM)
// Passes VM to MessagingScreen as props
// No actions.ts needed for reads — sendMessage/createConversation go through TanStack Query mutation → client-side mock repo calls
```

Note: since `social` service is mock-first and the mock repo runs server-side via DI, client mutations need a Server Action wrapper. **Server Actions (`actions.ts`)** wrap `makeSendMessageUseCase` and `makeCreateConversationUseCase`; TanStack Query `useMutation` calls these actions.

**Test first (Storybook interaction):**
```
features/messaging/presentation/messaging-screen/messaging-screen.stories.tsx
  Stories:
  - Loading: MessagingScreen with loading state (useQuery pending)
  - DirectTabPopulated: conversations list populated, first conversation active
  - GroupTabPopulated: groups tab active, group conversations listed
  - ChatWindowOpen: conversation selected, messages rendered with date dividers
  - SendMessage_Optimistic: interaction → type in input → click Send → optimistic bubble appears
  - EmptyState: no activeConversationId → empty-state placeholder shown
  - MobileView: viewport 375px → list pane shown; click conversation → chat pane shown
```

Each story uses mock data from `fixtures.ts` directly (no HTTP in stories).

**Done when:** all Storybook stories render without error; interaction tests pass; `tsc --noEmit` clean; no raw color in component files.

---

### Phase 5 — i18n keys

**Goal:** All UI strings in `messaging.*` namespace; vi source + en mirror; typed.

**Files:**
```
src/bootstrap/i18n/messages/vi.json   — add "messaging": { ... }
src/bootstrap/i18n/messages/en.json   — mirror
```

**Key catalog (`messaging.*`):**

```jsonc
"messaging": {
  "title": "Tin nhắn",
  "tabs": { "direct": "Trực tiếp", "groups": "Nhóm" },
  "search": { "placeholder": "Tìm kiếm...", "noResults": "Không tìm thấy", "noGroups": "Không có nhóm" },
  "newMessage": { "button": "Tin nhắn mới", "title": "Tin nhắn mới", "searchPlaceholder": "Tìm kiếm người dùng...", "suggestions": "Gợi ý" },
  "chat": {
    "members": "{{count}} thành viên",
    "online": "Đang online",
    "placeholder": "Nhập tin nhắn... (Enter để gửi)",
    "send": "Gửi",
    "attach": "Đính kèm",
    "history": "Lịch sử trò chuyện",
    "backToList": "Quay lại danh sách"
  },
  "openConversation": "Mở cuộc trò chuyện với {{name}}",
  "empty": {
    "title": "Chọn một cuộc trò chuyện",
    "subtitle": "Nhấn vào một cuộc trò chuyện để bắt đầu nhắn tin",
    "cta": "Bắt đầu cuộc hội thoại"
  },
  "errors": {
    "load-conversations-failed": "Không thể tải danh sách tin nhắn. Vui lòng thử lại.",
    "load-messages-failed": "Không thể tải tin nhắn. Vui lòng thử lại.",
    "send-message-failed": "Không thể gửi tin nhắn. Vui lòng thử lại.",
    "create-conversation-failed": "Không thể tạo cuộc hội thoại. Vui lòng thử lại."
  },
  "date": { "today": "Hôm nay", "yesterday": "Hôm qua" },
  "skeleton": { "loading": "Đang tải tin nhắn..." }
}
```

**Validation:** `bunx tsc --noEmit` catches any key mismatch after adding keys. Grep `\.tsx` files for Vietnamese diacritics (outside `*.stories.*` and `fixtures.ts`) must return empty.

**Done when:** vi + en keys added; tsc clean; no hardcoded strings in `.tsx` files.

---

### Phase 6 — Design-review gate + QA

**Goal:** `impeccable audit` pass; all AC verified; `bun build` green.

**Checklist:**
- `/impeccable audit` on MessagingScreen — check contrast on chat bubbles (own=primary on white fg ✓; other=card bg + text-primary; system=muted).
- Verify typing-indicator animation gated by `prefers-reduced-motion` (AC motion-safe).
- Keyboard nav: Tab through conversation list → Enter opens chat → Tab to input → type → Enter sends → Shift+Enter newline.
- Test mobile layout at 375px: only list or chat pane visible (AC-10).
- Verify `role="log" aria-live="polite"` on chat container (AC-11).
- SSE mock: with `NEXT_PUBLIC_USE_MOCK=true`, verify simulated incoming message appears in < 4s (setTimeout 3s + render).
- `bun vitest run` all phases green.
- `bun build` clean.

**Done when:** design-review gate pass + all AC items checked + `bun build` clean → story `implemented`.

---

### Risks, dependencies, open questions

**Risks:**
- TanStack Query `useInfiniteQuery` + optimistic mutation for chat is more complex than standard list. `fe-state-engineer` should own the query key structure and cache invalidation strategy.
- SSE mock via `setTimeout` in server-side mock repo — if presentation layer needs to subscribe to "incoming" messages client-side, the subscription must happen in a `useEffect` inside the presentation component (not in DI/infra). The mock repo's `subscribe()` method should not exist on the server — flag for `fe-state-engineer`.
- `(shared)` route group currently has no role-guard; all roles can access `/messages`. Confirm this matches RBAC (story says all roles allowed — but verify with `fe-lead` if any role is excluded).
- Chat window background (`#F8FAFF` in design) is not in `tokens.css`. Use `bg-muted/30` or add new token `--edu-chat-bg` before use. **[ADR-FLAG]** → needs token decision.

**Open questions:**
- `[OPEN QUESTION]` Does `getContacts()` come from `social` service or `iam` service (user directory)? If `iam`, endpoint is different and a separate DI factory may reference `iam` service instead of `social`.
- `[OPEN QUESTION]` SSE for real-time (AC-5): when `social` ships, will it be SSE (decision 0009 pattern) or WebSocket? Plan assumes SSE — confirm before real integration.
- `[OPEN QUESTION]` Optimistic sendMessage: if server mutation fails, should the failed bubble stay (with retry UI) or disappear on rollback? Design shows no retry state — plan is rollback (disappear). Confirm AC-4 intent.
- `[OPEN QUESTION]` Max message length (2000 chars) — assumed from common practice; confirm with BE/product.
- `[OPEN QUESTION]` `markConversationRead` (mentioned in Design Notes commands) — not in AC. Defer to follow-up US or include as silent side-effect of opening a conversation?

---

## State Architecture

Designed by `fe-state-engineer`. All state classified per repo model: server state via TanStack Query, URL state via `useSearchParams`, local interaction state via `useState`. No global client store introduced.

---

### 1. State Architecture Summary

**Key decisions:**

- **RSC is a shell — no data pre-fetch.** The `/messages` RSC page renders `MessagingScreen` with no initial data props. Chat is real-time by nature; SSR data stales the moment it reaches the client, adding hydration complexity for zero SEO benefit. All data loads client-side. ViewModel interface is minimal: no `initialConversations`.
- **Server Actions for all mutations.** Client components cannot read the `auth_token` httpOnly cookie. `createHttpClient()` requires an explicit token string. All writes (`sendMessage`, `createConversation`, `markRead`) go through `app/.../messages/actions.ts` Server Actions, which call `bootstrap/di/messaging.di.ts` (server-only; uses `createServerHttpClient()`). TanStack `useMutation` on the client invokes these Server Actions. This is identical to the discipline, attendance, and auth patterns in this repo.
- **`useInfiniteQuery` for messages.** Cursor-based pagination per the envelope contract (`meta.pagination.nextCursor` / `hasMore`). Each conversation gets its own independent cache entry keyed by `conversationId`. Load-older-messages scrolls up and triggers `fetchNextPage()`.
- **Optimistic `sendMessage`.** Prepend a `_pending: true` bubble to page 0 of the infinite query immediately; rollback to snapshot on error; `onSettled` invalidates to let the server-confirmed message replace the temp-id entry.
- **`activeConversationId` is dual-homed.** Read from `?conversation=<id>` URL param on mount; pushed to URL on every selection change. Deep-linkable + survives refresh. Mirrored to local `useState` so the component tree does not re-render synchronously on every `useSearchParams` read.
- **SSE mock lives in a client `useEffect`.** The simulated incoming-message timer fires inside `MessagingScreen` (or a `useMockIncomingMessage` hook) — never in `infrastructure/` or DI. When `social` SSE ships, replace the `setTimeout` body with an `EventSource` subscriber. This keeps SSE as a browser-only concern (decision 0009 pattern).

---

### 2. State Inventory

| # | State item | Type | Owner | TS shape | Reason |
|---|---|---|---|---|---|
| S1 | Conversations list | Server (TanStack `useQuery`) | `ConversationList` | `ConversationEntity[]` | Remote data; needs caching + refetch on focus |
| S2 | Messages per conversation | Server (TanStack `useInfiniteQuery`) | `ChatWindow` | `InfiniteData<MessagesPage>` | Cursor-paginated; grows with load-more |
| S3 | Contact search results (modal) | Server (TanStack `useQuery`) | `NewConversationModal` | `ContactEntity[]` | Enabled only when modal open + query >= 1 char |
| S4 | Send message mutation | Server (TanStack `useMutation`) | `ChatWindow` | `useMutation<MessageEntity, ApiError, SendInput, RollbackCtx>` | Optimistic update + rollback |
| S5 | Create conversation mutation | Server (TanStack `useMutation`) | `NewConversationModal` | `useMutation<ConversationEntity, ApiError, CreateInput, RollbackCtx>` | Optimistic prepend to conversations list |
| S6 | Mark read mutation | Server (TanStack `useMutation`) | `MessagingScreen` | `useMutation<void, ApiError, string>` | Fire-and-forget on conversation open |
| S7 | Active conversation ID | URL (`?conversation=`) + `useState` | `MessagingScreen` | `string \| null` | Deep-linkable; survives refresh |
| S8 | Active tab | URL (`?tab=`) | `MessagingScreen` via `useSearchParams` | `'direct' \| 'groups'` | Shareable; survives refresh |
| S9 | Search query (left pane) | Local `useState` | `ConversationList` | `string` | Client-side filter only; no API call |
| S10 | Message input text | Local `useState` | `ChatWindow` | `string` | Textarea value; cleared on successful send |
| S11 | Modal open flag | Local `useState` | `MessagingScreen` | `boolean` | UI-only toggle |
| S12 | Contact search query (modal) | Local `useState` | `NewConversationModal` | `string` | Drives S3 query; debounced 300 ms |
| S13 | Selected contacts (modal) | Local `useState` | `NewConversationModal` | `string[]` | Staged until confirm button |
| S14 | Mobile pane view | Local `useState` | `MessagingScreen` | `'list' \| 'chat'` | Responsive < 768px only; no URL needed |
| S15 | Typing indicator visible | Local `useState` | `ChatWindow` | `boolean` | Driven by SSE mock / real SSE event |

---

### 3. State Flow

```
RSC page.tsx (shell — no data fetch)
  └─ renders <MessagingScreen /> ('use client')
       │
       ├─ reads ?conversation= and ?tab= from useSearchParams (initial hydration)
       │    └─ sets activeConversationId + activeTab in useState
       │
       ├─ S1: useQuery(messagingKeys.conversations())
       │    └─ → getConversationsAction (Server Action)
       │         └─ makeGetConversationsUseCase() → MockRepo.getConversations()
       │
       ├─ S2: useInfiniteQuery(messagingKeys.messages(activeConversationId))
       │    └─ enabled: !!activeConversationId
       │    └─ → getMessagesAction (Server Action, passes cursor per page)
       │         └─ makeGetMessagesUseCase() → MockRepo.getMessages(id, cursor)
       │
       ├─ [user sends message] S4: useMutation → sendMessageAction
       │    onMutate → cancel S2 queries, snapshot, prepend optimistic bubble
       │    onError  → restore snapshot; show error toast (i18n key)
       │    onSettled→ invalidate S2 (messages) + S1 (conversations lastMessage)
       │
       ├─ [user creates conversation] S5: useMutation → createConversationAction
       │    onMutate → cancel S1, snapshot, prepend optimistic ConversationEntity
       │    onError  → restore S1 snapshot; show error toast
       │    onSettled→ invalidate S1; router.push(?conversation=<newId>)
       │
       ├─ [user selects conversation] setState(activeConversationId)
       │    + router.push(?conversation=id)   ← URL sync
       │    + S6 fire-and-forget markReadAction → onSettled: invalidate S1
       │
       └─ [SSE mock — useEffect in MessagingScreen]
            enabled: NEXT_PUBLIC_USE_MOCK && !!activeConversationId
            setTimeout(3000) → queryClient.setQueryData(S2 key, prepend incomingMsg)
                             → queryClient.setQueryData(S1 key, update lastMessage)
```

---

### 4. Query Key Hierarchy + Cache Policy

```typescript
// src/features/messaging/presentation/messaging-keys.ts
export const messagingKeys = {
  all:           ()                       => ['messaging']                                as const,
  conversations: ()                       => ['messaging', 'conversations']               as const,
  messages:      (conversationId: string) => ['messaging', 'messages', conversationId]   as const,
  contacts:      (query: string)          => ['messaging', 'contacts', query]            as const,
}
```

| Query | Key | `staleTime` | `gcTime` | `refetchOnWindowFocus` | Notes |
|---|---|---|---|---|---|
| `getConversations` | `messagingKeys.conversations()` | 30 000 ms | 120 000 ms | `true` | Override global 60 s default; list should feel fresh on window focus |
| `getMessages(id)` | `messagingKeys.messages(id)` | 10 000 ms | 60 000 ms | `false` | SSE mock updates cache directly; aggressive stale prevents double-refetch race with optimistic |
| `getContacts(query)` | `messagingKeys.contacts(query)` | 60 000 ms | 180 000 ms | `false` | Modal search; `enabled: isModalOpen && query.length >= 1` |

`useInfiniteQuery` config for messages:
- `getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined`
- `initialPageParam: undefined` (first page, no cursor)
- `fetchNextPage()` triggered by scroll-to-top of chat window (load older messages)

---

### 5. Invalidation Map

| Trigger | Keys invalidated | Strategy |
|---|---|---|
| `sendMessageAction` settled | `messagingKeys.messages(conversationId)` | `invalidateQueries` — server ID replaces temp-id |
| `sendMessageAction` settled | `messagingKeys.conversations()` | `invalidateQueries` — update lastMessage preview |
| `createConversationAction` settled | `messagingKeys.conversations()` | `invalidateQueries` — new convo appears at head |
| `markReadAction` settled | `messagingKeys.conversations()` | `invalidateQueries` — unreadCount drops to 0 |
| SSE mock `message.new` | `messagingKeys.messages(activeId)` | `setQueryData` — prepend to page 0 (no round-trip) |
| SSE mock `message.new` | `messagingKeys.conversations()` | `setQueryData` — update lastMessage + unreadCount |
| Window focus | `messagingKeys.conversations()` | Auto (`refetchOnWindowFocus: true`) |

---

### 6. Mutations & Optimistic Strategy

#### `sendMessage`

```
onMutate({ conversationId, text, tempId }):
  1. cancelQueries(messagingKeys.messages(conversationId))
  2. snapshot = getQueryData(messagingKeys.messages(conversationId))
  3. optimisticMsg = {
       id: tempId,               // 'opt-<uuid>'
       conversationId,
       from: 'me',
       text,
       time: <HH:mm now>,
       date: <today i18n label>,
       _pending: true            // drives muted opacity in ChatBubble
     }
  4. setQueryData(messages key, prepend optimisticMsg to pages[0].messages)
  5. return { snapshot }

onError(err, input, context):
  1. setQueryData(messages key, context.snapshot)    // rollback
  2. toast(t('messaging.errors.send-message-failed'))

onSettled():
  1. invalidateQueries(messagingKeys.messages(conversationId))
  2. invalidateQueries(messagingKeys.conversations())
```

`_pending: true` drives a CSS `opacity-60` on the bubble. After `onSettled` refetch, the server message (with real id, no `_pending`) replaces it.

#### `createConversation`

```
onMutate({ contactIds, name? }):
  1. cancelQueries(messagingKeys.conversations())
  2. snapshot = getQueryData(messagingKeys.conversations())
  3. optimisticConvo = {
       id: 'opt-<uuid>',
       type: contactIds.length > 1 ? 'group' : 'direct',
       name: name ?? <first contact name>,
       unreadCount: 0, lastMessage: '', lastMessageTime: <now>, _pending: true
     }
  4. setQueryData(conversations key, [optimisticConvo, ...old])
  5. return { snapshot }

onError(err, input, context):
  1. setQueryData(conversations key, context.snapshot)
  2. toast(t('messaging.errors.create-conversation-failed'))

onSettled(data):
  1. invalidateQueries(messagingKeys.conversations())
  2. if (data?.id) router.push(?conversation=<data.id>)
```

#### `markRead` (fire-and-forget)

No `onMutate` snapshot needed. `onSettled`: `invalidateQueries(messagingKeys.conversations())`. `onError`: silent (non-critical; count self-corrects on next refetch).

---

### 7. Async State Machine

#### Conversations list (left pane)

| State | Condition | UI treatment |
|---|---|---|
| Loading | `isLoading && !data` | 5 × `ConversationItemSkeleton` (pulse; avatar circle + 2 lines) — AC-1 |
| Error | `isError` | Error banner with retry; key `messaging.errors.load-conversations-failed`; retry only if `error.retryable === true` |
| Empty | `data.length === 0` | Empty state + CTA "Bắt đầu cuộc hội thoại" — AC-8 |
| Stale/refetching | `isFetching && data` | Subtle top-of-pane progress bar (non-blocking) |
| Success | `data.length > 0` | Render list filtered by `searchQuery` + `activeTab` |

#### Chat window (right pane)

| State | Condition | UI treatment |
|---|---|---|
| No selection | `!activeConversationId` | Centered placeholder: "Chọn một cuộc trò chuyện" — AC-8 |
| Loading first page | `isLoading` | 6 × `MessageBubbleSkeleton` alternating left/right |
| Loading more (scroll up) | `isFetchingNextPage` | Spinner pinned to top of message list |
| Error | `isError` | Error banner inside chat pane; key `messaging.errors.load-messages-failed`; `refetch()` button |
| Empty conversation | `pages[0].messages.length === 0` | "Chưa có tin nhắn — hãy bắt đầu cuộc trò chuyện" |
| Stale/refetching | `isFetching && data` | No visual indicator (SSE-driven; avoid flash) |
| Success | messages non-empty | Render bubbles; auto-scroll to bottom on `activeConversationId` change |

#### Error → failure → i18n key

| `MessagingFailure.type` | i18n key | Retry? |
|---|---|---|
| `load-conversations-failed` | `messaging.errors.load-conversations-failed` | Yes, if `error.retryable === true` |
| `load-messages-failed` | `messaging.errors.load-messages-failed` | Yes, if `error.retryable === true` |
| `send-message-failed` | `messaging.errors.send-message-failed` | No (user retypes) |
| `create-conversation-failed` | `messaging.errors.create-conversation-failed` | No |

TanStack retry: `retry: (count, error) => count < 1 && error.retryable === true`. Never retry 401/403.

---

### 8. Race Conditions & Resolution

| Race | Scenario | Resolution |
|---|---|---|
| Concurrent `sendMessage` + `getMessages` refetch | User sends; SSE mock fires simultaneously; `onSettled` invalidation triggers refetch while optimistic bubble is in cache | `cancelQueries` in `onMutate` stops in-flight refetch. Optimistic bubble stays until `onSettled` refetch completes and replaces temp-id. |
| Fast conversation switching | User clicks conversation A then B before A's messages load | `useInfiniteQuery` is keyed per `conversationId`; switching to B causes TanStack Query to abandon A's fetch automatically. Each convo has independent cache. |
| `createConversation` optimistic + list refetch race | Optimistic convo prepended; `onSettled` fires; server returns real convo with different id | `cancelQueries` prevents stale list landing over optimistic entry. `onSettled` `invalidateQueries` fetches authoritative list (temp-id entry replaced). |
| SSE `setQueryData` + `sendMessage` optimistic collide | Timer fires while user is mid-send | Both use functional updaters to `setQueryData`; React 18 batches them. `onSettled` invalidation reconciles against server truth. |
| Tab switch (Direct/Groups) during conversations fetch | Query in-flight; user changes tab | Conversations query is a single key (`messagingKeys.conversations()`); tab is client-side filter only. No refetch triggered — filter applied over cached data. |
| Mobile pane transition while messages loading | User taps conversation; `mobilePane` switches to `'chat'` before messages arrive | `mobilePane` is local state; chat pane renders with skeleton immediately. Query and UI state are independent. |

---

### 9. SSE Mock Simulation

The incoming-message simulation is a **client-only `useEffect`** — never in `infrastructure/` or DI.

```
// In MessagingScreen or useMockIncomingMessage(activeConversationId) hook
// 'use client' — browser only

useEffect(() => {
  if (!process.env.NEXT_PUBLIC_USE_MOCK) return
  if (!activeConversationId) return

  const timer = setTimeout(() => {
    const incomingMsg: MessageEntity = {
      id: `sse-mock-${Date.now()}`,
      conversationId: activeConversationId,
      from: 'other',
      text: <fixture text for this conversationId>,
      time: <HH:mm now>,
      date: <today i18n label>,
      senderName: <fixture contact name>,
      senderInitials: <initials>,
      senderColor: <color>,
    }

    // Prepend to page 0 of the infinite messages cache
    queryClient.setQueryData(
      messagingKeys.messages(activeConversationId),
      (old: InfiniteData<MessagesPage> | undefined) => {
        if (!old) return old
        return {
          ...old,
          pages: [
            { ...old.pages[0], messages: [incomingMsg, ...old.pages[0].messages] },
            ...old.pages.slice(1),
          ],
        }
      }
    )

    // Update conversations lastMessage + unreadCount
    queryClient.setQueryData(
      messagingKeys.conversations(),
      (old: ConversationEntity[] | undefined) =>
        old?.map(c =>
          c.id === activeConversationId
            ? { ...c, lastMessage: incomingMsg.text, lastMessageTime: incomingMsg.time }
            : c
        )
    )
  }, 3000)

  return () => clearTimeout(timer)
}, [activeConversationId, queryClient])
```

**Migration path to real SSE (decision 0009):** replace `setTimeout(callback, 3000)` with `new EventSource(SSE_EP.messaging)`. Subscribe to `message.new` events. Call identical `setQueryData` logic. No other changes needed.

---

### 10. ADR Flags (next available: 0041)

| ADR | Subject | Decision needed |
|---|---|---|
| 0041 | SSE subscription location | Formally record that SSE client (mock timer + future `EventSource`) lives in `presentation/` `useEffect`, not in `infrastructure/`. Rationale: SSE is browser-only; `infrastructure/` is server-only. Needed before `social` service integration. |
| 0042 | `getContacts()` service ownership | Contacts for `NewConversationModal` may come from `iam` (user directory) rather than `social`. If `iam`, the endpoint and DI factory are separate from `MessagingRepository`. Defer to when `social` ships; mock-first uses a unified mock. |
