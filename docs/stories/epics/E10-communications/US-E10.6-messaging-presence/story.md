# US-E10.6 Messaging Presence Indicator

> Renumbered from the original brief "US-E10.5" — that ID belongs to the
> unrelated, already-implemented "Messaging defect fixes" story
> (`docs/stories/epics/E10-communications/US-E10.5-messaging-defect-fixes/`).
> Use **US-E10.6** everywhere (branch, commits, harness-cli, TEST_MATRIX).

## Status

planned

## Lane

normal

## Dependencies

- Depends on: US-E10.1 (Messaging base, implemented), US-E10.4 (Group
  enhancements, implemented) — this US is a minimal-diff extension, not
  net-new. No new screen, no new route.
- Blocks: none known.
- Feature module(s) chạm: `src/features/messaging/` (domain entities,
  infrastructure mock repository, presentation: conversation-list,
  chat-header, group-info-panel). Also `src/bootstrap/realtime/` (typed SSE
  event union + invalidation map) and `src/bootstrap/i18n/messages/{vi,en}.json`
  (`messaging.presence.*` namespace, additive only).
- Shared contract/file: `RealtimeEvent` union (`src/bootstrap/realtime/event.ts`)
  and `queryKeysFor()` (`src/bootstrap/realtime/event-invalidation.ts`) are
  shared infra touched by every realtime-consuming feature — extend
  additively (new union member), never restructure existing cases. Coordinate
  if another in-flight US also edits these two files.

## Product Contract

The system SHALL surface a lightweight, non-blinking, three-state presence
indicator (`online` / `recent` (<5 min) / `offline`) for direct-message
contacts across the three places a contact's identity already renders in
Messaging:

1. **Conversation-list avatar** (direct conversations only) — presence dot,
   bottom-right.
2. **DM chat-header avatar + caption line** under the contact name.
3. **Group member-info panel** — per-row dot, online-first stable sort,
   "N online now" count line.

Group conversations show **no** per-member presence in their own header —
member-count subtitle only, unchanged from US-E10.4. All four roles (teacher,
principal, student, parent) see presence identically — no role gating.
Typing indicator, the 4 async UI states (loading/empty/error/success) of
Messaging itself, and all other existing message-interaction/group-management
behavior are explicitly unaffected — presence is an additive layer, never a
new gate or replacement.

Full engineering detail (FR/AC/traceability): see `spec.md` in this packet.

## Relevant Product Docs

- `docs/design-requests/DR-017-messaging-presence.md` (delivered)
- `design_src/edu/messaging.jsx` — `msgPresence()`, `MSGPresenceDot`,
  `msgPresenceCaption()` ("P6: Presence" block, lines ~40–76; `ConvoItem`
  avatar dot ~1479; chat-header dot+caption ~1684/1697; group-panel member
  list ~1015–1053)
- `docs/product/design-spec.jsonc` → `screens.messaging.presence` (lines
  ~2926–3010) — dot size/offset/colors, header caption copy, group-panel
  sort/count/banner spec (**normative** — do not re-derive values, read them
  from here)
- `docs/product/realtime-events.md` — SSE event taxonomy (decision `0009`);
  add `presence.changed` here when implemented
- `docs/decisions/0009-realtime-transport-sse.md`,
  `docs/decisions/0041-sse-client-in-presentation-layer.md`
- `.claude/rules/api-integration.md` (service map — `noti`, not
  "notification")

## Acceptance Criteria

Condensed; full Given/When/Then AC (44 total, AC-10.6.1.1…AC-10.6.6.5) live in
`use-cases.md` §4 and are consolidated with traceability IDs in `spec.md` §9.

- **UC-10.6.1 (FR-001)** — Conversation-list avatar: filled dot = online,
  hollow dot = recent, no dot = offline/group/error/unknown. Progressive,
  non-blocking; sr-only text; zero motion.
- **UC-10.6.2 (FR-002)** — DM chat-header: same dot convention + caption
  ("Đang hoạt động" / "Hoạt động {n} phút trước" / "Hoạt động hôm qua" or no
  caption); unavailable → no dot + no caption.
- **UC-10.6.3 (FR-003, regression guard)** — Group header shows member-count
  subtitle only, never presence, regardless of member states.
- **UC-10.6.4 (FR-004)** — Group member panel: dot per row (9px/0 offset),
  online-first stable sort (online→recent→offline), "N đang hoạt động" count
  from `msgPresence()` not legacy `isOnline`; offline dimmed treatment
  unchanged; missing record → safe offline default.
- **UC-10.6.5 (FR-005, regression guard)** — Typing indicator, base 4-state
  coverage, message actions, group management: pixel/behavior-identical to
  pre-US-E10.6.
- **UC-10.6.6 (FR-006, Should)** — Live update via existing SSE stream
  (`presence.changed` event, additive to `RealtimeEvent` union) invalidates
  the relevant query key; disconnect → stale-while-revalidate; mock-first
  fallback acceptable for v1.

## Design Notes

**Entities to extend (additive, keep legacy boolean as fallback input — do
NOT delete or rename):**

- `ContactEntity.isOnline: boolean` →  add `presence?: "online" | "recent" | "offline"`
  — `src/features/messaging/domain/entities/contact.entity.ts:11`
- `ConversationEntity.isOnline?: boolean` (direct-only) → add same
  `presence?` field — `src/features/messaging/domain/entities/conversation.entity.ts:19`
- `GroupMember.isOnline: boolean` → add same `presence?` field —
  `src/features/messaging/domain/entities/group.entity.ts:16` (consumed today
  in `src/features/messaging/presentation/group-info-panel/group-info-panel.tsx:215-216`
  for the dimmed treatment; that consumption stays, only the sort/count
  derivation logic changes to read `presence` via the fallback function).
- Derivation rule (from design-spec, do not re-derive):
  `msgPresence(x) = x.presence || (x.isOnline ? 'online' : 'offline')`.

**Commands:** none (presence is read/subscribe-only; no user action mutates
presence from this UI).

**Queries:**
- `GET /noti/api/v1/presence?memberIds=...` (INT-401, MOCK-FIRST) — batched
  per render site (conversation-list contacts, open DM contact, open group's
  member list), not a global fetch.
- Existing `groupMembers(groupId)` query (US-E10.4) — extend response
  derivation, no new query key needed for the base fetch itself.

**API:** see `spec.md` §6 for full request/response shape, error mapping,
mock-first plan.

**Tables:** none (no new backend table; `noti` presence store is BE-owned).

**Domain rules:**
- Dot never renders for group avatars (list or header).
- "recent" = last active <5 minutes; offline = no dot (never grey/muted dot).
- Group-panel sort/count computed from `msgPresence()`, never the legacy
  `isOnline` boolean directly.
- Missing/failed presence data → safe default = offline-equivalent (no dot,
  sorted last, excluded from count) — never a guessed or stale state.

**UI surfaces:**
- `src/features/messaging/presentation/conversation-list/` — avatar dot.
- `src/features/messaging/presentation/chat-header/` (or equivalent existing
  component housing the DM header) — avatar dot + caption line.
- `src/features/messaging/presentation/group-info-panel/group-info-panel.tsx`
  — per-row dot, online-first sort, "N online" banner.
- New shared dot element: per `.claude/rules/component-organization.md`,
  since the SAME dot convention is reused across 3 sites, it is a composed
  component reused ≥2 screens → belongs in `components/shared/` (naming/exact
  placement is `fe-component-architect`'s call, not prescribed here — but do
  NOT let 3 independent inline implementations exist).
- SSE: extend `RealtimeEvent` union in `src/bootstrap/realtime/event.ts`
  (add `"presence.changed"` literal + payload shape per `spec.md` §6);
  extend `REALTIME_EVENT_TYPES`; extend `queryKeysFor()` in
  `src/bootstrap/realtime/event-invalidation.ts`. Reuses the existing single
  `EventSource` connection opened by `use-realtime-events.ts` — **no second
  SSE mechanism** (decision `0041`). Screen-local optimistic-apply hook, if
  chosen, follows the precedent of
  `src/features/notifications-center/.../use-notification-new-event.ts`
  (US-E10.2) — optional, FR-006 is "Should".
- Mock: extend
  `src/features/messaging/infrastructure/repositories/messaging.repository.ts`
  (existing `USE_MOCK` branch pattern) for INT-401; extend
  `src/bootstrap/realtime/mock-upstream.server.ts`'s `samples` array with one
  `presence.changed` sample frame for INT-402 mock-mode exercise.

## Validation

When updating durable proof status, use numeric booleans:
`scripts/bin/harness-cli story update --id US-E10.6 --unit 1 --integration 1 --e2e 0 --platform 0`.

| Layer | Expected proof |
| --- | --- |
| Unit | Domain: `msgPresence()`/derivation fallback logic (if extracted to a pure fn), entity mapper additive-field handling, sort comparator (online→recent→offline, stable), online-count reducer. |
| Integration | Mock repository returns `presence` per `memberIds`; `parseEvent()` accepts `presence.changed` and rejects malformed frames; `queryKeysFor()` returns the 3 documented invalidation targets; `shouldHandle()` tenant-drop for a cross-tenant `presence.changed` event. |
| E2E | Storybook interaction stories per UC-10.6.1/.2/.4 states (online/recent/offline/error/loading dot+caption+sort+count); Playwright/story assertion that group header shows no dot (UC-10.6.3); regression assertion that typing indicator + 4-state coverage unchanged (UC-10.6.5). |
| Platform | n/a for this US (no new route/layout shell change). |
| Release | Design-review gate (`docs/DESIGN_REVIEW.md` + `/impeccable`) — a11y (sr-only, contrast ≥3:1, no motion), i18n key diff review (additive-only, no edit to `messaging.chat.online`). |

## Harness Delta

- New i18n keys to register: `messaging.presence.{onlineNow,activeMinutesAgo,
  activeYesterday,onlineCount,srOnline,srRecentlyActive}` in both
  `vi.json`/`en.json` — additive only, zero edits to existing
  `messaging.chat.online`.
- No new ADR required (naming correction "notification"→`noti` is
  terminology alignment only, not a contract change — see `integration.md`
  §Naming correction).
- If BE `noti` confirms `GET /api/v1/presence` at implementation time,
  `bootstrap/endpoint/noti.endpoint.ts` gains a `presence` entry — update
  Harness story status/notes when that lands (currently mock-first).
- Register `presence.changed` in `docs/product/realtime-events.md` (the
  durable SSE taxonomy doc) when the event type is implemented.

## Evidence

Design review: pass
- design-system: conform — `PresenceDot` uses only existing tokens
  (`bg-edu-success-text`/`border-edu-success-text`/`ring-card`, corrected from
  the design-spec's literal `--edu-success` value per A11Y-002 — see below);
  no new token, dot geometry/offset matches `design-spec.jsonc`
  `screens.messaging.presence` exactly (10px/1px list+header, 9px/0 panel).
- a11y: WCAG AA — `fe-accessibility-auditor` found 1 blocking (A11Y-001,
  sr-only presence text unreachable inside an `aria-label`led row button —
  fixed by folding the announcement into the button's own label via
  `conversationPresenceSuffix()`) + 1 major (A11Y-002, `--edu-success`
  ~1.72:1 non-text contrast — fixed by swapping to `--edu-success-text`
  5.24:1, both dot fill and hollow-dot border) + 1 minor (A11Y-004, same
  token fix on the group-panel "N online" banner dot) + 1 informational
  positive note (A11Y-003, chat-header caption already correctly uses
  `text-muted-foreground`/`--edu-text-secondary` instead of the design-spec's
  literal-but-failing `--edu-text-muted` — flagged as a doc-sync item for
  uiux, no code change). All blocking/major/minor findings fixed and
  re-verified (commit `79d240a`). Keyboard/motion/touch-target: pass (no new
  focusable node, zero animation classes — now asserted by
  `presence-dot.test.tsx`, not just a code comment).
- impeccable audit: scope covered functionally via the tech-lead + a11y
  passes above (tokens-only, contrast, motion, spacing conform to the
  already-normative `design-spec.jsonc` entry); no separate palette/layout
  deviation found — design system stays supreme, no conflict to record.
- states: loading/empty/error/success OK for all 3 render sites (presence is
  a non-blocking overlay, NFR-005 — proven via Storybook interaction stories
  + `presence-invalidation.test.ts`); responsive/320px unaffected (no new
  layout, dot is an absolute-positioned overlay); dark mode unaffected
  (token-only colors).

Tech-lead review (`fe-tech-lead-reviewer`): **Approved**. Layer boundaries,
component placement (`components/shared/presence-dot/`), `msgPresence()`
single-source-of-truth, i18n additive-only, SSE additive-only, security/tenant
scoping all verified directly (not self-report). One non-blocking
consideration noted (presence query key could be based on a stable id-hash
instead of a static key for future-proofing against optimistic
conversation-insert) — not required, no action taken this US.

QA (`fe-qa-playwright`): **Conditional Pass → resolved to full pass.**
38 AC mapped; 34/38 solid on first pass. Verified gaps: DEF-1 (MAJOR,
AC-10.6.3.2 — group-panel presence fetch was firing on conversation-select
instead of panel-open) fixed by lifting panel-open state via
`ChatWindow.onGroupInfoOpenChange` + a new pure `isGroupPresenceQueryEnabled()`
predicate (`presence-gating.ts`, 5 tests). No-motion AC gap (AC-10.6.1.9/
.2.7/.4.10) closed with explicit `presence-dot.test.tsx` assertions (7 tests).
Remaining non-blocking coverage notes (AC-10.6.2.4 dedicated story,
AC-10.6.4.4/.6/.7 panel-level assertions) left as follow-up — functionally
covered by code path reuse, not required to ship.

Regression guard (FR-005/UC-10.6.5): independently verified by both
`fe-tech-lead-reviewer` and `fe-qa-playwright` via `git diff main..HEAD` on
every named existing test file — zero assertion changes (only
`messaging.mapper.test.ts`/`conversation-item.test.ts` gained purely additive
tests).

Proof (final, after all fix rounds):
- `bun vitest run` → 277 files / 1552 tests, all passed.
- `bunx tsc --noEmit` → clean.
- `bun run build` → success.
- Storybook interaction (live Chromium, presence-touching files) → 4 files /
  29 tests passed. `messaging-screen.stories.tsx` broader check: 21/23 (2
  pre-existing failures confirmed identical on unmodified `main` via a
  throwaway worktree — not a regression).

Harness: `scripts/bin/harness-cli story update --id US-E10.6 --status
implemented --unit 1 --integration 1 --e2e 1 --platform 0`.

Open follow-ups (non-blocking, tracked here not as new stories):
- OQ-2: `NOTI_EP.presence` path (`/noti/api/v1/presence`) assumed — confirm
  against `noti`'s `openapi.yaml` when it ships real HTTP.
- OQ-3: `presence.changed` assumed single-`memberId` per event — revisit if
  BE ships batched.
- Doc-sync flag for uiux (not FE scope): `design-spec.jsonc`
  `screens.messaging.presence.dot.online.background`/`recent.border` should
  read `var(--edu-success-text)` (not `var(--edu-success)`, which fails
  1.4.11 at ~1.72:1) and `headerCaption.color` should read
  `var(--edu-text-secondary)` (not `var(--edu-text-muted)`, which fails 1.4.3
  at 2.95:1) — the implementation already uses the correct accessible
  tokens; only the doc's literal values need correcting so future
  implementers don't copy the failing ones verbatim.
