---
name: project-e10-communications
description: E10 Communications epic — US-E10.1 Messaging + US-E10.2 Notifications + US-E10.3 Announcements all implemented; E10 COMPLETE
metadata:
  type: project
---

US-E10.1 Messaging 2-pane inbox — IMPLEMENTED (merged to main 2026-06-18, 532 tests).

**What was built:**
- Domain: ConversationEntity, MessageEntity, ContactEntity; MessagingFailure union; IMessagingRepository; use-cases: get-conversations, get-messages, send-message (optimistic+rollback), create-conversation, get-contacts
- Infrastructure: 4 DTOs, MessagingMapper, MessagingRepository (social service), MockMessagingRepository + fixtures (50 convo, 100 msg, 10 contacts)
- bootstrap/di/messaging.di.ts — USE_MOCK toggle (social service not yet built; decision 0017)
- bootstrap/endpoint/messaging.endpoint.ts — MESSAGING_EP constants
- RSC page: src/app/[locale]/t/[tenant]/(app)/(shared)/messages/page.tsx
- Server Actions: actions.ts (sendMessageAction, createConversationAction, getMessagesAction)
- Presentation (all 'use client'): MessagingScreen (container, useQuery+useMutation), ConversationList (tablist direct/groups + skeleton), ConversationItem (aria-current, aria-hidden unread), ChatWindow (role="log" aria-live="polite"), ChatBubble (own/other/system), TypingIndicator (motion-safe:animate-bounce, isTyping prop — false by default; SSE wires it when social service ships), NewConversationModal (Radix Dialog + DialogDescription sr-only)
- nav-config: /messages route added for all roles
- i18n: messaging namespace in vi.json + en.json (49 keys)
- 9 Storybook stories with play functions; separate ConversationList stories (Loading via direct prop, not TQ)
- ADR 0041: SSE mock in presentation useEffect (not infrastructure)
- ADR 0042: contacts service ownership deferred to social service

**Key decisions/gotchas:**
- TypingIndicator gated on `isTyping?: boolean` prop (default false), NOT on conversation.isOnline — prevents always-on indicator. When SSE ships, MessagingScreen wires isTyping=true on SSE "typing" event.
- SSE mock uses useEffect in MessagingScreen presentation (decision 0041) — not infrastructure — because it is simulated client-side behavior, not a real server push yet.
- ConversationList Loading story: TanStack Query initialData prevents isLoading=true in story context → dedicated ConversationList.stories.tsx passes isLoading={true} directly to the component.
- Merge conflict with E11.2 (lessonBank): di/index, endpoint/index, vi.json, en.json — resolved keeping both namespaces; lessonBank first, messaging after.
- Worktree stash on main had QA-memory + TEST_MATRIX files — committed separately after merge as chore(agent-memory).

**Test proof:** 532 tests (103 files); unit=1, integration=1, e2e=1; bun build green; Harness US-E10.1 = implemented.

US-E10.3 Announcements (admin/principal) — IMPLEMENTED (merged to main 2026-06-18, 558 tests, 19 Storybook stories).

**What was built (E10.3):**
- Feature module: `src/features/announcements/` (domain/infra/presentation)
- Domain: AnnouncementEntity (priority: normal/important/urgent; status: draft/scheduled/sent; audience), AnnouncementRecipient, CreateAnnouncementInput; 8-variant failure union; IAnnouncementRepository; use-cases: create-announcement (TDD with injectable clock), delete-announcement, get-announcements
- Infrastructure: DTO, mapper, AnnouncementRepository (envelope-unwrapped), mock repo + 5 fixtures
- ANNOUNCEMENTS_EP constants added to bootstrap/endpoint/noti.endpoint.ts (not a new file)
- bootstrap/di/announcements.di.ts — USE_MOCK toggle (noti service not built)
- RSC page: src/app/[locale]/t/[tenant]/(app)/admin/announcements/page.tsx
- Server Actions: create/update/delete/fetchList/getRecipients/sendReminder
- Presentation: AnnouncementsScreen (TanStack Query + filter pills + list + skeletons + empty/error), AnnouncementCard (priority left-border for urgent, StatusBadge reuse, progress bar role=progressbar), AnnouncementDrawer (480px Sheet, audience fieldset, char counts, preview toggle), DetailSheet (400px Sheet, useQuery for recipients), DeleteAnnouncementDialog
- Nav: /admin/announcements (Megaphone) added to admin sidebar
- i18n: announcements namespace (72 keys vi+en) including all 8 failure error keys
- A11Y-017 to A11Y-030 all fixed: bg-edu-error-dark delete btn, text-edu-error-text form errors, text-edu-text-primary active pills, text-edu-text-secondary char-count/preview, bg-edu-success-text progress fill, progressbar role+aria, urgent aria-label, aria-invalid+describedby form fields, fieldset aria-describedby+role=alert, Sheet closeLabel i18n, skeleton aria-busy+role=status
- Design-review gate: PASS (0 impeccable findings)
- 19 Storybook stories with play() — 15/15 AC coverage
- No new ADRs needed (all tokens existed in tokens.css)

**Key decisions/gotchas (E10.3):**
- DetailSheet uses useQuery (not useEffect) for recipients — TL reviewer caught useEffect deviation
- `annm-audience-err` id + role="alert" on audience fieldset error — critical for SR user association
- Inactive pills: text-muted-foreground (2.75:1) → text-foreground; active pills: text-primary (3.56:1) → text-edu-text-primary (10:1)
- Progress fill: bg-edu-success (1.43:1 non-text) → bg-edu-success-text (5.34:1)
- Tab conflict on merge: TEST_MATRIX E11.1 row was "planned" on branch but "implemented" on main — kept main's E11.1 row + added E10.3 implemented row
- `fe-worktree list` showed stale us-e11.1 worktree entry but directory didn't exist — `git worktree list` was authoritative

US-E10.4 Messaging Enhancements (group chat, DR-008) — IMPLEMENTED (merged to main 2026-06-20, commit 7ef278d, 835 total tests).

**What was built (E10.4):**
- Domain extensions: GroupEntity, GroupMember; MessageEntity.replyTo+isPinned; GroupKind; MessagingFailure extended with 5 new types; 8 new use-cases (CreateGroup, DeleteGroup, LeaveGroup, AddGroupMembers, RemoveGroupMember, UpdateGroup, PinMessage, DeleteMessage)
- Infrastructure: group DTOs + mapper extensions, mock repo group fixtures (per-role seeding teacher/principal/student/parent)
- MESSAGING_EP extended with 7 new social service endpoint constants
- Presentation: CreateGroupModal (2-step: info+member-select, Radix Dialog, focus trap), GroupInfoPanel (Radix Sheet 320px slide-in, admin-gated edit/add-member/delete), MessageContextMenu (ARIA menu role, ArrowUp/Down/Esc keyboard nav, pin/delete disabled states with hints), ChatBubble extended (reply/quote block, highlight state, deleted placeholder), MessagingScreen wired (createGroupAction, getGroupAction, pinMessageAction, deleteMessageAction, removeGroupMemberAction, leaveGroupAction, deleteGroupAction, updateGroupAction)
- Tokens: --edu-messaging-quote-own-bg + --edu-messaging-quote-own-border added to tokens.css (ADR 0047)
- globals.css: edu-msg-highlight (3s, motion-safe via global prefers-reduced-motion reset), edu-msg-shimmer animations
- i18n: messaging.group, messaging.groupInfo, messaging.contextMenu, messaging.reply, messaging.deleteDialog namespaces (47+ keys vi+en)
- 36+ Storybook stories with play() across 6 story files; 47 domain+integration unit tests

**Key decisions/gotchas (E10.4):**
- Context menu disabled items use `disabled` attribute (not just aria-disabled) — low-severity a11y tension with NFR-003. Hint text via aria-describedby but not keyboard-reachable. Known gap, not blocking (design-spec-mandated 40%-opacity pattern).
- `motion-safe:` prefix on context menu animate-in (Tailwind). Global prefers-reduced-motion reset in globals.css gates ALL animations including Radix Sheet slide-in.
- Shimmer skeleton intentionally "not gated" in the comment but the global `!important` reset covers it anyway.
- Color swatches #6366F1 and #FB923C are spec-mandated hex literals (design-spec `colorPicker.palette`) — used in dynamic inline style, not Tailwind class. Acceptable exception.

US-E10.5 Messaging QA defect fixes — IMPLEMENTED (merged to main 2026-06-20, 839 total tests).

**What was fixed (E10.5):**
- DEF-01: `chat-window.tsx` — extracted `useHighlightTimer` logic into `highlight-timer.ts` pure helper; timer cleared before re-scheduling (rapid-click) and on unmount via `useEffect` cleanup ref. Unit tested with vi.useFakeTimers (4 cases).
- DEF-02: Wired `onAddMembers` stub → full chain: `addGroupMembersAction` Server Action (`'use server'`, calls `makeAddGroupMembersUseCase`), extended `MessagingScreenActions` ViewModel, new `AddMembersModal` component (contact-picker dialog, search, aria-pressed checkboxes, error alert, spinner), `addMembersMutation` in MessagingScreen (onSuccess writes updated group to cache + syncs conversationList memberCount, onSettled invalidates groupKey). Page.tsx passes the action. 5 AddMembersModal stories + AddMembers_Wired interaction story.
- DEF-03: `ScrollToPinned_Highlight_Wired` story (open panel → click pinned row → panel closes → highlight applied); real-clock 4s wait removed (storybook/test has no vi.useFakeTimers — that package exports only expect/userEvent/waitFor/within/fn/spyOn). Timer behavior proven by unit test.

**New files (E10.5):**
- `src/features/messaging/presentation/chat-window/highlight-timer.ts` — pure scheduleHighlightClear helper
- `src/features/messaging/presentation/chat-window/highlight-timer.test.ts` — 4 unit tests
- `src/features/messaging/presentation/add-members-modal/` — add-members-modal.tsx + .i-vm.ts + index.ts + .stories.tsx
- Extended: messaging-screen.tsx, messaging-screen.i-vm.ts, messaging-screen.stories.tsx, actions.ts, page.tsx, vi.json+en.json (messaging.addMembersModal block)

US-E10.6 Messaging Presence Indicator (DR-017) — IMPLEMENTED (merged to main 2026-07-14, commit d9eac0c, 1552 total tests).

**What was built (E10.6):** 3-state presence (online/recent/offline) additive to existing `isOnline` boolean on `ContactEntity`/`ConversationEntity`/`GroupMember`. New pure `domain/entities/presence.ts` (`msgPresence()`/`presenceRank()`/`isPresenceCountable()`/`sortByPresence()`). New shared `components/shared/presence-dot/` (`PresenceDot`, dumb, no `useTranslations` inside, caller passes translated sr-only label). INT-401 (`GET /noti/api/v1/presence`, mock-first) got its OWN small `IPresenceRepository`/`get-presence.use-case.ts` — deliberately NOT bolted onto `IMessagingRepository`'s existing contract, since presence is `noti`'s domain not `social`'s. `presence.changed` SSE event additive to `RealtimeEvent` union + `queryKeysFor()`. Wired into conversation-list avatar, DM chat-header dot+caption (`presence-caption.ts` pure derivation fn), group-info-panel dot+online-first-sort+"N online" count.

**Key decisions/gotchas (E10.6):**
- BA-provided story packet (spec.md/use-cases.md/requirements.md/integration.md) was unusually thorough — full FR/AC/traceability already done, so fe-planner only needed to sequence + lock 2 open design decisions (component home, INT-401 repo shape) rather than re-derive requirements. When intake handoff is this complete, skip re-deriving and go straight to a build-sequencing plan.
- Skipped `fe-component-architect`/`fe-state-engineer` for this US — justified explicitly in plan.md ("single small shared primitive + query additions following an exact existing pattern, no new component tree or state category"). Correct call in hindsight; nothing surfaced in review that needed architecture-pass rework.
- a11y audit caught a REAL blocking issue self-report/reviewer missed: `aria-label` on a parent button suppresses "name from content" — a nested `sr-only` span inside an `aria-label`led `<button>` is invisible to the accessible name (WCAG 4.1.2). Any future "icon/dot/badge with sr-only text nested inside an aria-labelled interactive wrapper" pattern needs the same check — fold the sr-only text into the wrapper's own `aria-label` instead of relying on nested content.
- a11y audit also caught the design-spec.jsonc itself specifying a failing contrast value (`--edu-success` ~1.72:1 non-text) as the NORMATIVE dot color — design-spec being normative doesn't mean it's always correct; `--edu-success-text` (5.24:1) was the right accessible substitute, already existed as a token. Flagged doc-sync back to uiux rather than silently deviating.
- fe-qa-playwright's independent AC-by-AC verification (not trusting engineer/reviewer self-report) caught a genuine spec violation the tech-lead review missed: a presence query's `enabled` condition fired on conversation-select rather than panel-open, violating an explicit AC ("no fetch attributable to header render, only when panel opens"). Confirms the recurring pattern (see E14.6 memory): QA re-deriving tests from AC text, not reading the report, finds real gaps tech-lead review doesn't.
- No-motion ACs (explicit AC items across 3 UCs) had ZERO test assertion — just a source code comment — until QA flagged it. "No animation" needs an explicit `className` assertion, a comment is not proof.
- Solo-mode branch (no in-flight feat/* branches at claim time) — straight main-checkout workflow, no worktree needed.

**E10 status:** ALL 6 US complete (E10.6 extends, doesn't reopen, the closed E10.1-E10.5 stories). E10 COMPLETE.

**How to apply:** E10 feature module (`src/features/messaging/`) is complete. Any future messaging work must be a new US extending it, not modifying the closed stories. Social service is still mock-first (decision 0017); `noti` presence REST surface also mock-first (OQ-2, path assumed `/noti/api/v1/presence`). Note: `storybook/test` does NOT export `vi`/`useFakeTimers` — use pure Vitest for timer-based tests, Storybook for wiring assertions only.

**Why:** noti service not yet built → mock-first (decision 0014). SSE fan-out deferred to when noti service ships.

**Why:** Social microservice not yet built → mock-first. SSE via decision 0041 (presentation layer). Contacts deferred (decision 0042).

**How to apply:** When E10.2 starts, check no in-flight feat/us-e10.* branch first. Social service mock pattern mirrors messaging mock exactly (USE_MOCK toggle in DI).
