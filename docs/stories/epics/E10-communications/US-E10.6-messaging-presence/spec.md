# Feature Spec — Messaging Presence Indicator (US-E10.6)

Status: Draft   Lane: normal
Sources: `requirements.md` (TR-101, FR-001…FR-006, NFR-001…006) +
`integration.md` (INT-401, INT-402) + `use-cases.md` (UC-10.6.1…6,
AC-10.6.1.1…AC-10.6.6.5) + `docs/product/design-spec.jsonc` →
`screens.messaging.presence` + `design_src/edu/messaging.jsx` (P6 block)

> **Naming:** this story is **US-E10.6** (renumbered from the brief's original
> "US-E10.5", which belongs to the unrelated, already-shipped "Messaging
> defect fixes" story). Every ID below (`UC-10.6.x`, `AC-10.6.x.y`) uses the
> corrected number. Service name is **`noti`** (canonical, decision `0017`) —
> not "notification", which is what the DR/requirements literally wrote (see
> §8 for the flagged terminology correction).

---

## 1. Scope & Objectives

**Purpose:** add a lightweight, three-state (`online` / `recent` / `offline`)
presence indicator to the three places a DM contact's identity already
renders in the already-implemented Messaging feature (US-E10.1 base,
US-E10.4 group enhancements), so users can see at a glance whether a contact
is currently reachable — without adding a new screen, route, or blocking
async state.

**In-scope:**
- Presence dot on the conversation-list avatar (direct conversations only).
- Presence dot + caption line on the DM chat-header avatar.
- Presence dot + online-first sort + "N online" count on group member-info
  panel rows.
- Three-state presence model (`online` / `recent` (<5 min) / `offline`) and
  its additive migration onto the three existing `isOnline: boolean` fields.
- `messaging.presence.*` i18n keys (vi + en).
- Live update of presence via the existing SSE stream (Should, not Must).

**Out-of-scope:**
- Any change to the group chat header (stays member-count only).
- Typing indicator changes.
- New screen, new route, or a new top-level `design-spec.jsonc` entry
  (extends `screens.messaging.presence` in place).
- Precise last-seen timestamp UI (coarse minute/day buckets only).
- Presence for non-messaging surfaces (e.g. staff directory).

**Definitions:**
- `presence` — the derived 3-state union `"online" | "recent" | "offline"`.
- `msgPresence(x)` — the derivation function:
  `x.presence || (x.isOnline ? 'online' : 'offline')` (design-spec, normative).
- "recent" — contact/member whose last activity was <5 minutes ago.
- "coarse bucket" — `lastActiveAt` rounded to a minute/day granularity, never
  a precise instant (NFR-006/PII posture).

---

## 2. Actors & Roles

| Actor | Type | Visibility |
| --- | --- | --- |
| Teacher | Primary, human | Identical to all other roles — views presence of DM contacts + group members; own presence reflected symmetrically |
| Principal | Primary, human | Identical — no variance |
| Student | Primary, human | Identical — no variance |
| Parent | Primary, human | Identical — no variance |
| SSE stream connection (`use-realtime-events.ts`) | Secondary, system | Delivers `presence.changed`; triggers cache invalidation |
| TanStack Query cache | Secondary, system | Holds/invalidates presence snapshot per render site |
| `noti` service (mock-first) | Secondary, system | Serves `GET /api/v1/presence` (INT-401); tenant-scopes both endpoints server-side |

**Role-gated visibility: none.** No AC in this spec has a role-gated variant
— confirmed against `roles-permissions.md` and requirements §actors. State
this once; do not re-derive per FR/AC.

---

## 3. Functional Requirements

### FR-001 — Conversation-list avatar dot (Must)
Source: TR-101/FR-001, UC-10.6.1
The system SHALL render a presence dot (bottom-right, 10px, on the
conversation-list avatar) for `type="direct"` conversations only, derived
from `msgPresence(contact)`.

AC (Given/When/Then — full set in §10, referenced here):
- AC-10.6.1.1 — online → filled success-colored dot, 2px card-color ring,
  sr-only "đang hoạt động"/"online now".
- AC-10.6.1.2 — recent → hollow dot (card-color background, 2px success
  border), sr-only "vừa hoạt động gần đây"/"recently active".
- AC-10.6.1.3 — offline → no dot at all (never grey).
- AC-10.6.1.4 — group conversation row → never a dot.
- AC-10.6.1.5/.6/.7/.8/.9 — loading (progressive, non-blocking)/empty/
  error (no dot, no banner)/success (in-place update)/no motion.

Dependencies: entity `presence?` field on `ContactEntity`/
`ConversationEntity` (see §8), INT-401.

### FR-002 — DM chat-header dot + caption (Must)
Source: TR-101/FR-002, UC-10.6.2
The system SHALL render the same dot convention on the DM chat-header avatar
and a caption line under the contact's name reflecting the same
`msgPresence()` state.

AC:
- AC-10.6.2.1 — online → "Đang hoạt động"/"Active now".
- AC-10.6.2.2 — recent → "Hoạt động {n} phút trước"/"Active {n} minutes ago",
  `n` from real elapsed time, never hardcoded.
- AC-10.6.2.3 — offline (known bucket) → "Hoạt động hôm qua"/"Active
  yesterday", OR no caption if no bucket available — **pick ONE
  deterministic behavior before Storybook interaction tests are written**
  (see [OPEN QUESTION] OQ-1, §8).
- AC-10.6.2.4 — unavailable → no dot + no caption.
- AC-10.6.2.5/.6/.7 — loading (non-blocking)/group header shows nothing
  (cross-ref FR-003)/no motion.

Dependencies: FR-001's dot convention (reused); INT-401.

### FR-003 — Group header unaffected (Must, regression guard)
Source: TR-101/FR-003, UC-10.6.3
The system SHALL NOT render any per-member presence indicator in the group
chat header — header continues to show avatar (no dot) + member-count
subtitle only, unchanged from US-E10.4.

AC:
- AC-10.6.3.1 — group header shows count only, regardless of any member's
  presence state.
- AC-10.6.3.2 — no presence-specific network call attributable to the
  header render itself (panel's own fetch, FR-004, is independent).

Dependencies: none new (assertion against existing behavior).

### FR-004 — Group member-panel dot, online-first sort, online count (Must)
Source: TR-101/FR-004, UC-10.6.4
The system SHALL render a presence dot per row in the group member-info
panel, sort members online-first (`online` rank 2 → `recent` rank 1 →
`offline` rank 0, stable within each bucket), and show an "N đang hoạt
động"/"N online now" count — all computed from `msgPresence()`, never the
legacy `isOnline` boolean directly.

AC:
- AC-10.6.4.1 — row dot (9px, 0 offset per design-spec `groupPanelSize`/
  `groupPanelOffset`), same color/hollow rules as FR-001.
- AC-10.6.4.2 — online-first stable sort, no jitter within same bucket.
- AC-10.6.4.3 — count = online + recent (never online-only, which would be
  the legacy-boolean-equivalent undercounting bug this US fixes).
- AC-10.6.4.4 — offline rows keep existing dimmed treatment (opacity 0.6,
  `grayscale(20%)`) unchanged from US-E10.4.
- AC-10.6.4.5 — missing presence record → safe default: offline, no dot,
  sorted last, excluded from count.
- AC-10.6.4.6 — re-sort/re-count atomic with refetch (no stale-order flash).
- AC-10.6.4.7/.8/.9/.10 — loading (non-blocking)/single-member edge
  case/error (all rows offline-equivalent, count 0, no dedicated error
  UI)/no motion.

Dependencies: `GroupMember.presence?` field (§8); INT-401 scoped to group's
`memberIds`; existing `groupMembers(groupId)` query.

### FR-005 — Regression guard: base Messaging unaffected (Must)
Source: TR-101/FR-005, UC-10.6.5
The system SHALL leave the typing indicator, all four Messaging UI states
(loading/empty/error/success) for conversation list/chat window/group panel,
message send/reply/pin/delete, and group management (rename, add/remove
member, leave, delete) completely unaffected by this change.

AC: AC-10.6.5.1…5 — pixel/behavior-identical assertions for each named
surface; the *sole* permitted diff is the additive presence dot/caption/
sort/count described in FR-001…FR-004.

Dependencies: none (negative/guard assertion against US-E10.1/E10.4 behavior).

### FR-006 — Live update via existing SSE stream (Should)
Source: TR-101/FR-006, UC-10.6.6
The system SHALL update presence state live via the existing SSE stream so a
contact's dot/caption/sort position reflects near-real-time changes without a
full page reload.

AC:
- AC-10.6.6.1 — event arrives → query key invalidated → refetch → in-place
  update, no hand-patched cache.
- AC-10.6.6.2 — stream disconnected → stale-while-revalidate, no error dot;
  existing global `SseDisconnectBanner` (US-E08.6) is the only disconnect UI.
- AC-10.6.6.3 — malformed frame → `parseEvent()` returns `null`, silently
  dropped.
- AC-10.6.6.4 — cross-tenant event → dropped client-side by `shouldHandle()`
  (defense-in-depth; primary control is server-side tenant scoping).
- AC-10.6.6.5 — mock-first fallback (seeded sample frame) exercises the same
  path as a real event; not required to block the US (Should).

Dependencies: `RealtimeEvent` union extension (`presence.changed`),
`queryKeysFor()` extension — both in shared realtime infra (§6).

---

## 4. Non-Functional Requirements

| ID | Category | Requirement | Measurable target | QA verification |
| --- | --- | --- | --- | --- |
| NFR-001 | Accessibility | Presence never color-only | Every dot carries sr-only text ("đang hoạt động"/"vừa hoạt động gần đây"); dot contrast ≥3:1 vs card background (non-text UI component, WCAG 1.4.11) | `fe-accessibility-auditor` + `/impeccable audit`; Storybook a11y addon contrast check; DOM assertion for sr-only span in interaction test |
| NFR-002 | Accessibility | No motion/blinking on dot | Zero animation/transition CSS properties on the dot element; nothing to gate behind `prefers-reduced-motion` because there is no motion | Static CSS review + Storybook snapshot (no `@keyframes`/`transition` class on dot) |
| NFR-003 | i18n | New copy additive-only, existing key untouched | `vi.json`/`en.json` both gain exactly the 6 keys in §8's i18n table under `messaging.presence.*`; zero edits to `messaging.chat.online` | `git diff` on both message files scoped to review; `tsc --noEmit` (typed messages) catches any key drift |
| NFR-004 | Responsive | No layout break; dot doesn't shrink touch target | No break at 320px; verified 375/768/1280px; avatar clickable/touch target stays ≥44×44px including dot overlay | Storybook viewport stories at all 4 breakpoints; manual touch-target measurement in interaction test |
| NFR-005 | Performance (perceived) | No new blocking loading state | Avatar renders immediately with no dot; dot/caption/sort/count update in place once INT-401 resolves — never gates/delays existing skeleton states | Interaction test: assert list/header/panel skeleton renders identically with presence query pending vs resolved |
| NFR-006 | Security / PII | Presence symmetric, non-sensitive, tenant-scoped | Only 3-state bucket + minute/day-bucketed `lastActiveAt` ever crosses the wire; no precise timestamp; server-side tenant filter is primary control, `shouldHandle()` is defense-in-depth | Integration test: cross-tenant event dropped client-side (AC-10.6.6.4); code review confirms no precise timestamp field added to any DTO |

---

## 5. UI States & Flows

Presence is a **non-blocking overlay** on top of 3 already-implemented async
surfaces. Its own states never gate the host surface's existing states.

| Render site | Loading | Empty | Error | Success |
| --- | --- | --- | --- | --- |
| Conversation-list avatar (FR-001) | Avatar renders immediately, no dot; list's own skeleton unaffected | Zero direct conversations → no presence logic runs | Fetch fails/times out → no dot (offline-equivalent), no banner | Dot appears in place once INT-401 resolves, no full-list flash |
| DM chat-header (FR-002) | Avatar+name render immediately, no dot/caption | N/A (DM always exactly 1 contact) | No dot + no caption | Dot+caption appear in place |
| Group member-panel (FR-004) | Rows render in existing order, no dots | Single-member group → no-op sort, count reflects that member | All rows fall back to offline-equivalent, count 0, no dedicated error UI | Re-sort + re-count atomic with refetch, no stale-order flash |

**Key flows (reference UC diagrams in `use-cases.md`):**
- UC-10.6.1 — list render → derive `msgPresence` per direct row → dot paint.
- UC-10.6.2 — DM header render → same derivation → dot + caption paint.
- UC-10.6.3 — group header render → no derivation invoked at all (guard).
- UC-10.6.4 — panel open → fetch/derive per member → sort → count → paint;
  re-triggered on `presence.changed` invalidation (UC-10.6.6).
- UC-10.6.5 — regression guard, no new flow (assert existing flows unchanged).
- UC-10.6.6 — SSE event → `queryKeysFor()` → invalidate → refetch → re-render
  affected site (list / header's underlying query / `groupMembers(groupId)`).

---

## 6. Data & Integration

### INT-401 — Get Presence Snapshot
- **Service:** `noti` (canonical name — corrected from "notification" in the
  original brief).
- **Method + path:** `GET /noti/api/v1/presence` (assumed path prefix,
  following the `ANNOUNCEMENTS_EP` `/noti/api/v1/*` precedent — see
  [OPEN QUESTION] OQ-2, §8).
- **Status:** MOCK-FIRST — `noti`'s REST surface is not confirmed live;
  proceed per decision `0014`.
- **Protected:** yes. **Role required:** any authenticated role, no gating.
- **Request (camelCase):** `memberIds` — batched per render site (rendered
  conversation-list contacts + open DM contact + open group's member list),
  not a global fetch.
- **Response (post-envelope-unwrap), array of:**
  ```ts
  {
    memberId: string;
    status: "online" | "recent" | "offline";
    lastActiveAt: string; // coarse minute/day bucket, never precise
  }
  ```
- **Pagination:** none (bounded request set).
- **Error → UI mapping:**
  - `401 TOKEN_EXPIRED` → standard reactive refresh (decision `0018`), retry
    transparently, never surfaced as a presence-specific error.
  - Any fetch failure/timeout/5xx → no dot rendered (offline-equivalent);
    retryable via normal TanStack Query background refetch, no blocking
    error UI.
  - `memberId` absent from response → treated as offline (safe default).
  - Cross-tenant `memberId` → server MUST filter/omit; client-side filter as
    defense-in-depth if it slips through.
- **Auth:** Bearer token via httpOnly cookie (never client-readable).

### INT-402 — Presence realtime event (reuses existing SSE stream)
- **Service:** `noti`. **Transport:** `GET /api/v1/stream` (existing proxy:
  `src/app/[locale]/api/stream/route.ts`) — REAL, already implemented
  (decision `0009`/`0041`, US-E06.2). Only the `"presence.changed"` event
  **type** is new — additive to the existing typed union, **not** a second
  SSE mechanism.
- **Status:** REAL transport / MOCK-FIRST event source until `noti` emits it.
- **Protected:** yes, same-origin cookie handled inside the proxy route.
- **Event payload (after `parseEvent()`):**
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
- **Extend `src/bootstrap/realtime/event.ts`:** add the above literal to the
  `RealtimeEvent` union; add `"presence.changed"` to
  `REALTIME_EVENT_TYPES`. No change to `parseEvent()`/`shouldHandle()` logic
  itself — both already operate generically on any union member via
  `eventId`/`tenantId`/`payload` structure.
- **Extend `src/bootstrap/realtime/event-invalidation.ts`'s `queryKeysFor()`:**
  add a `case "presence.changed":` branch returning the invalidation targets
  below (invalidate-and-refetch only — **no hand-patched cache**, consistent
  with every existing case):
  - Conversation-list avatar (FR-001) → the messaging conversations/contacts
    list query key.
  - DM chat-header (FR-002) → same list query key is sufficient for v1
    (refetch-driven); an optional screen-local hook mirroring
    `use-notification-new-event.ts` (US-E10.2 precedent,
    `src/features/notifications-center/...`) for optimistic apply is an
    implementation choice, not required (FR-006 is Should).
  - Group member-info panel (FR-004) → `["messaging", "groupMembers",
    groupId]`-shaped key (exact key must match whatever `fe-state-engineer`
    already defined for `groupMembers(groupId)` in US-E10.4 — do not invent a
    parallel key).
- **Error → UI mapping:**
  - Stream disconnected → stale-while-revalidate (last-known presence stays
    as-is); existing global `SseDisconnectBanner` (US-E08.6) is the only
    disconnect UI — no presence-specific disconnect indicator.
  - Malformed frame → `parseEvent()` returns `null`, silently dropped
    (existing generic behavior, no new handling).
  - Cross-tenant event → `shouldHandle()` drops client-side (defense-in-depth
    only; primary control is server-side tenant scoping).
- **Pagination:** none (push event).

### Mock-first plan
- **INT-401 mock:** extend
  `src/features/messaging/infrastructure/repositories/messaging.repository.ts`
  (existing `USE_MOCK` branch) — derive `status` from the existing mock
  `isOnline` boolean (`true` → `"online"`, `false` → a deterministic
  `"recent"`/`"offline"` mix seeded by ID hash so all 3 states are
  exercisable in Storybook/dev without new fixture files). `lastActiveAt`
  synthesized as `now - {0, 3min, 2days}` per bucket. Additive — do not
  delete `isOnline`.
- **INT-402 mock:** extend `src/bootstrap/realtime/mock-upstream.server.ts`'s
  `samples` array with one `presence.changed` sample frame (mirrors how
  `message.new`/`attendance.updated` samples are seeded) — flips one seeded
  contact from `"offline"` to `"online"` a few seconds after connect.

---

## 7. Use Case Summary

| UC ID | Title | FR coverage | AC count |
| --- | --- | --- | --- |
| UC-10.6.1 | Conversation-list avatar dot | FR-001 | 9 (AC-10.6.1.1–.9) |
| UC-10.6.2 | DM chat-header dot + caption | FR-002 | 7 (AC-10.6.2.1–.7) |
| UC-10.6.3 | Group chat header presence-free (guard) | FR-003 | 2 (AC-10.6.3.1–.2) |
| UC-10.6.4 | Group member-panel dot/sort/count | FR-004 | 10 (AC-10.6.4.1–.10) |
| UC-10.6.5 | Regression guard: base Messaging unaffected | FR-005 | 5 (AC-10.6.5.1–.5) |
| UC-10.6.6 | Live update via SSE | FR-006 | 5 (AC-10.6.6.1–.5) |

**Total: 38 AC across 6 UCs.** (Full Given/When/Then text is in
`use-cases.md` §4 — not re-transcribed here to keep this spec self-contained
but non-duplicative; §10 below carries the condensed pass/fail assertions
fe-lead needs per AC.)

---

## 8. Constraints & Assumptions

**Technical constraints:**
- No new SSE connection — one `EventSource` per session (decision `0041`);
  `presence.changed` is a new listener case on the existing stream, not a
  second mechanism.
- Entity migration MUST be additive: `presence?` field added alongside
  existing `isOnline: boolean` (never renamed/removed) on `ContactEntity`,
  `ConversationEntity`, `GroupMember` — see §Domain-changes-first below.
- `msgPresence()` derivation is the single source of truth for sort/count in
  the group panel — the legacy `isOnline` boolean must NOT be read directly
  for sort/count logic anymore (it remains only as `msgPresence()`'s
  fallback input).

**Domain-changes-first (apply in this order — cascades):**
1. `ContactEntity.presence?: "online" | "recent" | "offline"` —
   `src/features/messaging/domain/entities/contact.entity.ts:11`.
2. `ConversationEntity.presence?: "online" | "recent" | "offline"`
   (direct-only) — `.../conversation.entity.ts:19`.
3. `GroupMember.presence?: "online" | "recent" | "offline"` —
   `.../group.entity.ts:16`.
4. Mapper/DTO — `INT-401` response mapping into these optional fields; no
   change to existing mapper logic for `isOnline`.
5. Mock fixtures — safe default: if a fixture omits `presence`, derivation
   falls back to `isOnline`; if a fixture omits both, `msgPresence()` treats
   as `"offline"` (never throws).
6. Presentation — dot components, header caption, panel sort/count consume
   `msgPresence()`, never `entity.isOnline` directly except as the
   documented fallback inside the derivation function itself.

**Confirmed [ASSUMPTION]s (from requirements.md):**
- `[ASSUMPTION]` `noti`'s `/api/v1/presence` may not exist yet — FE proceeds
  mock-first (decision `0014`), wires real endpoint when `noti` ships.
- `[ASSUMPTION]` 5-minute "recent" threshold is a fixed constant, not
  user-configurable.
- `[ASSUMPTION]` Presence is symmetric and un-gated by role (confirmed
  against `roles-permissions.md`).

**[GAP]/[CONFLICT]/[OPEN QUESTION]:**
- `[CONFLICT: requirements.md/DR-017 vs canonical service map]` — the DR and
  requirements.md label the owning service "notification"; canonical name
  (decision `0017`) is **`noti`**. Resolution: this spec uses `noti`
  throughout; no ADR needed (terminology alignment, not a contract change) —
  flagged for `fe-lead` so it isn't reintroduced downstream.
- `[OPEN QUESTION] OQ-1` — AC-10.6.2.3 allows two behaviors for
  offline-without-a-known-last-seen-bucket ("Hoạt động hôm qua" vs. no
  caption). **Both are currently valid per requirements' own phrasing.**
  `fe-lead`/`uiux-designer` should pick ONE before `fe-qa-playwright` writes
  the Storybook interaction test — recommend defaulting to "no caption"
  (matches existing subtitle-empty behavior, zero new copy needed for the
  ambiguous case) unless design overrides.
- `[OPEN QUESTION] OQ-2` — exact `GET /api/v1/presence` path prefix
  unconfirmed (`/noti/api/v1/presence` assumed vs. bare `/api/v1/presence` as
  literally written in the DR). Affects `bootstrap/endpoint/noti.endpoint.ts`
  wiring only, not UI-facing behavior — confirm against `noti`'s
  `openapi.yaml` when reachable, otherwise proceed on the assumed prefix.
- `[OPEN QUESTION] OQ-3` — does `presence.changed` carry a single `memberId`
  or a batch (`memberIds: string[]`) for near-simultaneous changes (e.g.
  reconnect storms)? This spec assumes single-member events (matches every
  other event type's granularity). If BE ships batched, extend UC-10.6.6
  with a batch-specific AC before closing.
- `[OPEN QUESTION] OQ-4` — should INT-401 become POST-with-body if a group's
  `memberIds` list exceeds URL length limits (~150 members)? Not expected at
  current school scale; flag for `fe-nextjs-engineer` sizing, no AC change
  unless transport changes.
- `[GAP]` — no AC pins down virtualization/perf behavior for a very large
  conversation list (INT-401 batches by "rendered" `memberIds`, ambiguous if
  the list is virtualized). Not blocking for MVP; flag for
  `fe-state-engineer` sizing.
- `[RISK]` — the group-panel sort/count change is a **behavioral fix**, not
  just additive UI: pre-this-US, "online" count silently miscounted `recent`
  members as offline (legacy boolean only had 2 states). Reviewers should
  expect AC-10.6.4.3's example (5 members: 2 online + 1 recent + 2 offline →
  "3 online now") to differ from what today's code would show (would show
  "2"). This is intentional, not a regression.

**i18n key table (all additive, both locales, under existing `messaging`
namespace — zero edits to `messaging.chat.online`):**

| Key | vi | en |
| --- | --- | --- |
| `messaging.presence.onlineNow` | "Đang hoạt động" | "Active now" |
| `messaging.presence.activeMinutesAgo` | "Hoạt động {n} phút trước" | "Active {n} minutes ago" |
| `messaging.presence.activeYesterday` | "Hoạt động hôm qua" | "Active yesterday" |
| `messaging.presence.onlineCount` | "{n} đang hoạt động" | "{n} online now" |
| `messaging.presence.srOnline` | "đang hoạt động" | "online now" |
| `messaging.presence.srRecentlyActive` | "vừa hoạt động gần đây" | "recently active" |

---

## 9. Traceability Matrix

| Requirement | Source | Use Case(s) | Integration(s) | Priority |
| --- | --- | --- | --- | --- |
| FR-001 Conversation-list avatar dot | TR-101/FR-001 | UC-10.6.1 (AC-10.6.1.1–.9) | INT-401 | Must |
| FR-002 DM chat-header dot + caption | TR-101/FR-002 | UC-10.6.2 (AC-10.6.2.1–.7) | INT-401 | Must |
| FR-003 Group header unaffected (guard) | TR-101/FR-003 | UC-10.6.3 (AC-10.6.3.1–.2) | None (assertion only) | Must |
| FR-004 Group panel dot/sort/count | TR-101/FR-004 | UC-10.6.4 (AC-10.6.4.1–.10) | INT-401 | Must |
| FR-005 Base Messaging unaffected (guard) | TR-101/FR-005 | UC-10.6.5 (AC-10.6.5.1–.5) | None (assertion only) | Must |
| FR-006 Live update via SSE | TR-101/FR-006 | UC-10.6.6 (AC-10.6.6.1–.5) | INT-402 | Should |
| NFR-001 A11y non-color-only | TR-101/NFR-001 | UC-10.6.1/.2/.4 (sr-only clauses) | INT-401 | Must |
| NFR-002 No motion | TR-101/NFR-002 | UC-10.6.1/.2/.4 (no-motion ACs) | None | Must |
| NFR-003 i18n additive | TR-101/NFR-003 | UC-10.6.2/.4 (caption/count copy ACs) | None | Must |
| NFR-004 Responsive | TR-101/NFR-004 | UC-10.6.1 (touch-target clause) | None | Must |
| NFR-005 Non-blocking perf | TR-101/NFR-005 | Loading ACs across UC-10.6.1/.2/.4 | INT-401 | Should |
| NFR-006 No new PII / tenant scoping | TR-101/NFR-006 | UC-10.6.6 (AC-10.6.6.4) + exception flows across UC-10.6.1/.2/.4 | INT-401, INT-402 | Must |

---

## 10. Handoff to FE

**What `fe-lead` should build (in domain-changes-first order):**

1. **Domain (additive):** `presence?: "online" | "recent" | "offline"` on
   `ContactEntity`, `ConversationEntity`, `GroupMember` (§8 order). A pure
   `msgPresence()`-equivalent derivation function (naming/location is
   `fe-component-architect`'s call — candidate: shared domain util or a
   small helper co-located with the entities) is the single source of truth
   consumed everywhere; it must not be re-implemented per render site.
2. **Realtime infra (shared file, coordinate if contended):** add
   `"presence.changed"` to `RealtimeEvent` union
   (`src/bootstrap/realtime/event.ts`) + `REALTIME_EVENT_TYPES`; add the
   `case` to `queryKeysFor()` (`src/bootstrap/realtime/event-invalidation.ts`)
   per §6's three invalidation targets. Register the event in
   `docs/product/realtime-events.md`.
3. **Infrastructure (mock-first):** extend
   `src/features/messaging/infrastructure/repositories/messaging.repository.ts`
   for INT-401; extend `src/bootstrap/realtime/mock-upstream.server.ts`
   samples for INT-402. Real wiring behind `NEXT_PUBLIC_USE_MOCK` per
   decision `0014`, endpoint constant added to
   `src/bootstrap/endpoint/noti.endpoint.ts` when `noti`'s REST surface
   confirms (OQ-2).
4. **Presentation:** one shared dot component (composed, reused across 3
   sites → `components/shared/` per `.claude/rules/component-organization.md`
   — do not fork 3 inline implementations); extend conversation-list avatar,
   DM chat-header (avatar + caption), and `group-info-panel.tsx` (sort
   comparator + count line + row dot) to consume it. i18n: add the 6 keys in
   §8's table to both `vi.json`/`en.json`.
5. **Resolve OQ-1** (offline-no-bucket caption behavior) before Storybook
   interaction tests are written for AC-10.6.2.3.

**Suggested lane:** normal (confirmed — additive delta on an implemented
feature, no new screen/route, mock-first data layer, bounded scope).

**Proof owed (maps to TEST_MATRIX rows — see `story.md` §Validation for the
full table):**
- Unit: derivation function (`msgPresence()`-equivalent) covering all 3
  states + both fallback paths (explicit `presence` present vs. only
  `isOnline` vs. neither); sort comparator stability; online-count reducer
  (online + recent, excluding offline).
- Integration: mock repository presence derivation; `parseEvent()` accepting
  `presence.changed` + rejecting malformed frames; `queryKeysFor()` returning
  the 3 documented keys; `shouldHandle()` tenant-drop.
- E2E/Storybook: interaction stories per UC-10.6.1/.2/.4 states (online/
  recent/offline/loading/error), group-header regression story (UC-10.6.3),
  regression stories confirming typing indicator + 4-state coverage
  unchanged (UC-10.6.5), SSE live-update mock-mode story (UC-10.6.6/
  AC-10.6.6.5).
- Design-review gate: `/impeccable audit` for contrast/motion/spacing; a11y
  auditor sign-off on sr-only text + ≥3:1 contrast; i18n diff review
  (additive-only, `messaging.chat.online` untouched).
