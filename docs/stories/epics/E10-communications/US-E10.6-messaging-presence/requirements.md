# US-E10.6 — Messaging Presence Indicator — Requirements

> Renumbered from the original brief "US-E10.5" (that ID belongs to the
> unrelated, already-implemented "Messaging defect fixes" story —
> `docs/stories/epics/E10-communications/US-E10.5-messaging-defect-fixes/`).
> Use **US-E10.6** everywhere downstream.

Source design artifact: `docs/design-requests/DR-017-messaging-presence.md`
(status: delivered) + `design_src/edu/messaging.jsx` (`msgPresence()`,
`MSGPresenceDot`, `msgPresenceCaption()`) + `docs/product/design-spec.jsonc`
→ `screens.messaging.presence` sub-object (dot size/offset/colors, header
caption typography, member-panel sort/count spec — already added by
`uiux-designer`, lines ~2926–3010).

This is a **minimal-diff extension** of the already-implemented Messaging
feature (`src/features/messaging/`, US-E10.1 base + US-E10.4 group
enhancements). No new screen, no new route.

## 1. Requirements Summary

The system SHALL surface a lightweight, non-blinking presence indicator
(online / recently-active / offline) for direct-message contacts across the
three places a contact's identity already renders in Messaging: the
conversation-list avatar, the DM chat-header avatar + a caption line under the
contact name, and each row of the group member-info panel (which additionally
gains an online-first sort and an "N online" count). Group conversations do
NOT show per-member presence in their own header — only member count, as
today. All four staff/school roles (teacher, principal, student, parent) that
use Messaging see presence identically; there is no role gating on this
feature. Typing indicator, the 4 async UI states (loading/empty/error/success)
of Messaging itself, and all other existing message-interaction behavior are
explicitly unaffected — this US only adds a presence *layer* on top.

## 2. Technical Requirements (JSON)

```json
{
  "requirementId": "TR-101",
  "title": "Messaging Presence Indicator",
  "status": "Draft",
  "actors": [
    { "role": "teacher", "capabilities": ["view presence of DM contacts and group members", "see own presence reflected to others (symmetric)"] },
    { "role": "principal", "capabilities": ["view presence of DM contacts and group members"] },
    { "role": "student", "capabilities": ["view presence of DM contacts and group members"] },
    { "role": "parent", "capabilities": ["view presence of DM contacts and group members"] }
  ],
  "functionalRequirements": [
    {
      "id": "FR-001",
      "priority": "Must",
      "description": "The system SHALL render a presence dot (bottom-right, 10px, on the conversation-list avatar) for direct (1:1) conversations only, derived from the contact's presence state.",
      "trigger": "Conversation list renders with at least one direct conversation",
      "preconditions": ["Conversation is type=\"direct\"", "Presence data available (live or mock)"],
      "postconditions": ["Filled success-colored dot with card-color ring shown when state=online", "Hollow (outline-only) success-colored dot shown when state=recent (last active <5 min)", "No dot rendered when state=offline"],
      "errorConditions": ["Presence fetch/stream fails or is delayed → avatar renders with no dot (treated as offline/unknown), never a stale or incorrect state"]
    },
    {
      "id": "FR-002",
      "priority": "Must",
      "description": "The system SHALL render the same presence dot convention on the DM chat-header avatar and SHALL render a caption line under the contact's name reflecting the same presence state.",
      "trigger": "User opens or has open a direct conversation",
      "preconditions": ["Conversation is type=\"direct\""],
      "postconditions": [
        "state=online → caption \"Đang hoạt động\" / \"Active now\"",
        "state=recent → caption \"Hoạt động {n} phút trước\" / \"Active {n} minutes ago\" with n computed from actual elapsed time, not hardcoded",
        "state=offline (last seen not recent) → caption \"Hoạt động hôm qua\" / \"Active yesterday\" (or no caption per existing subtitle-empty behavior) — no dot rendered"
      ],
      "errorConditions": ["Presence unknown/unavailable → header falls back to no dot + no caption (never shows a wrong state)"]
    },
    {
      "id": "FR-003",
      "priority": "Must",
      "description": "The system SHALL NOT render any per-member presence indicator in the GROUP chat header — the header continues to show only the member-count subtitle, unchanged from US-E10.4.",
      "trigger": "User opens a group conversation",
      "preconditions": ["Conversation is type=\"group\""],
      "postconditions": ["Header shows avatar (no dot) + \"{count} thành viên\" subtitle only"],
      "errorConditions": []
    },
    {
      "id": "FR-004",
      "priority": "Must",
      "description": "The system SHALL render a presence dot per row in the group member-info panel, sort members online-first (online → recent → offline, stable within each bucket), and show an \"N đang hoạt động\" / \"N online now\" count in the members section header, all computed from the richer presence model rather than the legacy `isOnline` boolean.",
      "trigger": "Group info panel opens",
      "preconditions": ["Conversation is type=\"group\"", "Panel has member list data (may still expose `isOnline` from the API/mock; presentation derives presence via a fallback: explicit `presence` field if present, else `isOnline ? 'online' : 'offline'`)"],
      "postconditions": ["Members re-ordered online-first each time the panel data refreshes", "Offline rows keep the existing dimmed treatment (opacity 0.6, avatar grayscale) — unchanged from US-E10.4", "Online-count line reflects members whose derived presence !== 'offline' (online + recent both count)"],
      "errorConditions": ["Presence data missing for a member → member treated as offline (safe default, no dot, sorted last, excluded from the online count)"]
    },
    {
      "id": "FR-005",
      "priority": "Must",
      "description": "The system SHALL leave the typing indicator, all four Messaging UI states (loading/empty/error/success), message send/reply/pin/delete, and group management (rename, add/remove member, leave, delete) completely unaffected by this change.",
      "trigger": "Any existing Messaging interaction not related to presence",
      "preconditions": ["Feature already implemented (US-E10.1/US-E10.4)"],
      "postconditions": ["No behavioral or visual regression in the above flows"],
      "errorConditions": []
    },
    {
      "id": "FR-006",
      "priority": "Should",
      "description": "The system SHALL update presence state live (via the existing SSE stream) so a contact's dot/caption/sort position reflects near-real-time changes without a full page reload.",
      "trigger": "A presence-change event arrives on the realtime stream for a contact/member currently visible",
      "preconditions": ["SSE connection established (decision 0009/0041)", "Contact/member is rendered in list, header, or panel"],
      "postconditions": ["Affected avatar dot/caption/sort position updates via TanStack Query cache invalidation, consistent with the existing realtime pattern"],
      "errorConditions": ["Stream disconnected → last-known presence is shown (stale-while-revalidate), no dot flips to an error state"]
    }
  ],
  "nonFunctionalRequirements": [
    { "id": "NFR-001", "category": "Accessibility", "requirement": "Presence must never be color-only.", "measurableTarget": "Every presence dot carries an sr-only text equivalent (\"đang hoạt động\" / \"vừa hoạt động gần đây\"); WCAG 2.1 AA — dot color contrast vs card background ≥3:1 (non-text UI component)." },
    { "id": "NFR-002", "category": "Accessibility", "requirement": "No motion/blinking on the presence dot.", "measurableTarget": "Dot has zero animation/transition properties; nothing to gate behind prefers-reduced-motion because there is no motion to begin with." },
    { "id": "NFR-003", "category": "i18n", "requirement": "All new presence copy ships in both locales under the existing messaging namespace.", "measurableTarget": "vi.json and en.json both gain messaging.presence.{onlineNow,activeMinutesAgo,activeYesterday,onlineCount,srOnline,srRecentlyActive}; zero new namespaces; zero edits to the pre-existing messaging.chat.online legacy key." },
    { "id": "NFR-004", "category": "Responsive", "requirement": "Presence dot and caption must not break layout at any supported breakpoint.", "measurableTarget": "No layout break at 320px width; verified at 375/768/1280 — dot overlay does not increase avatar's clickable/touch target below 44×44px." },
    { "id": "NFR-005", "category": "Performance", "requirement": "Presence must not introduce a new blocking loading state to Messaging.", "measurableTarget": "Presence renders progressively (renders with no dot until data resolves, then updates in place) — it does not gate or delay the existing conversation-list/chat-window/group-panel skeleton states." },
    { "id": "NFR-006", "category": "Security", "requirement": "Presence data exposure is symmetric and non-sensitive (online/offline/last-active-bucket only), consistent with existing isOnline exposure.", "measurableTarget": "No precise last-seen timestamp exposed to the client beyond the coarse minute-bucket/day-bucket captions already specified; no new PII surface." }
  ],
  "uiStates": ["loading", "empty", "error", "success"],
  "dataDependencies": [
    { "source": "noti", "entity": "presence (GET /api/v1/presence)", "sensitivity": "Internal" },
    { "source": "noti", "entity": "realtime presence-change event over existing SSE stream (GET /api/v1/stream, decision 0009/0041)", "sensitivity": "Internal" },
    { "source": "mock", "entity": "ContactEntity.isOnline / ConversationEntity.isOnline / GroupMember.isOnline (current mock-first fields) — to be superseded/derived into the richer presence union", "sensitivity": "Internal" }
  ],
  "scope": {
    "inScope": [
      "Presence dot on conversation-list avatar (direct only)",
      "Presence dot + caption on DM chat-header avatar",
      "Presence dot + online-first sort + online-count on group member-info panel rows",
      "Three-state presence model (online / recent (<5 min) / offline)",
      "i18n keys under messaging.presence.*",
      "Realtime update of presence via existing SSE pattern (Should, not Must for v1 if BE `noti` presence endpoint is not yet live — falls back to mock/poll)"
    ],
    "outOfScope": [
      "Typing indicator changes",
      "Any change to group chat header (still member-count only, no per-member presence)",
      "New screen, new route, or new design-spec top-level entry (extends screens.messaging.presence in place)",
      "Precise last-seen timestamp UI (only coarse minute/day buckets per design-spec captions)",
      "Presence for non-messaging surfaces (e.g. staff directory online badges) — out of scope for this US"
    ],
    "externalDependencies": [
      "BE service `noti` — GET /api/v1/presence (does this endpoint exist yet? confirm before FE wiring; mock-first per decision 0014 if not)",
      "Existing SSE proxy route (US-E06.2 scaffold) — presence-change event type needs adding to the typed event union if not already present"
    ]
  },
  "assumptions": [
    "[ASSUMPTION] BE `noti` service's `/api/v1/presence` endpoint may not exist yet at implementation time; FE proceeds mock-first (decision 0014) and wires the real endpoint when `noti` ships, per the DR's own contract-first note.",
    "[ASSUMPTION] The 5-minute 'recent' threshold is a fixed client-side/BE-computed constant, not user-configurable.",
    "[ASSUMPTION] Presence is symmetric and un-gated by role — no role sees more/less presence detail than another (confirmed against roles-permissions.md, which does not distinguish messaging presence visibility by role)."
  ],
  "openQuestions": [
    "Does the `noti` service's presence contract already exist (openapi.yaml) at handoff time, or does FE build fully mock-first for this US and wire BE in a follow-up? (affects data-dependency sensitivity/sequencing only, not UI scope)"
  ]
}
```

## 3. Prioritized Requirements Summary (MoSCoW)

| ID | Requirement | Priority | Rationale |
| --- | --- | --- | --- |
| FR-001 | Presence dot on conversation-list avatar (direct only) | Must | Core DR-017 scope; primary visibility surface |
| FR-002 | DM chat-header dot + caption | Must | Core DR-017 scope; explicit design-spec entry |
| FR-003 | Group header unaffected (no per-member presence) | Must | Explicit non-goal in DR-017; prevents regression |
| FR-004 | Group member-panel dot + online-first sort + count | Must | Explicit DR-017 P8 reconciliation item (replaces legacy boolean) |
| FR-005 | Typing indicator + 4-state coverage + message/group actions unaffected | Must | Minimal-diff extension guardrail; explicit DR-017 out-of-scope note |
| FR-006 | Live update via SSE | Should | Improves usefulness but presence still functions correctly (just less live) if BE `noti` presence isn't live yet — mock-first fallback acceptable for v1 |
| NFR-001/002 | A11y: non-color-only, no motion | Must | WCAG 2.1 AA baseline; explicit DR-017 a11y section |
| NFR-003 | i18n additive-only | Must | Hard i18n rule; DR-017 explicitly flags collision risk with `chat.online` |
| NFR-004 | Responsive, no 320px break | Must | Project-wide responsive baseline |
| NFR-005 | No new blocking loading state | Should | Perceived-performance guardrail, not a new async boundary |
| NFR-006 | No new PII surface | Must | Security baseline; presence stays coarse-grained |

## 4. Handoff Notes

**For `ba-integration-analyst`:**
- Confirm whether `noti` service already exposes `GET /api/v1/presence` in its
  `openapi.yaml`/`INTEGRATION.md`, or whether this remains contract-first
  (decision `0009` precedent: web defines `docs/product/realtime-events.md`
  first, BE follows). If absent, define the mock-first shape aligned to the
  3-state union (`"online" | "recent" | "offline"`) plus whatever
  `lastActiveAt`/minute-bucket the caption needs.
- Add (or confirm) a `presence.changed` (naming TBD) event type to the
  existing typed SSE event union (`US-E06.2` scaffold: `parseEvent`,
  `shouldHandle`, `queryKeysFor`) so FR-006 has an invalidation target.
- Note the existing entity fields to migrate/extend: `ContactEntity.isOnline`
  (`src/features/messaging/domain/entities/contact.entity.ts`),
  `ConversationEntity.isOnline` (direct-only,
  `.../conversation.entity.ts`), and `GroupMember.isOnline`
  (`.../group.entity.ts`) — all currently a plain boolean. The design-spec
  entry (`docs/product/design-spec.jsonc` → `screens.messaging.presence`)
  already defines the derivation fallback: `msgPresence(c) = c.presence ||
  (c.online ? 'online' : 'offline')` — i.e. entities SHOULD gain an optional
  richer `presence?: "online" | "recent" | "offline"` field, with the legacy
  boolean kept as a fallback rather than deleted outright (minimal-diff).

**For `ba-use-case-modeler`:**
- Model the three render sites (list avatar, DM header, group panel) as
  separate Given/When/Then flows sharing one presence-state Given (`online` /
  `recent` / `offline`), since visual treatment differs per site.
- Include the "presence unknown/unavailable" error-path AC explicitly (falls
  back to offline-equivalent / no-dot rendering) since there's no
  dedicated error UI state for this overlay feature.
- Role variants are trivial here (identical across teacher/principal/
  student/parent) — call this out explicitly in the AC so QA doesn't spend
  cycles hunting for a role difference that doesn't exist.
- Confirm the group member-panel online-first sort is stable-sort (ties
  broken by existing member order) to avoid list-jitter AC ambiguity.

## Existing `online: boolean` field audit (for `ba-lead`)

Confirmed three existing plain-boolean presence fields that this feature's
data model must reconcile, per DR-017's own note about the "legacy boolean
`online`":

- `ContactEntity.isOnline: boolean` — `src/features/messaging/domain/entities/contact.entity.ts:11`
- `ConversationEntity.isOnline?: boolean` (direct-only) — `src/features/messaging/domain/entities/conversation.entity.ts:19`
- `GroupMember.isOnline: boolean` — `src/features/messaging/domain/entities/group.entity.ts:16`, consumed today in `src/features/messaging/presentation/group-info-panel/group-info-panel.tsx:215-216` (dims avatar) and implicitly in list order (no sort currently).

None of these has been migrated yet — `design-spec.jsonc`'s `screens.messaging.presence` sub-object (already added, lines ~2926–3010) specifies the derivation fallback so migration is additive (`presence?: "online" | "recent" | "offline"`, falling back to the boolean), not a breaking rename. i18n: `messaging.chat.online` ("Đang online") remains as-is (legacy, distinct call site per DR-017); no `messaging.presence.*` keys exist yet in `vi.json`/`en.json` — confirmed by grep, so `uiux-ux-writer`'s proposed keys in DR-017 are still pending addition, not yet landed despite the DR being marked "delivered" for design purposes.
