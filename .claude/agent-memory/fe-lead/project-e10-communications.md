---
name: project-e10-communications
description: E10 Communications epic — US-E10.1 Messaging 2-pane inbox implemented; US-E10.2 planned
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

**Remaining in E10:** US-E10.2 Notifications Center (story packet exists, status planned).

**Why:** Social microservice not yet built → mock-first. SSE via decision 0041 (presentation layer). Contacts deferred (decision 0042).

**How to apply:** When E10.2 starts, check no in-flight feat/us-e10.* branch first. Social service mock pattern mirrors messaging mock exactly (USE_MOCK toggle in DI).
