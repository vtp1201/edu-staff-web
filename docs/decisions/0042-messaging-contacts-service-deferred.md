# 0042 Messaging Contacts Service — Defer to Real Integration (Mock-First)

Date: 2026-06-18

## Status

Accepted

## Context

US-E10.1 (Messaging) needs a "New Conversation" modal that allows users to search
for contacts (other school members) to start a direct or group conversation. This
requires a `getContacts()` API call.

Two backend services could own this endpoint:

1. **`social` service** — owns conversations, messages, and potentially the contact
   graph for messaging purposes. Endpoint: `GET /social/api/v1/contacts`.
2. **`iam` service** — owns user identity, tenant members, and the full user directory.
   Endpoint: could be `GET /iam/api/v1/members` or similar.

The `social` service is not built yet (decision 0017). The `iam` service is partially
built (US-E06 BE integration delivered `iam` wiring for auth, staffing, roster).

## Decision

**Defer the service ownership question to real BE integration.** For US-E10.1 (mock-first):

- `IMessagingRepository.getContacts()` is defined in the domain interface.
- `MockMessagingRepository.getContacts()` returns in-memory contact fixtures from
  `design_src/edu/messaging.jsx` CONTACTS_BY_ROLE data (teacher role contacts).
- `MessagingRepository.getContacts()` (real) is a stub that returns
  `{ ok: false, failure: { type: 'load-conversations-failed', cause: 'social-service-not-available' } }`
  since `NEXT_PUBLIC_USE_MOCK=false` will not be used until `social` ships.
- The endpoint constant `MESSAGING_EP.contacts = '/social/api/v1/contacts'` is
  provisional — it will be updated when BE confirms the correct service + path.

When `social` (or `iam`) ships a contacts/members endpoint, the only change needed is:
1. Update `MESSAGING_EP.contacts` to the confirmed path.
2. Implement the real `MessagingRepository.getContacts()` HTTP call.
3. If it is `iam` service: create a separate `ContactRepository` in `features/iam-member/`
   or reuse the existing `iam-member` endpoint constants.

## Alternatives Considered

1. **Use `iam` `/members` endpoint now** — `iam` is live. Implement real contact search
   via `GET /iam/api/v1/members?tenantId=...`. Rejected: out of scope for US-E10.1
   (messaging US, not iam wiring US). Premature wiring adds risk without shipping value
   before the messaging UI is validated.

2. **Assume `social` owns contacts and stub it immediately** — Already done via mock.
   The question is only about which service owns it in production. Deferred because
   the BE team has not confirmed ownership.

## Consequences

Positive:

- US-E10.1 delivers without blocking on BE service ownership decision.
- `IMessagingRepository.getContacts()` interface is defined — the contract is clear
  regardless of which service implements it.
- Mock fixtures provide realistic contact data for UI development and design review.

Tradeoffs:

- The provisional `MESSAGING_EP.contacts` path may need updating when BE confirms.
  Low risk — it is a constant string in one file.
- If contacts come from `iam`, a separate DI factory may be needed (not `messaging.di.ts`).
  This is a follow-up wiring task, not a design blocker.

## Follow-Up

- BE team to confirm: does `social` service own the contacts/user-directory endpoint, or
  does `iam` `GET /members` serve this purpose?
- On confirmation: update `MESSAGING_EP.contacts` + implement real repository method.
  If `iam`: create `ContactSearchUseCase` in `features/iam-member/domain/use-cases/`
  and wire via existing `iam-member.di.ts`.
