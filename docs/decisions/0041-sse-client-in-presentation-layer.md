# 0041 SSE Client Lives in Presentation Layer (useEffect), Not Infrastructure

Date: 2026-06-18

## Status

Accepted

## Context

US-E10.1 (Messaging) and US-E10.2 (Notifications Center) both use real-time delivery
via SSE (Server-Sent Events). Decision 0009 established the SSE proxy pattern for the
`noti` service. For the `social` service (messaging), SSE is mock-first (social service
not yet built — decision 0017).

A question arose: where should the SSE subscription logic live in the Clean Architecture
layers? Two options were considered:

1. **Infrastructure layer** — `infrastructure/` handles the `EventSource` connection as
   part of the data-fetching concern, just like HTTP repositories.
2. **Presentation layer** — a `useEffect` hook (or a custom hook like
   `useMockIncomingMessage`) inside the client component manages the `EventSource` or
   `setTimeout` simulation and calls `queryClient.setQueryData` to inject events.

## Decision

SSE subscription logic lives in the **presentation layer** (`'use client'` component or
custom hook), not in `infrastructure/`. Concretely, for US-E10.1:

- `useMockIncomingMessage(conversationId, queryClient)` hook in
  `src/features/messaging/presentation/messaging-screen/` fires `setTimeout(3000)` when
  `NEXT_PUBLIC_USE_MOCK=true` and prepends a fake incoming `MessageEntity` to the
  TanStack Query cache via `queryClient.setQueryData`.
- When `social` SSE ships, the `setTimeout` body is replaced with an `EventSource`
  subscriber — the `setQueryData` calls stay identical; only the event source changes.
- The `IMessagingRepository` interface does NOT expose a `subscribe()` method — SSE is
  not a repository concern.

## Alternatives Considered

1. **SSE in `infrastructure/`** — `MessagingRepository.subscribe()` returns an
   `EventSource` or an async iterator. Infrastructure handles connection lifecycle.
   Rejected: `EventSource` is a browser-only API; `infrastructure/` files have
   `import 'server-only'`. This would require a dedicated client-only infra file
   pattern, adding complexity for minimal benefit.

2. **SSE in `bootstrap/lib/`** — a shared `createSseClient()` factory analogous to
   `createHttpClient()`. Rejected: SSE connections are per-feature and per-screen;
   a shared factory would require parameterization that ends up mirroring what a simple
   `useEffect` already does.

## Consequences

Positive:

- No `import 'server-only'` conflict — presentation components are already `'use client'`.
- TanStack Query `queryClient.setQueryData` is naturally accessible in presentation hooks.
- Mock → real migration is surgical: replace `setTimeout` with `EventSource` in one hook;
  no infrastructure or DI changes.
- Consistent with the existing `notification` feature pattern (`use-notification-new-event.ts`
  hook in `features/notification/presentation/`).

Tradeoffs:

- SSE connection lifecycle (reconnect, error handling) must be managed in the presentation
  hook rather than in a tested infrastructure unit. Mitigated by keeping the hook thin
  and testing the `setQueryData` side-effect via Storybook interaction.
- If two different features independently open SSE to the same endpoint, they each manage
  their own connection. Acceptable for current scale; revisit when fan-out increases.

## Follow-Up

- ADR-0042: Decide which service (`social` vs `iam`) provides the `getContacts()` endpoint
  before real BE integration.
- When `social` SSE ships: replace `setTimeout` in `useMockIncomingMessage` with
  `EventSource(MESSAGING_EP.sseChannel)` — no ADR needed (implementation swap, not an
  architecture decision).
