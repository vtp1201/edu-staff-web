# Component Architecture — US-E10.4 Messaging Enhancements (DR-008)

**Produced by**: fe-component-architect  
**Story packet**: `docs/stories/epics/E10-communications/US-E10.4-messaging-enhancements/`  
**Spec authority**: `spec.md` §7, §9  
**Design source**: `design_src/edu/messaging.jsx` lines 411–1494  
**Rule references**: decision 0026 (component placement), `.claude/rules/design-system.md`, `.claude/rules/accessibility.md`

---

## 1. Architecture Summary

### Feature Scope

US-E10.4 is **additive only** on top of the implemented US-E10.1 base. No new feature module, no route change. All new components live inside `src/features/messaging/presentation/` except the `MessageContextMenu` primitive which extends `components/ui/dropdown-menu/`.

### New vs Extended

| Component | Status |
|---|---|
| `CreateGroupModal` | NEW — `features/messaging/presentation/create-group-modal/` |
| `GroupInfoPanel` | NEW — `features/messaging/presentation/group-info-panel/` |
| `MemberSelectPanel` | NEW sub-component — lives inside `group-info-panel/` folder |
| `PinnedMessagesSection` | NEW sub-component — inside `group-info-panel/` folder |
| `MemberRow` | NEW sub-component — inside `group-info-panel/` folder |
| `MessageContextMenu` | EXTEND — wraps `components/ui/dropdown-menu/` (not forked); custom keyboard nav + viewport clamping added via wrapper in `features/messaging/presentation/message-context-menu/` |
| `ChatBubble` | EXTEND — add `replyTo?`, `isDeleted?`, `isPinned?`, `highlightId?`, `onContextMenu?` props |
| `ChatWindow` | EXTEND — add context-menu state, reply state, group-info-panel state, `onOpenGroupInfo?`, `selfIsGroupAdmin?`, scroll-to-message ref map |
| `ConversationList` | EXTEND — add Groups tab empty state (rich variant), create-group CTA strip, `onCreateGroup?` callback |
| `ConversationItem` | EXTEND — add group-specific layout: member-count chip, `lastSenderName?`, square avatar variant, no online dot for groups |
| `MessagingScreen` | EXTEND — wire `createGroupModal` open state, new server actions, `selfIsGroupAdmin` per-conversation map |

### Missing Primitives (require `bun ui:add`)

`context-menu` is **not present** in `components/ui/`. However, per spec §7 the design calls for viewport-clamped positioning and custom keyboard handling that `DropdownMenu` (present) can provide just as well when triggered programmatically. The decision: use `dropdown-menu` as the backing primitive, rendered via an open/close state set by the `contextmenu` + long-press event on `ChatBubble`. No new shadcn primitive installation needed. This avoids introducing a separate `context-menu` primitive when `dropdown-menu` already provides the full Radix Menu primitives (keyboard nav, focus trap, `role="menu"`, `role="menuitem"`, `aria-disabled`).

If the engineer finds `DropdownMenu` insufficient for the viewport-clamping pattern (absolute positioning at click coordinates), flag to `fe-lead` — `bun ui:add context-menu` is the fallback and does not require an ADR.

### Key Design Decisions

1. `MemberSelectPanel` is reused inside both `CreateGroupModal` step 2 and the add-member flow in `GroupInfoPanel`. Rather than copying, it is a named sub-component in the `group-info-panel/` folder and imported by `CreateGroupModal`. Since it is used by two components in the same feature (not two different screens), it stays feature-local — no promotion to `components/shared/` unless a third screen needs it.

2. `ReplyStrip` is NOT a separate component file. It is a conditional section rendered inside `ChatWindow`'s composer area, controlled by `replyState` local state. This matches spec §7 guidance.

3. `GroupInfoPanel` is a `Sheet`-like panel (uses `components/ui/sheet/` as the backing primitive — already present) rather than a full dialog, to support the slide-in from right animation and backdrop blur per TR-009.

4. The delete confirm dialog uses the existing `components/ui/alert-dialog/` primitive (already present). No new primitive needed.

5. Leave-group confirmation uses the same `alert-dialog` primitive via a separate controlled open state.

6. The quoted bubble block (reply display) is a sub-section of `ChatBubble` — not a separate component. One component, one location.

---

## 2. Component Tree

```
app/[locale]/(dashboard)/messages/page.tsx          [RSC — server component]
  └── MessagingScreen                                ['use client' — EXTENDED container]
        ├── ConversationList                         ['use client' — EXTENDED container]
        │     └── ConversationItem (×N)              [presentational — EXTENDED]
        │           └── GroupConversationItem        [presentational sub-layout, inside ConversationItem]
        ├── ChatWindow                               ['use client' — EXTENDED container]
        │     ├── ChatBubble (×N)                   [presentational — EXTENDED]
        │     │     └── QuotedBlock                 [presentational sub-section inside ChatBubble]
        │     ├── DateDivider (×N)                  [presentational — existing, unchanged]
        │     ├── TypingIndicator                   [presentational — existing, unchanged]
        │     ├── LoadingSkeletonBubbles             [presentational — NEW inline, inside ChatWindow]
        │     ├── ReplyStrip                        [presentational — NEW inline section of ChatWindow composer]
        │     └── MessageContextMenu                ['use client' — NEW wrapper, feature-local]
        │           └── DropdownMenu (ui/dropdown-menu) [existing primitive backing]
        ├── GroupInfoPanel                           ['use client' — NEW container]
        │     ├── MemberRow (×N)                    [presentational — NEW sub-component]
        │     ├── PinnedMessagesSection              [presentational — NEW sub-component]
        │     │     └── PinnedMessageRow (×N)       [presentational — NEW sub-component]
        │     └── MemberSelectPanel                 ['use client' — NEW sub-component, shared with CreateGroupModal]
        │           └── MemberChip (×N)             [presentational — NEW sub-component]
        ├── CreateGroupModal                         ['use client' — NEW compound]
        │     ├── StepIndicator                     [presentational — NEW sub-component]
        │     ├── Step1Form                         ['use client' — NEW sub-component]
        │     │     ├── GroupAvatarPreview           [presentational — NEW sub-component]
        │     │     └── ColorSwatchPicker           [presentational — NEW sub-component]
        │     ├── Step2MemberSelect                 ['use client' — NEW sub-component]
        │     │     └── MemberSelectPanel           [reused from group-info-panel/]
        │     └── Dialog (ui/dialog)                [existing primitive backing]
        ├── NewConversationModal                    ['use client' — existing, unchanged]
        └── AlertDialog (ui/alert-dialog)           [existing primitive — delete-confirm + leave-confirm]
```

**Legend**:
- `[RSC]` — React Server Component; no `'use client'`; maps ViewModel from use-case output into presentation props
- `['use client' — container]` — manages TanStack Query or multi-child local state; data flows DOWN via props
- `['use client' — compound]` — multi-step local state only (no TQ); compound of smaller pieces
- `[presentational]` — stateless; receives typed props; no side effects; can be tested in isolation
- `[NEW]` — does not exist yet
- `[EXTENDED]` — exists; new props added additively; never forked
- `[existing primitive backing]` — shadcn/ui primitive from `components/ui/`; used as-is

---

## 3. ViewModel + Prop Interfaces

### 3.1 Extended `MessagingScreenVM` (additions to `messaging-screen.i-vm.ts`)

The existing `MessagingScreenVM` stays unchanged. The `MessagingScreenActions` interface gets new server action signatures. The RSC page (`app/[locale]/(dashboard)/messages/page.tsx`) passes these into `MessagingScreen`.

```ts
// Additions to MessagingScreenActions in messaging-screen.i-vm.ts

export type CreateGroupResult =
  | { ok: true; value: ConversationEntity }
  | { ok: false; errorKey: MessagingFailure["type"] };

export type GroupInfoResult =
  | { ok: true; value: GroupEntity }
  | { ok: false; errorKey: MessagingFailure["type"] };

export type MutationResult =
  | { ok: true }
  | { ok: false; errorKey: MessagingFailure["type"] };

// Append to MessagingScreenActions:
createGroupAction: (input: CreateGroupInput) => Promise<CreateGroupResult>;
getGroupInfoAction: (groupId: string) => Promise<GroupInfoResult>;
updateGroupAction: (groupId: string, patch: UpdateGroupPatch) => Promise<GroupInfoResult>;
addGroupMembersAction: (groupId: string, memberIds: string[]) => Promise<MutationResult>;
removeGroupMemberAction: (groupId: string, userId: string) => Promise<MutationResult>;
leaveGroupAction: (conversationId: string) => Promise<MutationResult>;
deleteGroupAction: (groupId: string) => Promise<MutationResult>;
pinMessageAction: (conversationId: string, messageId: string) => Promise<MutationResult>;
deleteMessageAction: (conversationId: string, messageId: string) => Promise<MutationResult>;

// Input types (pure TS, safe for presentation layer — no infrastructure import)
export type CreateGroupInput = {
  name: string;
  description?: string;
  kind: GroupKind;
  color: string;
  memberIds: string[];
};

export type UpdateGroupPatch = {
  name?: string;
  description?: string;
  color?: string;
};
```

### 3.2 `CreateGroupModalIVm` — `create-group-modal/create-group-modal.i-vm.ts`

```ts
import type { ContactEntity } from "@/features/messaging/domain/entities/contact.entity";
import type { GroupKind } from "@/features/messaging/domain/entities/group.entity";

export type GroupKindOption = {
  value: GroupKind;
  /** i18n key, e.g. "messaging.group.typeClass" */
  labelKey: string;
};

/** Swatch color entry for the 8-swatch palette. */
export type ColorSwatch = {
  /** CSS token reference, e.g. "var(--edu-primary)" or "#6366F1". Must exist in tokens.css or be a raw hex from the design palette. */
  cssValue: string;
  /** Accessible label for screen readers, e.g. "Xanh lam" — injected by RSC via i18n. */
  label: string;
};

/** Step 1 sub-ViewModel (group info). */
export interface Step1Vm {
  kindOptions: GroupKindOption[];
  colorSwatches: ColorSwatch[];
}

/** Step 2 sub-ViewModel (member selection). */
export interface Step2Vm {
  /** All contacts available to add. Filtered client-side by search. */
  contacts: ContactEntity[];
}

/** Step indicator item. */
export interface StepItem {
  /** 1-based index. */
  step: number;
  /** i18n key for label, e.g. "messaging.group.stepInfo". */
  labelKey: string;
  state: "active" | "done" | "inactive";
}

export interface CreateGroupModalIVm {
  step1: Step1Vm;
  step2: Step2Vm;
}

/** Props for the CreateGroupModal client component. */
export interface CreateGroupModalProps extends CreateGroupModalIVm {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when the form is submitted with valid data. MessagingScreen owns the mutation. */
  onSubmit: (input: CreateGroupInput) => void;
  /** True while the createGroup mutation is in-flight (optimistic indicator). */
  isSubmitting?: boolean;
}
```

### 3.3 `GroupInfoPanelIVm` — `group-info-panel/group-info-panel.i-vm.ts`

```ts
import type { GroupEntity, GroupMember, PinnedMessage } from "@/features/messaging/domain/entities/group.entity";
import type { MessagingFailure } from "@/features/messaging/domain/failures/messaging.failure";

export interface GroupInfoPanelIVm {
  groupId: string;
  /** Pre-fetched initial data from RSC (avoids client-side waterfall on panel open). */
  initialGroupData?: GroupEntity;
  /** The userId of the currently authenticated user. Injected by RSC page. */
  currentUserId: string;
  /** True if the current user has role 'admin' in this group. */
  selfIsGroupAdmin: boolean;
  /** Contacts available for add-member search. */
  availableContacts: import("@/features/messaging/domain/entities/contact.entity").ContactEntity[];
}

export interface GroupInfoPanelProps extends GroupInfoPanelIVm {
  open: boolean;
  onClose: () => void;
  /** Scroll the chat window to a specific messageId. */
  onScrollToMessage: (messageId: string) => void;
  /** Server action refs — passed in by MessagingScreen. */
  onUpdateGroup: (groupId: string, patch: UpdateGroupPatch) => Promise<GroupInfoResult>;
  onAddMembers: (groupId: string, memberIds: string[]) => Promise<MutationResult>;
  onRemoveMember: (groupId: string, userId: string) => Promise<MutationResult>;
  onLeaveGroup: (conversationId: string) => Promise<MutationResult>;
  onDeleteGroup: (groupId: string) => Promise<MutationResult>;
  /** Needed to call leaveGroup by conversationId. */
  conversationId: string;
}

/** Sub-type for a MemberRow. */
export interface MemberRowProps {
  member: GroupMember;
  isSelf: boolean;
  selfIsAdmin: boolean;
  onRemove?: (userId: string) => void;
}

/** Sub-type for the pinned messages section. */
export interface PinnedMessagesSectionProps {
  messages: PinnedMessage[];
  onScrollToMessage: (messageId: string) => void;
}

export interface PinnedMessageRowProps {
  message: PinnedMessage;
  onScrollToMessage: (messageId: string) => void;
}
```

### 3.4 `MessageContextMenuIVm` — `message-context-menu/message-context-menu.i-vm.ts`

```ts
/** Describes one item in the context menu. */
export interface ContextMenuItem {
  id: "reply" | "pin" | "copy" | "delete";
  /** i18n label key. */
  labelKey: string;
  /** If true, rendered at 0.4 opacity with `aria-disabled="true"`. No action on click/Enter. */
  disabled: boolean;
  /** i18n key for the hint shown below a disabled item. Null when item is enabled. */
  hintKey?: string;
  /** Renders with error color + top separator. */
  isDanger?: boolean;
}

export interface MessageContextMenuIVm {
  items: ContextMenuItem[];
  /** Viewport coordinates (from contextmenu or long-press event). Used for absolute positioning. */
  position: { x: number; y: number };
  /** The messageId this menu targets. */
  targetMessageId: string;
}

export interface MessageContextMenuProps extends MessageContextMenuIVm {
  open: boolean;
  onClose: () => void;
  onReply: (messageId: string) => void;
  onPin: (messageId: string) => void;
  onCopy: (messageId: string) => void;
  /** Opens the delete AlertDialog — MessagingScreen or ChatWindow manages the confirm dialog state. */
  onRequestDelete: (messageId: string) => void;
}
```

### 3.5 `ReplyState` — local state type inside `ChatWindow`

This is NOT an i-vm.ts contract; it is a local state type co-located with ChatWindow. The `fe-state-engineer` will confirm placement. Defined here for contract clarity.

```ts
// Inside chat-window/ folder — not a separate i-vm.ts; local to ChatWindow

export type ReplyState = {
  messageId: string;
  senderName: string;
  /** Single-line excerpt — truncated at presentation layer. */
  excerpt: string;
} | null;
```

### 3.6 Extended `ChatBubbleProps` — additions to `chat-bubble.tsx`

```ts
// Additions to the existing ChatBubbleProps interface (EXTEND, not replace):

export interface ChatBubbleProps {
  // --- EXISTING (unchanged) ---
  message: MessageEntity;
  isGroup: boolean;
  showSender: boolean;

  // --- NEW ADDITIVE PROPS ---
  /** When set, renders a quoted block above the message text. */
  replyTo?: {
    messageId: string;
    senderName: string;
    excerpt: string;
  };
  /** When true, replaces text with the deleted-message placeholder string. */
  isDeleted?: boolean;
  /** When true, renders the pin indicator (pinned star icon, small, top-right of bubble). */
  isPinned?: boolean;
  /**
   * When this messageId matches the highlight target, the bubble plays the 3-second
   * CSS highlight animation (gated by @media prefers-reduced-motion: no-preference).
   * Passed from ChatWindow scroll-to-message state.
   */
  isHighlighted?: boolean;
  /**
   * Fires on contextmenu event (right-click) and on long-press (touch).
   * ChatWindow reads this and opens MessageContextMenu.
   */
  onContextMenu?: (event: { messageId: string; x: number; y: number }) => void;
  /** Fires when the user clicks the quoted block. Triggers scroll-to-original. */
  onClickReply?: (messageId: string) => void;
}
```

### 3.7 Extended `ChatWindowProps` — additions to `chat-window.tsx`

```ts
// Additions to the existing ChatWindowProps interface (EXTEND, not replace):

export interface ChatWindowProps {
  // --- EXISTING (unchanged) ---
  conversation: ConversationEntity;
  messages: MessageEntity[];
  isLoading: boolean;
  onSend: (text: string, replyTo?: ReplyState) => void;
  isTyping?: boolean;
  onBack?: () => void;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;

  // --- NEW ADDITIVE PROPS ---
  /** True when this is a group conversation AND the current user is group admin. */
  selfIsGroupAdmin?: boolean;
  /** Fires when the user clicks the group name/header. Opens GroupInfoPanel. */
  onOpenGroupInfo?: () => void;
  /** messageId → DOM ref — populated by ChatWindow to enable scroll-to-message. */
  messageRefMap?: React.MutableRefObject<Map<string, HTMLDivElement>>;
  /** When set, scrolls to and highlights this messageId after render. */
  scrollToMessageId?: string | null;
  onScrollToMessageDone?: () => void;
}
```

### 3.8 Extended `ConversationListProps` — additions to `conversation-list.tsx`

```ts
// Additions to ConversationListProps (EXTEND):

/** Fires when the user clicks "+ Tạo nhóm" CTA or the empty-state create button. */
onCreateGroup?: () => void;
```

### 3.9 Extended `ConversationItemProps` — additions to `conversation-item.tsx`

Current `ConversationItem` reads `ConversationEntity`. The entity gains `lastSenderName?` (per spec §4.3 additive field). The component uses this field conditionally for the group preview line ("Sender: preview…"). No new prop needed beyond what flows from the entity — the existing `conversation: ConversationEntity` prop already carries the extended fields. No prop interface change required for `ConversationItem`.

---

## 4. State Ownership (Contract Level)

The following table captures what is a **controlled prop** (owned by parent, passed down) vs **internal UI state** (component-private, `useState`). State-store design (TanStack Query keys, mutation hooks, optimistic patterns) is delegated to `fe-state-engineer`.

| State | Owner | Mechanism | Controlled by |
|---|---|---|---|
| `conversations` list | `MessagingScreen` | TanStack Query `['messaging','conversations']` | parent prop pattern |
| `messages` for active conversation | `MessagingScreen` | TanStack Query `['messaging','messages',id]` | passed to ChatWindow |
| `isModalOpen` (NewConversationModal) | `MessagingScreen` | `useState<boolean>` | internal |
| `isCreateGroupModalOpen` | `MessagingScreen` | `useState<boolean>` | internal — passed as controlled `open` to CreateGroupModal |
| `activeConversationId` | `MessagingScreen` | `useState<string|null>` | internal |
| `mobilePane` | `MessagingScreen` | `useState<"list"|"chat">` | internal |
| Group info panel open + active groupId | `MessagingScreen` | `useState<{ open: boolean; groupId: string|null; conversationId: string|null }>` | internal — passed as controlled props to GroupInfoPanel + ChatWindow |
| `contextMenu` (open + position + targetMessageId) | `ChatWindow` | `useState<{ open: boolean; position: {x,y}; targetMessageId: string|null }>` | internal |
| `replyState` | `ChatWindow` | `useState<ReplyState>` | internal — passed to ReplyStrip (inline) and to `onSend` callback |
| `scrollToMessageId` | `MessagingScreen` or `ChatWindow` | `useState<string|null>` | controlled prop from MessagingScreen |
| `deleteConfirmOpen` + `deleteTargetId` | `ChatWindow` | `useState` | internal — AlertDialog controlled |
| `leaveConfirmOpen` | `GroupInfoPanel` | `useState<boolean>` | internal |
| `deleteGroupConfirmOpen` | `GroupInfoPanel` | `useState<boolean>` | internal (inline confirm, not a dialog) |
| `groupInfoEditMode` | `GroupInfoPanel` | `useState<boolean>` | internal |
| `groupData` (remote) | `GroupInfoPanel` | TanStack Query `['messaging','group',groupId]` | TQ-owned; initial data passed from parent |
| Modal step (1 or 2) | `CreateGroupModal` | `useState<1|2>` | internal |
| Step 1 form values | `CreateGroupModal` | `useForm` (react-hook-form + zod) | internal |
| Step 2 selected member IDs | `CreateGroupModal` | `useState<string[]>` | internal |
| `addMemberPanelOpen` | `GroupInfoPanel` | `useState<boolean>` | internal |
| Member search query (step 2, add-member) | `MemberSelectPanel` | `useState<string>` | internal |

**Hand-off note to `fe-state-engineer`**: The key decisions that need confirmation are:

1. Where `scrollToMessageId` state should live — MessagingScreen or ChatWindow. If ChatWindow handles it independently (via direct scroll on `GroupInfoPanel.onScrollToMessage`), no prop threading is needed. Recommend ChatWindow owns a `highlightedMessageId` internal state with a clear-after-3s mechanism.

2. Whether `GroupInfoPanel` calls `getGroupInfoAction` via a TQ query internally (lazy-on-open), or whether MessagingScreen pre-fetches and passes down. Given the panel opens on user interaction, lazy-on-open inside `GroupInfoPanel` is cleaner. The `initialGroupData` prop from the parent (if available) can seed `initialData` for TQ.

3. The optimistic patterns for `createGroup` (prepend), `deleteMessage` (soft-delete), and `pinMessage` (set isPinned) must use `onMutate` / `onError` / `onSettled` per spec §8 TR-035.

---

## 5. Composition and Variant Strategy

### 5.1 `CreateGroupModal` — Multi-Step Compound

Backed by `components/ui/dialog/` (already present). Internal compound:

```
CreateGroupModal (Dialog root + controlled open/onOpenChange)
  ├── StepIndicator (pure presentational — receives StepItem[] array)
  ├── Step1Form (useForm internally; fires onNext with validated values)
  │     ├── GroupAvatarPreview (pure — receives name: string, color: string)
  │     └── ColorSwatchPicker (pure — receives swatches: ColorSwatch[], value, onChange)
  └── Step2MemberSelect (receives MemberSelectPanel + selected IDs)
        └── MemberSelectPanel (reused; receives contacts, selectedIds, onToggle)
              └── MemberChip (pure — name, initials, color, onRemove)
```

The `Dialog` from `components/ui/dialog/` provides `aria-modal="true"`, `role="dialog"`, focus trap, and Escape key close automatically via Radix. The `aria-labelledby` must point to the step title element (step 1: `messaging.group.stepInfo`, step 2: `messaging.group.stepMembers`) — this is a Radix `DialogTitle` prop.

Step transition: `useState<1|2>` inside `CreateGroupModal`. No animation library needed — a simple conditional render of Step1Form vs Step2MemberSelect suffices. Focus must move to the step 2 title on transition (AC-020-4).

### 5.2 `GroupInfoPanel` — Sheet-Backed Slide-In

Backed by `components/ui/sheet/` (already present). The `Sheet` primitive from shadcn provides `side="right"`, focus trap, `role="dialog"`, Escape key close, and backdrop. Custom animation (translateX 100%→0, 0.22s ease-out) is expressed as Tailwind CSS class on the Sheet content — gated by `@media (prefers-reduced-motion: no-preference)` per TR-031.

The Sheet content at 320px (`w-[320px]`) becomes `w-full` at mobile breakpoint (`md:w-[320px] w-full`) per TR-034.

Edit mode uses `useState<boolean>` inside GroupInfoPanel — toggles name/desc between display text and `<input>` / `<textarea>`. Save/Cancel are plain buttons. No additional primitive needed.

The inline delete-group confirmation (TR-012) uses `useState<boolean>(deleteGroupConfirmOpen)` — replaces the footer buttons with the two-step confirm inline (not a separate dialog). This is distinct from the leave-group confirmation which uses the `AlertDialog` primitive.

### 5.3 `MessageContextMenu` — DropdownMenu-Backed Custom Menu

The `DropdownMenu` primitive in `components/ui/dropdown-menu/` provides `role="menu"`, `role="menuitem"`, Arrow navigation, Escape close, and `aria-disabled` support — all required by TR-027 and UC-018.

The wrapper component `MessageContextMenu` (feature-local at `features/messaging/presentation/message-context-menu/`) handles:
- Converting the right-click / long-press event coordinates into absolute positioning
- Viewport clamping (adjusting x/y so the menu never overflows screen edges)
- Building the `ContextMenuItem[]` array from message entity state and `selfIsGroupAdmin`
- Passing `align="start"` and positioning to the DropdownMenuContent

The backing `DropdownMenu` is opened programmatically via a controlled `open` prop — the trigger element is a zero-size invisible div positioned at the click coordinates (`style={{ position: 'fixed', left: x, top: y }}`). This is the canonical pattern for position-anchored menus using Radix.

Long-press detection: implement via `onPointerDown` / `onPointerUp` / `onPointerCancel` timer inside `ChatBubble`. A 500ms threshold fires the same callback as `onContextMenu`. No library dependency needed. The native context menu is suppressed via `onContextMenu={e => e.preventDefault()}` on the bubble div.

### 5.4 `ConversationItem` — Conditional Group Layout

The existing `ConversationItem` renders from `ConversationEntity`. For group conversations (`type === 'group'`), the component conditionally renders:
- Rounded-square avatar (radius 12 via Tailwind `rounded-xl`) instead of full circle
- Member count chip (users icon + count) at bottom of the avatar section
- `lastSenderName` prepended to `lastMessage` preview ("Sender: preview…")
- `var(--edu-error)` unread badge background (instead of primary for DMs — the design-spec differentiates these)
- No online dot

This is a `from === 'group'` conditional branch **inside the existing** `ConversationItem`. No fork, no new component, no duplication.

### 5.5 `ChatBubble` — Quote Block and Deleted State

The existing `ChatBubble` receives the extended props. Two new rendering branches:

1. **Quoted block** (`replyTo != null, isDeleted !== true`): renders above the message text div. For `isMe`: `rgba(255,255,255,0.18)` background + `rgba(255,255,255,0.5)` left border. For `!isMe`: `var(--edu-bg)` background + 4px left border `var(--edu-primary)`. The quoted block is a `<button role="button">` to satisfy the "clickable" requirement (AC-012-5) — fires `onClickReply(replyTo.messageId)`. Note: the `rgba(255,255,255,0.18)` value for dark-mode compatibility must be verified against `src/app/tokens.css` — if no equivalent token exists, flag an ADR (Open Item §14 item 3 of spec).

2. **Deleted state** (`isDeleted === true`): replaces all other content with `messaging.deleteDialog.deletedLabel` in `text-muted-foreground italic` style. The bubble wrapper class remains (to preserve alignment), but `text`, `replyTo`, `isPinned` are all suppressed.

3. **Highlighted state** (`isHighlighted === true`): a CSS class `animate-highlight` (3s, defined via `@keyframes` in `globals.css`, gated by `@media (prefers-reduced-motion: no-preference)`) is conditionally appended to the bubble content div. This requires **no new token** — the animation uses an opacity/background flash from `pColor/20` → transparent.

### 5.6 `MemberSelectPanel` — Shared Sub-Component

Used by both `CreateGroupModal` (step 2) and `GroupInfoPanel` (add-member flow). Location: `features/messaging/presentation/group-info-panel/member-select-panel.tsx`. It is NOT in `components/shared/` because both consumers are within the same feature; decision 0026 criterion for `shared/` is "reused by ≥2 screens", not ≥2 components.

API: `contacts: ContactEntity[]`, `selectedIds: string[]`, `onToggle: (userId: string) => void`, `searchPlaceholderKey: string`. The parent owns `selectedIds` state.

### 5.7 Design-System Pattern Reuse

| UI element | Pattern | Source |
|---|---|---|
| Group avatar (list + panel) | `bg = groupColor + '20'`, initials, radius 12 | design-system StatCard icon box pattern adapted |
| Status badge "Admin" | `StatusBadge` from `components/shared/status-badge/` with `tone="error"` | existing shared component — no new badge variant |
| Step indicator dots | Presentational sub-component, pColor for active, success for done | new, follows design-spec §TR-006 |
| Member chips | presentational chip (mini avatar + name + X) — feature-local | no shared component; pattern only in this feature |
| Skeleton bubbles (TR-023) | `Skeleton` from `components/ui/skeleton/` | existing primitive |
| Reply strip left border | 4px solid `var(--edu-primary)` | design-system token (already exists) |
| Leave/delete buttons | `Button` variant `ghost` (leave) and custom danger class using `bg-edu-error-light text-edu-error` | design-system tokens; no new variant needed |

**Token concern**: the "danger" button for delete-group / confirm-delete uses `bg-edu-error-light text-edu-error`. Verify these tokens exist in `src/app/tokens.css`. If `--edu-error-light` is absent, an ADR is required before use.

---

## 6. Accessibility Contract

### `CreateGroupModal` (TR-026, UC-020)

| Element | Required contract |
|---|---|
| Dialog root | `role="dialog"`, `aria-modal="true"`, `aria-labelledby={stepTitleId}`. Provided by Radix Dialog primitive. |
| Step title | `id={stepTitleId}` — matches `aria-labelledby`. Changes when step advances. |
| Name field | `<label>` linked via `htmlFor`. On invalid: `aria-invalid="true"`, `aria-describedby={errorId}`. |
| "Tiếp theo" button | `disabled` attribute when name < 2 chars (not just visually disabled). |
| Member chip remove button | `aria-label="Xóa {name}"` — descriptive, not just "×". (AC-003-3, TR-030) |
| Color swatches | Each swatch is a `<button>` with `aria-label={swatch.label}`, `aria-pressed={isSelected}`. |
| Kind radio group | Uses `role="radiogroup"` with `role="radio"` per option, or `<input type="radio">` group. |
| Escape key | Closes modal, returns focus to "+ Tạo nhóm" trigger. Handled by Radix. |
| Focus trap | Tab cycles within modal. Handled by Radix Dialog. |
| Step advance focus | On step 2 open, focus moves programmatically to the step 2 title (`ref.current?.focus()`). |

### `GroupInfoPanel` (TR-028, UC-019)

| Element | Required contract |
|---|---|
| Sheet/panel root | `role="dialog"`, `aria-modal="true"`, `aria-labelledby={panelTitleId}`. Handled by Radix Sheet. |
| Close button | `aria-label="Đóng"` (i18n key). First focusable element after open. |
| Escape key | Closes panel, returns focus to group header trigger. Handled by Radix Sheet. |
| Backdrop click | Closes panel. Handled by Radix Sheet. |
| Remove member button | `aria-label="Xóa {name} khỏi nhóm"` per AC-019-3. |
| Edit icon button | `aria-label` = "Chỉnh sửa thông tin nhóm" (i18n). |
| Leave group button | Full `<button>` with descriptive text (not icon-only). |
| Delete group confirm | Inline — not a separate dialog; uses visible text + two buttons. No ARIA alertdialog needed here. |
| Motion | Slide-in `translateX(100%)→0` gated by `@media (prefers-reduced-motion: no-preference)`. |

### `MessageContextMenu` (TR-027, UC-018)

| Element | Required contract |
|---|---|
| Menu container | `role="menu"`. Provided by Radix DropdownMenu. |
| Each item | `role="menuitem"`. Provided by Radix. |
| Disabled item | `aria-disabled="true"`. Hint text element has `id={hintId}`; item has `aria-describedby={hintId}`. |
| Arrow Up/Down | Navigate between items (wrapping). Handled by Radix DropdownMenu keyboard nav. |
| Escape | Closes menu, returns focus to triggering bubble. Handled by Radix. |
| Enter / Space | Activates item. Handled by Radix. |
| Trigger element | `aria-haspopup="menu"`, `aria-expanded={open}`. The ChatBubble wrapper div that handles `onContextMenu` must have `tabIndex={0}` and `aria-label` covering the message (existing pattern in `role="log"` — verify scope). |
| Motion | Fade-in `opacity 0→1 + translateY(-3px)→0`, 0.12s, gated by `@media (prefers-reduced-motion: no-preference)`. |

### Delete Confirm AlertDialog (TR-029, UC-015)

| Element | Required contract |
|---|---|
| Dialog root | `role="alertdialog"`. Provided by `AlertDialog` primitive from `components/ui/alert-dialog/`. |
| Title | `AlertDialogTitle` = `messaging.deleteDialog.title`. |
| Description | `AlertDialogDescription` = `messaging.deleteDialog.body`. |
| Cancel button | `AlertDialogCancel`. Default focus target on open. |
| Confirm button | `AlertDialogAction` — danger styling (`bg-edu-error-light text-edu-error hover:bg-edu-error/20`). |
| Escape | Cancels and closes. Handled by Radix. |
| Focus trap | Handled by Radix AlertDialog. |

### Leave Group AlertDialog

Same pattern as Delete Confirm using `AlertDialog` primitive. `role="alertdialog"` via Radix.

### `ChatBubble` Interactive Elements

| Element | Required contract |
|---|---|
| Quoted block (replyTo) | Rendered as `<button type="button">` with `aria-label="Xem tin nhắn gốc của {senderName}"` (i18n composed). |
| Long-press area | The bubble wrapper should have `aria-haspopup="menu"` when `onContextMenu` is provided, to signal the context menu availability. |
| Deleted message | The placeholder text "Tin nhắn đã bị xoá" must still be associated with the message timestamp so screen readers can read the context. |

### `ConversationItem` Group Variant

| Element | Required contract |
|---|---|
| Member count chip | Has `aria-label="N thành viên"` (not just visual "2 users icon"). |
| Online dot | Suppressed for groups (no dot = no SR announcement needed). |
| Unread badge | `<span class="sr-only">{N} tin nhắn chưa đọc</span>` alongside the visual badge. Existing pattern must be verified. |

---

## 7. Component Placement Summary (Decision 0026)

| Component | Canonical Location | Rationale |
|---|---|---|
| `CreateGroupModal` | `features/messaging/presentation/create-group-modal/` | Single-feature compound; not shared across screens |
| `GroupInfoPanel` | `features/messaging/presentation/group-info-panel/` | Single-feature compound |
| `MemberSelectPanel` | `features/messaging/presentation/group-info-panel/member-select-panel.tsx` | Used by 2 components within same feature; no cross-feature reuse yet |
| `MemberChip` | Inside `group-info-panel/` (not promoted) | Sub-component of MemberSelectPanel |
| `MemberRow` | Inside `group-info-panel/` | Sub-component of GroupInfoPanel only |
| `PinnedMessagesSection` + `PinnedMessageRow` | Inside `group-info-panel/` | Sub-components of GroupInfoPanel only |
| `StepIndicator` | Inside `create-group-modal/` | Used only in CreateGroupModal |
| `Step1Form`, `Step2MemberSelect` | Inside `create-group-modal/` | Sub-components of CreateGroupModal |
| `GroupAvatarPreview`, `ColorSwatchPicker` | Inside `create-group-modal/` | Sub-components of Step1Form |
| `MessageContextMenu` (wrapper) | `features/messaging/presentation/message-context-menu/` | Feature-local; wraps `ui/dropdown-menu` with messaging-specific item logic |
| `ChatBubble` (extended) | `features/messaging/presentation/chat-bubble/` | EXTEND existing; no fork |
| `ChatWindow` (extended) | `features/messaging/presentation/chat-window/` | EXTEND existing; no fork |
| `ConversationList` (extended) | `features/messaging/presentation/conversation-list/` | EXTEND existing; no fork |
| `ConversationItem` (extended) | `features/messaging/presentation/conversation-item/` | EXTEND existing; no fork |
| `MessagingScreen` (extended) | `features/messaging/presentation/messaging-screen/` | EXTEND existing; no fork |
| `AlertDialog` (delete + leave confirm) | `components/ui/alert-dialog/` | REUSE existing primitive |
| `Sheet` (GroupInfoPanel backing) | `components/ui/sheet/` | REUSE existing primitive |
| `Dialog` (CreateGroupModal backing) | `components/ui/dialog/` | REUSE existing primitive |
| `DropdownMenu` (MessageContextMenu backing) | `components/ui/dropdown-menu/` | REUSE existing primitive |
| `Skeleton` (loading bubbles) | `components/ui/skeleton/` | REUSE existing primitive |

---

## 8. Required Storybook Stories per Component

Per spec §9. File locations follow the pattern `<component>/<component>.stories.tsx`.

### `create-group-modal/create-group-modal.stories.tsx`
- `CreateGroup_Step1_Empty` — default open step 1; Next disabled; avatar preview shows placeholder initials
- `CreateGroup_Step1_Valid` — name "Nhóm Toán 12A", color success selected; Next enabled; preview shows "NT" with success tint
- `CreateGroup_Step1_ValidationError` — name "N" (1 char), blur fired; field shows error; Next disabled
- `CreateGroup_Step2_NoMembers` — step 2, empty chip area, Submit disabled
- `CreateGroup_Step2_WithMembers` — 3 members selected; chips visible; Submit enabled
- `CreateGroup_Submit_Loading` — `isSubmitting={true}` state; spinner on button
- `CreateGroup_Submit_Error` — story simulating rollback: error banner visible below the form

### `group-info-panel/group-info-panel.stories.tsx`
- `GroupInfoPanel_Open` — non-admin view; member list (3 rows); pinned section empty state; leave button visible; no delete button; no edit icon
- `GroupInfoPanel_AdminView` — admin view; edit icon visible; add-member CTA visible; remove buttons visible on non-admin non-self members; delete button visible in footer
- `GroupInfoPanel_NonAdminView` — aliases Open story; no edit, no remove, no delete
- `GroupInfoPanel_DeleteConfirm` — `deleteGroupConfirmOpen=true` state; footer shows warning text + Cancel + danger confirm button
- `GroupInfoPanel_PinnedMessages` — pinned section with 2 message rows (star icon, sender, time, excerpt)
- `MemberOffline` — member row with `isOnline=false`: opacity 0.6, grayscale avatar, no green dot

### `message-context-menu/message-context-menu.stories.tsx`
- `ContextMenu_OwnMessage_Admin` — own message, `selfIsGroupAdmin=true`; all 4 items enabled (Reply, Pin, Copy, Delete danger)
- `ContextMenu_OwnMessage_NonAdmin` — own message, `selfIsGroupAdmin=false`; Pin disabled with hint "Chỉ admin mới có thể ghim" at 0.4 opacity
- `ContextMenu_OtherMessage` — other's message (non-admin context); Delete disabled + "Chỉ xoá tin nhắn của bạn" hint
- `ContextMenu_OwnMessage_Expired` — own message `sentAt` > 1 hour ago; Delete disabled + "Đã quá 1 giờ" hint

### `chat-bubble/chat-bubble.stories.tsx` (additions to existing stories file)
- `Reply_Quote_OwnBubble` — `from="me"`, `replyTo` set; quoted block with white semi-transparent bg + white left border
- `Reply_Quote_OtherBubble` — `from="other"`, `replyTo` set; quoted block with `bg-background` + pColor left border
- `DeletedMessageBubble` — `isDeleted=true`; shows "Tin nhắn đã bị xoá" in muted italic; no text, no quoted block
- `Reply_Strip_Active` — rendered inside `ChatWindow` story: ReplyStrip visible above composer with cancel X

### `chat-window/chat-window.stories.tsx` (additions to existing)
- `LoadingSkeleton` — `isLoading=true` with custom skeleton variant: 5 staggered shimmer bubbles alternating left/right
- `Reply_Strip_Active` — `replyState` set; strip shown above composer

### `conversation-list/conversation-list.stories.tsx` (additions)
- `EmptyGroups` — Groups tab active, 0 group conversations; users icon + title + subtitle + "Tạo nhóm mới" primary CTA button

### Delete dialog — tested inline in `alert-dialog/alert-dialog.stories.tsx`
- `DeleteMessageConfirm_Dialog` — `role="alertdialog"` open; title/body/cancel/confirm danger buttons per TR-029

### Mobile viewport variants
- Key stories re-run at 375px width via Storybook viewport parameter on: `GroupInfoPanel_Open`, `CreateGroup_Step1_Valid`, `ContextMenu_OwnMessage_Admin`, `EmptyGroups`.

---

## 9. Open Items for Implementation

1. **Token gap — `--edu-error-light`**: Verify this token exists in `src/app/tokens.css`. The admin badge and danger button patterns depend on it. If absent, flag an ADR before use.

2. **Token gap — quoted bubble dark-mode**: `rgba(255,255,255,0.18)` used for own-message quoted block is a raw RGBA value. Must be resolved to a `src/app/tokens.css` variable. If no token covers semi-transparent white on primary bg, flag an ADR (Open Item 3 from spec §14).

3. **`bun ui:add context-menu` fallback**: If the engineer finds `DropdownMenu`-at-coordinates pattern insufficient, the fallback is `bun ui:add context-menu`. No ADR needed for primitive addition — just update this architecture doc.

4. **`highlight` keyframe animation**: The 3-second CSS highlight animation requires a `@keyframes highlight-pulse` entry in `globals.css` using a `pColor/20 → transparent` sequence. This uses existing tokens but introduces a new keyframe. Confirm with `fe-lead` whether this warrants a note in the design-system doc or is covered by the motion-token guidance in `.claude/rules/accessibility.md`.

5. **Long-press implementation**: Pointer event timer approach (`onPointerDown` 500ms, `onPointerUp`/`onPointerCancel` cancel). No library. Spec §14 item 4 leaves this to FE team — confirm approach before implementation.

6. **`MemberSelectPanel` import direction**: `CreateGroupModal` imports `MemberSelectPanel` from the `group-info-panel/` folder. This is acceptable (same feature, same presentation layer) but unusual. If it causes confusion, consider moving `MemberSelectPanel` to a top-level `features/messaging/presentation/member-select-panel/` folder. Decision deferred to implementation phase.
