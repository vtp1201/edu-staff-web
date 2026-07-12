# US-E10.6 — Messaging Presence — Integration Map

Source: `requirements.md` (TR-101) + `.claude/rules/api-integration.md` (service
map, decision `0017`) + `docs/decisions/0009-realtime-transport-sse.md` +
`docs/decisions/0041-sse-client-in-presentation-layer.md`.

## Naming correction (flag for `ba-lead`)

The DR (`docs/design-requests/DR-017-messaging-presence.md`) and
`requirements.md`'s `dataDependencies`/`externalDependencies` refer to the
owning service as **"notification"**. The canonical service-map name (decision
`0017`, `.claude/rules/api-integration.md`) is **`noti`**. This map uses `noti`
consistently below. No ADR needed for this — it's a terminology alignment, not
a contract change — but `ba-lead` should note it so downstream specs (use-case
model, spec-writer traceability matrix) don't reintroduce "notification" as a
service label.

## 1. Integration Overview

- **Endpoints touched: 2** — one REST (presence snapshot), one realtime
  (presence-change event riding the *existing* SSE stream — not a second
  mechanism).
- **Service: `noti`** only. No `social`/`core`/`lms` calls added by this US
  (the messaging entities that presence attaches to — `ContactEntity`,
  `ConversationEntity`, `GroupMember` — already live in `social`, wired
  mock-first per US-E10.1/US-E10.4; this US only adds a `presence` field to
  their shape, not a new `social` call).
- **Real vs mock-first:**
  - SSE transport itself (`GET /api/v1/stream` proxy) — **REAL**, already
    implemented (`src/app/[locale]/api/stream/route.ts`, decision `0009`/`0041`,
    US-E06.2). Adding the `presence.changed` event type is **additive** to an
    existing typed union, not new plumbing.
  - `GET /api/v1/presence` (snapshot) — **MOCK-FIRST**. `noti`'s only confirmed
    live HTTP surface today is the SSE stream itself; its REST surface
    (`ANNOUNCEMENTS_EP`, US-E10.3) is *also* still mock-first pending real
    wiring (see `src/bootstrap/endpoint/noti.endpoint.ts` — "notification is a
    background worker — no HTTP route through Kong, ADR 0030"; announcements
    comment: "Real wiring lands when the noti HTTP surface exists"). No
    `openapi.yaml`/`INTEGRATION.md` reference for a `/presence` route exists
    in this repo (no sibling `edu-api` checkout reachable from this workspace
    to confirm directly) → treat as unconfirmed, proceed mock-first per
    decision `0014`, matching the requirements doc's own assumption.
- **Risk notes:**
  - FR-006 (live update) is *Should*, not *Must* — mock-first snapshot +ellipsis poll/refetch is an acceptable v1 fallback; do not block the US on the
    SSE event type landing.
  - Presence must never leak cross-tenant (NFR-006 + general SSE tenant
    scoping) — both the snapshot endpoint and the event MUST be tenant-scoped
    server-side; the existing `shouldHandle()` client-side drop is
    defense-in-depth, not the primary control.
  - `docs/product/realtime-events.md` is the durable contract doc for the SSE
    event taxonomy (decision `0009`, "web defines contract first") — adding
    `presence.changed` there is an infra concern for `fe-state-engineer`/
    `fe-nextjs-engineer`, flagged here so it isn't missed.

## 2. Endpoint Catalogue

### INT-401 — Get Presence Snapshot

```
Service: noti                          Method+Path: GET /noti/api/v1/presence
Status: MOCK-FIRST (noti REST HTTP surface not confirmed live — see overview)
Protected: yes                          Role required: any authenticated staff/school role (teacher, principal, student, parent) — no role gating (requirements §actors, all four identical)
```

**Request (outbound, camelCase):**
- `memberIds` — repeated query param or comma-joined list of contact/user IDs
  currently rendered (conversation-list contacts + open DM's contact + open
  group's member list) — the caller batches per screen, not a global fetch |
  Internal (opaque IDs only, no PII in the request itself)

**Response payload (inbound, after envelope unwrap):** array of:
- `memberId` — user/contact ID the entry describes | Internal
- `status` — `"online" | "recent" | "offline"` — the 3-state union | Internal
- `lastActiveAt` — ISO 8601 timestamp, **coarse-bucketed** (minute/day bucket
  only per NFR-006 — never a precise last-seen instant) | Internal,
  low-sensitivity (behavioral signal, not identity PII, but still
  tenant-scoped — do not expose to other tenants)

**Pagination:** none — bounded request set (only currently-rendered
contacts/members are queried, not the full directory).

**Errors → UI behavior:**
- `401`/session expired → standard reactive refresh (decision `0018`), then
  retry the presence fetch transparently — never surfaced to the user as a
  presence-specific error.
- Any fetch failure/timeout/5xx → **no dot rendered** (treated as
  offline/unknown per FR-001/FR-002 `errorConditions`) — never shows a stale
  or guessed state. Retryable via normal TanStack Query background refetch,
  not a blocking error UI.
- Member ID not present in the response (e.g. contact has no presence record)
  → treated as offline (safe default per FR-004 `errorConditions`) — no dot,
  sorted last in group panel, excluded from the "N online" count.
- Cross-tenant member ID somehow requested → server MUST filter/omit (never
  return); if it slipped through, `shouldHandle`-equivalent client filtering
  should drop it before render (defense-in-depth, mirrors SSE tenant guard).

**Empty / loading expectation:** progressive, non-blocking (NFR-005) — avatar
renders immediately with no dot; dot/caption appear in place once the presence
fetch resolves. This does **not** gate or delay the existing
conversation-list/chat-window/group-panel skeleton states — presence is a
layer on top, never a new loading gate.

---

### INT-402 — Presence realtime event (reuses existing SSE stream)

```
Service: noti                          Method+Path: GET /api/v1/stream (existing proxy: src/app/[locale]/api/stream/route.ts)
Status: REAL — transport already implemented (decision 0009/0041, US-E06.2); only the "presence.changed" event TYPE is new (additive to an existing typed union)
Protected: yes                          Role required: same as INT-401 (no role gating); auth via same-origin cookie handled inside the proxy route, never client-readable
```

**Request (outbound):** none — subscription only. The existing hook already
opens `EventSource` at `/${locale}/api/stream?tenant=${tenantId}` with
`withCredentials: true`; no new connection is opened for presence (decision
`0041` explicitly warns against a second SSE mechanism — reuse the one
connection, add a listener/case).

**Response (event payload, after `parseEvent()`):** new literal to add to the
`RealtimeEvent` union in `src/bootstrap/realtime/event.ts` (same envelope
shape as every existing event type — `eventId`/`tenantId`/`occurredAt` are
unchanged, only `type` + `payload` are new):
```ts
{
  type: "presence.changed";
  eventId: string;
  tenantId: string;
  occurredAt: string;
  payload: {
    memberId: string;
    status: "online" | "recent" | "offline";
    lastActiveAt: string; // coarse bucket, same rule as INT-401
  };
}
```
- `payload.memberId` — user/contact whose presence changed | Internal
- `payload.status` — 3-state union | Internal
- `payload.lastActiveAt` — coarse bucket | Internal, tenant-scoped

**Pagination:** none (event stream).

**Errors → UI behavior:**
- Stream disconnected (`sseStatus === "disconnected"`) → **stale-while-revalidate**: keep last-known presence exactly as-is (FR-006 `errorConditions` — "no dot flips to an error state"). The existing global
  `SseDisconnectBanner` (US-E08.6) already surfaces the overall connection
  problem; presence does not need its own disconnect UI.
- Malformed frame → `parseEvent()` returns `null`, silently dropped (existing
  behavior, no change needed).
- Cross-tenant event → `shouldHandle(event, tenantId)` drops it client-side
  (existing behavior) — defense-in-depth on top of server-side tenant scoping.

**Empty / loading expectation:** N/A — this is a push event, not a query;
initial state always comes from INT-401's snapshot fetch.

**How each render site subscribes (invalidation targets, extend
`src/bootstrap/realtime/event-invalidation.ts`'s `queryKeysFor()`):**
- **Conversation-list avatar** (FR-001) — invalidate the messaging
  conversations/contacts list query key so the list refetches presence
  merged with the existing mock/real conversation data.
- **DM chat-header avatar + caption** (FR-002) — same invalidation target as
  above is sufficient for v1 (refetch-driven); an optional screen-local hook
  mirroring `useNotificationNewEvent` (US-E10.2 pattern) could apply the
  event optimistically without waiting for refetch, but that's an
  implementation choice for `fe-state-engineer`/`fe-nextjs-engineer`, not
  required by FR-006 ("Should").
- **Group member-info panel** (FR-004) — invalidate the group members query
  key (`groupMembers(groupId)`-scoped) so the panel refetches, re-derives
  `presence` per member, re-sorts online-first, and recomputes the "N online"
  count.

This is invalidate-and-refetch, consistent with every other event type in
`event-invalidation.ts` — **no hand-patched cache**, per decision `0009`'s
"web reacts by invalidating" principle.

## 3. Auth & Security

- Both INT-401 and INT-402 are **protected** — Bearer token in httpOnly
  cookie, never client-readable (decision `0018`). No role gating (all four
  roles see identical presence data per requirements §actors).
- **Tenant scoping is the critical control** (NFR-006 + general multi-tenant
  rule, decision `0007`): the `noti` service MUST scope the presence snapshot
  response and the `presence.changed` event to the requesting tenant —
  presence must not leak across tenants (e.g. a parent in tenant A must never
  see a teacher's presence in tenant B, even if IDs collide). SSE already has
  a tenant filter (`shouldHandle()`); the same guarantee must exist
  server-side for `noti`'s presence source, since client-side filtering alone
  is not a security boundary.
- **PII posture:** presence is intentionally coarse — 3-state bucket +
  minute/day-bucketed `lastActiveAt`, no precise timestamp, no location, no
  device info. This matches the existing `isOnline` boolean's exposure level
  (NFR-006) — no new PII surface introduced.
- No new endpoint requires elevated role; this is symmetric visibility
  (teacher sees student's presence, student sees teacher's presence, etc.) —
  consistent with the existing DM/group membership model (you only see
  presence for contacts/members you already share a conversation with, since
  `memberIds` in INT-401 is scoped to what's rendered).

## 4. Mock-first plan

Both integrations need mock support in `src/bootstrap/lib/mock.ts` /
feature-local mock repository, gated by `NEXT_PUBLIC_USE_MOCK` (decision
`0014`), following the existing messaging mock pattern
(`src/features/messaging/infrastructure/repositories/messaging.repository.ts`
already branches on `USE_MOCK`).

**INT-401 mock shape:**
- A `MockPresenceRepository` (or a method added to the existing messaging mock
  repo) that, given a set of `memberIds`, derives `status` from the *existing*
  mock `isOnline` boolean fields already present on `ContactEntity`/
  `ConversationEntity`/`GroupMember` (`isOnline: true` → `"online"`, `false` →
  a deterministic mix of `"recent"`/`"offline"` seeded by ID hash, so the
  three states are all exercisable in Storybook/dev without new mock fixture
  files). `lastActiveAt` synthesized as `now - {0, 3min, 2days}` per bucket.
- Keep this **additive** — do not delete `isOnline`, per requirements' own
  minimal-diff note (`presence?: "online" | "recent" | "offline"`, falling
  back to the boolean is the design-spec's derivation rule, not something
  this analysis should relitigate).

**INT-402 mock shape:**
- Extend `src/bootstrap/realtime/mock-upstream.server.ts`'s `samples` array
  with one `presence.changed` sample frame (mirrors how `message.new`/
  `attendance.updated` samples are already seeded) — e.g. flips one seeded
  contact from `"offline"` to `"online"` a few seconds after connect, so the
  live-update path (FR-006) is exercisable end-to-end in mock mode without a
  real `noti` backend.

## 5. Open Questions

- `[OPEN QUESTION]` Does `noti`'s `openapi.yaml`/`INTEGRATION.md` (edu-api
  repo — not reachable from this workspace checkout) actually define
  `GET /api/v1/presence` yet? Requirements' own `externalDependencies` flags
  this as unconfirmed. If it exists, confirm the exact path prefix (this map
  assumes `/noti/api/v1/presence`, following the `ANNOUNCEMENTS_EP` precedent
  of `/noti/api/v1/*` for noti's REST surface — NOT the bare `/api/v1/presence`
  the DR/requirements literally wrote, which omits the service segment used
  everywhere else in `bootstrap/endpoint/noti.endpoint.ts`).
- `[OPEN QUESTION]` Should `presence.changed` carry a single `memberId` per
  event, or a batch (`memberIds: string[]`) for cases where many contacts
  change state near-simultaneously (e.g. reconnect storms)? This map assumes
  single-member events (matches every other existing event type's
  granularity — `attendance.updated`, `message.new` are all single-entity).
- `[OPEN QUESTION]` Confirm with `ba-lead`/BE team whether the presence
  snapshot is a pure GET-with-query-params (simple, matches this map) or
  needs to become a POST-with-body if `memberIds` lists grow large enough to
  hit URL length limits (unlikely at DM/group-panel scale, but worth a note
  for `fe-nextjs-engineer` if a school's largest group exceeds ~150 members).
