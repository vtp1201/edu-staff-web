# US-E08.6 SSE Connection Status UI (Disconnect Banner + Pending-Message Pill)

## Status

in-progress

## Lane

normal

## Dependencies

- Depends on: US-E06.2 (SSE realtime foundation — hook + route handler must exist); US-E10.1 (messaging — pendingMsgCount counter lives in messaging context)
- Blocks: none
- Feature module(s) cham: `src/components/shared/sse-status/` (new shared component); `src/components/layout/` (DashboardLayout or root layout shell integration)
- Shared contract/file: `useRealtimeEvents()` hook from US-E06.2 (SSE hook — exposes connection state); no new endpoint

## Product Contract

Them hai UI element vao shell de phan anh trang thai ket noi SSE theo thiet ke `app.jsx` (edustaff_5, 2026-06):

**1. SSE Disconnect Banner (full-width, ben tren content area):**
- Hien khi `sseStatus === 'disconnected'`.
- Animate vao (slide-down), animate ra khi reconnect thanh cong.
- Mau: `bg-edu-warning` (vang), text `text-edu-warning-foreground`.
- Icon: `wifiOff` hoac equivalent, ben trai.
- Text: "Mat ket noi tuyen thong. Dang ket noi lai..." + spinner (connecting) hoac "Ket noi lai" button (disconnected + reconnect manual trigger).
- Auto-reconnect sau 4 giay (theo `app.jsx` mock).
- `role="status"` (ARIA live region, `aria-live="polite"`).
- Khong hien khi `sseStatus === 'connecting'` lan dau (chi hien khi mat ket noi sau khi da connected).

**2. Pending-Message Floating Pill:**
- Hien khi `pendingMsgCount > 0` VA nguoi dung dang o ngoai section messaging.
- Vi tri: floating bottom-right hoac theo handoff (app.jsx: floating pill voi badge so luong).
- Click -> navigate toi `/messages`.
- Badge so luong: toi da hien "99+" neu count > 99.
- An khi user di vao section `/messages`.
- `aria-label`: "Ban co N tin nhan moi. Bam de xem."

**RBAC:** Hien thi cho tat ca role co access messaging (teacher, student, parent, principal). Admin tuy chon (messaging co the bi disable).

**SSE status integration:**
- `useRealtimeEvents()` hook (US-E06.2) exposes connection state.
- Web gia su ket noi mat khi `EventSource` close unexpectedly -> `onclose`/`onerror` handler -> set `sseStatus = 'disconnected'`.
- Reconnect: setTimeout(4000) -> re-instantiate `EventSource`.
- `pendingMsgCount`: tang khi nhan SSE event `message.new` va user chua o section messaging; reset khi navigate vao `/messages`.

Mock-first: SSE upstream chua ship; `TweaksPanelUI` trong `app.jsx` demo toggle `sseStatus` cho dev.

## Relevant Product Docs

- `design_src/edu/app.jsx` — `sseStatus` state (lines ~10-25), SSE disconnect banner (lines ~50-90), floating pill (lines ~95-120), `TweaksPanelUI` SSE demo toggle
- `docs/product/screens.md` — Shell / App Shell section
- `docs/decisions/0041-sse-client-in-presentation-layer.md` — SSE hook placement rule (presentation layer); ADR confirms approach
- US-E06.2 — SSE foundation (hook + route handler)
- US-E10.1 — Messaging (pendingMsgCount source)

## Acceptance Criteria

- AC-1 (hidden when connected): Khi `sseStatus === 'connected'`, khong co banner, khong co pill (neu pendingMsgCount = 0).
- AC-2 (disconnect banner visible): Khi `sseStatus === 'disconnected'`, banner hien du voi: icon wifi-off, text thong bao mat ket noi, nut "Ket noi lai" (manual trigger).
- AC-3 (reconnecting state): Khi `sseStatus === 'connecting'`, banner thay doi text thanh "Dang ket noi lai..." va hien spinner; nut "Ket noi lai" bi disabled hoac an.
- AC-4 (auto-reconnect): Sau 4 giay mat ket noi (mock timer), trang thai tu chuyen ve `connecting` -> `connected`; banner an di.
- AC-5 (ARIA): Banner co `role="status"` va `aria-live="polite"`; text du ngu nghia (khong chi biet boi mau).
- AC-6 (motion-safe): Slide-in/out animation cua banner gate sau `@media (prefers-reduced-motion: reduce)`.
- AC-7 (pending pill — visible): Khi `pendingMsgCount > 0` va user khong o `/messages`, floating pill hien voi so luong (hien "99+" neu > 99).
- AC-8 (pending pill — navigate): Click pill -> chuyen den `/messages`; pill an sau khi navigate.
- AC-9 (pending pill — hidden in messaging): Khi user o section `/messages`, pill khong hien du cho `pendingMsgCount > 0`.
- AC-10 (pending pill — aria): Pill co `aria-label` ro rang bao gom so tin nhan moi.
- AC-11 (token-only): Mau banner dung warning token family (`bg-edu-warning-light` + `border-edu-warning` + `text-edu-warning-text`, established pairing dung o cac banner canh bao khac trong repo — vd `school-setup-screen`, `calendar-screen`, `exam-result`); khong raw color, khong dung `bg-edu-warning` (solid) lam nen text vi vi pham contrast a11y (amended 2026-07-07 per fe-planner finding, khong doi token moi).
- AC-12 (i18n): Tat ca strings qua namespace `shell`.

## Design Notes

- Commands: none (UI state only — no mutation)
- Queries: none (UI state from SSE hook)
- API: extends `useRealtimeEvents()` hook (US-E06.2) to expose `sseStatus` + `pendingMsgCount`
- Tables: none
- Domain rules: `pendingMsgCount` reset on navigate to /messages; auto-reconnect timer = 4s
- UI surfaces: `src/components/shared/sse-status/SseDisconnectBanner.tsx` + `SsePendingPill.tsx`; integrated into `src/components/layout/DashboardLayout` (or equivalent shell wrapper)
- Routes: shell-level — appears across all dashboard routes

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `SseDisconnectBanner` render logic (hidden/connecting/disconnected states); `pendingMsgCount` reset logic |
| Integration | `useRealtimeEvents()` hook integration — sseStatus transitions; pendingMsgCount increment on SSE event |
| E2E | Storybook: Banner_Hidden / Banner_Disconnected / Banner_Reconnecting / Pill_Visible / Pill_HiddenInMessages; play() assertions |
| Platform | bun build green; tsc --noEmit 0 errors |
| Release | design-review gate PASS |

## Harness Delta

- `docs/product/screens.md`: add row "SSE Disconnect Banner" to Shell section
- `docs/TEST_MATRIX.md`: add row US-E08.6 as `planned`

## Evidence

(to be filled after implementation)

## Implementation Plan

_Written by `fe-planner`, 2026-07-07. Research grounded in current `main` state
(post US-E06.2/US-E10.2, ADR `0041`, ADR `0049`). No code written by this plan._

### 0. Corrections to packet metadata (read before Phase 1)

- **Dependencies line is stale.** "US-E10.1 — pendingMsgCount counter lives in
  messaging context" does **not exist** in code. There is no shell-level
  messaging context; `unreadCount`/`totalUnread` are per-conversation, fetched
  by a screen-scoped TanStack Query in `conversation-list.tsx`. This story
  **creates** `pendingMsgCount` from scratch as local hook state — it does not
  consume an existing counter. Treat the Dependencies line as informational
  only; no blocking dependency on US-E10.1 beyond "messaging route exists at
  `/messages` so navigation target is real" (route confirmed:
  `src/app/[locale]/t/[tenant]/(app)/(shared)/messages/page.tsx`).
- **`useRealtimeEvents()` is defined but never invoked anywhere in the app**
  (verified: only its own definition matches `useRealtimeEvents(` across
  `src/`). The stale comment in `use-notification-new-event.ts` ("global, in
  AppShell") describes intended, not actual, state. **Closing this gap is
  in-scope for this story** — see §1 flag below.
- "DashboardLayout" in the packet's Design Notes does not exist as a name in
  this codebase; the actual integration point is `AppShell`
  (`src/components/layout/app-shell/app-shell.tsx`), which is the correct
  Clean-Arch-legal client shell (already `'use client'`, already receives
  `tenantId`/`role`).

### 1. Architecture decisions (resolved, not left open)

**Decision A — `useRealtimeEvents()` return type extends, no sibling hook.**
Change its signature from `(): void` to `(): { sseStatus: SseStatus;
pendingMsgCount: number }`. Rationale: ADR `0041` says SSE subscription logic
belongs in the presentation layer as a hook; a second hook opening a *second*
`EventSource` to the same URL to track connection state would (a) duplicate
the connection ADR `0041` already tolerates once
(`use-notification-new-event.ts` opens a second one and leans on browser
`EventSource` dedup-by-URL — this is an *existing, already-shipped* pattern,
not new risk introduced by this story) and (b) split "the SSE connection
state machine" across two files for no benefit, since `onopen`/`onerror`
naturally live next to the `EventSource` instance already being created here.
Extending the existing hook is the smaller, DRY-er change and keeps ADR `0041`
compliance (still presentation-layer, still a hook, still no
`infrastructure/` involvement).

- Add `onopen` → `setSseStatus('connected')`.
- Add `onerror` → `setSseStatus('disconnected')` (browser's native
  auto-reconnect on `onerror` is NOT relied upon — the story's spec is an
  explicit `setTimeout(4000)` re-instantiate loop, not native EventSource
  retry, so `source.close()` inside the error handler before scheduling the
  timeout to avoid a duplicate connection).
- Initial state on mount = `'connecting'`; AC-1 says nothing renders for
  `'connecting'` on **first mount** (banner "does not show on first connect"),
  so the banner's visibility rule is `status === 'disconnected' ||
  (status === 'connecting' && hasEverConnected)` — i.e. the hook (or the
  banner-consumer) must track "has this session ever reached `connected`
  once" to distinguish first-load connecting from post-disconnect
  reconnecting. Recommend the hook track this via an internal
  `hasConnectedRef` and only report `'connecting'` outward as a
  post-disconnect state; expose a derived `showBanner: boolean` alongside
  `sseStatus` to keep the boolean logic out of the presentational component
  (`SseDisconnectBanner` stays a pure prop-in component per §4, but the
  "first-connect suppression" rule is a stateful concern → belongs in the
  hook, not repeated in every consumer).
- Auto-reconnect timer: on `onerror`, `setTimeout(() => { setSseStatus
  ('connecting'); recreate EventSource }, 4000)`. Clear the timeout in the
  effect cleanup (unmount / dep change) to avoid leaks — mirror the pattern
  already established in `highlight-timer.ts`/`.test.ts` (store the timer id,
  clear on cleanup).
- Manual "Kết nối lại" button (AC-2): exposed as a returned `reconnect()`
  function from the hook that clears the pending timeout and immediately
  re-runs the connect logic (sets `'connecting'`, opens a new `EventSource`).

**Decision B — invocation point = `AppShell`.** `AppShell` already receives
`tenantId` (confirmed prop exists) and is `'use client'`; `useLocale()` is
called internally by the hook so no new prop is needed. Call
`useRealtimeEvents({ tenantId })` once inside `AppShell`, render
`<SseDisconnectBanner>` between `<Header>` and `<main>` (matches the handoff's
DOM position — banner sits below header, above content, full-width) and
`<SsePendingPill>` as a fixed-position sibling near the end of the shell's
JSX (outside the flex column, `position: fixed`, so it floats over content
regardless of scroll).

- **Flag for `fe-lead`/ADR decision (do not action myself):** wiring
  `useRealtimeEvents()` into `AppShell` for the first time closes a
  pre-existing "hook defined but never mounted" gap from US-E06.2. This means
  *today*, in production, `notification.created`/`attendance.updated` events
  are NOT invalidating any query cache anywhere in the running app (only
  `notification.new`, handled separately by the screen-local
  `useNotificationNewEvent`, actually fires). This is a **behavior change**
  beyond this story's stated scope (banner + pill), not just additive UI. It
  is probably *correct* to fix as part of this story (the hook's sole purpose
  is cache invalidation + connection state, and this story needs the
  connection-state half of it anyway), but it silently activates
  previously-dead invalidation logic app-wide. Recommend `fe-lead` decide:
  (a) accept as an in-scope bugfix-by-necessity (no ADR, just note it in the
  PR/commit body), or (b) require a short ADR note since it changes
  data-freshness behavior across every screen with a `notifications`/
  `attendance` query key. This plan defaults to (a) — it is a one-line mount,
  not a contract change — but flags it explicitly per your instruction.

**Decision C — `pendingMsgCount` is local `AppShell`/hook state, not a new
messaging context.** Add `"message.new"` as a new member of the
`RealtimeEvent` union in `event.ts`:

```ts
| {
    type: "message.new";
    eventId: string;
    tenantId: string;
    occurredAt: string;
    payload: { conversationId: string };
  }
```

(minimal payload — only what's needed to decide "should this bump the
counter"; no message body needed since the pill never renders message
content, only a count). Add `"message.new"` to `REALTIME_EVENT_TYPES`. Add a
`case "message.new": return [];` arm to `queryKeysFor()` in
`event-invalidation.ts` (exhaustive switch forces this; returns `[]` with a
comment — no messaging screen query is invalidated by this story, that stays
US-E10.x scope) .

`useRealtimeEvents()` increments `pendingMsgCount` in its `dispatch()`
function when it receives `message.new` **and** the current pathname is not
under `/messages`. Pathname source: `usePathname()` from
`@/bootstrap/i18n/routing` (confirmed export — locale-stripped, but NOT
tenant-stripped, so pathname looks like `/t/{tenant}/messages`; use
`pathname.endsWith("/messages")` as the section check, matching how the
route is actually structured — no other route segment currently ends in
`/messages`). Reset to `0` in a separate `useEffect` keyed on `pathname` that
fires when pathname enters `/messages`.

Confirmed: this hook already runs inside a component tree that has
`next-intl`'s routing context (it calls `useLocale()` today), so adding
`usePathname()` from the same `@/bootstrap/i18n/routing` module is consistent
and requires no new provider.

**Mock upstream stays untouched** (per your instruction) — `message.new` is
never emitted by `mock-upstream.server.ts`. Storybook/unit tests dispatch the
event shape directly into the hook's internal handler (testing the exported
pure helper, not a real `EventSource`) or, for the presentational
`SsePendingPill`, simply pass `count`/`visible` props — no SSE simulation
needed at that layer.

### 2. Component split (confirmed against grep — no existing SSE/status/pill component)

Grepped `components/shared/` for `status|pill|badge|toast|sse` — only hit is
`status-badge/` (an unrelated small colored label component, not a banner or
floating action). No existing component to extend. Proceed with two new
components:

- `src/components/shared/sse-status/sse-disconnect-banner.tsx` —
  `SseDisconnectBanner({ status: 'connecting' | 'disconnected', onReconnect
  }: Props)`. Pure/presentational, **no hooks inside** (receives everything
  via props, per your constraint). Renders `null` when status is anything
  else (the "hidden on first connect" `'connecting'` suppression is the
  caller's job per Decision A — this component only ever receives
  `'connecting'` when it should actually render the reconnecting state, or
  `'disconnected'`; the caller passes `undefined`/omits rendering otherwise).
  Icon: `WifiOff` from `lucide-react` (matches AC-2's literal wording; the
  handoff mockup used `alertTriangle`, but AC-2 is explicit about `wifi-off`
  — following the AC over the mockup icon choice since both are equally
  "supported" tokens/icons and AC-2 is unambiguous). Tokens: `bg-edu-warning-
  light` / `border-edu-warning` / `text-edu-warning-text` for the message
  body — **not** literal `bg-edu-warning`/`text-edu-warning-foreground` as
  AC-11 states verbatim. See §4 open question — flagging this conflict
  rather than silently picking one.
- `src/components/shared/sse-status/sse-pending-pill.tsx` —
  `SsePendingPill({ count, visible, onClick }: Props)`. Pure/presentational.
  Formats `count > 99 ? "99+" : String(count)`. Renders `null` when
  `!visible || count === 0`.
- Both get `index.ts` re-export + `.stories.tsx` per component-organization
  rule (new `components/shared/` entries require stories).
- Correct home per decision `0026`: both are composed, cross-cutting,
  shell-level components with no reasonable single-screen owner → 
  `components/shared/`, not `features/`.

### 3. i18n keys (namespace `shell`, both `vi.json` + `en.json`)

Add under `shell.sseStatus` (new sub-namespace, sibling to existing
`shell.header`):

```jsonc
"shell": {
  "sseStatus": {
    "disconnectedTitle": "Mất kết nối realtime.",
    "disconnectedBody": "Trang sẽ tự động kết nối lại. Các sự kiện mới sẽ không đến cho đến khi được khôi phục.",
    "reconnectingTitle": "Đang kết nối lại...",
    "reconnectButton": "Kết nối lại",
    "pendingMessageOne": "Bạn có 1 tin nhắn mới. Bấm để xem.",
    "pendingMessageMany": "Bạn có {count} tin nhắn mới. Bấm để xem.",
    "pendingMessageOverflowLabel": "99+"
  }
}
```

- Use ICU `{count}` interpolation (next-intl supports `t("key", { count })`)
  for the many-message case; keep the singular as a separate key rather than
  ICU plural rules — matches existing repo convention (grep shows plain
  keyed strings, not `plural` ICU blocks, elsewhere in `messages/vi.json`).
- `aria-label` on the pill button uses `pendingMessageOne`/`pendingMessageMany`
  directly (already full sentences satisfying AC-10's "so tin nhan moi"
  requirement — no separate aria-only key needed).
- `en.json` mirror: `"Realtime connection lost.", "The page will reconnect
  automatically. New events won't arrive until it's restored.",
  "Reconnecting...", "Reconnect", "You have 1 new message. Tap to view.",
  "You have {count} new messages. Tap to view.", "99+"`.

### 4. Open questions to resolve before/at Phase 2 (NOT resolved by this plan)

1. **AC-11 token wording vs. established pattern.** AC-11 says literally
   `bg-edu-warning`/`text-edu-warning-foreground`. Three other screens
   (`school-setup-screen.tsx`, `calendar-screen.tsx`, `exam-result.tsx`)
   already use `edu-warning-light`/`edu-warning-text` for warning banners —
   the established, more accessible pairing (light tint bg + dark warning
   text, matching design-system.md's guidance about not putting text
   directly on solid `--edu-warning`). Recommend using the established
   `-light`/`-text` pair and treating AC-11's wording as "use the warning
   token family, not raw color" rather than literally those two token names
   — but this is an AC wording correction, flag to `fe-lead`/BA for a
   one-line AC amendment rather than silently diverging. No new token needed
   either way — no ADR required.
2. **Motion (AC-6) is already satisfied globally.** `globals.css` gates
   `animation-duration`/`transition-duration` to `0.01ms` under
   `@media (prefers-reduced-motion: reduce)` at the universal-selector level
   (already shipped, decision `0013`). Any `animate-in slide-in-from-top` /
   custom `@keyframes` used by these two components is automatically
   motion-safe with zero extra `motion-safe:` prefixing needed. Engineer
   should not re-derive this — just use ordinary Tailwind animation utilities
   or a small scoped `@keyframes` in `globals.css` and confirm in Storybook
   with `prefers-reduced-motion` emulation, not add redundant per-component
   gating.
3. **Reconnect-timer test determinism** — team memory flags at least one
   prior story where Storybook/interaction tests had no `vi.useFakeTimers()`
   available. For the **hook's** 4s auto-reconnect logic, this repo already
   has a working pattern: `highlight-timer.test.ts` uses
   `vi.useFakeTimers()`/`vi.advanceTimersByTime()` in a plain Vitest unit
   test — reuse that pattern by extracting the reconnect-scheduling logic
   into a small pure/testable unit (e.g. a `scheduleReconnect(cb, delayMs)`
   helper analogous to `scheduleHighlightClear`) so the 4s timer is unit-
   tested with fake timers, not asserted via a live Storybook `play()` wait.
   Storybook interaction tests should only assert **rendered state given a
   status prop** (no real timer dependency) — this sidesteps the "no fake
   timers in Storybook" constraint entirely by keeping timer logic out of the
   Storybook layer.
4. **`EventSource` dedup-by-URL assumption** (used to justify Decision A's
   "don't worry about a second connection already existing from
   `use-notification-new-event.ts`") is the browser's HTTP/2 connection
   coalescing behavior for same-origin `EventSource`, not a guaranteed spec
   behavior across all browsers/HTTP versions (HTTP/1.1 connection-per-origin
   limits can also silently queue rather than truly dedup). This was already
   an accepted risk shipped with `use-notification-new-event.ts` — this story
   doesn't add new risk here since it doesn't open a third connection (it's
   the *same* `useRealtimeEvents` connection, one connection, unchanged
   count). No action needed, but noting it's inherited, not introduced.

### 5. Phased breakdown

```
Phase 1 — Domain: event contract extension
  Files:
    - src/bootstrap/realtime/event.ts            (add "message.new" variant + REALTIME_EVENT_TYPES entry)
    - src/bootstrap/realtime/event-invalidation.ts (add exhaustive case, returns [])
  Test first:
    - event.test.ts (if none exists, create): parseEvent() accepts a well-formed
      "message.new" frame, rejects malformed payload (missing conversationId)
    - event-invalidation.test.ts: queryKeysFor(message.new event) === []
  Done when: unit tests green, tsc clean (exhaustive switch compiles)

Phase 2 — Hook: sseStatus + pendingMsgCount + reconnect timer
  Files:
    - src/bootstrap/realtime/use-realtime-events.ts (extend return type;
      onopen/onerror; hasConnectedRef; reconnect() fn; pendingMsgCount +
      pathname-based reset)
    - src/bootstrap/realtime/schedule-reconnect.ts (NEW — pure timer helper,
      extracted per §4.3, testable with vi.useFakeTimers())
  Test first (Vitest, fake timers per highlight-timer.test.ts pattern):
    - schedule-reconnect.test.ts: fires callback after exactly 4000ms; a
      manual reconnect() call clears the pending timeout and doesn't double-fire
    - use-realtime-events.test.ts (integration-ish, mock EventSource global):
      onopen -> sseStatus 'connected'; onerror -> 'disconnected' then
      'connecting' after 4s (fake timers); message.new event while pathname
      !== '/messages' increments pendingMsgCount; pathname change to
      '/t/x/messages' resets pendingMsgCount to 0
  Done when: hook unit/integration tests green; existing US-E06.2 tests for
    query invalidation still pass unmodified (regression guard for Decision B's
    behavior-activation flag)

Phase 3 — Presentation: SseDisconnectBanner + SsePendingPill + i18n + AppShell wiring
  Files:
    - src/components/shared/sse-status/sse-disconnect-banner.tsx + index.ts + .stories.tsx
    - src/components/shared/sse-status/sse-pending-pill.tsx + index.ts + .stories.tsx
    - src/bootstrap/i18n/messages/{vi,en}.json (shell.sseStatus.* keys, §3)
    - src/components/layout/app-shell/app-shell.tsx (mount useRealtimeEvents,
      render banner + pill)
  i18n: keys per §3, both files same run
  Test first:
    - sse-disconnect-banner.test.tsx: renders null for 'connected'/absent;
      renders wifi-off icon + title/body for 'disconnected'; renders spinner +
      disabled/hidden reconnect button for 'connecting'; role="status" +
      aria-live="polite" present in all rendered states
    - sse-pending-pill.test.tsx: renders null when !visible or count===0;
      renders "99+" when count > 99; renders exact count otherwise;
      aria-label includes the count via the singular/plural key
    - Storybook interaction stories (satisfies Validation table's E2E row):
      Banner_Hidden, Banner_Disconnected, Banner_Reconnecting,
      Pill_Visible, Pill_HiddenInMessages — play() asserts DOM/ARIA, no
      timer-dependent assertions (per §4.3)
  Done when: design-review gate ready (tokens-only, a11y checks pass);
    bun build green; tsc --noEmit 0 errors
```

### 6. Component + state sketch

```
AppShell (client)
 ├─ useRealtimeEvents({ tenantId }) → { sseStatus, showBanner, pendingMsgCount, reconnect }
 ├─ <Sidebar/> <Header/>  (unchanged)
 ├─ <SseDisconnectBanner status={showBanner ? sseStatus : undefined} onReconnect={reconnect} />
 ├─ <main>{children}</main>
 └─ <SsePendingPill count={pendingMsgCount} visible={pendingMsgCount > 0 && !pathname.endsWith("/messages")} onClick={() => router.push(tenantUrl(tenantId, "/messages"))} />
```

State classification: `sseStatus`/`pendingMsgCount` = **hook-local React
state** driven by an external subscription (SSE) — not TanStack Query (it's
not a fetch, it's a push-stream connection state), not a Zustand store (no
global store per project convention), not URL state. This matches the
existing `useRealtimeEvents` pattern already in the codebase (its
invalidation side already works this way) — no new state-management pattern
introduced.

### 6b. fe-lead decisions on flagged items (2026-07-07)

- **Decision B (mounting `useRealtimeEvents` in `AppShell`)**: accepted as
  option (a) — in-scope bugfix-by-necessity, no ADR. This is a one-line mount
  of a hook whose sole stated purpose (since US-E06.2) was shell-wide
  connection state + cache invalidation; it does not change any DTO/contract,
  only activates dormant invalidation the hook was always meant to perform.
  Note it explicitly in the implementation commit body so it's traceable, and
  the tech-lead reviewer must confirm no screen relies on
  `notification.created`/`attendance.updated` staying un-invalidated (regression
  check already scoped into Phase 2's "existing US-E06.2 tests still pass"
  done-criterion).
- **AC-11 token wording**: amended directly in the AC (see Acceptance
  Criteria section) to the established `-light`/`-text` warning pairing. No
  ADR — no new token, this is a wording correction, not a design-system change.

### 7. Risks / dependencies / open questions (recap)

- [OPEN QUESTION] AC-11 exact token names vs. established `-light`/`-text`
  pairing — recommend AC amendment, see §4.1.
- [FLAG for fe-lead] Mounting `useRealtimeEvents` in `AppShell` for the first
  time activates previously-dead `notification.created`/`attendance.updated`
  invalidation app-wide — decide ADR vs. plain note, see Decision B.
- No new design token required — all colors/icons come from existing
  `tokens.css` entries and `lucide-react` (already a dependency).
- No BE contract touched — `message.new` is a client-only union member with
  no server emitter in this story (explicitly out of scope), so
  `openapi.yaml`/`ERROR_CODES.md` in edu-api are irrelevant here.
- a11y: `role="status"`/`aria-live="polite"` on the banner (AC-5) and a clear
  `aria-label` on the pill (AC-10) are both plain ARIA attributes on existing
  primitives — no new a11y pattern, `fe-accessibility-auditor` should mainly
  verify focus order (does the reconnect button trap focus correctly when it
  appears/disappears) and touch-target size (44×44px) for the pill on mobile.
