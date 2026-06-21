# US-E17.9 — DetailPanelHeader: Use Cases & Acceptance Criteria

**Story ID:** US-E17.9
**Epic:** E17 — UX Polish: Confirmations, Navigation, Loading & Feedback
**UC Author:** ba-use-case-modeler

---

## 1. Use Case Scope Summary

**Total UCs:** 5
**Actors:** Teacher, Principal, Admin, Parent (role variants differ only by which panels they can access)
**System boundary:** `components/shared/detail-panel-header/` (purely presentational). Navigation behavior (close drawer, pop route) is owned by parent callers. Three named consumer screens: announcements detail drawer, messaging group-info panel, exam-builder header.

---

## 2. Actor Catalogue

| Actor / Role | Type | Capabilities in Scope |
|---|---|---|
| Teacher | Human, internal | Use back navigation in announcements drawer, messaging group-info panel, exam-builder |
| Principal | Human, internal | Use back navigation in announcements drawer, messaging group-info panel |
| Admin | Human, internal | Use back navigation in announcements drawer |
| Parent | Human, external | Use back navigation in messaging group-info panel (mobile) |
| Screen reader user | Assistive technology | Receives descriptive `aria-label` on back button regardless of text truncation |

---

## 3. Use Case Catalogue

### UC-E17.9-001 — Render DetailPanelHeader with Back Navigation

**Primary Actor:** Any role with access to a detail panel
**Preconditions:**
1. Parent component renders `DetailPanelHeader` with required `backLabel` (non-empty string) and `onBack` (function) props.
2. Optional `title` and `actions` props may or may not be provided.

**Main Success Scenario:**
1. Component renders a horizontal 3-zone row: back button (left), title zone (center), actions zone (right).
2. Back button renders as ghost-variant Button containing ChevronLeft icon (16px) and `backLabel` text.
3. Back button has `min-h-[44px]` and `min-w-[44px]`.
4. `aria-label` on the back button equals the `backLabel` prop value.
5. If `title` is provided, title zone renders `text-base font-bold text-foreground`.
6. If `actions` is provided, actions zone renders the ReactNode on the right.
7. If `title` or `actions` are not provided, their respective zones are empty; 3-zone structure is maintained.

**Alternative Flows:**
- A1 (No title, no actions): Component renders back button only; center and right zones are empty but layout structure holds.
- A2 (Title only, no actions): Center zone shows title; right zone is empty.
- A3 (Actions only, no title): Left back button + empty center + right actions.

**Exception Flows:**
- E1 (Empty backLabel): `aria-label` on button becomes empty string; screen reader receives no descriptive label. This is a caller violation — the component should always receive a non-empty backLabel.

---

### UC-E17.9-002 — Back Navigation Activation

**Primary Actor:** Any role
**Preconditions:** `DetailPanelHeader` is rendered; `onBack` is a function.

**Main Success Scenario:**
1. User clicks the back button.
2. `onBack()` is called exactly once.
3. Parent handles the navigation consequence (close drawer, pop route, etc.).

**Alternative Flows:**
- A1 (Keyboard Enter on focused back button): `onBack()` is called.
- A2 (Keyboard Space on focused back button): `onBack()` is called.

**Exception Flows:**
- E1 (onBack throws): Error boundary at parent level handles it; the shared component does not catch errors from `onBack`.

---

### UC-E17.9-003 — Announcements Detail Drawer Consumer

**Primary Actor:** Teacher / Principal / Admin
**Preconditions:**
1. User has opened an announcement detail drawer.
2. Drawer renders `DetailPanelHeader` with `backLabel = t('announcements.backToList')`.

**Main Success Scenario:**
1. Header shows back button labeled with the `announcements.backToList` i18n value.
2. User clicks back → `onBack()` called → drawer closes → announcements list view is restored.
3. Focus returns to the list item that was used to open the drawer.

---

### UC-E17.9-004 — Messaging Group-Info Panel Consumer

**Primary Actor:** Teacher / Principal / Parent
**Preconditions:**
1. User has opened the messaging group-info panel.
2. Panel renders `DetailPanelHeader` with `backLabel = t('messaging.chat.backToList')`.

**Main Success Scenario:**
1. Header shows back button labeled with the `messaging.chat.backToList` i18n value.
2. User clicks back → `onBack()` called → panel closes → chat view is restored.
3. On mobile (375px), the back button remains full-size (44×44px minimum); if actions are present they are icon-only.

---

### UC-E17.9-005 — Exam-Builder Header Consumer

**Primary Actor:** Teacher
**Preconditions:**
1. User is within the exam-builder view.
2. Exam-builder renders `DetailPanelHeader` with a `backLabel` resolved from the exam namespace.

**Main Success Scenario:**
1. Header shows back button with the exam-namespace back label.
2. User clicks back → `onBack()` called → exam list or parent view is restored.

**Alternative Flows:**
- A1 (Unsaved changes guard): If a separate unsaved-changes guard intercepts the navigation, that guard is the responsibility of the exam-builder parent, not `DetailPanelHeader`. The component only calls `onBack()`.

---

## 4. Acceptance Criteria

### UC-E17.9-001: Render

**AC-E17.9-01 — Success: 3-zone layout renders**
Given `DetailPanelHeader` is rendered with `backLabel="Quay lại danh sách"` and `onBack` function,
When the component mounts,
Then the back button is left-aligned,
And the center zone is empty (no title prop),
And the right zone is empty (no actions prop),
And the overall layout holds the 3-zone horizontal row structure.

**AC-E17.9-02 — Success: back button meets touch target**
Given `DetailPanelHeader` renders on any viewport,
When inspecting the back button dimensions,
Then the back button has `min-height: 44px` (min-h-[44px]) and `min-width: 44px` (min-w-[44px]).

**AC-E17.9-03 — Success: back button aria-label equals backLabel**
Given `backLabel="Quay lại danh sách thông báo"`,
When the component renders,
Then the back button element has `aria-label="Quay lại danh sách thông báo"`.

**AC-E17.9-04 — Success: back button is ghost variant with ChevronLeft icon**
Given `DetailPanelHeader` renders,
When inspecting the back button,
Then the button uses the `ghost` variant (no background fill in default state),
And a ChevronLeft icon at 16px appears before the `backLabel` text.

**AC-E17.9-05 — Success: title renders with correct typography**
Given `title="Thông báo quan trọng"` is passed,
When the component renders,
Then the title text appears in the center zone with `text-base font-bold text-foreground`.

**AC-E17.9-06 — Success: actions slot renders on the right**
Given an `actions` ReactNode is passed (e.g. an Edit button),
When the component renders,
Then the actions node appears right-aligned in the third zone.

**AC-E17.9-07 — Success: component renders without title and without actions**
Given `title` and `actions` props are both undefined,
When the component renders,
Then the back button is still rendered correctly,
And no error or broken layout occurs in the center or right zones.

---

### UC-E17.9-001: Responsive

**AC-E17.9-08 — Responsive: title truncates at 375px**
Given `title` is a long string (>20 characters) and the viewport is 375px wide,
When the component renders,
Then the title text truncates with an ellipsis (overflow-hidden truncate),
And the back button and actions zone are not pushed out of view.

**AC-E17.9-09 — Responsive: actions are icon-only below 768px**
Given `actions` contains a button with a text label (e.g. "Chỉnh sửa"),
When the viewport is 375px wide,
Then the text label in the actions zone is hidden (md:hidden on label span),
And the icon in the action button remains visible.

**AC-E17.9-10 — Responsive: full layout at 768px+**
Given the viewport is 768px or wider,
When the component renders with both `title` and `actions`,
Then the full title text is visible (no truncation unless the title itself is unusually long),
And the actions zone shows the full labeled button(s).

**AC-E17.9-11 — Responsive: no overflow at 320px**
Given the viewport is 320px wide,
When the component renders with a long `title` and an `actions` node,
Then there is no horizontal overflow from the header row.

---

### UC-E17.9-002: Back Navigation Activation

**AC-E17.9-12 — Click: onBack called once**
Given the back button is visible and interactive,
When the user clicks the back button,
Then `onBack` is called exactly once.

**AC-E17.9-13 — Keyboard: Tab reaches back button**
Given keyboard navigation is active on the panel,
When the user presses Tab to navigate,
Then the back button receives focus with a visible focus ring using the `--ring` token.

**AC-E17.9-14 — Keyboard: Enter activates back button**
Given the back button is focused,
When the user presses Enter,
Then `onBack` is called exactly once.

**AC-E17.9-15 — Keyboard: Space activates back button**
Given the back button is focused,
When the user presses Space,
Then `onBack` is called exactly once.

**AC-E17.9-16 — Accessibility: aria-label readable even when text overflows**
Given `title` is truncated visually at 375px,
When a screen reader reads the back button,
Then it announces the full `backLabel` value (not a truncated string),
Because `aria-label` is on the button element, independent of visible text rendering.

---

### UC-E17.9-003: Announcements Consumer

**AC-E17.9-17 — Announcements: back button label resolves from i18n**
Given a teacher opens an announcement detail drawer (vi locale),
When `DetailPanelHeader` renders with `backLabel = t('announcements.backToList')`,
Then the button text and `aria-label` show "Quay lại danh sách thông báo" (or the vi value of that key).

**AC-E17.9-18 — Announcements: back closes drawer and restores list focus**
Given the announcements detail drawer is open,
When the user clicks the back button,
Then the drawer closes and focus moves to the list item that was opened.

---

### UC-E17.9-004: Messaging Consumer

**AC-E17.9-19 — Messaging: back button label resolves from i18n**
Given the messaging group-info panel is open,
When `DetailPanelHeader` renders with `backLabel = t('messaging.chat.backToList')`,
Then the button `aria-label` matches the resolved vi/en value of `messaging.chat.backToList`.

**AC-E17.9-20 — Messaging mobile: back button 44px on 375px**
Given the messaging panel is open and the viewport is 375px,
When the user attempts to tap the back button,
Then the back button tap target is at least 44×44px.

---

### UC-E17.9-005: Exam-Builder Consumer

**AC-E17.9-21 — Exam-builder: header renders with caller-supplied backLabel**
Given the exam-builder view is rendered with a `backLabel` resolved from the exam namespace,
When `DetailPanelHeader` renders,
Then the back button displays the exam-namespace back label and `aria-label` equals that label.

---

### i18n: No hardcoded strings

**AC-E17.9-22 — i18n: component contains no hardcoded strings**
Given the component source code is reviewed,
Then zero hardcoded Vietnamese or English UI strings are present in the component file,
And `bunx tsc --noEmit` passes with no missing-key errors.

---

## 5. Edge Case Matrix

| Scenario | no-title | no-actions | title+actions | 375px | 768px+ | keyboard-only | empty-backLabel | onBack-throws | actions-no-aria-label |
|---|---|---|---|---|---|---|---|---|---|
| Layout | 3-zone holds | 3-zone holds | full 3-zone | truncates + icon-only actions | full labels | N/A | button renders | N/A | caller's responsibility |
| Back button | visible | visible | visible | 44px visible | 44px visible | focusable with ring | aria-label="" (caller violation) | error boundary at parent | N/A |
| Title truncation | N/A | N/A | truncates on mobile | overflow-hidden | no truncation | N/A | N/A | N/A | N/A |
| Actions visibility | N/A | not rendered | icon-only <768px | icon-only | full label | N/A | N/A | N/A | icon-only, no label |
| aria-label on back | equals backLabel | equals backLabel | equals backLabel | equals backLabel (full value) | equals backLabel | announced | empty string | equals backLabel | N/A |

---

## 6. Open Questions

No open questions for this story. The requirements and i18n keys for all three consumers are fully specified.
