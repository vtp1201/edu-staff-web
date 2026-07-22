# US-E18.17 Messaging remodel — rooms/DMs + read/typing/moderation

## Status

implemented

## Lane

high-risk (epic table's own label — vocabulary change touches every
`IMessagingRepository` method + the failure taxonomy; contract-first with NO
live-gateway proof since Kong does not route `/social` yet, ADR `0060`). No
auth/RBAC/token/session/tenant-isolation hard gate trips beyond the
already-covered BE-contract handling rule; no new design-system token; no
weakened validation. Flagged high-risk primarily for **scope/blast-radius**
(every repository method touched) and **deferred verification** (see ADR
`0060` §4), not for a specific hard-gate hit.

## Dependencies

- Depends on: none (independent of Wave 1-3; social service ground-truth read
  directly from `edu-api`, read-only).
- Blocks: none.
- Feature module(s) chạm: `src/features/messaging/`,
  `src/bootstrap/{endpoint,di}/messaging.di.ts` + `messaging.endpoint.ts`.
- Shared contract/file: none (no other in-flight US touches `messaging`).
- **Blocked (cross-repo, tracked before this US and still open)**: Kong does
  not route `/social` — ask #1 in `EPIC-OVERVIEW.md`. This US proceeds
  contract-first per ADR `0060`; live-gateway verification is explicitly
  deferred, not solved here.

## Product Contract

Ground-truth `edu-api/services/social/docs/{openapi.yaml,INTEGRATION.md,
ERROR_CODES.md}` for the `Rooms`/`Members`/`Messages`/`Read State`/`School
DMs`/`Global DMs`/`Profile Directory` tags and remap
`src/features/messaging/domain/repositories/i-messaging.repository.ts`'s real
implementation to match. Per zero-regression AC, every EXISTING screen
(inbox, chat window, contact picker, group info panel) keeps its exact
current behavior in mock mode; the real repository is wired in parallel
(selected by `NEXT_PUBLIC_USE_MOCK=false`) and is a byte-for-byte behavioral
match for the slice that has a real mapping. See ADR `0060` for the full
scope decision and rationale (what's wired real vs. permanently mock).

### Real contract (ground-truthed)

- `GET /api/v1/rooms?userId=<self>` — list rooms (cursor-paginated,
  `RoomSummary[]`: `roomId, scope, roomType, name, lastMessagePreview,
  lastMessageAt, status, requestStatus?`). Exactly one of `userId`/`tenantId`
  required (`ROOM_LIST_FILTER_REQUIRED`, 422); mismatched `userId` vs the
  caller's own claim → `FORBIDDEN_ACTION` (403, IDOR guard, US-085).
- `GET /api/v1/rooms/{roomId}/messages?cursor=&limit=` — message history,
  `Message[]` (`messageId, roomId, senderUserId, text, status, editCount,
  editedAt?, deletedAt?, createdAt, media?`), real cursor pagination via
  `meta.pagination`.
- `POST /api/v1/rooms/{roomId}/messages` — send (`{text}` only; media
  multipart out of scope for this US). 403 `ROOM_NOT_MEMBER`; 409
  `ROOM_ARCHIVED` or (SCHOOL DM only) `ROOM_DM_REQUEST_PENDING_SEND_LIMIT`.
- `DELETE /api/v1/rooms/{roomId}/messages/{messageId}` — self soft-delete,
  **5-minute** mutation window (`DELETE_WINDOW_EXPIRED`, 403 — NOT the web's
  previously-invented 1 hour), `NOT_MESSAGE_SENDER` (403),
  `MESSAGE_ALREADY_DELETED` (404).
- `POST /api/v1/rooms/school-dms` `{targetUserId}` — find-or-create the
  same-tenant 1:1 DM (US-118/ADR-0089). 200 existing / 201 new. Role pair
  gate (`ROOM_DM_ROLE_PAIR_NOT_ALLOWED`), cross-tenant guard
  (`ROOM_CROSS_TENANT_DM_NOT_SUPPORTED`), self-target
  (`ROOM_INVALID_USER_ID`, 400). Returns `requestStatus: pending|accepted`.
- `POST /api/v1/rooms/{roomId}/read` — mark all messages read, 204, no body.
- `POST /api/v1/rooms/{roomId}/typing` `{typing: boolean}` — best-effort
  broadcast, 204, no body; rate-limited ~3s/user/room (`429`,
  `TooManyRequests`). No persistence, no ack payload.
- `GET /api/v1/social/tenants/{tenantId}/members/directory` — the ONLY
  people-directory endpoint; gated to `ADMIN`/`TEACHER` tenant-wide staff
  callers (`PROFILE_NOT_FOUND` 404 for anyone else, enumeration-safe). Not
  wired this US (see ADR `0060` §3) — documented so a future
  role-forked contact picker can start from here.
- No message-pin endpoint and no ad hoc/self-service group-room
  create/rename/membership endpoint exist at all (see ADR `0060` Context).

### Scope table (what changes in `IMessagingRepository`'s real implementation)

| Method | Real wiring |
| --- | --- |
| `getConversations` | **Real** — `GET /rooms?userId=` |
| `getMessages` | **Real** — `GET /rooms/{id}/messages`, real cursor (fixes hardcoded `hasMore:false`) |
| `sendMessage` | **Real** — `POST /rooms/{id}/messages` |
| `deleteMessage` | **Real** — `DELETE /rooms/{id}/messages/{msgId}`, window corrected to 5 min |
| `createConversation` | **Real for 1:1 only** (`contactIds.length===1`) — `POST /rooms/school-dms`; `length>1` → `create-conversation-failed` (group path, see below) |
| `markConversationRead` *(NEW)* | **Real** — `POST /rooms/{id}/read` |
| `sendTypingIndicator` *(NEW)* | **Real** — `POST /rooms/{id}/typing` (outbound only; inbound signal stays mock, needs SSE/E18.18) |
| `getContacts` | **Stays mock permanently** — role-gated real endpoint, no fork in current UI |
| `createGroup`/`getGroup`/`updateGroup`/`addGroupMembers`/`removeGroupMember`/`leaveGroup`/`deleteGroup` | **Stays mock permanently** — no self-service group contract |
| `pinMessage`/`unpinMessage` | **Stays mock permanently** — no wire capability |

## Relevant Product Docs

- `docs/product/screens.md` (messaging screen entry — unchanged, no new UI).
- `docs/decisions/0060-messaging-rooms-remap-contract-first.md`.
- `docs/stories/epics/E18-be-wiring/EPIC-OVERVIEW.md` (row US-E18.17, ask #1,
  new ask #32).

## Acceptance Criteria

- With `NEXT_PUBLIC_USE_MOCK=false`, `getConversations`/`getMessages`/
  `sendMessage`/`deleteMessage`/1:1 `createConversation` call the real
  `/social/api/v1/rooms...` paths, unwrap the envelope via the shared HTTP
  client, and map every ground-truthed error code to a stable
  `MessagingFailure` (never branching on `error.message`).
- `markConversationRead` and `sendTypingIndicator` exist as new
  `IMessagingRepository` methods + use-cases, wired real; the mock repository
  implements deterministic equivalents (unread reset / no-op ack) so
  `NEXT_PUBLIC_USE_MOCK=true` behavior stays fully exercisable in
  Storybook/tests.
- Opening a conversation in the messaging screen calls `markConversationRead`
  and the conversation's `unreadCount` reflects the server round-trip (mock
  mode: local reset, same visible behavior as today).
- The compose input firing a typing signal calls `sendTypingIndicator`
  best-effort (fire-and-forget; a failure — incl. 429 — never surfaces as a
  user-facing error, never blocks sending).
- The client-side delete-window pre-check (`delete-message.use-case.ts` +
  `message-context-menu.tsx`) uses 5 minutes, matching the real
  `DELETE_WINDOW_EXPIRED` rule; a reactive 403 past the window (race) maps to
  a new `delete-window-expired` failure.
- `getContacts`, the whole group lifecycle, and `pinMessage`/`unpinMessage`
  are unchanged (still call the mock-shaped stub in real mode as documented
  by ADR `0060` — i.e. the DI factory force-mocks exactly these methods
  regardless of `USE_MOCK`, same hybrid pattern as US-E18.4/US-E18.5/
  US-E18.11) — zero UI/behavior change for any of these flows.
- Full existing messaging test suite (mapper/use-case/mock-repo/presentation)
  passes unchanged — zero regression.
- `bunx tsc --noEmit` and `bun run build` are clean.
- No new i18n keys needed unless a new failure type requires a new error
  message (`delete-window-expired`) — added to both `vi.json`/`en.json` in
  the same commit if so.

## Design Notes

- Commands: `sendMessage`, `deleteMessage`, `createConversation` (1:1),
  `markConversationRead` (NEW), `sendTypingIndicator` (NEW).
- Queries: `getConversations`, `getMessages`.
- API: see "Real contract" table above; endpoint constants live in
  `bootstrap/endpoint/messaging.endpoint.ts` (`MESSAGING_EP`) — replace the
  invented `/conversations`/`/groups` paths with `/rooms`-shaped ones,
  following the SAME `/social/api/v1/...` prefix convention already
  established by `MODERATION_EP`/`FEED_EP` (US-E19.1/US-E19.2) — no new
  prefix invention.
- Domain rules: current-user id resolved server-side via the access-token
  `sub` claim (`decodeSubClaim`, same precedent as `attendance.di.ts`/
  `teacher-class.di.ts`/`timetable-view.di.ts`), never a client-supplied
  param — needed for the mandatory `?userId=` filter on `GET /rooms`.
- UI surfaces: NONE new. `isTyping`/`unreadCount` props already exist on
  `ChatWindow`/`ConversationEntity` (dormant, mock-only) — this US gives them
  a real outbound write path; no new component, no new visual state, no
  design-review-gate-triggering change (per epic's "Design Source" note:
  gate applies only when a US adds new state UI).

## Validation

`scripts/bin/harness-cli story update --id US-E18.17 --status implemented --unit 1 --integration 1 --e2e 0 --platform 0`
(no `e2e`/live-gateway proof — deferred per ADR `0060` §4).

| Layer | Expected proof |
| --- | --- |
| Unit | New/updated tests: mapper (room→conversation, message shape), `delete-message.use-case.test.ts` (5-min window), new `mark-conversation-read.use-case.test.ts`, new `send-typing-indicator.use-case.test.ts`. |
| Integration | `messaging.repository.test.ts` (new/updated) — real interceptor pipeline per repo (mocked `http.get/post/delete`), error-code→failure mapping table test (ROOM_*/MESSAGE_*/SOCIAL_* codes), pagination via `{raw:true}`+`parseEnvelope`. Mock repo test updated to match. |
| E2E | None — no new UI surface (existing Storybook/Playwright suite must stay green, zero regression). |
| Platform | `bunx tsc --noEmit`, `bun run build` clean. |
| Release | Full `bun vitest run` zero-regression; merge to `main` on gate-green. |

## Harness Delta

- Story `US-E18.17` registered `high-risk`.
- Decision `0060` registered (rooms/dms remap, contract-first, deferred
  verification, group/pin/contacts permanently-mock scope).
- `docs/TEST_MATRIX.md` — add/update the `messaging` row(s) once proof lands.
- `EPIC-OVERVIEW.md` — mark the US-E18.17 row done with the actual scope
  decision (not the original "blocked" label) + append cross-repo/product ask
  #32 (ad hoc group creation has no real contract; contact picker directory
  is role-gated).

## Evidence

- **Scope delivered** exactly per ADR `0060`'s scope table: real-wired
  `getConversations`/`getMessages`/`sendMessage`/`deleteMessage`/1:1
  `createConversation` against `/social/api/v1/rooms...`; NEW additive
  `markConversationRead`/`sendTypingIndicator` (real, wired into
  `messaging-screen.tsx`'s open-conversation effect + `chat-window.tsx`'s
  throttled compose `onTyping`); `getContacts`/full group lifecycle/
  `pinMessage`/`unpinMessage` force-mocked via the new
  `HybridMessagingRepository` facade (never a doomed HTTP call in real mode).
  Self-delete window corrected 1h→5min (`FIVE_MINUTES_MS`), including the
  presentation-layer disabled-state copy (`messaging.contextMenu.deleteExpired`,
  vi+en) that the a11y audit caught still saying "1 hour".
- **Tests**: full suite `bun vitest run` → **385 files / 2492 tests pass**
  (zero regression; +2 from the initial 2490 baseline are the QA-added
  delete-window boundary tests). `bunx tsc --noEmit` clean. `bun run build`
  clean (no stray `NEXT_PUBLIC_USE_MOCK` leak).
- **fe-tech-lead-reviewer**: **Approved**. One SHOULD-FIX (dead
  permanently-mock endpoint constants with a stale-path/misleading comment)
  — fixed same-session (`705d557`).
- **fe-accessibility-auditor**: 1 Major finding (A11Y-001 — delete-window
  disabled-hint copy said "1 hour", the real/corrected rule is 5 minutes) —
  fixed same-session (`2a062df`). No new UI surface confirmed (no new
  component/state/animation/aria-live); design-review gate not separately
  invoked per the epic's own rule (gate applies only when a US adds new
  state UI — this one doesn't).
- **fe-qa-playwright**: **GO**. Found + closed (test-only) 2 real coverage
  gaps: exact 5-minute delete-window boundary test, and call-assertion
  (`fn()` spies) for the mark-read/typing wiring in
  `messaging-screen.stories.tsx` (previously only stubbed with no
  assertion). Confirmed 2 pre-existing, unrelated Storybook failures
  (`Create Group Optimistic Prepend`, `Reply Strip Active`) via `git stash`
  bisection — NOT a regression from this US.
- **Commits** (in order):
  `66faefa` docs (packet + ADR 0060) ·
  `860f84e` fix (5-min delete window) ·
  `6b03bc5` feat (real repo remap) ·
  `060fe91` feat (mark-read + typing presentation wiring) ·
  `2530527` chore (engineer agent-memory) ·
  `2a062df` fix (A11Y-001 copy fix) ·
  `705d557` chore (dead endpoint constants cleanup) ·
  `cacbe54` test (QA gap closure) ·
  `d3a29b3` chore (QA agent-memory).
- **Deferred** (ADR `0060` §4): live-gateway verification — Kong does not
  route `/social` yet (cross-repo ask #1). No `make stack-up` smoke exists
  for this US, unlike US-E18.0's school-config proof-of-pattern.
- **Cross-repo/product findings** logged to `EPIC-OVERVIEW.md` ask #32: (a)
  real `RoomSummary` has no unread-count/avatar/color field on the wire
  (client derives locally); (b) ad hoc self-service group-room creation has
  no real contract; (c) the only people-directory endpoint is role-gated to
  ADMIN/TEACHER, blocking a role-agnostic contact picker; (d) real message
  timestamps are ISO-only (no relative "Hôm nay"/"Hôm qua" label from the
  wire) — real mode renders a numeric date/time instead, only observable
  once Kong routes `/social`.
