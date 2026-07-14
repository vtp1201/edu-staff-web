# US-E10.6 — Messaging Presence Indicator — Implementation Plan

Status: planned · Lane: normal · Depends on US-E10.1 + US-E10.4 (implemented).
Minimal-diff, additive extension of `src/features/messaging/`. No new screen,
no new route. Full FR/AC in `spec.md`; this plan sequences the work and pins
the two design decisions `spec.md`/`integration.md` left open for `fe-lead`
(shared dot component home, INT-401 repo/use-case shape).

## 0. Decisions this plan locks in (read before coding)

1. **OQ-1 (AC-10.6.2.3, offline-no-bucket caption):** adopt **"no caption"**
   for offline-without-a-known-last-seen-bucket — matches the existing
   subtitle-empty behavior, zero new copy for the ambiguous case. The
   `activeYesterday` key is used ONLY when a day-bucketed `lastActiveAt` is
   actually present on the entity; otherwise the caption renders empty string
   (same code path as today's `subtitle = conversation.isOnline ? t("chat.online") : ""`).
   No further design input needed before Storybook tests are written.

2. **Shared presence-dot component** (composed, reused at 3 sites — per
   `.claude/rules/component-organization.md` decision tree, composed +
   reused ≥2 screens → `components/shared/`):
   `src/components/shared/presence-dot/` (`presence-dot.tsx`, `index.ts`,
   `presence-dot.stories.tsx`). Name: `PresenceDot`. Props:
   `{ presence: PresenceState; size: "list" | "header" | "panel" }` — `size`
   maps to the design-spec's two geometries (10px/1px offset for
   list+header, 9px/0 offset for panel) so callers don't pass raw pixel
   values. Renders `null` (no DOM) for `presence === "offline"`. Always
   renders sr-only text via a `label` prop passed in by the caller (caller
   translates — component itself does not call `useTranslations`, keeping it
   a dumb presentational primitive consistent with `components/shared/`
   conventions e.g. `status-badge`).

3. **INT-401 shape — NOT added to `IMessagingRepository`** (that interface is
   `social`'s 12-method contract; presence is `noti`'s). New, deliberately
   small sibling interface + use-case, mirroring the exact per-feature
   DI/repo pattern already used for every other messaging capability:
   - `src/features/messaging/domain/repositories/i-presence.repository.ts`
     — `IPresenceRepository { getPresence(memberIds: string[]): Promise<Result<PresenceRecord[], MessagingFailure>> }`.
   - Reuses `MessagingFailure` (additive new member `"load-presence-failed"`)
     rather than inventing a parallel failure union — the UI treats every
     presence failure identically (no dot), so one generic failure member is
     sufficient; do not over-model.
   - `src/features/messaging/domain/use-cases/get-presence.use-case.ts` —
     thin orchestration, same shape as `get-contacts.use-case.ts`.
   - `src/features/messaging/infrastructure/repositories/presence.repository.ts`
     (real, `'server-only'`) + `.../mocks/presence.mock.repository.ts` (mock).
   - `bootstrap/di/messaging.di.ts` gains `makeGetPresenceUseCase()` selecting
     real/mock via `USE_MOCK`, same `makeRepo()`-style helper, separate small
     `makePresenceRepo()` (does not touch the existing `makeRepo()` used by
     the 12 `IMessagingRepository` methods).
   - `bootstrap/endpoint/noti.endpoint.ts` gains `presence: "/noti/api/v1/presence"`
     on `NOTI_EP` (assumed path per OQ-2 — update when `noti`'s `openapi.yaml`
     confirms).

4. **Derivation helpers live in `domain/entities/`** (pure, zero framework
   deps, consumed by mock repo AND presentation): new file
   `src/features/messaging/domain/entities/presence.ts` exporting
   `PresenceState`, `msgPresence()`, `presenceRank()` (online=2/recent=1/
   offline=0, for the sort comparator), `isPresenceCountable()` (online or
   recent → counts toward "N online"). Caption-text selection (which i18n
   key, if any) is presentation-only logic (depends on `t()` + real elapsed
   time) — lives in a new pure, unit-testable file
   `src/features/messaging/presentation/chat-window/presence-caption.ts`
   (`derivePresenceCaptionKey(state, lastActiveAt?, now?)` →
   `{ key: "onlineNow"|"activeMinutesAgo"|"activeYesterday"|null; n?: number }`).

## Phase 1 — Domain entities (additive) + derivation helper

**Files:**
- `src/features/messaging/domain/entities/contact.entity.ts` — add
  `presence?: "online" | "recent" | "offline"; lastActiveAt?: string`.
- `src/features/messaging/domain/entities/conversation.entity.ts` — same two
  optional fields (direct-only, comment already documents `isOnline` as
  direct-only — extend that comment).
- `src/features/messaging/domain/entities/group.entity.ts` — same two
  optional fields on `GroupMember`.
- New `src/features/messaging/domain/entities/presence.ts` —
  `PresenceState`, `msgPresence()`, `presenceRank()`, `isPresenceCountable()`.

**Test first (`presence.test.ts`, colocated):**
- `msgPresence()`: explicit `presence` wins; falls back to `isOnline ? 'online' : 'offline'`; neither present → `'offline'` (never throws).
- `presenceRank()`: online=2, recent=1, offline=0.
- `isPresenceCountable()`: true for online/recent, false for offline.
- Sort comparator (can be a small `sortByPresence()` helper here too, or
  inline in group-info-panel — prefer extracting to `presence.ts` since it's
  reused nowhere else but keeps group-info-panel free of algorithm logic):
  `sortByPresence(members, getPresence)` — stable, online→recent→offline,
  ties keep original relative order (verify with `Array.prototype.sort`
  stability — Node/V8 sort is stable, but assert behavior explicitly via a
  test with duplicate ranks and pre-shuffled input order preserved).

**Done when:** unit tests green; zero changes to existing entity consumers'
compiled shape (optional fields, no breaking change) — confirm by running
existing `messaging.mapper.test.ts` / `conversation-item.test.ts` unchanged
and still green.

## Phase 2 — Infrastructure: DTO, mapper, presence repo (mock-first)

**Files:**
- `src/features/messaging/infrastructure/dtos/presence-response.dto.ts` —
  `{ memberId: string; status: "online"|"recent"|"offline"; lastActiveAt: string }[]`.
- `src/features/messaging/infrastructure/mappers/messaging.mapper.ts` —
  extend `toContactEntity`/`toConversationEntity` to pass through `presence`/
  `lastActiveAt` if present on their DTOs (additive DTO fields too —
  `contact-response.dto.ts`, `conversation-response.dto.ts` gain the same
  two optional fields, mirroring the entity).
- `src/features/messaging/infrastructure/mappers/group.mapper.ts` — same for
  `GroupMember`.
- New `src/features/messaging/domain/repositories/i-presence.repository.ts`.
- New `src/features/messaging/domain/failures/messaging.failure.ts` — add
  `{ type: "load-presence-failed"; cause: string }` member (additive union).
- New `src/features/messaging/infrastructure/repositories/presence.repository.ts`
  (real, `'server-only'`, calls `NOTI_EP.presence` with `memberIds` query
  param, maps DTO→`PresenceRecord[]`, catches → `load-presence-failed`).
- New `src/features/messaging/infrastructure/repositories/mocks/presence.mock.repository.ts`
  — derives `status` from the **existing** mock fixtures' `isOnline` boolean
  (`true` → `"online"`; `false` → deterministic `"recent"`/`"offline"` split
  seeded by a stable hash of `memberId`, so all 3 states are exercisable
  without new fixture files, matching `integration.md`'s mock-first plan).
  `lastActiveAt` synthesized as `now - {0, 3min, 2days}` per bucket.
- `bootstrap/endpoint/noti.endpoint.ts` — add `presence` entry to `NOTI_EP`.
- `bootstrap/di/messaging.di.ts` — add `makePresenceRepo()` + `makeGetPresenceUseCase()`.
- New `src/features/messaging/domain/use-cases/get-presence.use-case.ts`.

**Test first:**
- `presence.mock.repository.test.ts` — given a set of `memberIds` overlapping
  known mock contacts, returns one record per id with `status` derived
  deterministically (same input → same output across calls, i.e. no
  `Math.random()`); unknown `memberId` → either omitted or `"offline"`
  (pick omitted — matches FR-004's "missing record → safe default" being a
  presentation-layer concern, not a repo one — document this choice in the
  mock repo's docstring).
- `get-presence.use-case.test.ts` — mocks `IPresenceRepository`, asserts
  pass-through `ok`/`fail` (same trivial-orchestration test shape as
  `get-contacts.use-case.ts`'s sibling test, if one exists — otherwise mirror
  `create-conversation.use-case.test.ts`'s structure).
- Mapper test addition in `messaging.mapper.test.ts` / a new
  `group.mapper.test.ts` (if it doesn't already exist — check first) —
  DTO with `presence`/`lastActiveAt` present → entity carries them; DTO
  without them → entity fields are `undefined` (never throws, never
  defaults incorrectly).

**Done when:** unit + the repo/mapper tests green; `bun vitest related` on
touched files passes.

## Phase 3 — Presentation: shared `PresenceDot` + 3 render sites

**Files:**
- `src/components/shared/presence-dot/presence-dot.tsx` + `index.ts` +
  `presence-dot.stories.tsx` (states: online/recent/offline×list/header/panel
  sizes — offline renders nothing, so the offline story asserts absence).
- `src/features/messaging/presentation/conversation-item/conversation-item.tsx`
  — replace the inline dot markup (lines ~69–77) with
  `<PresenceDot presence={msgPresence(conversation)} size="list" label={...} />`,
  gated on `!isGroup` (group avatars never render it, AC-10.6.1.4).
- `src/features/messaging/presentation/chat-window/chat-window.tsx` —
  replace inline header dot (~233–241) the same way (`size="header"`); add
  `presence-caption.ts` import, replace the `subtitle` ternary (~152–156)
  with `derivePresenceCaptionKey()` → `t("presence.<key>", {n})` or `""`.
  Group subtitle branch (member count) is untouched (FR-003 guard).
- `src/features/messaging/presentation/group-info-panel/group-info-panel.tsx`
  — before rendering `<ul>` (~205), compute
  `const sorted = sortByPresence(group.members, msgPresence)` and
  `const onlineCount = sorted.filter(isPresenceCountable).length`; render the
  onlineCountBanner line (design-spec `groupPanel.onlineCountBanner`: 7px dot,
  `t("presence.onlineCount", { n: onlineCount })`) above the `<ul>`; map over
  `sorted` instead of `group.members`; add `<PresenceDot presence={...} size="panel" />`
  per row next to the existing `!m.isOnline && "opacity-60 grayscale"` avatar
  class (dimmed treatment stays keyed off `msgPresence(m) === 'offline'`, not
  the raw `m.isOnline`, per FR-004's "never the legacy boolean directly").

**Test first (Storybook interaction, per AC — see Phase 6 for the full list;
these are the "does it render/derive correctly" checks co-located with each
component, not yet the design-review-gate stories):**
- `presence-dot.stories.tsx` interaction: online → filled + sr-only text;
  recent → hollow + sr-only text; offline → no DOM node at all.
- `presence-caption.test.ts` (pure fn, Vitest, no React): online → `onlineNow`
  no params; recent → `activeMinutesAgo` with real `n` computed from
  `lastActiveAt`; offline+dayBucket → `activeYesterday`; offline+no-bucket →
  `null` (renders nothing, per Decision §0.1).

**Done when:** the three render sites visually match design-spec geometry/
color values (manual + `/impeccable audit` later in the gate), existing
`conversation-item.test.ts` still green, `bun vitest related` green.

## Phase 4 — i18n (additive only)

**Files:** `src/bootstrap/i18n/messages/vi.json` + `en.json` — add exactly
the 6 keys under `messaging.presence.*` from `spec.md` §8's table
(`onlineNow`, `activeMinutesAgo`, `activeYesterday`, `onlineCount`,
`srOnline`, `srRecentlyActive`). Zero edits to `messaging.chat.online`.

**Verification (no test framework needed, but gate-checked):** `bunx tsc --noEmit`
catches any typed-message key drift; manual diff review confirms additive-only.

## Phase 5 — Realtime infra (shared files — coordinate if contended)

**Files:**
- `src/bootstrap/realtime/event.ts` — add `"presence.changed"` union member
  (shape per `integration.md`/`spec.md` §6) + append to
  `REALTIME_EVENT_TYPES`.
- `src/bootstrap/realtime/event-invalidation.ts` — add
  `case "presence.changed":` to `queryKeysFor()` returning the 3 documented
  targets: `conversationsKey()`-equivalent (`["messaging","conversations"]`),
  and `["messaging","group", event-scoped conversationId]` for the panel —
  **reuse the exact existing `groupKey(id)` shape** (keyed by
  `conversationId`, confirmed in `messaging-screen.tsx:35`, NOT `groupId` —
  do not invent a parallel key). Since the event payload only carries
  `memberId` (not `conversationId`), and DM header shares the conversations
  list key already, the group-panel case can't be precisely scoped from the
  payload alone for v1 — return the generic `["messaging","conversations"]`
  key plus, if a `conversationId`/`groupId` is later added to the payload,
  the scoped group key. Document this v1 simplification as a code comment
  (mirrors `message.new`'s existing precedent of returning `[]` for a
  narrower-than-ideal scope rather than over-engineering).
- `src/bootstrap/realtime/mock-upstream.server.ts` — add one
  `presence.changed` sample frame to `samples[]` (flips one seeded contact
  `offline`→`online` a few seconds after connect).
- `docs/product/realtime-events.md` — register `presence.changed` in the
  durable SSE taxonomy doc.

**Test first:**
- `event.test.ts` (or wherever `parseEvent`/`shouldHandle` are tested today
  — check for an existing `event.test.ts`; if none exists, this phase adds
  the first one, extending coverage for `presence.changed`: accepts a
  well-formed frame, rejects malformed (`payload` not an object, missing
  `eventId`/`tenantId`), `shouldHandle()` drops cross-tenant.
- `event-invalidation.test.ts` — `presence.changed` → returns the documented
  key set (assert `["messaging","conversations"]` is included).

**Done when:** unit tests green; existing tests for other event types
(`notification.new`, `attendance.updated`, etc.) still pass unchanged
(regression guard on shared files).

## Phase 6 — Wire presence into TanStack Query (render-site fetch + invalidation)

**Files:** `messaging-screen.tsx` (or a small new hook file if the existing
component is already large — check line count first) — add a presence query
per render site, batched:
- Conversation list: one `useQuery({ queryKey: ["messaging","presence","list"], queryFn: () => getPresence(directContactIds) })`, merged into the rendered `ConversationEntity[]` before passing to `ConversationItem` (or merged inside `ConversationItem` via a prop — prefer merging once at the list level to avoid N separate queries).
- DM header: reuse the same list-level presence data if the open conversation is in the list; else a small dedicated query for the single open contact.
- Group panel: one query scoped to the open group's `memberIds`
  (`["messaging","presence","group", groupId]`), fetched only when the panel
  is open (AC-10.6.3.2 — no presence fetch attributable to the header itself).

**Non-functional constraint (NFR-005):** these queries must NOT gate the
existing `conversationsKey()`/`groupKey()` queries' loading state — render
with `presence: undefined` until resolved (progressive).

**Test first:** integration-level test (or defer to Storybook interaction if
`messaging-screen.tsx` has no existing unit test file — check first) —
presence query pending → rows render without dots; presence query
error/resolved-empty → rows render offline-equivalent (no dot); presence
query resolved with data → rows update in place.

**Done when:** manual dev-mode check (`NEXT_PUBLIC_USE_MOCK=true bun dev`)
shows all 3 states across all 3 sites; no console error on presence fetch
failure (simulate via mock repo throwing).

## Phase 7 — Storybook interaction + regression-guard stories (design-review gate input)

**New/extended stories:**
- `conversation-list.stories.tsx` — add online/recent/offline/group-no-dot
  variants (AC-10.6.1.1–.4), loading (presence pending, AC-10.6.1.5), error
  (presence fetch fails, AC-10.6.1.7).
- `chat-window.stories.tsx` (create if it doesn't exist yet — check) — DM
  header online/recent/offline+bucket/offline+no-bucket/unavailable
  (AC-10.6.2.1–.4), group header no-dot regression story (AC-10.6.2.6 /
  AC-10.6.3.1).
- `group-info-panel.stories.tsx` — extend existing stories with a mixed
  online/recent/offline member set asserting sort order + count banner text
  (AC-10.6.4.1–.3), single-member edge case (AC-10.6.4.8), presence-fetch-
  error variant (AC-10.6.4.9).
- Regression stories/assertions (UC-10.6.5): re-run/extend existing
  `typing-indicator.test.ts` (unchanged, no new assertions needed — passing
  as-is IS the proof) and confirm `conversation-item.test.ts`,
  `messaging.mapper.test.ts`, `messaging.mock.repository.test.ts`, and every
  `*.use-case.test.ts` under `domain/use-cases/` (13 files, unrelated to
  presence) are all still green with zero edits required to their assertions.
- SSE live-update mock-mode story/test (AC-10.6.6.5) — simulate the seeded
  `presence.changed` sample frame flipping a contact to online, assert the
  affected row updates (Storybook play function or a targeted integration
  test on `event-invalidation.ts` + a query-client harness).

**Done when:** all stories pass interaction assertions; ready for
`fe-tech-lead-reviewer` + `fe-accessibility-auditor` (parallel) →
design-review gate (`docs/DESIGN_REVIEW.md` + `/impeccable audit` — contrast
≥3:1, no motion, sr-only text) → `fe-qa-playwright`.

## Regression-guard checklist (FR-005/UC-10.6.5 — must stay green, unedited)

Run `bun vitest related` on every touched file, then confirm these existing
suites pass with **zero assertion changes** (only allowed diff: import paths
if a helper moved, never behavior):
- `src/features/messaging/presentation/conversation-item/conversation-item.test.ts`
- `src/features/messaging/presentation/typing-indicator/typing-indicator.test.ts`
- `src/features/messaging/presentation/messaging-screen/pane-visibility.test.ts`
- `src/features/messaging/presentation/chat-window/highlight-timer.test.ts`
- `src/features/messaging/infrastructure/mappers/messaging.mapper.test.ts`
- `src/features/messaging/infrastructure/repositories/mocks/messaging.mock.repository.test.ts`
- All 8 `domain/use-cases/*.use-case.test.ts` files (add-group-members,
  create-conversation, create-group, delete-group, delete-message,
  leave-group, pin-message, remove-group-member, update-group,
  send-message — 10 total, confirmed by directory listing)
- `group-info-panel.tsx` and `chat-window.tsx` currently have **no dedicated
  test file** — this US is the first to add test coverage for them
  (`presence-caption.test.ts` + Storybook interaction), which is net-new
  proof, not a regression risk, but note it so `fe-tech-lead-reviewer`
  doesn't expect a pre-existing baseline to diff against.
- Full `bun vitest run && bun build` before merge (pre-push gate, per
  `.claude/rules/parallel-workflow.md`).

## Component + state sketch (lightweight — no fe-component-architect/fe-state-engineer handoff needed)

This US is additive/derivational, not a new component tree or non-trivial
server-state shape — a single new shared primitive (`PresenceDot`, ~20 LOC,
no variants beyond `size`/`presence`) and query additions that follow the
exact existing TanStack Query pattern already in `messaging-screen.tsx`
(`conversationsKey()`/`groupKey()`). No Zustand, no new client-state
category beyond "server" (presence query) — `fe-nextjs-engineer` can proceed
directly from this plan without a separate architecture/state-engineering
pass. Flag to `fe-lead`: if Phase 6's query-merging turns out non-trivial in
practice (e.g. `messaging-screen.tsx` already exceeds a comfortable size),
split a `fe-state-engineer` pass for that phase only.

## Risks / open items carried into implementation

- **OQ-2** (INT-401 path prefix `/noti/api/v1/presence` assumed, not
  confirmed against `noti`'s `openapi.yaml`) — proceed mock-first per
  decision `0014`; update `NOTI_EP.presence` when confirmed.
- **OQ-3** (single vs batched `presence.changed` payload) — this plan assumes
  single `memberId` per event, matching every other event type's granularity;
  if BE ships batched, Phase 5's event/invalidation shape needs a follow-up.
- **OQ-4** (INT-401 GET vs POST at large `memberIds` scale, ~150 members) —
  not expected at current school scale; no action this US.
- **[GAP]** conversation-list virtualization + presence batching interaction
  — flagged for `fe-state-engineer` if the list is ever virtualized; no
  blocking action for this US's scope.
- **[RISK]** AC-10.6.4.3's count fix is a genuine behavioral change (online-
  only count → online+recent count) — reviewers should expect the example
  numbers to differ from pre-US-E10.6 output; this is intentional (call out
  explicitly in the PR/commit description, not a silent regression).
- No new design token, no ADR required (service-name correction
  "notification"→`noti` is terminology alignment only, per `integration.md`).
