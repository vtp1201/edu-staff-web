---
name: us-e10.4-qa-patterns
description: Messaging enhancements (group chat) QA patterns — AC gaps, domain gate coverage, story locator pitfalls
metadata:
  type: project
---

## Key AC coverage pattern

- AC-12 domain gate: all four destructive use-cases (RemoveGroupMember, DeleteGroup, PinMessage, UpdateGroup) have
  explicit `not-group-admin` unit test cases — pre-existing, no gap.
- AC-4 optimistic prepend: tested at MessagingScreen level (CreateGroup_Optimistic_Prepend); requires all E10.4
  action props to be provided in story args (createGroupAction + six stubs) — meta args only carry E10.1 actions.
- AC-7 reply strip: tested at MessagingScreen level (Reply_Strip_Active); right-click via
  `userEvent.pointer({ target, keys: "[MouseRight]" })`; context menu is fixed-position so query via
  `within(canvasElement.ownerDocument.body)`.
- AC-10 keyboard nav: tested at MessagingScreen level (ContextMenu_Keyboard_Nav); use
  `userEvent.keyboard("{ArrowDown}")` then assert `document.activeElement.getAttribute("role") === "menuitem"`.

## Locator patterns

- Context menu (fixed, outside canvas): always `within(canvasElement.ownerDocument.body).getByRole("menu")`.
- CreateGroupModal (Radix Dialog portal): `within(canvasElement.ownerDocument.body).getByRole("dialog")`.
- Right-click: `userEvent.pointer({ target: el, keys: "[MouseRight]" })` — NOT `userEvent.click`.
- Reply strip label: `canvas.getByText(/Đang trả lời/i)` — i18n key `messaging.reply.replyingTo`.
- Textarea focus assertion: `expect(canvas.getByRole("textbox")).toHaveFocus()`.

## E10.4 story stubs pattern

MessagingScreen meta args only cover E10.1 actions. Any E10.4 story must supply all eight actions:
`createGroupAction`, `getGroupAction`, `pinMessageAction`, `deleteMessageAction`,
`removeGroupMemberAction`, `leaveGroupAction`, `deleteGroupAction`, `updateGroupAction`.
Use `noopGroupAction = async () => ({ ok: true })` and `noopGetGroup = async () => ({ ok: false, errorKey: ... })`
for stubs that aren't exercised by the story.

## Recurring gap pattern

ConversationList stories do NOT assert the unread badge color (error token) for groups — AC-1 unread badge
color is a visual-only gap; covered by design-review/axe, not interaction test.

**Why:** Context menu is fixed/portalled; multi-action MessagingScreen stories need full prop set.
**How to apply:** Always check messaging-screen meta args before writing MessagingScreen stories; supply all eight E10.4 props explicitly.
