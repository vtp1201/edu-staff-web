---
name: messaging-patterns
description: US-E10.x messaging feature component decisions — Sheet for slide-in panels, DropdownMenu for context menus, ReplyStrip inline in ChatWindow composer, MemberSelectPanel feature-local sub-component
metadata:
  type: project
---

## Messaging Feature Component Patterns (US-E10.1 base + US-E10.4 enhancements)

### Panel: GroupInfoPanel uses `ui/sheet/` (side="right")
The 320px slide-in group info panel is backed by `components/ui/sheet/` (already present). This provides focus trap, role="dialog", Escape key close, backdrop click close, and the side-slide animation — all from Radix Sheet. Custom slide animation (translateX 100%→0, 0.22s ease-out) is Tailwind CSS gated by `@media (prefers-reduced-motion: no-preference)`.

**Why:** Dialog doesn't support side-slide; Sheet is the correct Radix primitive for this.

### Context Menu: `ui/dropdown-menu/` (not `context-menu`)
`context-menu` shadcn primitive is NOT installed. For MessageContextMenu, use `dropdown-menu` opened programmatically at click coordinates via a zero-size trigger div (`position: fixed; left: x; top: y`). This gives role="menu", Arrow navigation, aria-disabled, Escape close for free.

**Fallback:** `bun ui:add context-menu` if positioning proves insufficient.

### ReplyStrip: inline section inside ChatWindow, NOT a separate component
The reply strip (shown above the composer when replying) is a conditional JSX section inside `chat-window.tsx`, controlled by `replyState: ReplyState | null` local state. Do NOT create a separate `ReplyStrip` component file per spec §7.

### MemberSelectPanel: feature-local sub-component, imported cross-component
Used by both `CreateGroupModal` (step 2) and `GroupInfoPanel` (add-member flow). Lives at `features/messaging/presentation/group-info-panel/member-select-panel.tsx`. Both consumers are within the same feature — decision 0026 criterion for `components/shared/` is cross-screen (≥2 screens), not cross-component. Stays feature-local.

### ChatBubble extension pattern
All new features (replyTo quoted block, isDeleted state, isHighlighted animation, onContextMenu, onClickReply) are **additive props** on the existing `ChatBubbleProps` interface. No fork, no new component. The quoted block is a sub-section rendered inside the same component.

### All messaging presentation components are feature-local
As of US-E10.1 + US-E10.4, no messaging component has been promoted to `components/shared/`. They all live in `features/messaging/presentation/`. Promote only if a second screen outside the messaging feature needs to reuse a pattern.

### Token concerns flagged in US-E10.4
- `--edu-error-light` — verify in `src/app/tokens.css` before using admin badge + danger buttons
- `rgba(255,255,255,0.18)` for own-message quoted block dark-mode — needs a CSS variable equivalent; flag ADR if token absent
- `@keyframes highlight-pulse` for 3s pin highlight — new keyframe in globals.css, uses existing tokens
