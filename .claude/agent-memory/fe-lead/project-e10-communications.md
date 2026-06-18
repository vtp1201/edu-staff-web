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

**E10 status:** ALL 3 US complete. Remaining: none in E10.

**Why:** noti service not yet built → mock-first (decision 0014). SSE fan-out deferred to when noti service ships.

**Why:** Social microservice not yet built → mock-first. SSE via decision 0041 (presentation layer). Contacts deferred (decision 0042).

**How to apply:** When E10.2 starts, check no in-flight feat/us-e10.* branch first. Social service mock pattern mirrors messaging mock exactly (USE_MOCK toggle in DI).
