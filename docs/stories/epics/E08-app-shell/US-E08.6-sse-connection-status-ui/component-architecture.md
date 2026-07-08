# US-E08.6 — Component Architecture (SSE Disconnect Banner + Pending Pill)

_Written by `fe-component-architect`, 2026-07-07. Scope: component tree, prop
contracts, container boundary, a11y-per-node, `.stories.tsx` plan for the two
new presentational components in the plan's §2/§6. No hooks, no state-store
design (that's `fe-state-engineer`'s `useRealtimeEvents` extension), no
implementation code._

## 1. Grep confirmation (before proposing)

- `components/shared/` grep for `status|pill|badge|toast|sse` → only
  `status-badge/` (unrelated small tone label, reused below for pattern
  reference, not extended). No existing banner/pill/toast primitive to reuse
  wholesale.
- `SseStatus` type does not exist yet anywhere in `src/` — this doc defines its
  shape at the prop boundary; `fe-state-engineer` owns where it's declared
  (recommend colocating in `src/bootstrap/realtime/event.ts` or
  `use-realtime-events.ts`, exported so both the hook and these two
  presentational components' prop files can import it as a **type-only**
  import — that satisfies the presentation-layer rule since it's a plain
  string-union type, not a class/runtime dependency).
- Closest existing floating/fixed-position pattern in the repo:
  `staff-leave-screen.tsx`'s inline toast (`fixed bottom-7 left-1/2 z-[9000]`,
  `<output aria-live="polite">`, always-mounted + `sr-only` when hidden). That
  pattern is feature-local and one-off; **not promoted** here since the pill's
  shape (floating action button with badge, not a transient toast) is
  different enough to warrant its own component — no duplication concern.
- Spinner precedent: `login-form.tsx` uses `Loader2` from `lucide-react` with
  `animate-spin`. Reuse that combination for the banner's connecting spinner
  (no new spinner primitive needed).

## 2. Component tree

```
AppShell                                             [RSC-adjacent client container, 'use client']
 ├─ useRealtimeEvents({ tenantId })                   → { sseStatus, showBanner, pendingMsgCount, reconnect }  (fe-state-engineer)
 ├─ usePathname() (existing @/bootstrap/i18n/routing import)
 ├─ <div className="hidden lg:block"><Sidebar/></div>                          — unchanged
 ├─ <Sheet> mobile <Sidebar/> </Sheet>                                         — unchanged
 └─ <div className="flex min-w-0 flex-1 flex-col">
     ├─ <Header/>                                                             — unchanged
     ├─ <SseDisconnectBanner                          [presentational, no hooks, controlled by props]
     │     status={showBanner ? sseStatus : undefined}
     │     onReconnect={reconnect}
     │   />
     ├─ <main className="flex-1 p-4 sm:p-6">{children}</main>                 — unchanged
     └─ <SsePendingPill                                [presentational, no hooks, controlled by props]
           count={pendingMsgCount}
           visible={pendingMsgCount > 0 && !pathname.endsWith("/messages")}
           onClick={() => router.push(tenantUrl(tenantId, "/messages"))}
         />
   </div>
```

Both new components are leaves — no children, no sub-composition, no
compound-component API needed (see §5).

## 3. Container boundary — confirming/adjusting plan §6

**Confirmed as designed by the plan**, with two placement adjustments:

1. **Banner stays in-flow (not `fixed`/`absolute`), placed between `<Header>`
   and `<main>` inside the same flex column** (`className="flex min-w-0
   flex-1 flex-col"` wrapper). This is a deliberate refinement over any fixed-
   overlay reading of the plan: the banner is a *content-affecting* notice
   ("events won't arrive"), not a transient toast, so pushing `<main>` down
   when it mounts (ordinary block flow + height/opacity transition) is more
   correct than overlaying content — it never covers header or page content
   underneath, and needs **no z-index** at all since it participates in
   normal flow. `animate-in slide-in-from-top` (or a scoped `@keyframes`
   height transition) works fine in-flow; motion is already gated globally
   (AC-6, decision 0013) so no extra `motion-safe:` prefix is required per the
   plan's §4.2 note.
2. **Pill is `fixed`, positioned bottom-right, `z-40`.** Checked against every
   existing z-index in the codebase (`Sheet` overlay/content `z-50`,
   `message-context-menu` overlay `z-40`/content `z-50`, `Header` sticky
   `z-30`, `Dialog`/`AlertDialog`/`Popover`/`Tooltip` all `z-50`,
   `staff-leave-screen` toast `z-[9000]` one-off). Recommendation: **`z-40`**
   for the pill — sits above `Header` (`z-30`) and ordinary page content, but
   *below* every Radix overlay/dialog/sheet (`z-50`), so when the mobile nav
   `Sheet` opens (which already covers the full viewport with its own
   `z-50` overlay) the pill is correctly obscured rather than floating over a
   modal — avoids the exact collision named in the task brief. Do **not**
   reuse `z-[9000]` (that's a one-off in a single feature screen, not a
   documented convention) and do **not** use `z-50` (would tie/overlay with
   Sheet/Dialog, which is wrong — the pill must never compete with an open
   modal for pointer events). No new z-index token exists in `tokens.css`;
   `z-40` is an existing Tailwind utility already used elsewhere
   (`message-context-menu` overlay) — no new token/ADR needed.
3. Both mount unconditionally in `AppShell`'s JSX (not behind an `if`) —
   visibility is entirely prop-driven (`status={undefined}` → banner renders
   `null`; `visible={false}` → pill renders `null`). This matches the
   "always mounted, prop-gated" pattern already used for the toast in
   `staff-leave-screen.tsx` (`aria-live` regions render better when
   mounted-but-empty rather than added/removed from the DOM, so screen
   readers reliably pick up content changes — relevant to AC-5/AC-10).

**RBAC note (from Product Contract):** not enforced inside these two
components — `AppShell` already receives `role`, and if `fe-lead`/BA decide
admin should not see the pill, that's a conditional at the `AppShell` call
site (`visible={pendingMsgCount > 0 && !pathname.endsWith("/messages") &&
role !== "admin" /* if disabled */}`), not a prop or internal branch inside
`SsePendingPill`. Keeps the presentational component role-agnostic.

## 4. ViewModel / prop contracts

These two components are **not** screen-level VM consumers in the
`<component>.i-vm.ts` sense (that pattern pairs a `'use client'` screen
component with an RSC→client data contract for server-fetched data). Here,
`sseStatus`/`pendingMsgCount` are **client-only, hook-derived UI state** (per
the plan's §6 state classification), not server data mapped by a use-case —
so there is no server↔client boundary to name via `.i-vm.ts`. Plain
`type <Component>Props` in each component's own file is the correct, minimal
contract (consistent with `StatusBadgeProps` precedent above, which is also a
pure presentational prop type with no `.i-vm.ts`).

### `SseStatus` (shared type — owned by `fe-state-engineer`, referenced here as the contract shape)

```ts
// exported from wherever fe-state-engineer places the hook, e.g.
// src/bootstrap/realtime/use-realtime-events.ts (type-only import into
// presentation/ is legal — a plain string union, not a runtime dependency)
export type SseStatus = "connected" | "connecting" | "disconnected";
```

### `src/components/shared/sse-status/sse-disconnect-banner.tsx`

```ts
import type { SseStatus } from "@/bootstrap/realtime/use-realtime-events";

export interface SseDisconnectBannerProps {
  /**
   * `undefined` (or omit) → render nothing. The caller (AppShell, via the
   * hook's derived `showBanner`) is responsible for the "don't show on first
   * connect" suppression rule (plan Decision A) — this component only ever
   * receives 'connecting' when it should actually render the reconnecting
   * state (i.e. a post-disconnect reconnect attempt), never on first mount.
   */
  status?: Extract<SseStatus, "connecting" | "disconnected">;
  /**
   * Manual reconnect trigger (AC-2). Called when the user activates the
   * "Kết nối lại" button. Absent/no-op while `status === 'connecting'` —
   * the button is disabled in that state so this is never invoked then, but
   * the prop itself stays required so the container always wires a real
   * handler (no silent no-op default).
   */
  onReconnect: () => void;
  className?: string;
}
```

Render contract (for the engineer, not code):
- `status` undefined → return `null`.
- `status === "disconnected"` → title = `t("sseStatus.disconnectedTitle")`,
  body = `t("sseStatus.disconnectedBody")`, visible enabled "Kết nối lại"
  button (`onClick={onReconnect}`).
- `status === "connecting"` → title = `t("sseStatus.reconnectingTitle")`,
  `Loader2` spinner (`animate-spin`) replacing the button; button either
  `disabled` or unmounted — **recommend unmounted** (cleaner focus order: a
  disabled button that then reappears enabled steals focus-return
  responsibility; simplest a11y story is "the interactive element isn't
  there while there's nothing useful to do").
- Root element: `role="status"` + `aria-live="polite"` in **both** rendered
  states (AC-5) — put these on the outer wrapping element that's always
  present whenever `status` is defined, so screen readers get the region
  once and only content-diff between disconnected↔connecting is announced.
- Tokens (per AC-11 as amended in §6b of the plan): `bg-edu-warning-light` +
  `border-edu-warning` (1px bottom or full border, matches
  `school-setup-screen`/`calendar-screen`/`exam-result` pairing) +
  `text-edu-warning-text` for title/body copy.

### `src/components/shared/sse-status/sse-pending-pill.tsx`

```ts
export interface SsePendingPillProps {
  /** Raw unread/pending count. Formatting (">99 → '99+'") is the component's job. */
  count: number;
  /** Container-computed visibility (count>0 AND not on /messages, AND any RBAC gate). */
  visible: boolean;
  onClick: () => void;
  className?: string;
}
```

Render contract:
- `!visible || count === 0` → return `null`.
- Label text on the badge: `count > 99 ? "99+" : String(count)` — the "99+"
  literal comes from `t("sseStatus.pendingMessageOverflowLabel")` (plan §3),
  not a hardcoded string, even though it's also hardcoded in en/vi (still
  goes through i18n per AC-12, since it's user-facing copy, not a code
  constant).
- `aria-label`: `count === 1 ? t("sseStatus.pendingMessageOne") :
  t("sseStatus.pendingMessageMany", { count })` — full sentence, satisfies
  AC-10, matches plan §3's decision to reuse the visible-copy keys as the
  aria-label directly (no separate aria-only key).
- Element: a real `<button type="button">` (not a `<div onClick>`) so it's
  natively keyboard/focus/AT accessible without extra ARIA — `onClick={onClick}`.
- Touch target: `min-h-11 min-w-11` (44px, matches `SSO_BTN`'s `min-h-11`
  convention already in the repo) regardless of how compact the visual badge
  looks — pad the hit area, don't shrink it to fit the badge.
- Position: `fixed bottom-6 right-6 z-40` (see §3.2 for the z-40 rationale);
  `bottom-6`/`right-6` follow the existing `gap`/spacing scale (`24px`), not
  new values.

## 5. State ownership (contract level) — hand-off to `fe-state-engineer`

| State | Owner | Notes |
| --- | --- | --- |
| `sseStatus: SseStatus` | `useRealtimeEvents()` hook (fe-state-engineer) | Derived from `EventSource` `onopen`/`onerror` + 4s reconnect timer. Passed down as a **controlled prop** to `SseDisconnectBanner`; the component holds no internal state. |
| `showBanner: boolean` (first-connect suppression) | hook (`hasConnectedRef` internal) | Consumed only by `AppShell` to decide whether to pass `status` at all — `SseDisconnectBanner` never sees the suppressed case, so it needs no internal "have I connected before" logic itself. |
| `pendingMsgCount: number` | hook, incremented on `message.new` SSE events, reset on pathname entering `/messages` | Controlled prop into `SsePendingPill`; component has zero internal state. |
| `pathname` (for both the reset effect and the `visible` computation) | `AppShell`, via existing `usePathname()` from `@/bootstrap/i18n/routing` | `AppShell` computes `visible` and passes the final boolean — `SsePendingPill` does not import routing itself (keeps it a pure leaf, easier to story/test). |
| `reconnect(): void` | hook | Passed straight through as `onReconnect`. |
| local UI-only state inside either component | **none** | Both components are fully controlled/stateless per the plan's explicit "no hooks inside" constraint — confirmed and preserved in this design. |

No TanStack Query, no Zustand/global store — matches plan §6's state
classification (push-stream connection state, not fetched/cacheable data).

## 6. Composition & variant strategy

- Neither component needs `cva` variants, compound sub-components, or
  `asChild`/`Slot` — each renders one fixed visual shape driven by simple
  discriminated props (`status` union, `visible` boolean). Over-abstracting a
  2-state banner and a count-pill into a variant system now would violate
  the "no abstraction before 3+ instances" guidance with zero present need.
- `SseDisconnectBanner`'s two visible states (disconnected/connecting) are
  handled by a plain `if`/ternary inside one component, not two separate
  components or a `variant` prop — they share the same chrome (icon slot,
  title, body, role/aria-live wrapper) and only swap the trailing
  action/spinner region.
- Icon composition: both components accept **no icon prop** — `WifiOff` is
  hardcoded in the banner (AC-2 is explicit about wifi-off; not meant to be
  swappable), and the pill has no icon at all in the base design (count badge
  only, per handoff). If a future screen needs an icon-less variant of
  either, extend via a new optional prop then — not preemptively.
- Reuse: spinner = `Loader2` + `animate-spin` (matches `login-form.tsx`
  precedent, no new spinner primitive). Warning-tint tokens = same pairing
  already used in `school-setup-screen`/`calendar-screen`/`exam-result` (no
  new token).

## 7. Accessibility contract (per interactive/informational node)

### `SseDisconnectBanner`

| Node | Role/label | Notes |
| --- | --- | --- |
| Outer wrapper (when `status` defined) | `role="status"` `aria-live="polite"` | AC-5. Present in both disconnected/connecting renders; the element should stay mounted whenever `status` is defined so content swaps are announced, not element insertion (matches `staff-leave-screen` toast pattern of "mount once, vary content"). |
| `WifiOff` icon | `aria-hidden="true"` | Purely decorative next to the visible title text, which already carries the meaning — icon-only accessible-name rule does not apply here since text is adjacent (per task brief's decision guidance: icon + visible text → hide icon, let text carry the label). |
| Title/body text | plain text nodes, no extra role | Carries the a11y-required "meaning not conveyed by color alone" (AC-5 note). |
| `Loader2` spinner (connecting state) | `aria-hidden="true"` | The `reconnectingTitle` text ("Đang kết nối lại...") already communicates the busy state textually; the spinner is decorative reinforcement, not the sole indicator — avoids double-announcing "loading" via both an `aria-busy`/spinner label and the text. |
| "Kết nối lại" button (disconnected state) | native `<button type="button">`, visible text label (no icon needed, but if the engineer adds one, `aria-hidden="true"` on it since the button text already says "Kết nối lại") | Keyboard-operable by default as a native button; no extra `aria-label` needed since visible text is the accessible name. Focus-visible ring inherited from the repo's global button focus styles — do not override with `outline-none` without replacement (accessibility.md hard rule). |

### `SsePendingPill`

| Node | Role/label | Notes |
| --- | --- | --- |
| Root element | native `<button type="button">` | Not a `<div onClick>` — gets keyboard (`Enter`/`Space`) activation and focusability for free. |
| `aria-label` | `t("sseStatus.pendingMessageOne")` or `t("sseStatus.pendingMessageMany", { count })` | Full sentence carries the count — satisfies AC-10 ("rõ ràng bao gồm số tin nhắn mới"); overrides the visible short badge text ("3", "99+") as the accessible name so AT users get the full context, not just the digit. |
| Visible badge text (count/"99+") | `aria-hidden` not needed (it's inside the labeled button, but redundant with `aria-label` — set the count text span `aria-hidden="true"` since the button's `aria-label` already supersedes it and duplicate announcement should be avoided) | — |
| Touch target | `min-h-11 min-w-11` (≥44×44px) | accessibility.md hard rule, mobile. |
| Focus | default browser/Tailwind focus-visible ring, not suppressed | Fixed-position elements are easy to accidentally clip with `overflow-hidden` ancestors — confirm in review that no ancestor clips the focus ring. |

## 8. `.stories.tsx` state coverage plan (for `fe-nextjs-engineer` + `fe-qa-playwright`)

### `sse-disconnect-banner.stories.tsx`

| Story | Props | Asserts (play, when added) |
| --- | --- | --- |
| `Banner_Hidden` | `status={undefined}` | Renders `null` — no `role="status"` node in the DOM. |
| `Banner_Disconnected` | `status="disconnected"`, `onReconnect={fn()}` | `role="status"`/`aria-live="polite"` present; `WifiOff` icon `aria-hidden`; title/body text visible; "Kết nối lại" button present, enabled, click fires `onReconnect`. |
| `Banner_Reconnecting` | `status="connecting"`, `onReconnect={fn()}` | Reconnecting title text visible; spinner (`Loader2`, `aria-hidden`) visible; "Kết nối lại" button absent (or disabled, per §4 recommendation — unmounted); `onReconnect` never called by any interaction in this story. |

No timer-dependent story (per plan §4.3) — the 4s auto-reconnect is a hook
concern tested with `vi.useFakeTimers()` in a Vitest unit test, not simulated
here.

### `sse-pending-pill.stories.tsx`

| Story | Props | Asserts (play, when added) |
| --- | --- | --- |
| `Pill_Visible` | `count={3}`, `visible={true}`, `onClick={fn()}` | Button rendered, visible text "3", `aria-label` = full "Bạn có 3 tin nhắn mới..." sentence, click fires `onClick`. |
| `Pill_Overflow` (extra, not in the packet's named list but recommended — cheap to add, exercises the "99+" formatting branch called out explicitly in AC-7) | `count={140}`, `visible={true}` | Visible text "99+"; `aria-label` uses the real count (140), not "99+", in the sentence (per plan §3 — the aria sentence always states the actual `{count}`, only the visible badge glyph caps at "99+"). |
| `Pill_HiddenInMessages` | `count={5}`, `visible={false}` | Renders `null` — represents both the `/messages`-route case and the `count===0` case (component logic doesn't distinguish the two `visible=false` causes, so one story covers both branches of the `!visible \|\| count===0` guard; the `count===0` half is implicit/equivalent, no separate story needed). |

## 9. Missing primitives / ADR flags

- **No missing shadcn/ui primitive.** Both components are built from plain
  HTML (`div`, `button`, `output`/`div[role=status]`) + `lucide-react` icons
  (`WifiOff`, `Loader2`) already in the dependency tree — no `bun ui:add`
  needed.
- **No new design token.** Confirmed reuse of `bg-edu-warning-light` /
  `border-edu-warning` / `text-edu-warning-text` (existing pairing) and
  `z-40` (existing Tailwind utility, already used by
  `message-context-menu`). No ADR required from this doc.
- **Type location flag (not a token/ADR issue, just a coordination note for
  `fe-state-engineer`):** please export `SseStatus` from the hook's module so
  both the hook and `SseDisconnectBannerProps` can share one definition
  (`Extract<SseStatus, "connecting" | "disconnected">` for the prop, full
  `SseStatus` including `"connected"` for the hook's own return type) — avoid
  redefining the union in two places.
