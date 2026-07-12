# DR-017 — Presence Indicator (Messaging)

- **US**: US-E10.5 (extends existing epic E10 — messaging; base messaging is
  US-E10.1, group-chat is US-E10.4/DR-008)
- **Route(s)**: `(app)/(shared)/messages` (extends the existing design-ready
  screen, no new route)
- **Mockup**: `design_src/edu/messaging.jsx` — extended in place: `msgPresence()`,
  `MSGPresenceDot`, `msgPresenceCaption()` (search markers "P6: Presence").
- **Type**: **RECONCILE** — minimal-diff extension, generated + audited (P6 in
  `PROMPTS-group-b-ui-gen.md`, run AFTER P2/moderation per the prompt-pack's
  own sequencing note to avoid two diffs on the same file; P8 item 6 further
  reconciled the group-member-panel count/sort to use `msgPresence()` instead
  of the legacy boolean `online`).
- **Already-implemented check**: `messaging.jsx` + `features/messaging`
  already exist design-ready (US-E10.1/E10.4, DR-006/DR-008). This DR adds
  ONLY presence — reuse the existing `messaging` i18n namespace, add keys
  under `messaging.presence.*`, do NOT create a new namespace or re-key
  anything already delivered in DR-008.

## Scope

- Conversation-list avatar + chat-header avatar: 10px presence dot,
  bottom-right — online = `--edu-success` + 2px card-color ring; offline = no
  dot (avoid grey-dot noise); "recent" (<5 min) = success-outline dot
  (hollow), not filled.
- DM header: caption line under name — "Đang hoạt động" / "Hoạt động 5 phút
  trước" / "Hoạt động hôm qua".
- Group room: no per-person presence in header; member-list panel gets a
  presence dot + online-first sort + "N đang hoạt động" count (via
  `msgPresence()`, not the old boolean).
- Typing indicator: untouched (explicitly out of scope).
- No blinking/flashing animation on the dot (motion-safe, reduces noise).

## States

N/A as a standalone screen-state set (this is a presence overlay on an
existing screen); confirm the 4-state coverage already delivered for
messaging in DR-006/DR-008 is unaffected.

## Design-spec entry

`docs/product/design-spec.jsonc` → extend the EXISTING `screens.messaging`
(or `screens.groupChat`, per DR-008) entry with a `presence` sub-object
(dot size/offset/colors, caption typography) — do NOT create a new
`screens.presence` top-level entry. Added by `uiux-designer`.

## UX copy (i18n keys)

Extend the EXISTING `messaging` namespace: `messaging.presence.online`,
`messaging.presence.recentActive` (with relative-time interpolation),
`messaging.presence.activeYesterday`, `messaging.presence.onlineCount`,
`messaging.presence.srOnlineLabel` (sr-only text for the dot). `uiux-ux-writer`
must grep existing `messaging.*` keys first to avoid collision with DR-006/
DR-008 keys.

```jsonc
// vi.json → ADD "presence" object inside the EXISTING "messaging" namespace
// (alongside chat/contextMenu/date/... siblings at line ~1943; do not touch
// messaging.chat.online — that existing key is a different, legacy label)
"messaging": {
  // ...existing keys unchanged...
  "presence": {
    "onlineNow": "Đang hoạt động",
    "activeMinutesAgo": "Hoạt động {count} phút trước",
    "activeYesterday": "Hoạt động hôm qua",
    "onlineCount": "{count} đang hoạt động",
    "srOnline": "đang hoạt động",
    "srRecentlyActive": "vừa hoạt động gần đây"
  }
}
```

```jsonc
// en.json → ADD "presence" object (mirror)
"messaging": {
  // ...existing keys unchanged...
  "presence": {
    "onlineNow": "Active now",
    "activeMinutesAgo": "Active {count} minutes ago",
    "activeYesterday": "Active yesterday",
    "onlineCount": "{count} online now",
    "srOnline": "online",
    "srRecentlyActive": "recently active"
  }
}
```

Notes:
- Grepped `src/bootstrap/i18n/messages/vi.json` → `messaging` block (lines
  1943–2078) first: existing keys are `chat.online` ("Đang online" — legacy
  1:1 DM presence label, distinct call site) and no `presence.*` sub-tree yet
  → safe additive extension, no collision.
- `msgPresenceCaption`'s per-contact seeded `lastSeen` strings (`"Hoạt động 3
  phút trước"`, `"Hoạt động 5 phút trước"`) are mock data with baked-in
  minute counts; the static key is `presence.activeMinutesAgo` with a
  `{count}` param — `/fe` computes the actual elapsed minutes, does not
  hardcode the mock's "3"/"5".
- `messaging.chat.members` (`"{count} thành viên"`) already exists and is
  reused as-is for the member-panel header count; only the online-count line
  (`"N đang hoạt động"`) is new (`presence.onlineCount`).

## A11y (WCAG 2.1 AA)

- Presence dot must carry `sr-only` text ("đang hoạt động") — not color-only.
- Relative-time captions spelled out, no confusing abbreviations.
- No motion (dot does not blink) — motion-safe by default here, nothing to
  gate behind `prefers-reduced-motion` since there is no animation.

## BE contract

Service `notification` (or `noti` per the 5-service map — confirm naming
with `/ba`). `GET /api/v1/presence`, realtime via SSE `/api/v1/stream`
(existing SSE pattern, decision 0009/0041).

## Dependencies

- Same file as DR-013 (moderation report dialog in `messaging.jsx`) — mockup
  already sequenced P2-before-P6; for the DR/spec-entry work here, no direct
  contention since DR-013 edits the report-dialog design-spec sub-entry and
  this DR edits the presence sub-entry of the SAME `screens.messaging` block.
  `uiux-designer` should apply DR-013's edit before DR-017's in the same pass
  to avoid clobbering each other in `design-spec.jsonc`.

## Status

- [ ] delivered
