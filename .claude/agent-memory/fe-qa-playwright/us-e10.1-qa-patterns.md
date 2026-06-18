---
name: us-e10.1-qa-patterns
description: US-E10.1 messaging screen QA patterns — portal queries, multi-node text, fixture choice for AC-3
metadata:
  type: project
---

**Radix portal query pattern:** `NewConversationModal` uses Radix `Dialog` which
renders into a portal outside `canvasElement`. Query it via
`within(canvasElement.ownerDocument.body).getByRole("dialog")` — `within(canvasElement)`
will not find it.

**Multi-node text:** `getByText("Trần Minh Quân")` throws "multiple elements" because the
name appears in both the ConversationItem list and the ChatWindow header (first conversation
is auto-selected). Use `getAllByText(...).length >= 1` or scope to a sub-container.

**AC-3 fixture choice:** Default story args use `u1` messages (no system messages, single
date group). For AC-3 (date dividers + system messages) the `ChatWindowOpen` story must
override `initialConversations` to `[CONVERSATIONS[2]]` (the group) and
`getMessagesAction` to return `MESSAGES.g1`, which has two date groups and a system message.

**AC-4 input-clear check:** `SendMessage_Optimistic` — after clicking Send, assert
`expect(input).toHaveValue("")` inside `waitFor` (the clear is synchronous but the
optimistic mutation is async, so the ordering matters).

**Loading story AC-1:** With `initialData=[]` the TanStack Query starts in "success" state
immediately — the skeleton never flashes in jsdom/chromium headless. The story is a smoke
test confirming no crash; skeleton rendering is verified visually in Storybook only.

**Why:** recurring patterns from this session; avoid repeating the same query-scope mistakes.
**How to apply:** whenever writing play functions for screens with Radix Dialog portals
or screens that auto-select the first item and show it in two places simultaneously.
