# US-E18.18 Notification wiring — SSE `/stream` + `unread-counts` + `presence` contract fix

## Status

implemented

## Lane

normal (epic table's own label). No auth/RBAC/token/session/tenant-isolation
hard gate trips beyond the already-covered BE-contract handling rule; no new
design-system token; no weakened validation; no NEW UI surface (reuses
dormant `unreadCount`/`isTyping` props already shipped, same "no design-review
gate" precedent as US-E18.17). Flagged for scope/blast-radius only (touches
`notification`, `messaging`, and the shared `bootstrap/realtime/*` SSE
contract module) — not a specific hard-gate hit.

## Dependencies

- Depends on: none directly, but reads/extends artifacts from US-E18.17
  (messaging rooms remap, ADR `0060`) — messaging's real repository,
  `HybridMessagingRepository`, `messaging.di.ts`.
- Blocks: none.
- Feature module(s) chạm: `src/features/notification/`,
  `src/features/messaging/` (presence + conversation unread enrichment +
  inbound typing/message realtime), `src/bootstrap/realtime/*` (shared SSE
  event contract), `src/bootstrap/endpoint/{notification,noti}.endpoint.ts`,
  `src/bootstrap/di/{notification,messaging}.di.ts`,
  `src/app/[locale]/api/stream/route.ts`.
- Shared contract/file: `src/bootstrap/realtime/event.ts` +
  `event-invalidation.ts` + `sse-connection.ts` are the single SSE contract
  used by BOTH the notification feature and the messaging feature — no other
  in-flight branch touches them (confirmed via `git fetch --prune`, no other
  `feat/*`/`fix/*` remote branch exists as of claim time).
- **Blocked (cross-repo, tracked before this US)**: Kong does not route
  `notification` at all (`gateway/kong/kong.yml` line 3: "notification is a
  worker (no HTTP) and is not routed here" — STALE per ground-truth below).
  This US proceeds contract-first, same deferred-verification pattern as ADR
  `0060`/US-E18.17.

## Product Contract

Ground-truthed against `edu-api/services/notification/docs/{openapi.yaml,
INTEGRATION.md,ERROR_CODES.md}` + `gateway/kong/kong.yml` +
`docs/decisions/0047-kong-auth-trust-model-review.md` (edu-api, read-only).

### Ground-truth correction #1 — kong.yml's comment is stale, not a hard block on HTTP existing

`kong.yml`'s top comment ("notification is a worker (no HTTP) and is not
routed here") describes the OLD `cmd/worker`-only shape. `INTEGRATION.md`
confirms the service has grown a full second process, `cmd/server`, exposing
a real `/api/v1/*` HTTP+SSE surface (`GET /stream`, `GET
/notifications/unread-counts`, `GET /presence`, plus push-device/preferences
endpoints out of this US's scope). The Kong-routing gap (cross-repo ask #1)
is real and still blocks LIVE verification — but it is an infra/ops gap (Kong
config hasn't caught up to the service's own growth), not evidence the HTTP
surface itself doesn't exist. Proceed contract-first per ADR `0060`'s
precedent.

### Ground-truth correction #2 — auth trust model makes the current direct-bypass proxy structurally incompatible, independent of the Kong gap

`docs/decisions/0047-kong-auth-trust-model-review.md` (accepted 2026-06-13,
AFTER the original SSE-proxy design in ADR `0009`/`0030`) retired per-service
Bearer-JWT verification. `notification`'s `cmd/server` now trusts ONLY the
Kong-injected `X-Edu-Claims`/`X-Edu-Claims-Sig` headers
(`RequireGatewayClaims`) — confirmed by `INTEGRATION.md`'s own curl examples,
which supply claims headers, not a Bearer token. ADR `0047`'s own Consequences
section states explicitly: "a direct call to a service carries no HMAC-signed
`X-Edu-Claims` header, so the service returns 401 regardless of the bearer
token" — this is a **closed** bypass path, not merely unrouted.

Consequence: `src/app/[locale]/api/stream/route.ts`'s real branch (fetches
`${NOTI_URL}${NOTI_EP.stream}` directly with `Authorization: Bearer <token>`,
bypassing Kong entirely — the ADR `0009`/`0030` design) will **structurally
401** in any real deployment that has adopted ADR `0047`, even once the path
is fixed and even if `NOTI_SERVICE_URL` pointed at a live service. This is a
SEPARATE, additional blocker to cross-repo ask #1 (Kong routing) — filed as
new cross-repo/product finding below. **Scope decision**: fix the path bug
(literal ask, zero regression, correct regardless) but do NOT attempt to
re-architect the proxy to route through Kong in this US (that requires Kong
routing to exist first — chicken/egg with ask #1). Document clearly; defer.

### Real contract (ground-truthed, `notification` service `cmd/server`)

| Endpoint | Auth | Notes |
| --- | --- | --- |
| `GET /api/v1/stream` | Kong gateway claims | SSE; frames: `message.new`, `message.edited`, `message.deleted`, `unread.updated`, `typing`, `: heartbeat` comment. **No `notification.new`/`attendance.updated`/`presence.changed` frame exists on the real wire at all** — see correction #3. |
| `GET /api/v1/notifications/unread-counts?roomIds=` | Kong gateway claims | Returns `{roomId, unreadCount}[]`, **per-room** (messaging), optionally filtered; never 500 (FR-084-011, 0 on Redis-down/missing counter). |
| `GET /api/v1/presence?userIds=` (1–50) | Kong gateway claims | Returns `{items: [{userId, online: boolean, lastSeen: string\|null}]}` — a flat **2-state** model (online/offline + timestamp), NOT the web's invented 3-state `online/recent/offline` enum. |
| `POST /notifications/devices`, `.../preferences` (push) | Kong gateway claims | Out of scope for this US (push registration, no web screen consumes it). |
| No `GET`/list/mark-read endpoint of any kind for generic notifications | — | Confirms epic table: `listNotifications`/`markRead`/`markAllRead` have **zero** real backing, not even a stub — force-mock permanently. |

Error taxonomy (ground-truthed, all UPPER_SNAKE): `UNAUTHORIZED_ACCESS` (401),
`INTERNAL_SERVER_ERROR` (500), `RESOURCE_NOT_FOUND` (404),
`INVALID_REQUEST_PARAMETERS` (422), `TOO_MANY_SSE_CONNECTIONS` (429, stream
only, unenforced), `PRESENCE_USER_IDS_REQUIRED`/`PRESENCE_USER_IDS_MAX_EXCEEDED`
(422, presence only). Notably **no dedicated error code for
`unread-counts`** — it degrades to `count: 0` rather than erroring per
FR-084-011.

### Ground-truth correction #3 — `unread-counts` is messaging-room-scoped, not generic-notification-scoped (implementation-time correction to the epic table's grouping)

The epic table files `unread-counts` under "Notification wiring" because the
route lives on the `notification` service. But its SHAPE
(`{roomId, unreadCount}[]`) is exclusively about **messaging room** unread
counts — there is no generic "grade/attendance/discipline/announcement/system
notification" unread concept anywhere on the real wire. This closes a gap
`US-E18.17`/ADR `0060` explicitly flagged (cross-repo ask #32(a): "real
`RoomSummary` has no unread-count field on the wire (client derives
locally)"): `messaging.repository.ts`'s `toConversationEntityFromRoom` mapper
hardcodes `unreadCount: 0` with a `GAP` comment pointing exactly at this. This
US closes that gap for real.

**Decision**: wire `unread-counts` into the **messaging** feature (enrich
`getConversations()`'s real branch), not the generic `notification` feature.
`notification`'s own `getUnreadCount()` (the bell badge, historically meant
to span grade/attendance/discipline/announcement/system categories) has
**no real equivalent whatsoever** — it is repurposed to return the
**messaging-room unread SUM** (the only real "unread count" concept that
exists), which is a real, if narrower, meaning; this must be called out
clearly as a behavior nuance (mock mode keeps its richer synthetic
multi-category count for demo/Storybook; real mode is messaging-only). This
mirrors the epic's own repeated pattern of "real diverges from mock's
invented semantics" (US-E18.7 `count`, US-E18.11 `room`, ADR `0060`'s
unread-count itself).

### Ground-truth correction #4 — the web's own `RealtimeEvent` SSE contract (`bootstrap/realtime/event.ts`) has ZERO overlap with the real wire's frame vocabulary

`event.ts`'s union (`notification.created`, `notification.new`,
`attendance.updated`, `session.revoked`, `message.new` w/ `{conversationId}`
payload, `presence.changed`) was invented speculatively (ADR `0009`: "web
defines this contract first; BE follows"). BE has now shipped
(`INTEGRATION.md`), and its actual frame vocabulary is entirely
messaging-scoped: `message.new` (rich payload: `roomId`, `messageId`,
`senderId`, `senderName`, `preview`, `createdAt`, `roomType` — no
`eventId`!), `message.edited`, `message.deleted`, `unread.updated`
(`{roomId, unreadCount}`), `typing` (`{roomId, userId, typing}` — **no
embedded `type` field in the data payload at all**, the SSE `event:` line IS
the type; **no `tenantId` either**). There is **no real
`notification.new`/`attendance.updated`/`presence.changed`/`session.revoked`
frame** documented anywhere in the notification service.

`session.revoked` is kept as-is (a legitimate, separately-justified,
mock-only future capability — no change; matches nothing on the real wire
today, stays dormant/mock-safe, out of scope to remove).

**Decision**: remap the union to the REAL shapes for the 4 messaging frames +
`typing`; relax `eventId`(now optional, absent on every real frame) and
`tenantId` (optional, absent specifically on `typing`); rename the existing
`message.new` payload field `conversationId`→`roomId` (aligns with the
already-real messaging vocabulary from US-E18.17) and update its one
consumer (`app-shell.tsx`'s pending-message pill). Keep
`notification.created`/`notification.new`/`attendance.updated`/
`presence.changed` in the union, clearly commented as **mock-only,
permanently — no real BE equivalent exists**; `createMockUpstream` keeps
emitting them (harmless — real mode simply never emits these, zero
regression) AND additionally emits sample real-shaped `message.new`/
`unread.updated`/`typing` frames so the new inbound wiring is demoable in
mock mode too.

### Ground-truth correction #5 — presence contract shape mismatch (query param name, response envelope, state cardinality)

`src/features/messaging/infrastructure/repositories/presence.repository.ts` +
`presence-response.dto.ts` are a full guess, wrong on 3 counts vs.
`GET /api/v1/presence`:
1. Query param is `userIds` (repo sends `memberIds`).
2. Response is `{items: [...]}` (repo expects a bare array).
3. Each item is `{userId, online: boolean, lastSeen: string|null}` — a
   flat 2-state model. The repo/DTO currently expects `{memberId, status:
   'online'|'recent'|'offline', lastActiveAt}` (3-state, sourced directly
   from the wire).

**Decision**: fix param name + envelope unwrap; keep the domain's existing
3-state `PresenceState`/`PresenceRecord.memberId` (zero VM/UI change) by
mapping the wire's 2-state `{online, lastSeen}` into the existing 3-state
model client-side: `online` when `online === true`; else derive `recent` vs
`offline` from `lastSeen` age using a documented threshold (5 minutes — no
existing product/design-spec value for this, flagged as an open product
question in Evidence, not a blocker: absence of a spec value does not block
wiring a sane default). Cap `userIds` at 50 per call (real hard limit,
`PRESENCE_USER_IDS_MAX_EXCEEDED`); if the messaging caller ever needs to
query more than 50 members in one batch, chunk client-side — verify actual
current caller sizes (contact lists / group member panels) stay well under 50
in practice; do not build unneeded chunking machinery if no realistic caller
exceeds it (note the finding either way).

## Scope table (what changes for real in this US)

| Area | Real wiring |
| --- | --- |
| SSE upstream path (`NOTI_EP.stream`) | Fixed: `/events/stream` → `/api/v1/stream` (direct-bypass call, unchanged proxy architecture — ADR `0009`/`0030` — live verification still deferred, correction #2 documented) |
| `bootstrap/realtime/event.ts` + `event-invalidation.ts` + `sse-connection.ts` | Remapped to the real `message.new`/`message.edited`/`message.deleted`/`unread.updated`/`typing` frame shapes; mock-only legacy types kept, clearly flagged |
| Messaging inbound realtime | NEW: `message.new`/`message.edited`/`message.deleted`/`unread.updated` invalidate `["messaging","conversations"]` + `["messaging","messages",roomId]`; `typing` drives the chat-window's inbound typing indicator (closes US-E18.17's explicitly deferred item) |
| `messaging.repository.ts` `getConversations()` | Enriched: best-effort fan-out to `GET /notifications/unread-counts` after the room list loads, merges real `unreadCount` per room (closes ADR `0060` ask #32(a)); failure of this enrichment call never fails the whole conversation list (falls back to `0`, same graceful-degradation precedent as US-E18.2's `activeAssignmentCount`) |
| `notification` feature (`getUnreadCount`) | Repurposed to call the real endpoint (no `roomIds` filter) and SUM `unreadCount` across the caller's rooms — real, but semantically narrower than mock (correction #3) |
| `notification` feature (`listNotifications`/`markRead`/`markAllRead`) | Force-mocked permanently via new `HybridNotificationRepository` — zero real backing exists (confirmed no endpoint at all) |
| `presence.repository.ts` + DTO + mapper | Fixed to real contract (correction #5); zero domain/VM change |
| `notification.entity.ts`/`RealtimeEvent`'s `notification.new` category system | Unchanged, mock-only forever — no BE equivalent |

## Relevant Product Docs

- `docs/product/realtime-events.md` (SSE contract doc — update to reflect the
  remap; do NOT create a parallel doc).
- `docs/stories/epics/E18-be-wiring/EPIC-OVERVIEW.md` (row US-E18.18, ask #1,
  new asks for the ADR-0047 direct-bypass finding + the event-vocabulary
  mismatch).
- `docs/decisions/0060-messaging-rooms-remap-contract-first.md` (ask #32(a),
  closed by this US), `0009` (original SSE contract-first decision), `0047`
  (edu-api, read-only — auth trust model).

## Acceptance Criteria

- `NOTI_EP.stream === "/api/v1/stream"`; mock mode (`NEXT_PUBLIC_USE_MOCK` or
  no `NOTI_SERVICE_URL`) is completely unaffected (still serves
  `createMockUpstream`).
- `RealtimeEvent`'s `message.new`/`message.edited`/`message.deleted`/
  `unread.updated`/`typing` variants match the real wire shapes exactly
  (ground-truthed field names); `eventId` is optional across the union;
  `tenantId` is optional specifically for `typing`.
- Receiving a real-shaped `message.new`/`message.edited`/`message.deleted`/
  `unread.updated` frame invalidates `["messaging","conversations"]` (always)
  and `["messaging","messages", roomId]` (when a `roomId` is present on the
  payload) — proven via the existing `qc.invalidateQueries` pattern used by
  `presence-invalidation.test.ts`.
- Receiving a `typing` frame for the currently-open conversation's `roomId`
  drives `ChatWindow`'s inbound typing indicator on/off (per
  `payload.typing`); a `typing` frame for a different `roomId` is ignored.
- `NEXT_PUBLIC_USE_MOCK=false`: `MessagingRepository.getConversations()`
  calls `GET /rooms` then best-effort enriches each conversation's
  `unreadCount` via `GET /notifications/unread-counts?roomIds=...`; a failure
  of the enrichment call degrades to `unreadCount: 0` and does NOT fail the
  whole conversations list.
- `NEXT_PUBLIC_USE_MOCK=false`: `NotificationRepository.getUnreadCount()`
  calls the real endpoint (no filter) and returns the sum of `unreadCount`
  across all returned rooms; `listNotifications`/`markRead`/`markAllRead`
  are force-mocked regardless of `USE_MOCK` (new `HybridNotificationRepository`,
  same pattern as `HybridMessagingRepository`).
- `PresenceRepository.getPresence()` sends `userIds` (not `memberIds`),
  unwraps `{items: [...]}`, and derives the domain's existing 3-state
  `PresenceState` from the wire's `{online, lastSeen}` — zero change to
  `IPresenceRepository`'s public signature or `PresenceRecord` shape (VM/UI
  untouched).
- Full existing test suite (notification + messaging + realtime) passes with
  zero regression; mock-mode behavior for every existing screen/story is
  byte-for-byte unchanged.
- `bunx tsc --noEmit` and `bun run build` clean.
- No new i18n keys needed (no new UI copy; reuses existing typing-indicator
  and unread-badge presentation).

## Design Notes

- No new component/screen — reuses `ChatWindow`'s already-shipped (dormant)
  `isTyping` prop and `ConversationEntity.unreadCount` (already rendered by
  `ConversationItem`/`ConversationList`). Per the epic's "Design Source" rule,
  the design-review gate is not separately invoked (no new state UI) — same
  precedent as US-E18.17.
- `fe-accessibility-auditor` still runs (lighter touch) since the typing
  indicator moves from permanently-mock to live-real-data-driven — confirm no
  regression to the existing aria-live/motion-safe treatment already audited
  in US-E16.5.

## Validation

`scripts/bin/harness-cli story update --id US-E18.18 --status implemented --unit 1 --integration 1 --e2e 0 --platform 1`
(no `e2e`/live-gateway proof — deferred: Kong doesn't route `notification`
AND the direct-bypass proxy is separately incompatible with ADR `0047`, see
correction #2).

| Layer | Expected proof |
| --- | --- |
| Unit | `event.ts`/`event-invalidation.ts` remap tests (real frame shapes, optional eventId/tenantId, typing dispatch); `notification.mapper`/`presence` mapper tests (2-state→3-state derivation); `get-unread-count.use-case` sum-across-rooms test. |
| Integration | `notification.repository.test.ts` (real `unread-counts` call + sum), `presence.repository.test.ts` (param rename + envelope unwrap), `messaging.repository.test.ts` (unread-counts enrichment + graceful degradation), `sse-connection.test.ts` (typing/message.new/unread.updated dispatch → invalidation), route/proxy path test. Mock repos updated to match (`HybridNotificationRepository`). |
| Platform | `bunx tsc --noEmit`, `bun run build` clean. |
| Release | Full `bun vitest run` zero-regression; merge to `main` on gate-green. |

## Harness Delta

- Story `US-E18.18` registered `normal`.
- ADR to register: real SSE/unread-counts/presence contract remap +
  ADR-0047 direct-bypass incompatibility finding (number = next after `0060`
  at claim time — confirm before registering, another epic US may have
  landed a decision in between).
- `docs/TEST_MATRIX.md` — add the `US-E18.18` row once proof lands.
- `docs/product/realtime-events.md` — sync the remapped contract (no new
  parallel doc).
- `EPIC-OVERVIEW.md` — mark the US-E18.18 row done with the actual scope
  decision + append cross-repo asks (ADR-0047 direct-bypass finding,
  event-vocabulary mismatch, presence 5-minute-threshold open product
  question).

## Evidence

- **Scope delivered** exactly per the Scope table: SSE path fixed
  (`/events/stream`→`/api/v1/stream`); `RealtimeEvent` remapped to the real
  flat wire vocabulary for `message.new`/`message.edited`/`message.deleted`/
  `unread.updated`/`typing` (eventId optional, tenantId optional only for
  `typing`, tenant-scoping confirmed strict for every other type by review);
  legacy mock-only frame types kept and clearly flagged; `createMockUpstream`
  extended with real-shaped sample frames. `messaging.getConversations()`
  real-mode best-effort enriches `unreadCount` via the real per-room
  endpoint, degrading to 0 on failure (closes ADR 0060 ask #32(a)).
  `notification.getUnreadCount()` real (sums per-room counts);
  `listNotifications`/`markRead`/`markAllRead` force-mocked permanently via
  new `HybridNotificationRepository`. Presence contract fixed (`userIds`,
  `{items:[...]}` envelope, real 2-state DTO→existing 3-state domain model
  via an injected-clock 5-min threshold) with zero VM/UI change. Inbound
  `typing` wired to `ChatWindow`'s dormant indicator, room-scoped correctly.
  `ensureFreshSession()` added to both `notification.di.ts` and
  `messaging.di.ts`'s `makePresenceRepo()`.
- **Tests**: full suite `bun vitest run` → **389 files / 2527 tests pass**
  (zero regression vs the 385/2492 baseline before this US — +4 files/+35
  tests). Storybook messaging+notification scope 79/86 (7 pre-existing
  failures confirmed via `git stash` bisection against `main`, unrelated to
  this US — `message-context-menu`/`Create Group Optimistic Prepend`/
  `Reply Strip Active`/`notifications-center` stories). `bunx tsc --noEmit`
  clean. `bun run build` clean (real mode, `NEXT_PUBLIC_USE_MOCK` unset).
- **fe-tech-lead-reviewer**: implementation **Approved** — clean layering,
  correct `raw:true` top-level placement (unread-counts/presence calls don't
  need it — both are enveloped, non-paginated), graceful-degradation and
  force-mock claims verified against actual branch logic (not just
  self-report), tenant-isolation regression risk from the `typing`-only
  `tenantId` relaxation explicitly checked and cleared, deterministic
  injected-clock presence derivation confirmed, `ensureFreshSession()`
  placement confirmed correct in both DI factories. Initial verdict
  **Revision Required** — scoped ONLY to durable-artifact gaps (missing ADR,
  missing TEST_MATRIX row, stale EPIC-OVERVIEW row) per the story's own
  Harness Delta — closed same-session by the lead (ADR `0061` registered,
  this row added, EPIC-OVERVIEW row + cross-repo asks #33-#35 appended). Two
  CONSIDER (non-blocking) notes: a second concurrent `EventSource` opened by
  the messaging screen on `/messages` (pre-existing pattern, precedent
  `use-notification-new-event.ts`) and an unencoded `roomIds.join(",")` in
  the unread-counts query string (server-generated ids, low risk) — logged
  as follow-ups, not blockers.
- **fe-accessibility-auditor**: **PASS**, no findings. Confirmed the live
  typing indicator reuses the EXACT SAME already-audited US-E16.5
  `TypingIndicator` component/markup (diff on that component/keyframe is
  empty) — no new component, no bypass, motion-safe/aria-live/sr-only
  treatment unchanged. Room-scoping (no cross-room/stale-status leakage)
  independently confirmed via `typing-inbound.test.ts`. One non-blocking
  product observation (out of this US's scope): the indicator is gated
  `!isGroup && isTyping` in `chat-window.tsx`, so a real `typing` frame for
  an open GROUP conversation is silently dropped (no misleading state, just
  no indicator) — flagged as a future-US candidate, needs its own
  design-review pass if prioritized.
- **fe-qa-playwright**: **GO**. Independently mapped and verified all 10 ACs
  against concrete tests (not self-report) — 10/10 covered. Found + closed 3
  real test-coverage gaps (all test-only, no production code changed): (1)
  new `route.test.ts` proving the SSE proxy's real branch actually fetches
  `NOTI_SERVICE_URL + /api/v1/stream` with a Bearer token — AC-1's literal
  subject had zero direct test before this; (2) a real Storybook interaction
  test (`InboundTyping_TogglesIndicatorForOpenRoomOnly`) proving the `typing`
  wiring end-to-end (fake EventSource → dispatch → rendered indicator
  toggle), not just the pure-reducer unit test; (3) exact ±1-second boundary
  tests around the presence 5-minute "recent" threshold (would have caught a
  `>`/`>=` off-by-one silently before). Zero production defects found. One
  INFO-level note (not a regression, pre-existing, out of scope): `NOTI_EP
  .presence` still points at `/noti/api/v1/presence` rather than the
  ground-truthed bare `/api/v1/presence` — correction #5 in this packet only
  scoped param-name/envelope/cardinality fixes, not the path; flagged for a
  future US, already had an in-repo TODO comment predating this story.
- **Commits** (in order): `54166c4` feat (SSE contract remap + path fix) ·
  `dd8efa4` feat (notification real unread-counts + hybrid force-mock) ·
  `9051a72` feat (presence fix + inbound typing) · `87cc41f` docs (realtime
  contract sync) · `4e96680` chore (engineer agent-memory) · `78e5575` docs
  (ADR 0061 + EPIC-OVERVIEW, lead) · `ed356f8` test (QA gap closure) ·
  `487651a` chore (QA agent-memory).
- **Deferred** (ADR `0061` §Consequences): live end-to-end verification —
  TWO independent reasons: Kong does not route `notification` (cross-repo
  ask #1/#33), AND edu-api ADR `0047`'s auth trust model makes the existing
  direct-bypass SSE proxy structurally incompatible even once Kong routes it
  (a second, separate unblock needed later).
- **Cross-repo/product findings** logged to `EPIC-OVERVIEW.md` asks #33-#35:
  (a) Kong routing gap + ADR-0047 direct-bypass incompatibility (two
  independent blockers, both must clear before live verification); (b) no
  generic multi-category notification-bell concept exists on the real wire
  at all — `notification`'s list/mark-read stays permanently mock, needs new
  BE surface if ever prioritized; (c) presence's 5-minute "recent" threshold
  is an unconfirmed engineering default, no product/design-spec value
  exists — flagged for `/uiux`/`/ba` confirmation.
