# Spec — US-E17.3 Messaging Mobile Pane Toggle

**Status:** Planned | **Lane:** normal
**Sources:** requirements.md · use-cases.md · `docs/product/design-spec.jsonc` (`responsiveGrid.messagingLayout`)

---

## 1. Overview

The messaging screen at `src/features/messaging/presentation/messaging-screen/messaging-screen.tsx` already has `mobilePane` state (`"list"` | `"chat"`) and `hidden md:flex` / `flex` CSS classes for pane toggling (lines 298–316). The back button in `ChatWindow` already has an `onBack` prop and `aria-label` using the key `messaging.chat.backToList` ("Quay lại danh sách"). What is currently missing: CSS `transform` slide animation (currently just show/hide), a `@media (prefers-reduced-motion: reduce)` guard to suppress the animation, and `aria-hidden` on the off-screen panel to remove its focusable children from the accessibility tree. This story adds exactly those three items. No new tokens, no new i18n keys (back button key already exists), and no BE changes.

---

## 2. Screen & Route

| Route | Component file | Design spec key |
|---|---|---|
| `/messages` | `src/features/messaging/presentation/messaging-screen/messaging-screen.tsx` | `responsiveGrid.messagingLayout` |

---

## 3. Actors & RBAC

| Role | Screen | Primary device | Single-pane benefit |
|---|---|---|---|
| Student | `/messages` | Mobile-first | Primary beneficiary |
| Parent | `/messages` | Mobile-first | Primary beneficiary |
| Teacher | `/messages` | Desktop + mobile | Secondary; desktop layout unchanged |
| Principal | `/messages` | Desktop + mobile | Secondary; desktop layout unchanged |

All roles share the same messaging screen. Desktop layout (> 768 px) is NOT changed by this story.

---

## 4. Functional Spec

### FR-1 — Desktop layout preserved unchanged (TR-001)

The system SHALL NOT alter any layout, class, or behavior at viewports > 768 px. Both panels remain visible side-by-side (conversation list ≈ 300 px, chat pane `flex: 1`). No `aria-hidden` is applied to either pane at desktop. `mobilePane` state is irrelevant at desktop.

### FR-2 — CSS transform slide transition on both panes (TR-005)

The system SHALL add CSS `transform: translateX(...)` slide animation to the existing pane toggle. Both pane divs get Tailwind transition utilities `transition-transform duration-[250ms] ease-in-out` applied permanently. Pane visibility is controlled by adding/removing translate classes based on `mobilePane` state:

**List pane div (lines 298–305 area):**
- When `mobilePane === "chat"`: add `translate-x-[-100%]` (slide out left)
- When `mobilePane === "list"`: add `translate-x-0` (visible)
- Permanent classes: `transition-transform duration-[250ms] ease-in-out motion-reduce:transition-none`

**Chat pane div (lines 306–316 area):**
- When `mobilePane === "list"`: add `translate-x-[100%]` (off-screen right)
- When `mobilePane === "chat"`: add `translate-x-0` (visible)
- Permanent classes: `transition-transform duration-[250ms] ease-in-out motion-reduce:transition-none`

The parent wrapper (line 294) already has `overflow-hidden` — this clips both panes during the transition so no content from both panes is simultaneously visible.

At desktop (≥ `md:` breakpoint), the transform classes MUST be inactive; the existing `hidden md:flex` / `flex` structure continues to apply. The FE team should scope the translate classes to `max-md:` if needed to avoid interfering with desktop layout.

### FR-3 — Reduced-motion guard (TR-006)

The system SHALL suppress all transform/transition animation when `prefers-reduced-motion: reduce` is active. The guard MUST be implemented in CSS, not JavaScript. The Tailwind utility `motion-reduce:transition-none` applied to both pane elements achieves this: it adds `@media (prefers-reduced-motion: reduce) { transition: none }` automatically — no `matchMedia` call is needed.

### FR-4 — `aria-hidden` on off-screen panel (TR-NFR-001)

The system SHALL add `aria-hidden` attribute to the off-screen pane so keyboard users and screen readers are not presented with interactive elements in the hidden panel:

- List pane: `aria-hidden={mobilePane === "chat" ? "true" : undefined}`
- Chat pane: `aria-hidden={mobilePane === "list" ? "true" : undefined}`

`aria-hidden` is only applied at mobile (≤ 768 px). At desktop, neither pane should have `aria-hidden`. The FE team should conditionally apply `aria-hidden` only when in mobile single-pane mode (i.e. when the `mobilePane` state is relevant). A simple approach: apply it unconditionally based on `mobilePane` state and verify it is never set at desktop by ensuring `mobilePane` does not control desktop visibility.

### FR-5 — Touch target for back button and conversation rows (TR-007)

**Back button:** `ChatWindow` already has a back button with `aria-label={t("chat.backToList")}`. The button element SHALL have a minimum hit area of ≥ 44 × 44 px. Add `min-h-[44px] min-w-[44px]` to the back button if not already present.

**Conversation rows:** Each conversation row in the list SHALL have a minimum height of 44 px. Add `min-h-[44px]` to conversation row elements if not already present.

### FR-6 — No new i18n keys (TR-NFR-004)

The back button already uses `messaging.chat.backToList` ("Quay lại danh sách"). The system SHALL NOT add any new i18n keys. The FE team MUST confirm this key exists in `vi.json` / `en.json` before implementation (see OQ-001).

---

## 5. Non-Functional Requirements

| NFR | Target | Verification |
|---|---|---|
| **A11y — WCAG 2.1 AA (TR-NFR-001)** | Off-screen pane has `aria-hidden="true"`; keyboard Tab does not reach focusable elements in hidden pane; back button has `aria-label` from existing i18n key; DOM order unchanged. | Storybook a11y addon; axe-core; manual Tab key audit at 375 px. |
| **Responsive — no break at 320 px (TR-NFR-002)** | Conversation list at full width; `document.documentElement.scrollWidth === document.documentElement.clientWidth` at 320 px. | Chromium device-mode 320 px; Playwright assertion. |
| **Motion-safe animation (TR-NFR-003)** | `prefers-reduced-motion: reduce` → no CSS transition plays; pane switch is instant. Duration ≤ 0.25 s. | Storybook with `prefers-reduced-motion: reduce` emulation; inspect `transition` computed style. |
| **i18n (TR-NFR-004)** | Zero new keys in `vi.json` / `en.json`. | `git diff src/bootstrap/i18n/messages/` shows no additions. |
| **No pane overlap (TR-008)** | Parent `overflow-hidden` clips panes during transition; sum of visible area of both panes does not exceed 100% viewport width at any frame. | Visual inspection; Storybook interaction test at mid-transition (250 ms / 2). |
| **Desktop unchanged (TR-001)** | No visual or structural difference at 1280 px vs. pre-story. | Storybook viewport story at 1280 px. |
| **Touch targets (TR-007)** | Back button ≥ 44 × 44 px; conversation rows ≥ 44 px height. | Computed style inspection at 375 px. |

---

## 6. Acceptance Criteria

**AC-01** — Default mobile state (list visible, 375 px)
Given a Student navigates to `/messages` at 375 px with conversations loaded,
When the component mounts,
Then the conversation-list panel is fully visible at 100% viewport width; the chat pane has `aria-hidden="true"`; no page-level horizontal overflow exists.

**AC-02** — Loading state in list pane (mobile)
Given the conversation list is loading at 375 px,
When the component mounts,
Then the list panel shows a loading indicator at full width; the chat pane is off-screen and `aria-hidden="true"`.

**AC-03** — Error state in list pane (mobile)
Given the conversation list fetch returns an error at 375 px,
When the error state renders,
Then the error state is in the list panel at full width; the chat pane is off-screen and `aria-hidden="true"`; the user can retry from the list panel.

**AC-04** — Off-screen pane keyboard inaccessibility
Given the chat pane is off-screen (`mobilePane === "list"`),
When the user presses Tab repeatedly,
Then no focusable element inside the chat pane receives focus; all tab stops are within the visible list panel.

**AC-05** — Tapping a conversation slides chat pane in (standard motion, 375 px)
Given a Student is viewing the conversation list at 375 px with `prefers-reduced-motion: no-preference`,
When the Student taps a conversation row,
Then the chat pane transitions from `translateX(100%)` to `translateX(0)` over 0.25 s ease; after the transition the chat pane is fully visible at 100% viewport width; the list panel is off-screen and `aria-hidden="true"`.

**AC-06** — No pane overlap during transition
Given the slide transition is in progress (0 < t < 0.25 s),
When both panes are inspected,
Then the sum of visible area of both panes does not exceed 100% viewport width; no content from both panes is simultaneously visible within the viewport.

**AC-07** — Chat content loads after pane appears
Given the chat pane slides into view after tapping a conversation,
When the pane is fully visible,
Then chat content for the selected conversation is displayed (or a loading indicator if still fetching); no blank pane after transition.

**AC-08** — Chat pane error state
Given the chat pane is visible and the chat content fetch fails,
When the error state renders,
Then an error message is shown within the chat pane; the back button is visible and operable.

**AC-09** — Conversation row touch target
Given the conversation list renders at 375 px,
When a conversation row is inspected,
Then each row's computed height is ≥ 44 px.

**AC-10** — Back button returns to list (standard motion, 375 px)
Given a Student is viewing the chat pane at 375 px with `prefers-reduced-motion: no-preference`,
When the Student taps the back button,
Then the conversation list slides in from the left (`translateX(-100%)` → `translateX(0)`) over 0.25 s ease; the chat pane slides out to the right; after the transition the list is fully visible; the chat pane is off-screen and `aria-hidden="true"`.

**AC-11** — Back button touch target
Given the chat pane is visible at 375 px,
When the back button is inspected,
Then its computed hit area is ≥ 44 × 44 px.

**AC-12** — Back button aria-label
Given the back button renders,
When its attributes are inspected,
Then it has `aria-label` sourced from the existing i18n key `messaging.chat.backToList`; `vi.json` / `en.json` diff shows zero new key additions.

**AC-13** — List pane keyboard accessibility restored after back
Given the user has returned to the list pane,
When Tab is pressed,
Then focusable elements within the list are accessible; no focusable element in the off-screen chat pane is reachable.

**AC-14** — Transition duration and easing
Given both pane elements are inspected in the DOM,
When their CSS `transition` property is read (when `prefers-reduced-motion` is not active),
Then the value is `transform 0.25s ease`; no other duration or easing is applied to the pane switch.

**AC-15** — CSS transform used (not layout property)
Given the pane switch animation plays,
When the browser rendering is observed,
Then `transform: translateX(...)` is modified on pane elements; no `left`, `right`, `margin-left`, or `width` properties animate.

**AC-16** — Reduced-motion: no transition
Given the user has `prefers-reduced-motion: reduce` set,
When the user taps a conversation row on mobile,
Then no CSS transition plays; the chat pane appears and the list disappears in the same browser paint frame; no intermediate `translateX` value is observable.

**AC-17** — Reduced-motion guard is CSS-only
Given `prefers-reduced-motion: reduce` is active,
When the component source is inspected,
Then the guard is `motion-reduce:transition-none` Tailwind utility (compiles to `@media (prefers-reduced-motion: reduce) { transition: none }`); no `matchMedia` JS call is added by this story.

**AC-18** — Functional correctness under reduced motion
Given `prefers-reduced-motion: reduce` is active and the user taps a conversation then taps Back,
When both pane switches complete,
Then the correct pane is visible after each switch; `aria-hidden` is correctly set on the off-screen pane; back button is visible in chat pane and absent in list pane.

**AC-19** — Desktop: both panes visible (1280 px)
Given a Teacher views `/messages` at 1280 px,
When the page renders,
Then both panels (list ≈ 300 px, chat `flex: 1`) are simultaneously visible; neither has `aria-hidden="true"`; no CSS transform is applied.

**AC-20** — Desktop layout unaltered
Given this story is implemented,
When the messaging screen is rendered at 1280 px and compared to pre-story,
Then there is no visual or structural difference; side-by-side arrangement is preserved.

**AC-21** — No horizontal overflow at desktop (1280 px)
Given the messaging screen renders at 1280 px,
When the page is inspected,
Then no horizontal page overflow exists; both panels are fully within the viewport.

**AC-22** — Empty conversation list (mobile, 375 px)
Given a Student opens `/messages` at 375 px and the conversation list is empty,
When the fetch resolves with empty data,
Then the list pane shows an empty-state component with `role="status"`; the chat pane is off-screen and `aria-hidden="true"`.

**AC-23** — No overflow at 320 px (any UI state)
Given any UI state (loading / empty / error / loaded) at 320 px,
When the messaging screen renders,
Then `document.documentElement.scrollWidth === document.documentElement.clientWidth`.

---

## 7. Dependencies

- **Depends on:** none
- **Blocks:** US-E17.7 (messaging empty state — the conversation list pane structure established here is where US-E17.7's canonical empty state will render)
- **Feature modules touched:** `src/features/messaging/presentation/messaging-screen/`
- **Shared contracts:** `ChatWindow` component's `onBack` prop + `aria-label` key (`messaging.chat.backToList`) — these already exist; no new contract added

---

## 8. Traceability Matrix

| Requirement | Source | Use Case(s) | Integration(s) | Priority |
|---|---|---|---|---|
| TR-001 — Desktop layout preserved | requirements.md | UC-06 (AC-19, AC-20) | None | Must |
| TR-002 — Mobile single-pane mode (default list) | requirements.md | UC-01 (AC-01) | None | Must |
| TR-003 — Tap conversation → chat pane | requirements.md | UC-02 (AC-05) | None | Must |
| TR-004 — Back button → list | requirements.md | UC-03 (AC-10) | None | Must |
| TR-005 — Slide transition 0.25 s ease | requirements.md | UC-04 (AC-14, AC-15) | None | Should |
| TR-006 — Reduced-motion guard | requirements.md | UC-05 (AC-16, AC-17) | None | Must |
| TR-007 — Touch target ≥ 44 px | requirements.md | UC-02 (AC-09), UC-03 (AC-11) | None | Should |
| TR-008 — No pane overlap during transition | requirements.md | UC-02 (AC-06) | None | Must |
| TR-NFR-001 — WCAG AA / aria-hidden | requirements.md | UC-01 (AC-04), UC-02, UC-03 (AC-12, AC-13) | None | Must |
| TR-NFR-002 — No break at 320 px | requirements.md | UC-07 (AC-23) | None | Must |
| TR-NFR-003 — Motion-safe animation | requirements.md | UC-05 (AC-16) | None | Should |
| TR-NFR-004 — No new i18n keys | requirements.md | UC-03 (AC-12) | None | Must |

---

## 9. Open Questions

**[OQ-001]** `TR-NFR-004` states the back button `aria-label` reuses the key `messaging.chat.backToList` ("Quay lại danh sách"). The implementation facts confirm `ChatWindow` already uses this key. The FE team MUST confirm this key exists in `src/bootstrap/i18n/messages/vi.json` and `en.json` before implementation. If absent, `ba-lead` must authorize adding one key (`vi` source + `en` mirror).

**[OQ-002]** The `aria-hidden` approach proposed here (`aria-hidden={mobilePane === "chat" ? "true" : undefined}`) must not affect the desktop layout. The FE team should confirm that at ≥ 768 px the `mobilePane` state is either irrelevant (does not drive `aria-hidden` at desktop) or that the component conditionally skips `aria-hidden` at desktop breakpoint. Recommend: apply `aria-hidden` conditionally only within a mobile-specific guard (e.g. `isMobile && mobilePane === "chat"`).

**[OQ-003]** On viewport resize from mobile to desktop mid-session (UC-06 A1): if a user is in chat pane on mobile and resizes to > 768 px, both panes become visible. The `mobilePane` state is irrelevant at desktop. On resize back to mobile, `mobilePane` should revert to `"list"` as a safe default unless the product direction requires preserving context. The FE team should implement the safer default (`"list"`) and confirm with `ba-lead`.

**[OQ-004]** The existing `overflow-hidden` on the outer wrapper (line 294) clips both panes during transition (no-overlap guarantee, TR-008). The FE team must confirm this `overflow-hidden` class is already present and that no scroll behavior is broken at desktop by it. If the desktop chat area requires internal overflow scrolling, the outer `overflow-hidden` may need scoping to `max-md:overflow-hidden`.
