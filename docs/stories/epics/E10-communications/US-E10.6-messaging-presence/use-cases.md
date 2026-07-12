# US-E10.6 — Messaging Presence Indicator — Use Cases & Acceptance Criteria

> Naming: this packet is **US-E10.6** (renumbered from the original brief
> "US-E10.5" — that ID belongs to the unrelated, already-shipped "Messaging
> defect fixes" story). Used consistently below, including in the traceability
> IDs (`UC-10.6.x`, `AC-10.6.x.y`).

Inputs read: `requirements.md` (TR-101, FR-001…FR-006, NFR-001…006),
`integration.md` (INT-401 presence snapshot, INT-402 SSE `presence.changed`
event), `docs/product/design-spec.jsonc` → `screens.messaging.presence`
(dot geometry/color, header caption copy, group-panel sort/count spec),
`design_src/edu/messaging.jsx` (`msgPresence()`, `MSGPresenceDot`,
`msgPresenceCaption()`).

This is a **minimal-diff extension** of the already-implemented Messaging
feature (US-E10.1 base, US-E10.4 group enhancements). Per the task brief, this
packet does **not** re-derive the base feature's own UC set (conversation
list load/empty/error, send/reply/pin/delete message, group CRUD, etc. —
already specified/implemented). It focuses on the presence *layer* added on
top, and explicitly asserts (as testable AC, not narrative) that everything
pre-existing is unaffected.

---

## 1. Use Case Scope Summary

- **Total UCs: 6** (UC-10.6.1 … UC-10.6.6).
- **Actors:** teacher, principal, student, parent — all four identical
  capabilities, no role gating (confirmed against `roles-permissions.md` and
  requirements §actors). Secondary/system actors: the existing SSE stream
  connection (`use-realtime-events.ts`), TanStack Query cache, the `noti`
  service (mock-first for INT-401, real transport for INT-402 per
  `integration.md`).
- **In-scope render sites:** conversation-list avatar (direct only), DM
  chat-header avatar + caption, group member-info panel rows (dot + sort +
  count).
- **Explicitly out of scope / boundary:** group chat header (no per-member
  presence — count-only, unchanged), typing indicator, the base Messaging
  4-state coverage (loading/empty/error/success) for conversation
  list/chat-window/group-panel, message send/reply/pin/delete, group
  rename/add/remove/leave/delete. UC-10.6.5 exists specifically to assert
  these are unaffected (regression-guard use case).
- Presence itself is asynchronous (INT-401 fetch + INT-402 event) but is
  explicitly a **non-blocking overlay** (NFR-005) — its own loading/empty/
  error/success states are modeled per render-site UC below, distinct from
  (and never gating) the host screen's existing async states.

## 2. Actor Catalogue

| Actor/Role | Type | Capabilities |
| --- | --- | --- |
| Teacher | Primary, human | View presence of DM contacts + group members; own presence reflected symmetrically to others |
| Principal | Primary, human | Same as teacher — identical, no variance |
| Student | Primary, human | Same as teacher — identical, no variance |
| Parent | Primary, human | Same as teacher — identical, no variance |
| SSE stream connection (`use-realtime-events.ts`) | Secondary, system | Delivers `presence.changed` events over the existing single connection; triggers cache invalidation |
| TanStack Query cache | Secondary, system | Holds presence snapshot per render site; invalidated/refetched on `presence.changed` |
| `noti` service (mock-first) | Secondary, system | Serves `GET /api/v1/presence` snapshot (INT-401); tenant-scopes both endpoints server-side |

**Role-variant note (call out explicitly so QA doesn't hunt for a difference that doesn't exist):** every AC below applies identically to teacher/principal/student/parent. No AC in this packet has a role-gated variant — this is stated once here rather than repeated per AC.

## 3. Use Case Catalogue

### UC-10.6.1 — View presence dot on conversation-list avatar

- **Primary actor:** any of the four roles, viewing their conversation list.
- **Secondary actor:** `noti` (INT-401), TanStack Query cache.
- **Preconditions:** user is authenticated; conversation list has rendered
  with ≥1 `type="direct"` conversation.
- **Main success scenario:**
  1. Conversation list renders avatars for all conversations (existing
     behavior, unaffected).
  2. For each `type="direct"` conversation, the client derives presence via
     `msgPresence(contact) = contact.presence || (contact.isOnline ? 'online' : 'offline')`.
  3. A presence dot renders bottom-right of the avatar per the derived state
     (filled/hollow/none — see AC-10.6.1.*).
- **Alternative flows:**
  - A1 — Group conversation row: no dot rendered regardless of any member's
    presence (avatar shows initials/photo only, as today).
  - A2 — Presence data arrives after the list's own data (progressive
    render): avatar renders first with no dot; dot appears in place once
    INT-401 resolves — never delays the list's existing skeleton/empty/error
    states.
- **Exception flows:**
  - E1 — INT-401 fetch fails/times out: no dot rendered (treated as
    offline/unknown), list itself is otherwise unaffected (no error banner
    for presence specifically).
  - E2 — Contact has no presence record in the response: same as E1 (safe
    default — offline/no-dot).
- **Business rules:** dot never renders for group avatars; "recent" = last
  active <5 minutes; no gray dot for offline (no dot at all).
- **Non-functional constraints:** WCAG AA non-color-only (sr-only text);
  ≥3:1 contrast dot vs card background; zero motion/animation on the dot;
  no layout break at 320px; avatar touch target stays ≥44×44px including the
  dot overlay.

### UC-10.6.2 — View presence dot + caption on DM chat header

- **Primary actor:** any of the four roles, with an open direct conversation.
- **Preconditions:** open conversation is `type="direct"`.
- **Main success scenario:**
  1. Chat header renders contact avatar + name (existing, unaffected).
  2. The same `msgPresence()` derivation renders the header-avatar dot using
     the identical visual convention as UC-10.6.1.
  3. A caption line renders under the contact name via
     `msgPresenceCaption()`, reflecting the same derived state.
- **Alternative flows:**
  - A1 — `recent` state: caption computes `n` (minutes) from actual elapsed
    time (`lastActiveAt` coarse bucket), not a hardcoded number.
  - A2 — `offline` with a known last-seen bucket: caption shows
    "Hoạt động hôm qua"/"Active yesterday" (or the existing
    subtitle-empty behavior if no last-seen bucket is available) — no dot
    rendered in this state either way.
- **Exception flows:**
  - E1 — Presence unavailable/fetch failed: header falls back to no dot +
    no caption (never guesses/shows a stale state).
- **Business rules:** dot + caption apply to DM headers only (see UC-10.6.3
  for the group-header boundary).
- **Non-functional constraints:** same a11y/motion/contrast constraints as
  UC-10.6.1; caption text is full words, never cryptic shorthand
  ("online"/"5m").

### UC-10.6.3 — Group chat header remains presence-free (regression guard)

- **Primary actor:** any of the four roles, with an open group conversation.
- **Preconditions:** open conversation is `type="group"`.
- **Main success scenario:** header renders avatar (no dot) + the existing
  "{count} thành viên"/"{count} members" subtitle only — identical to
  pre-US-E10.6 behavior.
- **Alternative flows:** none (this UC has no state variance — that is the
  point).
- **Exception flows:** none applicable — there is nothing to fail, since no
  presence call/derivation happens for the group header at all.
- **Business rules:** FR-003 — explicit non-goal; per-member presence is
  never surfaced at group-header level (only inside the member panel,
  UC-10.6.4).

### UC-10.6.4 — Group member-info panel: presence dot, online-first sort, online count

- **Primary actor:** any of the four roles, with the group info panel open.
- **Secondary actor:** `noti` (INT-401 scoped to the group's `memberIds`),
  SSE stream (INT-402 for FR-006 live update).
- **Preconditions:** conversation is `type="group"`; panel has member-list
  data (may still expose legacy `isOnline` boolean per member).
- **Main success scenario:**
  1. Panel fetches/derives `presence` per member via the same fallback
     (`member.presence || (member.isOnline ? 'online' : 'offline')`).
  2. Members are sorted online-first: `online` (rank 2) → `recent` (rank 1)
     → `offline` (rank 0), **stable** within each bucket (ties broken by the
     existing member order — no jitter on re-render with unchanged data).
  3. A row-level dot renders per the UC-10.6.1 convention (smaller size per
     design-spec: 9px dot, 0 offset in-panel vs 10px/1px elsewhere).
  4. A members-section header line shows "{n} đang hoạt động"/"{n} online
     now", where `n = members.filter(m => msgPresence(m) !== 'offline').length`
     (online + recent both count toward `n`).
  5. Existing offline dimmed treatment (opacity 0.6, avatar grayscale(20%))
     is preserved unchanged for `offline` rows.
- **Alternative flows:**
  - A1 — Panel data refreshes (e.g. after `presence.changed` invalidation):
    re-sort + re-count happen atomically with the refetch — no visible
    flash of pre-sort order before the new order settles.
- **Exception flows:**
  - E1 — Presence missing for a member: member treated as `offline` — no
    dot, sorted last (rank 0 bucket), excluded from `n`.
  - E2 — INT-401 fetch for the panel's member set fails: all rows fall back
    to `offline`-equivalent (no dot, sorted by existing/original order,
    `n` = 0) — panel itself does not show an error state for this (no
    dedicated presence error UI, per requirements' explicit note).
- **Business rules:** sort key and count are computed from `msgPresence()`,
  **never** the legacy `isOnline` boolean directly (that boolean remains
  only as the derivation's fallback input, not the sort/count source).
- **Non-functional constraints:** same a11y/motion constraints; sort/count
  recompute must not introduce a new blocking loading state for the panel.

### UC-10.6.5 — Regression guard: base Messaging behavior unaffected

- **Primary actor:** any of the four roles, exercising any pre-existing
  Messaging interaction not related to presence.
- **Preconditions:** US-E10.1/US-E10.4 already implemented and tested.
- **Main success scenario:** typing indicator, the four Messaging UI states
  (loading/empty/error/success) for conversation list / chat window / group
  panel, message send/reply/pin/delete, and group management (rename,
  add/remove member, leave, delete) all behave exactly as before this US —
  presence is additive, never a replacement or gate.
- **Alternative flows:** none — this UC is a negative/guard assertion, not a
  new behavior.
- **Exception flows:** none new — existing exception flows for those
  features (unchanged) still apply, out of this packet's scope to re-derive.
- **Business rules:** FR-005 — minimal-diff guardrail; any diff touching
  these areas beyond adding the presence field/derivation is out of scope
  for this US.
- **Non-functional constraints:** no new perceived-performance regression
  (NFR-005) — presence must not delay first paint of any of the guarded
  surfaces.

### UC-10.6.6 — Live presence update via existing SSE stream (Should)

- **Primary actor:** any of the four roles, with a render site (list/header/
  panel) currently visible and the SSE connection established.
- **Secondary actor:** SSE stream (`presence.changed` event, INT-402),
  TanStack Query cache invalidation (`event-invalidation.ts`).
- **Preconditions:** SSE connection established (decision 0009/0041);
  affected contact/member is currently rendered.
- **Main success scenario:**
  1. A `presence.changed` event arrives for a visible contact/member.
  2. The corresponding query key is invalidated (conversation list, DM
     header's underlying query, or `groupMembers(groupId)`).
  3. Affected dot/caption/sort position updates in place once the refetch
     resolves — no hand-patched cache, consistent with every other event
     type.
- **Alternative flows:**
  - A1 — `noti` presence endpoint/event not yet live: falls back to
    mock/poll-driven refresh; feature still functions correctly, just less
    live (this flow does not block the US per FR-006 being "Should").
- **Exception flows:**
  - E1 — Stream disconnected: stale-while-revalidate — last-known presence
    shown as-is; no dot flips to an error/broken state. The existing global
    `SseDisconnectBanner` (US-E08.6) is the only disconnect UI shown (not a
    presence-specific one).
  - E2 — Malformed event frame: `parseEvent()` returns null, silently
    dropped (existing behavior, no new handling needed).
  - E3 — Cross-tenant event: dropped client-side by `shouldHandle()`
    (defense-in-depth; primary control is server-side tenant scoping).
- **Business rules:** single existing SSE connection reused — no second
  connection opened for presence.
- **Non-functional constraints:** tenant scoping is a hard security
  boundary (NFR-006); no precise last-seen timestamp ever crosses the wire.

---

## 4. Acceptance Criteria

### UC-10.6.1 — Conversation-list avatar dot

```
AC-10.6.1.1  Online → filled dot
  Given a direct conversation whose contact has msgPresence = "online"
  When the conversation list renders that row
  Then a filled, success-colored (var(--edu-success)) dot renders bottom-right
    of the avatar with a 2px card-color ring, size 10px, offset 1px
  And the dot element carries sr-only text "đang hoạt động" (vi) /
    "online now" (en) equivalent — status is not color-only

AC-10.6.1.2  Recent (<5 min) → hollow/outline dot, not filled
  Given a direct conversation whose contact has msgPresence = "recent"
    (last active <5 minutes ago)
  When the conversation list renders that row
  Then a hollow dot renders (background = var(--edu-card), 2px solid
    var(--edu-success) border, same 2px card-color ring) — visually
    distinct from the filled "online" dot, never a solid/filled fill
  And the dot carries sr-only text "vừa hoạt động gần đây" (vi) /
    "recently active" (en) equivalent

AC-10.6.1.3  Offline → no dot rendered (never a grey dot)
  Given a direct conversation whose contact has msgPresence = "offline"
  When the conversation list renders that row
  Then no dot element renders at all on the avatar (not a grey/muted dot,
    not a hidden-but-present element) — the avatar looks exactly as it did
    before this US shipped

AC-10.6.1.4  Group conversation → never a dot regardless of member presence
  Given a group conversation row (type="group")
  When the conversation list renders that row
  Then no presence dot renders on the group avatar, regardless of any
    member's individual presence state

AC-10.6.1.5  Loading (progressive, non-blocking)
  Given the conversation list's own data has resolved but the presence
    snapshot (INT-401) has not yet resolved
  When the list renders
  Then every direct-conversation avatar renders immediately with no dot
    (not a loading spinner on the avatar) — the list's existing
    loading/skeleton state is unaffected and not gated by presence

AC-10.6.1.6  Empty (no direct conversations)
  Given the conversation list contains zero type="direct" conversations
  When the list renders
  Then no presence dot logic executes for any row (group-only list) — the
    list's existing empty-state behavior (if any) is unchanged

AC-10.6.1.7  Error (presence fetch fails)
  Given INT-401 returns a fetch error/timeout/5xx for the visible contacts
  When the conversation list renders
  Then every affected avatar renders with no dot (treated as offline/
    unknown) — no error banner or toast is shown for presence specifically,
    and the list itself shows no error state on account of this failure

AC-10.6.1.8  Success (dot appears in place after resolve)
  Given the presence snapshot resolves after the list's initial paint
  When the resolved states differ from "no dot" (e.g. online/recent)
  Then affected avatars update in place to show the correct dot without a
    full list re-render/flash

AC-10.6.1.9  No motion/blinking
  Given any conversation-list avatar with a presence dot rendered
  When the dot is on screen for any duration
  Then the dot has zero animation/transition/blink properties — it is
    static from first paint (no @keyframes, no CSS transition on the dot)
```

### UC-10.6.2 — DM chat-header avatar dot + caption

```
AC-10.6.2.1  Online → "Đang hoạt động" / "Active now"
  Given an open direct conversation whose contact has msgPresence = "online"
  When the chat header renders
  Then the header avatar shows the filled dot (same convention as
    AC-10.6.1.1) and the caption line under the contact name reads
    "Đang hoạt động" (vi) / "Active now" (en)

AC-10.6.2.2  Recent → "Hoạt động {n} phút trước" / "Active {n} minutes ago"
  Given the contact has msgPresence = "recent" with lastActiveAt bucketed
    at n minutes ago (n computed from actual elapsed time)
  When the chat header renders
  Then the header avatar shows the hollow dot (same convention as
    AC-10.6.1.2) and the caption reads "Hoạt động {n} phút trước" (vi) /
    "Active {n} minutes ago" (en), with {n} substituted from real elapsed
    time — never a hardcoded placeholder value

AC-10.6.2.3  Offline (known last-seen bucket) → "Hoạt động hôm qua" / "Active yesterday"
  Given the contact has msgPresence = "offline" with a known day-bucketed
    last-seen value
  When the chat header renders
  Then no dot renders on the header avatar, and the caption reads
    "Hoạt động hôm qua" (vi) / "Active yesterday" (en) — or, if no
    last-seen bucket is available, the existing subtitle-empty behavior
    (no caption line) applies instead — either is acceptable, a wrong/
    guessed state is not

AC-10.6.2.4  Presence unavailable → no dot + no caption
  Given INT-401 fails or returns no record for the open contact
  When the chat header renders
  Then no dot renders and no caption line renders — the header never shows
    a guessed or stale presence state

AC-10.6.2.5  Loading (progressive, non-blocking)
  Given the chat window's own data has resolved but presence has not
  When the header renders
  Then the avatar + name render immediately with no dot/caption, updating
    in place once presence resolves — the chat window's existing
    loading/skeleton state is unaffected

AC-10.6.2.6  Group header — no per-member caption/dot (cross-ref UC-10.6.3)
  Given the open conversation is type="group"
  When the chat header renders
  Then no presence dot or caption renders for any member — only the
    existing "{count} thành viên"/"{count} members" subtitle shows

AC-10.6.2.7  No motion/blinking
  Given the DM chat-header dot is rendered in any state
  Then it has zero animation/transition properties, identical guarantee to
    AC-10.6.1.9
```

### UC-10.6.3 — Group chat header presence-free (regression guard)

```
AC-10.6.3.1  Group header shows member count only, never presence
  Given an open group conversation
  When the chat header renders
  Then it shows the avatar (no dot) and "{count} thành viên"/
    "{count} members" subtitle exactly as it did before this US, regardless
    of how many members are online/recent/offline

AC-10.6.3.2  No presence fetch triggered for group header itself
  Given an open group conversation
  When the chat header renders
  Then no additional presence-specific network call is attributable to the
    header rendering (the member panel's own presence fetch, UC-10.6.4, is
    independent and only occurs if/when the panel is opened)
```

### UC-10.6.4 — Group member-info panel: dot, sort, count

```
AC-10.6.4.1  Row-level dot per member, same convention (smaller size)
  Given the group info panel is open with members in all three presence
    states
  When each member row renders
  Then each row shows its own dot per the online/recent/offline convention
    (9px dot, 0 offset, per design-spec groupPanelSize/groupPanelOffset) —
    same color/hollow rules as AC-10.6.1.1/.2/.3, and each dot carries the
    same sr-only text equivalents

AC-10.6.4.2  Online-first stable sort
  Given a group with members whose derived presence is a mix of online,
    recent, and offline
  When the panel renders the member list
  Then members are ordered online (rank 2) → recent (rank 1) → offline
    (rank 0), and members within the same bucket preserve their original
    relative order (stable sort — no jitter)

AC-10.6.4.3  "N đang hoạt động" count reflects msgPresence(), not isOnline
  Given a group with 5 members: 2 online, 1 recent, 2 offline
  When the panel renders the members-section header
  Then it shows "3 đang hoạt động" / "3 online now" (2 online + 1 recent —
    NOT 2, which would be the legacy isOnline-only count)

AC-10.6.4.4  Offline rows keep existing dimmed treatment
  Given a member row whose derived presence is "offline"
  When the row renders
  Then it keeps opacity 0.6 and avatar grayscale(20%) exactly as before
    this US (US-E10.4 behavior unchanged) — no dot shown for that row

AC-10.6.4.5  Missing presence record → safe default
  Given a member has no presence record in the INT-401 response and no
    legacy isOnline field either
  When the panel renders that row
  Then the member is treated as offline: no dot, sorted last (rank 0
    bucket), and excluded from the "N online" count

AC-10.6.4.6  Re-sort/re-count on data refresh (e.g. after presence.changed)
  Given the panel's member-list query is invalidated and refetched
  When the new data resolves with different presence values
  Then the member list re-sorts online-first and the count line
    recomputes atomically with the refetch (no stale order/count shown
    momentarily)

AC-10.6.4.7  Loading (progressive, non-blocking)
  Given the panel's own member-list data has resolved but presence has not
  When the panel renders
  Then rows render in existing/original order with no dots, updating to
    sorted order + dots once presence resolves — the panel's existing
    loading/skeleton state is unaffected

AC-10.6.4.8  Empty (group has one member — just the current user, edge case)
  Given a group's member list resolves to a single member
  When the panel renders
  Then the sort is a no-op (single item) and the count line shows 0 or 1
    "đang hoạt động" per that member's actual presence — no error, no
    broken layout

AC-10.6.4.9  Error (presence fetch fails for the panel's member set)
  Given INT-401 fails for the group's memberIds
  When the panel renders
  Then all rows fall back to offline-equivalent (no dot, original order,
    count = 0) — the panel itself shows no dedicated presence error UI

AC-10.6.4.10  No motion/blinking
  Given any group-panel row dot or the online-count banner dot
  Then all such dots have zero animation/transition properties
```

### UC-10.6.5 — Regression guard: base Messaging unaffected

```
AC-10.6.5.1  Typing indicator unchanged
  Given a contact is typing in an open conversation (direct or group)
  When the typing indicator renders
  Then its appearance, copy, and timing are pixel/behavior-identical to
    pre-US-E10.6 — presence changes do not alter, gate, or replace it

AC-10.6.5.2  Conversation-list loading/empty/error/success states unchanged
  Given the conversation list is exercised in each of its four existing UI
    states (loading, empty — zero conversations, error — fetch failure,
    success — conversations render)
  When each state is triggered
  Then the state's existing markup/copy/behavior is identical to
    pre-US-E10.6, with the sole addition of presence dots appearing only
    inside the success state's direct-conversation rows

AC-10.6.5.3  Chat-window loading/empty/error/success states unchanged
  Given the chat window is exercised in each of its four existing UI states
  When each state is triggered
  Then behavior is identical to pre-US-E10.6 aside from the header's
    additive dot/caption (DM only) and panel's additive dot/sort/count
    (group only) — message list rendering itself is unaffected

AC-10.6.5.4  Group-panel loading/empty/error/success states unchanged
  Given the group info panel is exercised in each of its four existing UI
    states
  Then behavior is identical to pre-US-E10.6 aside from the additive
    dot/sort/count described in UC-10.6.4

AC-10.6.5.5  Message actions unaffected
  Given a user sends, replies to, pins, or deletes a message, or performs
    group management (rename, add/remove member, leave, delete)
  When any such action is performed
  Then its result is identical to pre-US-E10.6 — no new field, gate, or
    side effect introduced by presence
```

### UC-10.6.6 — Live presence update via SSE

```
AC-10.6.6.1  Successful live update
  Given a visible contact's avatar/header/panel row and an established SSE
    connection
  When a presence.changed event arrives for that contact/member
  Then the corresponding query key is invalidated, the refetch resolves,
    and the affected dot/caption/sort position updates in place without a
    full page reload

AC-10.6.6.2  Stream disconnected → stale-while-revalidate
  Given the SSE connection status is "disconnected"
  When no presence.changed events can arrive
  Then the last-known presence state remains displayed as-is (no dot flips
    to an error/broken visual) — the existing global SseDisconnectBanner is
    the only disconnect UI shown, not a presence-specific one

AC-10.6.6.3  Malformed event dropped silently
  Given a malformed presence.changed frame arrives
  When parseEvent() processes it
  Then it returns null and the frame is dropped with no visible effect and
    no console-visible user-facing error

AC-10.6.6.4  Cross-tenant event dropped client-side (defense-in-depth)
  Given a presence.changed event arrives with a tenantId different from the
    current session's tenant
  When shouldHandle() evaluates it
  Then the event is dropped client-side (server-side tenant scoping remains
    the primary control per NFR-006)

AC-10.6.6.5  Mock-first fallback when noti presence isn't live
  Given NEXT_PUBLIC_USE_MOCK is enabled and no real noti presence endpoint
    is wired
  When the mock upstream seeds a presence.changed sample frame
  Then the affected contact's dot/caption/sort updates exactly as it would
    from a real event — this flow is not required to block the US (FR-006
    is "Should")
```

---

## 5. Edge Case Matrix

| Feature / site | Empty | Max-length (large N) | Concurrent (rapid state flips) | Auth-expired | Network-error | Wrong-role |
| --- | --- | --- | --- | --- | --- | --- |
| Conversation-list avatar dot (UC-10.6.1) | Zero direct conversations → no dot logic runs (AC-10.6.1.6) | Large contact list → INT-401 batches only rendered `memberIds`, no per-row perf regression [OPEN QUESTION: confirm no virtualization gap] | Rapid online↔recent↔offline flips via SSE → last invalidation wins, no dot flicker beyond the single state swap (no animation to "flicker" per AC-10.6.1.9) | Standard reactive refresh (decision 0018) retries INT-401 transparently, never surfaced as a presence error | No dot rendered, treated as offline (AC-10.6.1.7) | N/A — identical across all 4 roles, no wrong-role case exists (confirmed in requirements) |
| DM chat-header dot + caption (UC-10.6.2) | N/A (DM always has exactly 1 contact) | N/A | Rapid flips → caption/dot swap atomically with refetch, no stale caption shown mid-swap | Same reactive-refresh fallback | No dot + no caption (AC-10.6.2.4) | N/A |
| Group chat header (UC-10.6.3) | N/A — no presence surfaced here at all | N/A | N/A | N/A | N/A | N/A |
| Group member-panel dot/sort/count (UC-10.6.4) | Single-member group → no-op sort, count reflects that member (AC-10.6.4.8) | Very large group (~150 members, per integration.md open question on GET vs POST) → sort/count must stay O(n log n)/O(n), no visible lag [OPEN QUESTION: perf ceiling for INT-401 memberIds list length] | Panel open while multiple presence.changed events arrive in a burst → re-sort/re-count debounced to the latest resolved state, no visible order thrash beyond one settle (AC-10.6.4.6) | Same reactive-refresh fallback | All rows fall back to offline-equivalent, count = 0 (AC-10.6.4.9) | N/A |
| Typing indicator / 4-state regression guard (UC-10.6.5) | Existing empty-state behavior unchanged (AC-10.6.5.2/.3/.4) | N/A | N/A | Unaffected — this UC asserts no change | Existing error-state behavior unchanged | N/A |
| SSE live update (UC-10.6.6) | N/A — push-only, no query state | N/A | Burst of events for many members at once → each invalidation is independent per existing event-invalidation pattern; no cross-event ordering guarantee required beyond "last resolved wins" | N/A (SSE proxy auth handled server-side, not client-readable) | Stream disconnected → stale-while-revalidate (AC-10.6.6.2) | N/A |

## 6. Open Questions

- `[OPEN QUESTION]` (carried from `integration.md`) Does `noti`'s
  `openapi.yaml`/`INTEGRATION.md` actually define `GET /api/v1/presence` yet,
  and is the path prefix `/noti/api/v1/presence` (following the
  `ANNOUNCEMENTS_EP` precedent) or the bare `/api/v1/presence` the DR
  literally wrote? Affects INT-401 wiring, not this packet's UI-facing AC.
- `[OPEN QUESTION]` (carried from `integration.md`) Does `presence.changed`
  carry a single `memberId` per event or a batch (`memberIds: string[]`) for
  near-simultaneous state changes (e.g. reconnect storms)? Affects
  AC-10.6.6.1's "burst" behavior — if batched, UC-10.6.6 should be extended
  with a batch-specific AC once confirmed.
- `[OPEN QUESTION]` (carried from `integration.md`) Should INT-401 become a
  POST-with-body if a school's largest group's `memberIds` list exceeds URL
  length limits (~150 members)? Affects the "max-length" cell in the edge
  case matrix for UC-10.6.4 — no AC change needed unless the transport
  changes, but flagging for `fe-nextjs-engineer` sizing.
- `[OPEN QUESTION]` AC-10.6.2.3's two acceptable behaviors for offline
  without a known last-seen bucket ("Hoạt động hôm qua" vs. no caption at
  all) are both currently allowed by `requirements.md`'s own phrasing
  ("...or no caption per existing subtitle-empty behavior"). Recommend
  `ba-lead`/`uiux-designer` pick ONE deterministic rule before `fe-qa-playwright`
  writes a Storybook interaction test for this state, to avoid an
  ambiguous/flaky assertion.
- `[OPEN QUESTION]` No AC currently pins down virtualization/perf behavior
  for a very large conversation list with many direct contacts all needing
  presence dots (INT-401 batches by rendered `memberIds`, but "rendered" is
  ambiguous if the list is virtualized) — flagging for `fe-state-engineer`
  sizing, not a blocking gap for MVP AC.

---

## Traceability quick-reference (for `ba-spec-writer`)

| UC | FR | Render site |
| --- | --- | --- |
| UC-10.6.1 | FR-001 | Conversation-list avatar |
| UC-10.6.2 | FR-002 | DM chat-header avatar + caption |
| UC-10.6.3 | FR-003 | Group chat header (guard) |
| UC-10.6.4 | FR-004 | Group member-info panel |
| UC-10.6.5 | FR-005 | Typing indicator + base 4-state coverage (guard) |
| UC-10.6.6 | FR-006 | SSE live update (Should) |

NFR mapping: NFR-001/002 (a11y, no motion) → embedded in every dot AC across
UC-10.6.1/.2/.4 (e.g. AC-10.6.1.1's sr-only clause, AC-10.6.1.9's no-motion
clause). NFR-003 (i18n additive) → caption/count copy ACs (AC-10.6.2.1-3,
AC-10.6.4.3) reference `messaging.presence.*` keys, distinct from the legacy
`messaging.chat.online` key (untouched). NFR-004 (responsive) → implied in
touch-target clause of AC-10.6.1.1. NFR-005 (non-blocking) → the "Loading"
AC of each UC (AC-10.6.1.5, AC-10.6.2.5, AC-10.6.4.7). NFR-006 (no PII, tenant
scoping) → AC-10.6.6.4 + exception flows E1/E2 across UC-10.6.1/.2/.4.
