# US-E10.5 Messaging group-chat QA defect fixes (DEF-01/02/03)

## Status

implemented

## Lane

normal

## Dependencies

- Depends on: US-E10.4 (base messaging feature — already merged to main)
- Blocks: none
- Feature module(s) chạm: `src/features/messaging/…`
- Shared contract/file: `messaging-screen.i-vm.ts`, `chat-window.tsx`, `messaging-screen.tsx`, `actions.ts`

## Product Contract

Three targeted post-QA defects from US-E10.4 gate. The base feature is merged; these are isolated follow-up fixes:

- **DEF-01 (timer leak):** `scrollToMessage` in `chat-window.tsx` uses `window.setTimeout` without clearing on unmount → potential setState-after-unmount warning in dev mode.
- **DEF-02 (functional gap):** `onAddMembers` handler inside `groupActions` in `messaging-screen.tsx` is a no-op stub `() => {}`. The domain use-case (`AddGroupMembersUseCase`), DI factory (`makeAddGroupMembersUseCase`), and `GroupInfoPanel` button are all built. Needs screen-level wiring: a Server Action (`addGroupMembersAction`), an `AddMembersModal` (or inline contact picker), a TanStack Query mutation with optimistic update + error rollback + group-query invalidation — mirroring how `removeGroupMemberAction`/`leaveGroupAction`/`deleteGroupAction` are wired.
- **DEF-03 (test coverage):** The scroll-to-pinned + 3s highlight-flash flow has no screen-level assertion. Component-level `ChatBubble_Highlighted` and domain cover the state; this adds a deterministic screen-level wiring assertion using a controlled clock (vi.useFakeTimers) rather than a real 3s wait.

## Acceptance Criteria

- DEF-01: `chat-window.tsx` `scrollToMessage` effect returns a cleanup that clears the timer; a Vitest unit test asserts no timer leak on unmount.
- DEF-02: Clicking "Thêm thành viên" in the GroupInfoPanel opens an add-members UI; selecting contacts and confirming calls `addGroupMembersAction`, which invokes `AddGroupMembersUseCase`; on success the group query is invalidated and the panel reflects new members; on error the previous group state is restored. Tests: screen-level mutation test (red→green) + Story.
- DEF-03: A Storybook interaction story (or Vitest test) asserts screen-level scroll-to-pinned wiring: `onPinnedClick` triggers `scrollToMessage`, highlight class applied, cleared after 3s (controlled clock).
- All 3 fixes: `bunx tsc --noEmit` clean, `bun vitest run` green, `bun build` clean.

## Design Notes

- DEF-02 UI surface: reuse `NewConversationModal` contact-picker pattern (existing `ContactEntity[]` + checkbox selection), or a lightweight inline sheet. Do NOT redesign the GroupInfoPanel layout. `messaging.groupInfo.addMembers` copy key already exists in vi.json.
- DEF-02 new Server Action: `addGroupMembersAction(groupId, memberIds[])` → `GetGroupResult` (mirrors `removeGroupMemberAction`).
- DEF-02 i18n: any new UI strings added to vi.json + en.json (typed). Check existing keys first before adding.
- DEF-01: minimal change — add `return () => window.clearTimeout(tid)` in the effect.
- DEF-03: use `vi.useFakeTimers()` / `vi.advanceTimersByTime(3000)` to deterministically test the highlight-clear path.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | DEF-01 timer-cleanup test; DEF-02 screen mutation test (add-members invokes use-case + invalidates); DEF-03 highlight-flash wiring test |
| Integration | DEF-02 addGroupMembersAction wires through to use-case (covered by screen-level mutation test with mock action) |
| E2E | DEF-02 Story: AddMembers_Wired (interaction test); DEF-03 Story: ScrollToPinned_Highlight_Wired |
| Platform | n/a |
| Release | gate green: tsc + vitest run + bun build |

## Harness Delta

- US-E10.5 registered.
- Server Action `addGroupMembersAction` added to `messages/actions.ts`.
- `MessagingScreenActions` interface extended with `addGroupMembersAction`.
