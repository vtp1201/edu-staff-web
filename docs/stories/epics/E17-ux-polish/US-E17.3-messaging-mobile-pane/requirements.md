# Requirements — US-E17.3 Messaging Mobile Single-Pane Toggle

## Requirements Summary

The messaging screen (`src/features/messaging/presentation/messaging-screen/`) currently renders the conversation list and the chat pane side-by-side at all viewports, causing both to render at less than half the available width on 375 px — making both panels too narrow to use. This story introduces a single-pane mode for viewports ≤ 768 px: the conversation list is the default visible pane; tapping a conversation slides the chat pane in full-width; a back button returns to the list. The transition is a `transform` slide (0.25 s ease) guarded by `prefers-reduced-motion`. No new tokens, no new i18n keys (all existing), and no BE changes are required.

## Actors & Roles

| Role | Screen | Primary device |
|---|---|---|
| Teacher | `/messages` | Desktop + mobile |
| Principal | `/messages` | Desktop + mobile |
| Student | `/messages` | Mobile-first |
| Parent | `/messages` | Mobile-first |

All roles share the same messaging screen. Student and Parent are the primary mobile users.

## Functional Requirements

**TR-001** — Desktop layout preserved (> 768 px)
The system SHALL render the messaging layout as two side-by-side panels at viewports wider than 768 px: conversation list (fixed 300 px width) on the left and chat pane (`flex: 1`) on the right. This is the existing behaviour and MUST NOT be changed.
- Trigger: page render or window resize to > 768 px.
- Preconditions: user is on the messaging screen.
- Postconditions: both panels are visible simultaneously; conversation list is 300 px; chat pane fills remaining width.
- Error conditions: none.

**TR-002** — Mobile single-pane mode (≤ 768 px)
At viewports ≤ 768 px the system SHALL show only one panel at a time. The conversation list SHALL be the default visible panel when the user navigates to `/messages` without a selected conversation.
- Trigger: page render or window resize to ≤ 768 px.
- Preconditions: user navigates to messaging screen.
- Postconditions: only the conversation-list panel is visible; the chat pane is off-screen (translated or hidden). No horizontal overflow or content clipping at 375 px.
- Error conditions: if the conversation list fails to load, the error state is shown in the single-pane conversation-list panel.

**TR-003** — Tap conversation to open chat pane (mobile)
At ≤ 768 px, tapping a conversation row in the conversation list SHALL transition the chat pane into view at full viewport width, hiding the conversation list.
- Trigger: user taps a conversation row.
- Preconditions: mobile single-pane mode is active (viewport ≤ 768 px).
- Postconditions: chat pane is fully visible at 100% viewport width; conversation list is off-screen. Active conversation is highlighted (existing behaviour). Chat content for the selected conversation is loaded.
- Error conditions: if the chat pane fails to load (e.g. network error), the error state is shown within the chat pane; the back button remains operable.

**TR-004** — Back button returns to conversation list (mobile)
At ≤ 768 px, when the chat pane is visible the system SHALL display a back button (using an existing back/chevron-left icon) that, when tapped, transitions back to the conversation list.
- Trigger: user taps the back button in the chat pane header.
- Preconditions: mobile single-pane mode; chat pane is currently visible.
- Postconditions: conversation list is visible; chat pane is off-screen. The active conversation selection MAY remain highlighted in the list.
- Error conditions: none.

**TR-005** — Slide transition (standard motion)
The panel switch described in TR-003 and TR-004 SHALL be animated using a CSS `transform` slide: chat pane slides in from the right (translateX from 100% to 0); conversation list slides out to the left (translateX from 0 to −100%). Duration: 0.25 s, easing: `ease`. The back navigation reverses the transform directions.
- Trigger: TR-003 (open chat) or TR-004 (back to list).
- Preconditions: `prefers-reduced-motion` media query is NOT set to `reduce`.
- Postconditions: smooth slide animation is visible.
- Error conditions: if the browser does not support CSS transforms (extremely rare), instant show/hide is acceptable.

**TR-006** — Reduced-motion guard
When `@media (prefers-reduced-motion: reduce)` is active, the system SHALL omit all transform/transition animations and instead perform an instant visibility toggle (show/hide) when switching panels. No animation is shown.
- Trigger: TR-003 or TR-004 when `prefers-reduced-motion: reduce` is active.
- Preconditions: user has enabled "Reduce Motion" in OS accessibility settings.
- Postconditions: panel switch is instant; no animation plays.
- Error conditions: none.

**TR-007** — Touch target for back button and conversation rows
On mobile viewports (≤ 768 px), the back button and each conversation row SHALL have a minimum touch target of 44 × 44 px.
- Trigger: render on viewport ≤ 768 px.
- Preconditions: back button is rendered; conversation rows are rendered.
- Postconditions: back button hit area ≥ 44 × 44 px; each conversation row height ≥ 44 px.
- Error conditions: none.

**TR-008** — No overlap of both panels
At ≤ 768 px the system SHALL ensure the conversation list and chat pane are never both visible at the same time (no partial overlap, no bleed-through). During the transition animation one panel slides fully off-screen before or as the other slides fully into view.
- Trigger: any panel switch.
- Preconditions: mobile single-pane mode.
- Postconditions: visual overlap is ≤ 0 px at any point during the transition.
- Error conditions: none.

## Non-Functional Requirements

**TR-NFR-001 — Accessibility (WCAG 2.1 AA)**
The off-screen panel SHALL be rendered as `aria-hidden="true"` or moved out of the tab order (`inert` attribute or equivalent) while not visible so keyboard users and screen readers are not presented with interactive elements in the hidden panel. The back button SHALL have an `aria-label` (using an existing i18n key). Measurable target: Tab key does not reach focusable elements in the hidden panel; screen reader announcement on panel switch reflects current content.

**TR-NFR-002 — Responsive (no break at 320 px)**
At 320 px viewport width the messaging screen SHALL display the conversation list at full-width single-pane without horizontal overflow. Measurable target: no page-level horizontal scroll at 320 px.

**TR-NFR-003 — Motion-safe animation**
The slide animation satisfies `prefers-reduced-motion: reduce` guard (TR-006). Duration ≤ 0.25 s is below the threshold that causes vestibular discomfort. Measurable target: with `prefers-reduced-motion: reduce` set in OS, no CSS transition plays; panel switch is instant.

**TR-NFR-004 — i18n**
No new i18n keys are introduced. The back button label reuses an existing navigation key. Measurable target: zero new key additions in `vi.json` / `en.json`.

[ASSUMPTION] An existing i18n key for "back" or "back to conversations" exists (e.g. under `messaging.*` or `Common.*`). If no suitable key is found during implementation, `ba-lead` should be notified; a single targeted key addition may be required.

## Scope Boundary

**IN scope:**
- `src/features/messaging/presentation/messaging-screen/` — layout and panel switching logic.
- Slide transition CSS/class implementation.
- `prefers-reduced-motion` guard.
- Back button in chat pane header (mobile only).
- Touch target enforcement for back button and conversation rows on mobile.

**OUT of scope:**
- Conversation list empty state — covered in US-E17.7.
- Desktop layout changes (preserved as-is).
- Group chat creation or message composition — separate stories.
- New design tokens or new i18n keys.
- BE changes, new routes.
- Deep-link to a specific conversation on mobile (URL state management) — [ASSUMPTION] tapping a conversation shows it in the single-pane UI without changing the URL; if URL-based conversation routing is needed that is a separate story.

**External dependencies:**
- None. Pure UI layout/animation change on the existing presentation component.

## MoSCoW

| Priority | Requirement | Rationale |
|---|---|---|
| Must | TR-001, TR-002, TR-003, TR-004 | Core fix — without single-pane toggle the screen is unusable on mobile |
| Must | TR-006, TR-008 | Reduced-motion guard is a WCAG 2.3.3 (motion) requirement; no-overlap is a correctness constraint |
| Must | TR-NFR-001, TR-NFR-002 | WCAG AA and no-320px-break are "done" criteria |
| Should | TR-005 | Slide transition is a strong UX quality signal; could be replaced by instant toggle (Won't) |
| Should | TR-007 | Touch target ≥ 44 px (WCAG 2.5.5 AA hard requirement) |
| Should | TR-NFR-003, TR-NFR-004 | Motion-safe and i18n constraints; easy to satisfy |
| Could | Swipe gesture to dismiss chat pane | Beyond spec; no design reference |
| Won't | URL-based conversation routing on mobile | Deferred; requires separate routing story |

## Design Spec Reference

`docs/product/design-spec.jsonc` key: `responsiveGrid.messagingLayout`

Normative values:
- `>768px`: `"side-by-side: conversation list (300px) + chat pane (flex 1)"`
- `<=768px`: `"single pane; show list by default; tapping a conversation slides in chat pane (full width); back button returns to list; no list/chat overlap"`
- `mobileTransition`: `"transform 0.25s ease (slide left/right); @media (prefers-reduced-motion: reduce) → no transform, instant show/hide"`
