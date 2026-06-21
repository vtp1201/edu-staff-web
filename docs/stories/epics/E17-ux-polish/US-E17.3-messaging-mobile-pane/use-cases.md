# Use Cases — US-E17.3 Messaging Mobile Pane Toggle

---

## 1. Use Case Scope Summary

**Total UCs:** 7
**Actors:** Teacher, Principal, Student, Parent (all share the same messaging screen at `/messages`).
**Boundary:** Layout and animation changes to `src/features/messaging/presentation/messaging-screen/messaging-screen.tsx`. Adds CSS `transform` slide transition (0.25 s ease) to the existing `mobilePane` state toggle, adds `@media (prefers-reduced-motion: reduce)` guard to suppress the animation, and adds `aria-hidden` / `inert` management on the off-screen pane. No BE changes, no new routes, no new design tokens. One i18n key for the back button `aria-label` is assumed to already exist (see Open Questions).

---

## 2. Actor Catalogue

| Actor / Role | Type | Capabilities |
|---|---|---|
| Teacher | Human | Sends/receives messages; desktop-primary but may use mobile |
| Principal | Human | Sends/receives messages; desktop-primary |
| Student | Human | Sends/receives messages; mobile-primary; primary beneficiary |
| Parent | Human | Sends/receives messages; mobile-primary; primary beneficiary |
| Browser / OS | System | Evaluates CSS transforms, `prefers-reduced-motion`, and `aria-hidden` |

---

## 3. Use Case Catalogue

---

### UC-01: Mobile (≤ 768 px) shows conversation list pane by default

**Goal:** When a user navigates to the messaging screen on a mobile viewport, the conversation list fills the screen and the chat pane is off-screen, so the full width is available for browsing conversations.
**Primary Actor:** Student / Parent
**Preconditions:**
- User is authenticated with any role.
- User navigates to `/messages`.
- Viewport width ≤ 768 px.
- No conversation was previously selected in this session (or the component mounts fresh).

**Main Success Scenario:**
1. Component mounts with `mobilePane` state = `"list"`.
2. The conversation-list panel is visible at 100% viewport width.
3. The chat pane is translated off-screen (translateX(100%) or equivalent) and has `aria-hidden="true"` (or `inert`) so its focusable children are inaccessible to keyboard and screen reader.
4. No horizontal page overflow exists.
5. Conversation list data is fetched; list items render (success state).

**Alternative Flows:**
- A1 (viewport ≥ 769 px on same render): Desktop side-by-side layout renders instead; `mobilePane` state is irrelevant (see UC-06).

**Exception Flows:**
- E1 (conversation list fetch error): The list request fails; error state renders inside the conversation-list panel; the chat pane remains off-screen (see UC-07 for empty state).
- E2 (conversation list loading): List data is in-flight; loading state renders inside the conversation-list panel.

**Business Rules:**
- BR-001: Default pane on mobile is always `"list"` — the chat pane is never shown by default without a user selection.
- BR-002: Off-screen pane MUST have `aria-hidden="true"` or `inert` attribute to remove its focusable children from tab order (TR-NFR-001).

---

### UC-02: Tapping a conversation slides the chat pane in (full-width, mobile)

**Goal:** On mobile, selecting a conversation from the list replaces the list view with the chat pane at full viewport width via a smooth slide animation.
**Primary Actor:** Student / Parent / Teacher / Principal (mobile)
**Preconditions:**
- Viewport ≤ 768 px.
- `mobilePane` state = `"list"`.
- Conversation list has loaded with at least one conversation row.
- `prefers-reduced-motion` is NOT active.

**Main Success Scenario:**
1. User taps a conversation row (touch target height ≥ 44 px).
2. Component sets `mobilePane` to `"chat"`.
3. CSS transition plays: chat pane slides in from the right (translateX 100% → 0) over 0.25 s ease; conversation list slides out to the left (translateX 0 → −100%) over 0.25 s ease.
4. At no point during the transition are both panes simultaneously visible (no overlap — TR-008).
5. After transition completes: chat pane is fully visible at 100% viewport width; conversation list is off-screen and `aria-hidden="true"`.
6. Chat content for the selected conversation loads and displays.

**Alternative Flows:**
- A1 (rapid double-tap): User taps two conversations rapidly; only the last-tapped conversation renders; transition does not stack or glitch.

**Exception Flows:**
- E1 (chat load error): After pane slides in, the chat content fetch fails; error state is displayed within the chat pane; the back button remains visible and operable.
- E2 (reduced-motion active): Animation is suppressed; pane switch is instant (see UC-05).

**Business Rules:**
- BR-003: Transition MUST use CSS `transform` (not `left`/`right` positioning) to avoid layout thrashing.
- BR-004: Both panels MUST NOT be visible at the same time during the transition; z-index or overflow clipping ensures zero visual overlap.

---

### UC-03: Back button returns to conversation list (mobile)

**Goal:** When the chat pane is active on mobile, tapping the back button reverses the slide and returns the conversation list to view.
**Primary Actor:** Student / Parent / Teacher / Principal (mobile)
**Preconditions:**
- Viewport ≤ 768 px.
- `mobilePane` state = `"chat"`.
- Back button is visible in the chat pane header.
- `prefers-reduced-motion` is NOT active.

**Main Success Scenario:**
1. User taps the back button in the chat pane header (touch target ≥ 44 × 44 px).
2. Component sets `mobilePane` to `"list"`.
3. CSS transition plays in reverse: conversation list slides in from the left (translateX −100% → 0); chat pane slides out to the right (translateX 0 → 100%); duration 0.25 s ease.
4. At no point are both panels simultaneously visible.
5. After transition: conversation list is fully visible; chat pane is off-screen and `aria-hidden="true"`.
6. The previously selected conversation row MAY remain highlighted (existing behavior).

**Alternative Flows:**
- A1 (no previously active conversation in list): The list renders without a highlighted row; normal list state.

**Exception Flows:**
- E1 (reduced-motion active): No animation; instant return to list (see UC-05).

**Business Rules:**
- BR-005: Back button MUST have an `aria-label` using an existing i18n key (no new key added — TR-NFR-004).
- BR-002 applies: returned-to pane (list) is visible; dismissed pane (chat) gets `aria-hidden="true"`.

---

### UC-04: Transition is smooth 0.25 s ease (standard motion)

**Goal:** The slide animation matches the design-spec `mobileTransition` value, is perceived as smooth, and does not exceed 0.25 s (below vestibular discomfort threshold).
**Primary Actor:** Student / Parent (mobile, no reduced-motion setting)
**Preconditions:**
- Viewport ≤ 768 px.
- `prefers-reduced-motion: no-preference` (or unset) in OS/browser.
- User triggers a pane switch (UC-02 or UC-03).

**Main Success Scenario:**
1. CSS `transition: transform 0.25s ease` is active on both pane elements.
2. On pane switch, both panes animate simultaneously over exactly 0.25 s.
3. Animation easing is `ease` (not `linear`, not `ease-in-out`).
4. Chat pane enters from the right; list pane exits to the left (or vice versa for back navigation).
5. No jank, no half-rendered overlap visible at any frame.

**Alternative Flows:** None.

**Exception Flows:**
- E1 (CSS transform unsupported): Browser does not support CSS transforms (legacy); pane switch is an instant toggle; acceptable degradation.

**Business Rules:**
- BR-006: Duration MUST NOT exceed 0.25 s (accessibility + vestibular safety).
- BR-003: MUST use `transform` not layout properties.

---

### UC-05: Reduced-motion: no transition, instant show/hide

**Goal:** Users who have enabled OS-level "Reduce Motion" do not see the slide animation; panes switch instantly to avoid triggering vestibular discomfort.
**Primary Actor:** Student / Parent / Teacher / Principal (any role with `prefers-reduced-motion: reduce`)
**Preconditions:**
- Viewport ≤ 768 px.
- OS accessibility setting "Reduce Motion" / "prefers-reduced-motion" is set to `reduce`.
- User triggers a pane switch.

**Main Success Scenario:**
1. The `@media (prefers-reduced-motion: reduce)` CSS rule removes / overrides the `transition` property on both pane elements.
2. On pane switch, the off-screen pane becomes visible and the on-screen pane becomes hidden instantly (no animation frame visible to the user).
3. Functional result is identical to standard motion: correct pane is shown, `aria-hidden` is updated, back button is available.

**Alternative Flows:** None.

**Exception Flows:** None.

**Business Rules:**
- BR-007: The guard MUST be implemented in CSS as `@media (prefers-reduced-motion: reduce) { /* remove transition */ }` — NOT as a JS check of the media query (to keep parity with the existing pattern and avoid JS hydration issues).

---

### UC-06: Desktop (> 768 px) shows both panes side-by-side (unchanged)

**Goal:** At desktop viewport widths the messaging screen renders in the original two-pane side-by-side layout, unchanged by this story.
**Primary Actor:** Teacher / Principal (desktop-primary)
**Preconditions:**
- Viewport width > 768 px.
- User is on `/messages`.

**Main Success Scenario:**
1. `md:flex` / Tailwind responsive classes (or equivalent CSS) show both panels.
2. Conversation list is rendered at 300 px width (left).
3. Chat pane fills remaining width (`flex: 1`, right).
4. `mobilePane` state is irrelevant; no CSS transforms are applied to either pane.
5. Both panes are visible and not `aria-hidden`.

**Alternative Flows:**
- A1 (window resize from desktop to mobile): User resizes from > 768 px to ≤ 768 px mid-session; the layout switches to single-pane; `mobilePane` reverts to `"list"` (or retains last state — see Open Questions).

**Exception Flows:**
- E1 (conversation list load error at desktop): Error state shows in the left panel; chat pane renders an empty/placeholder state. This is existing behavior and is not changed by this story.

**Business Rules:**
- BR-008: Desktop layout MUST NOT be altered by this story. Any change that affects `> 768 px` behavior is out of scope.

---

### UC-07: Mobile empty conversation list state

**Goal:** When the user opens the messaging screen on mobile with no conversations available, the conversation-list pane shows the canonical empty state so the screen is not blank.
**Primary Actor:** Student / Parent (new user with no conversations)
**Preconditions:**
- Viewport ≤ 768 px.
- `mobilePane` state = `"list"`.
- Conversation list data fetch returns zero conversations.

**Main Success Scenario:**
1. Data fetch completes with an empty conversation list.
2. The conversation-list panel displays the empty-state component (existing empty state per this repo's pattern, separate from US-E17.7 which may define the canonical version).
3. The empty-state container has `role="status"`.
4. The chat pane remains off-screen and `aria-hidden="true"`.
5. No horizontal overflow.

**Alternative Flows:**
- A1 (loading then empty): User sees the loading state (spinner or skeleton) while the fetch is in-flight, then the empty state after the empty response.

**Exception Flows:**
- E1 (network error): Fetch fails; error state renders in the list pane (distinct from empty state); error message is displayed; back button does not appear (no conversation was tapped).

---

## 4. Acceptance Criteria

---

### UC-01: Default mobile view — conversation list

**AC-01.1 — Success (375 px, list loaded)**
Given a Student navigates to `/messages` at 375 px viewport with conversations loaded,
When the component mounts,
Then the conversation-list panel is fully visible at 100% viewport width; the chat pane has `aria-hidden="true"` (or `inert`); no page-level horizontal overflow exists.

**AC-01.2 — Loading state (375 px)**
Given a Student navigates to `/messages` at 375 px and the conversation list is loading,
When the component mounts,
Then the conversation-list panel occupies the full width and shows a loading indicator (spinner or skeleton); the chat pane is off-screen and `aria-hidden="true"`.

**AC-01.3 — Error state (conversation list fetch failure)**
Given the conversation list fetch returns an error,
When the error state renders,
Then the error state is displayed in the conversation-list panel at full width; the chat pane is off-screen and `aria-hidden="true"`; the user can retry from within the list panel.

**AC-01.4 — Off-screen pane keyboard inaccessibility**
Given the chat pane is off-screen (`mobilePane` = `"list"`),
When the user presses Tab repeatedly,
Then no focusable element inside the chat pane receives focus; all tab stops are within the visible conversation-list panel.

---

### UC-02: Tap conversation — chat pane slides in

**AC-02.1 — Success (375 px, standard motion)**
Given a Student is viewing the conversation list at 375 px with `prefers-reduced-motion: no-preference`,
When the Student taps a conversation row,
Then the chat pane transitions from translateX(100%) to translateX(0) over 0.25 s ease; after the transition the chat pane is fully visible at 100% viewport width; the conversation-list panel is off-screen and `aria-hidden="true"`.

**AC-02.2 — No overlap during transition**
Given the slide transition is in progress (0 < t < 0.25 s),
When either pane is inspected visually,
Then the sum of visible area of both panes does not exceed 100% viewport width; no content from both panes is simultaneously visible within the viewport.

**AC-02.3 — Chat content loads after pane appears**
Given the chat pane slides into view after tapping a conversation,
When the pane is fully visible,
Then the chat content for the selected conversation is displayed (or a loading indicator appears if still fetching); no blank pane is shown after the transition.

**AC-02.4 — Chat pane error state**
Given the chat pane is visible and the chat content fetch fails,
When the error state renders,
Then an error message is shown within the chat pane; the back button is visible and operable.

**AC-02.5 — Conversation row touch target**
Given the conversation list renders at 375 px,
When a conversation row is inspected,
Then each row's computed height is ≥ 44 px.

---

### UC-03: Back button returns to list

**AC-03.1 — Success (375 px, standard motion)**
Given a Student is viewing the chat pane at 375 px with `prefers-reduced-motion: no-preference`,
When the Student taps the back button in the chat pane header,
Then the conversation list slides in from the left (translateX −100% → 0) over 0.25 s ease; the chat pane slides out to the right; after the transition the conversation list is fully visible; the chat pane is off-screen and `aria-hidden="true"`.

**AC-03.2 — Back button touch target**
Given the chat pane is visible at 375 px,
When the back button is inspected,
Then its computed hit area is ≥ 44 × 44 px.

**AC-03.3 — Back button aria-label**
Given the back button renders,
When its attributes are inspected,
Then it has an `aria-label` value taken from an existing i18n key (not a hardcoded string); the `vi.json` / `en.json` diff for this story shows zero new key additions.

**AC-03.4 — List pane keyboard accessibility restored**
Given the user has returned to the conversation-list pane,
When the user presses Tab,
Then focusable elements within the conversation list are accessible; no focusable element in the off-screen chat pane is reachable.

---

### UC-04: Transition timing and easing

**AC-04.1 — Transition duration = 0.25 s**
Given both pane elements are inspected in the DOM after the feature is implemented,
When their CSS `transition` property is read,
Then the value is `transform 0.25s ease` (duration 0.25 s, easing `ease`); no other duration or easing is applied.

**AC-04.2 — CSS transform used (not layout property)**
Given the pane switch animation plays,
When the browser rendering is observed,
Then the animation modifies `transform: translateX(...)` on the pane elements; no `left`, `right`, `margin-left`, or `width` properties animate.

---

### UC-05: Reduced-motion guard

**AC-05.1 — No transition with prefers-reduced-motion: reduce**
Given the user has `prefers-reduced-motion: reduce` set in their OS,
When the user taps a conversation row on mobile,
Then no CSS transition plays; the chat pane appears and the list pane disappears in the same browser paint frame (instant); no intermediate translateX value is observable.

**AC-05.2 — Reduced-motion guard is CSS-only**
Given the component is rendered with `prefers-reduced-motion: reduce`,
When the component source is inspected,
Then the motion guard is implemented via `@media (prefers-reduced-motion: reduce) { transition: none }` in CSS / CSS-in-JS; there is no JS `matchMedia('(prefers-reduced-motion: reduce)')` call added by this story.

**AC-05.3 — Functional correctness under reduced motion**
Given `prefers-reduced-motion: reduce` is active and the user taps a conversation then taps Back,
When both pane switches complete,
Then the correct pane is visible after each switch; `aria-hidden` is correctly set; back button is visible in chat pane; back button is absent from list pane.

---

### UC-06: Desktop side-by-side layout (unchanged)

**AC-06.1 — Both panes visible at 1280 px**
Given a Teacher views the messaging screen at 1280 px,
When the page renders,
Then both the conversation-list panel (computed width ≈ 300 px) and the chat pane (remaining width) are simultaneously visible; neither has `aria-hidden="true"`; no CSS transform is applied to either pane.

**AC-06.2 — Desktop layout unaltered**
Given this story is implemented,
When the messaging screen is rendered at 1280 px and compared to the pre-story implementation,
Then there is no visual or structural difference to the desktop layout; the side-by-side arrangement is preserved.

**AC-06.3 — No horizontal overflow at desktop**
Given the messaging screen renders at 1280 px,
When the page is inspected,
Then no horizontal page overflow exists; both panels are fully within the viewport.

---

### UC-07: Mobile empty conversation list

**AC-07.1 — Empty state rendered in list pane**
Given a Student opens `/messages` at 375 px and the conversation list is empty (zero conversations),
When the fetch resolves with empty data,
Then the conversation-list panel shows an empty-state component; the container has `role="status"`; the chat pane remains off-screen and `aria-hidden="true"`.

**AC-07.2 — Loading state before empty**
Given the conversation list fetch is in-flight at 375 px,
When the component mounts,
Then a loading indicator is shown in the list panel; no chat pane is visible; no horizontal overflow.

**AC-07.3 — Network error in list pane (mobile)**
Given the conversation list fetch returns a network error at 375 px,
When the error state renders,
Then an error message (sourced from i18n) is displayed in the list panel at full width; the chat pane is off-screen and `aria-hidden="true"`.

**AC-07.4 — No overflow at 320 px**
Given any UI state (loading / empty / error / loaded) at 320 px viewport,
When the messaging screen renders,
Then `document.documentElement.scrollWidth === document.documentElement.clientWidth` (no page-level horizontal overflow).

---

## 5. Edge Case Matrix

| Scenario | UC-01 (default list) | UC-02 (tap → chat) | UC-03 (back to list) | UC-04 (transition) | UC-05 (reduced-motion) | UC-06 (desktop) | UC-07 (empty list) |
|---|---|---|---|---|---|---|---|
| 375 px, data loaded | List visible | Slide in | Slide out | 0.25 s ease | Instant | N/A | N/A |
| 320 px minimum | List at 100% width, no overflow | Pane at 100%, no overflow | No overflow | Same | Instant | N/A | No overflow |
| 768 px (boundary) | Single-pane mode | Slide in | Slide out | 0.25 s ease | Instant | N/A | N/A |
| 769 px (desktop boundary) | N/A (both visible) | N/A | N/A | N/A | N/A | Both panes visible | N/A |
| 1280 px | N/A | N/A | N/A | N/A | N/A | Both panes visible | N/A |
| Viewport resize 1280 → 375 | Single-pane mode enters | — | — | — | — | — | — |
| Viewport resize 375 → 1280 | Desktop exits single-pane | — | — | — | — | Both visible | — |
| Conversation list loading | Loading in list pane | — | — | — | — | — | Loading in list |
| Conversation list error | Error in list pane | Error in chat pane, back button works | — | — | — | Error in list pane | — |
| Conversation list empty (0 rows) | — | — | — | — | — | — | Empty state shown |
| prefers-reduced-motion: reduce | Instant toggle | Instant | Instant | No animation | No transition | No animation | Instant |
| prefers-reduced-motion: no-preference | — | 0.25 s slide | 0.25 s slide | 0.25 s ease | — | — | — |
| Rapid taps (2 conversations quickly) | — | Last tapped wins, no glitch | — | No stacked animations | — | — | — |
| Auth expired | Redirect to login | — | — | — | — | — | — |
| Wrong role (no messaging access) | Auth redirect | — | — | — | — | — | — |
| CSS transform unsupported (legacy) | Instant toggle (degradation) | Instant toggle | Instant toggle | No animation | N/A | — | — |
| Back button tapped when no conversation | N/A (back only exists in chat pane) | — | — | — | — | — | — |

---

## 6. Open Questions

**[OPEN QUESTION 1]** `TR-NFR-004` states the back button `aria-label` reuses an existing i18n key. `AC-03.3` depends on this. The FE team MUST confirm that a key exists under `messaging.*` or `Common.*` with the meaning "back" or "back to conversations." If no suitable key is found, `ba-lead` must authorize adding one key (`vi` source + `en` mirror) before the story can be marked `implemented`; AC-03.3 would be updated accordingly.

**[OPEN QUESTION 2]** The requirements note an assumption that tapping a conversation does not change the URL on mobile (the selected conversation is held in component state only). If future navigation requirements or deep-linking needs dictate that the URL should reflect the selected conversation on mobile, that is a separate story. For this story, component state only is the correct behavior. `ba-lead` should confirm this constraint is acceptable to product stakeholders.

**[OPEN QUESTION 3]** Viewport resize behavior when transitioning between mobile and desktop mid-session (UC-06 A1): if a user is in chat pane on mobile (375 px) and resizes to desktop (> 768 px), both panes become visible. The `mobilePane` state becomes irrelevant at desktop. On resize back to mobile, it is unspecified whether `mobilePane` should revert to `"list"` (safe default) or retain `"chat"` (preserve context). The FE team should pick the safer default (`"list"`) unless product direction differs. `ba-lead` should confirm.

**[OPEN QUESTION 4]** `TR-008` requires zero visual overlap of both panels during the transition. Achieving this with a CSS-only approach requires careful container overflow clipping (e.g. `overflow: hidden` on the outer wrapper at ≤ 768 px). The FE team should confirm that the existing `messaging-screen.tsx` outer container clips overflow correctly or that a wrapper with `overflow: hidden` will be added as part of this story.
