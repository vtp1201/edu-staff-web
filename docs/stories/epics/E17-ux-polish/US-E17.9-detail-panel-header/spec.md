# Feature Spec — DetailPanelHeader Shared Component (US-E17.9)

**Status:** Draft
**Lane:** normal
**Priority:** P2
**Sources:** requirements.md + use-cases.md (this packet) · DR-011 §UX-04 · design-spec.jsonc#interactionPatterns.detailPanelHeader · E17-ux-polish epic

---

## 1. Scope & Objectives

**Purpose:** Create a canonical `DetailPanelHeader` component in `components/shared/` that provides a consistent back-navigation affordance in detail drawers, sheets, and full-screen panels. It replaces ad-hoc back buttons in the announcements detail drawer and messaging group-info panel, and provides a missing navigation header for the exam-builder.

**In scope:**
- New shared component: `src/components/shared/detail-panel-header/` (index.ts + component + .stories.tsx)
- Wire into: announcements detail drawer (`backLabel = t('announcements.backToList')`)
- Wire into: messaging group-info panel (`backLabel = t('messaging.chat.backToList')`)
- Wire into: exam-builder header (caller supplies its own exam-namespace `backLabel`)
- Storybook stories: default, with-title, with-actions, 375px mobile viewport

**Out of scope:**
- Breadcrumb trail (multi-level navigation)
- Progress steps or wizard header (see US-E17.13)
- Route manipulation (push/pop/replace) — parent owns navigation logic
- `RosterBreadcrumb` in admin-roster (feature-specific variant, not a consolidation target here)

**Definitions:**
- *Back label:* A descriptive string (e.g. "Quay lại danh sách thông báo") passed as a resolved i18n value by the caller — never hardcoded in the component
- *3-zone row:* Left (back button) · Center (optional title) · Right (optional actions)

---

## 2. Actors & Roles

| Actor | Role | Visible Consumers |
|---|---|---|
| Teacher | Internal | Announcements detail drawer, messaging group-info, exam-builder |
| Principal | Internal | Announcements detail drawer, messaging group-info |
| Admin | Internal | Announcements detail drawer |
| Parent | External (mobile) | Messaging group-info panel |
| Screen reader user | Assistive technology | Back button `aria-label` regardless of visual truncation |

**Role-gated visibility:** The shared component has no role guard. Each consumer panel already handles which roles can open it.

---

## 3. Functional Requirements

### FR-001 — 3-Zone Row API (Props Contract)
**Priority:** Must
**Source:** TR-E17.9-FR-001 / UC-E17.9-001

The system SHALL render a horizontal 3-zone row: `[back button, left-aligned] [title, center] [actions slot, right-aligned]`. Props:
- `backLabel: string` (required)
- `onBack: () => void` (required)
- `title?: string` (optional)
- `actions?: React.ReactNode` (optional)

**AC:**
- Given `backLabel` and `onBack` provided, Then 3-zone layout renders; center and right zones empty when title/actions not passed.
- Given `title` and `actions` both absent, Then back button is still rendered correctly; no crash or broken layout.

---

### FR-002 — Back Button Design and Touch Target
**Priority:** Must
**Source:** TR-E17.9-FR-002 / UC-E17.9-001

The system SHALL render the back button as a ghost-variant `Button` containing a Lucide `ChevronLeft` icon (16px) and the `backLabel` text. The button SHALL have `min-h-[44px]` and `min-w-[44px]`. The button `aria-label` SHALL equal the `backLabel` prop.

**AC:**
- Given component renders on any viewport, Then back button has `min-height: 44px` and `min-width: 44px`.
- Given `backLabel="Quay lại danh sách thông báo"`, Then `aria-label` on back button equals that value.
- Given component renders, Then back button uses `variant="ghost"` and ChevronLeft icon (16px) appears before label text.

---

### FR-003 — onBack Activation
**Priority:** Must
**Source:** TR-E17.9-FR-003 / UC-E17.9-002

The system SHALL call `onBack` when user clicks the back button, or presses Enter or Space while the back button is focused.

**AC:**
- Given back button is clicked, Then `onBack` is called exactly once.
- Given back button is focused and Enter is pressed, Then `onBack` is called exactly once.
- Given back button is focused and Space is pressed, Then `onBack` is called exactly once.

---

### FR-004 — Title Zone Typography and Truncation
**Priority:** Must
**Source:** TR-E17.9-FR-004 / UC-E17.9-001

The system SHALL render the title zone with `text-base font-bold text-foreground`. On viewports below 768px the title SHALL truncate with ellipsis (`overflow-hidden truncate`).

**AC:**
- Given `title` is provided, Then title renders in center zone with `text-base font-bold text-foreground`.
- Given `title` is a long string (>20 chars) and viewport is 375px, Then title truncates with ellipsis; back button and actions zone are not pushed out of view.
- Given viewport is 768px+, Then full title text is visible (no truncation for normal-length titles).

---

### FR-005 — Actions Slot and Mobile Collapse
**Priority:** Must
**Source:** TR-E17.9-FR-005 / UC-E17.9-001

The system SHALL render the actions slot (right zone) when the `actions` prop is provided. On mobile (below 768px) action text labels SHALL be hidden (`md:hidden` on label span) leaving icon-only buttons visible. Icon-only buttons in the actions slot MUST have their own `aria-label` — this is the caller's responsibility.

**AC:**
- Given `actions` contains a button with text, When viewport is 375px, Then text label is hidden (`md:hidden`) and icon remains visible.
- Given viewport is 768px+, Then full labeled action button is visible.
- Given `actions` is undefined, Then right zone is empty; layout holds 3-zone structure.

---

### FR-006 — Announcements Detail Drawer Consumer
**Priority:** Must
**Source:** TR-E17.9-FR-006 / UC-E17.9-003

The system SHALL be wired in the announcements detail drawer with `backLabel = t('announcements.backToList')`.

**AC:**
- Given teacher/principal opens an announcement detail drawer (vi locale), When `DetailPanelHeader` renders, Then back button label and `aria-label` show the vi value of `announcements.backToList`.
- Given user clicks back, Then drawer closes and focus returns to the list item that opened the drawer.

---

### FR-007 — Messaging Group-Info Panel Consumer
**Priority:** Must
**Source:** TR-E17.9-FR-007 / UC-E17.9-004

The system SHALL be wired in the messaging group-info panel with `backLabel = t('messaging.chat.backToList')`. Replaces any existing AlertDialog-based back affordance.

**AC:**
- Given messaging group-info panel is open, Then `aria-label` on back button matches the resolved value of `messaging.chat.backToList`.
- Given viewport is 375px, Then back button tap target is ≥44×44px.

---

### FR-008 — Exam-Builder Header Consumer
**Priority:** Must
**Source:** TR-E17.9-FR-008 / UC-E17.9-005

The system SHALL be wired in the exam-builder header. The `backLabel` is supplied by the exam-builder caller from its own namespace.

**AC:**
- Given exam-builder renders with a caller-supplied `backLabel` from the exam namespace, Then back button displays and `aria-label` equals that label.
- Given user clicks back, Then `onBack` is called; the exam-builder parent handles navigation (unsaved-changes guard, if any, is the parent's responsibility).

---

### FR-009 — Focus Ring via --ring Token
**Priority:** Should
**Source:** TR-E17.9-FR-009 / UC-E17.9-002

The system SHALL apply consistent focus-ring styling to the back button using the `--ring` token. Focus ring SHALL never be suppressed with `outline:none` without a replacement.

**AC:**
- Given user navigates to back button via Tab, Then a visible focus ring using the `--ring` token is displayed.

---

## 4. Non-Functional Requirements

### NFR-001 — Accessibility: WCAG 2.5.5 Touch Target
**Source:** TR-E17.9-NFR-001
Back button `aria-label` must equal `backLabel` prop (descriptive). Minimum touch target `min-h-[44px] min-w-[44px]`.
**Measurable target:** WCAG 2.5.5 AA (44×44px); WCAG 1.4.3 (contrast ≥4.5:1 for button text); 2.4.6 (descriptive labels). Verified by `fe-accessibility-auditor`.

### NFR-002 — Accessibility: aria-label Independent of Visual Truncation
**Source:** TR-E17.9-NFR-002
When `backLabel` text is visually truncated, `aria-label` on the button element still exposes the full descriptive label.
**Measurable target:** Screen reader announces full `backLabel` value regardless of visual overflow.

### NFR-003 — Responsive: 320px–1280px
**Source:** TR-E17.9-NFR-003
At 375px: title truncates; actions icon-only. At 768px+: full title and labeled actions. No layout break at 320px.
**Measurable target:** No horizontal overflow at 320px; no z-index collision with drawer/sheet overlay; tested at 320/375/768/1280px.

### NFR-004 — i18n: No Hardcoded Strings
**Source:** TR-E17.9-NFR-004
Component contains zero hardcoded Vietnamese or English strings. All display text passed by callers.
**Measurable target:** `bunx tsc --noEmit` passes with no missing-key errors.

---

## 5. UI States & Flows

| State | Props | Visual |
|---|---|---|
| `default` | `backLabel` + no title + no actions | Back button only in left zone |
| `with-title` | `backLabel` + `title` | Back button left + title center |
| `with-actions` | `backLabel` + `actions` | Back button left + actions right |
| `with-title-and-actions` | All props | Full 3-zone row |
| `mobile-collapsed-actions` | Any state on <768px viewport | Actions zone shows icon-only (label `md:hidden`) |

**Key flow — Announcements back:**
1. User opens announcement detail → parent renders `DetailPanelHeader` with `backLabel = t('announcements.backToList')`
2. User clicks back → `onBack()` called → drawer closes → focus returns to list item

**Key flow — Messaging back:**
1. User opens group-info panel → component renders with `backLabel = t('messaging.chat.backToList')`
2. User clicks back → `onBack()` called → chat view restored → panel closes

---

## 6. Data & Integration

No backend integration. The component is purely presentational. Navigation behavior (close drawer, pop route) is owned by parent callers.

**External dependencies:**
- `src/components/ui/button/` — ghost variant (already exists)
- `lucide-react` — `ChevronLeft` icon

---

## 7. Use Case Summary

| UC ID | Title | FR Coverage | AC Count |
|---|---|---|---|
| UC-E17.9-001 | Render DetailPanelHeader with Back Navigation | FR-001, FR-002, FR-004, FR-005 | AC-01 through AC-11 |
| UC-E17.9-002 | Back Navigation Activation | FR-003, FR-009 | AC-12 through AC-16 |
| UC-E17.9-003 | Announcements Detail Drawer Consumer | FR-006 | AC-17, AC-18 |
| UC-E17.9-004 | Messaging Group-Info Panel Consumer | FR-007 | AC-19, AC-20 |
| UC-E17.9-005 | Exam-Builder Header Consumer | FR-008 | AC-21 |

---

## 8. Constraints & Assumptions

**Technical constraints:**
- The component uses `React.ReactNode` for the `actions` slot. Icon-only button `aria-label` is the caller's responsibility — the component cannot validate it.
- `md:hidden` on action label text requires callers to structure their action buttons with a separate `<span>` for the label and an icon element.

**Confirmed assumptions:**
- [ASSUMPTION] The messaging group-info-panel currently uses AlertDialog for its back navigation; FE must replace that usage with `DetailPanelHeader` and retain any existing close/dismiss behavior.
- [ASSUMPTION] No `title` prop is needed for the announcements drawer — the drawer itself has its own heading. The component works correctly when `title` is undefined.
- [ASSUMPTION] The exam-builder caller will supply its own i18n `backLabel` key — no new key needed in this story if an appropriate key already exists in the exam namespace.

No open questions. All requirements and i18n keys for all three consumers are fully specified.

---

## 9. Traceability Matrix

| Requirement | Source | Use Case(s) | Integration | Priority |
|---|---|---|---|---|
| FR-001 (3-zone API) | TR-E17.9-FR-001 + design-spec.jsonc#detailPanelHeader.layout | UC-E17.9-001 | None | Must |
| FR-002 (Back button 44px) | TR-E17.9-FR-002 + design-spec.jsonc#detailPanelHeader.layout.backButton | UC-E17.9-001 | None | Must |
| FR-003 (onBack activation) | TR-E17.9-FR-003 + design-spec.jsonc#detailPanelHeader.keyboard | UC-E17.9-002 | None | Must |
| FR-004 (Title truncation) | TR-E17.9-FR-004 + design-spec.jsonc#detailPanelHeader.layout.title | UC-E17.9-001 | None | Must |
| FR-005 (Actions mobile) | TR-E17.9-FR-005 + design-spec.jsonc#detailPanelHeader.layout.actions | UC-E17.9-001 | None | Must |
| FR-006 (Announcements wire) | TR-E17.9-FR-006 | UC-E17.9-003 | None; i18n: `announcements.backToList` | Must |
| FR-007 (Messaging wire) | TR-E17.9-FR-007 | UC-E17.9-004 | None; i18n: `messaging.chat.backToList` | Must |
| FR-008 (Exam-builder wire) | TR-E17.9-FR-008 | UC-E17.9-005 | None; i18n: exam-namespace key (caller-supplied) | Must |
| FR-009 (Focus ring) | TR-E17.9-FR-009 + design-spec.jsonc#detailPanelHeader.a11y | UC-E17.9-002 | None | Should |
| NFR-001 (44px a11y) | TR-E17.9-NFR-001 | UC-E17.9-001 (AC-02), UC-E17.9-004 (AC-20) | None | Must |
| NFR-002 (aria-label full) | TR-E17.9-NFR-002 | UC-E17.9-002 (AC-16) | None | Must |
| NFR-003 (Responsive 320px) | TR-E17.9-NFR-003 | UC-E17.9-001 (AC-08–11) | None | Must |
| NFR-004 (No hardcoded strings) | TR-E17.9-NFR-004 | UC-E17.9-001 (AC-22) | i18n: both keys below | Must |

### i18n Key Coverage

| i18n Key Path | vi Value | en Value | Status | Used in |
|---|---|---|---|---|
| `announcements.backToList` | "Quay lại danh sách thông báo" | "Back to announcements" | Existing (confirmed) | FR-006 (AC-17) |
| `messaging.chat.backToList` | (vi back label for messaging) | (en back label) | Existing (confirmed) | FR-007 (AC-19) |

**No net-new i18n keys required for US-E17.9.**

---

## 10. Handoff to FE

**What `fe-lead` should build:**

1. **Shared component** at `src/components/shared/detail-panel-header/index.ts` + component + `.stories.tsx` (composed, ≥3 consumers → `components/shared/` per component-organization.md).
2. **Wire into 3 consumers:** announcements detail drawer, messaging group-info panel (replace AlertDialog back), exam-builder header.
3. **Storybook proof:** stories for default (no title/actions), with-title, with-actions, and 375px viewport with truncated title + icon-only actions.

**Lane:** normal

**Proof owed (TEST_MATRIX rows):**

| Layer | Expected proof |
|---|---|
| Unit | Vitest: props rendering variants — 3-zone structure, `aria-label` equals `backLabel`, `min-h-[44px]` class present |
| Integration | None |
| E2E | Storybook interaction: 3 consumer stories + 375px viewport asserting truncated title and icon-only actions + 44×44px back button |
| Platform | Manual mobile device-mode test at 375px for back button tap target |
