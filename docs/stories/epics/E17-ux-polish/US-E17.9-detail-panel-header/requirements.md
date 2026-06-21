# US-E17.9 — DetailPanelHeader Shared Component

**Story ID:** US-E17.9
**Epic:** E17 — UX Polish: Confirmations, Navigation, Loading & Feedback
**Design Request:** DR-011 (UX-04)
**Priority:** P2

---

## 1. Requirements Summary

The system needs a canonical `DetailPanelHeader` component in `components/shared/` to provide consistent back-navigation affordance in detail drawers, sheets, and full-screen panels. It replaces ad-hoc back buttons in the announcements detail drawer and messaging group-info panel, and provides a missing navigation header for the exam-builder. The component accepts a back label, back handler, optional title, and optional action slot. All roles who can open detail views are actors. Minimum 44×44px touch target on the back button is a WCAG hard requirement.

---

## 2. Technical Requirements

```json
{
  "requirementId": "TR-E17.9",
  "title": "DetailPanelHeader — Canonical Back Navigation for Detail Panels",
  "status": "Draft",
  "actors": [
    {
      "role": "teacher",
      "capabilities": [
        "View announcements detail drawer with back navigation",
        "Navigate back from group-chat info panel",
        "Navigate within exam-builder with back header"
      ]
    },
    {
      "role": "principal",
      "capabilities": [
        "View announcements detail drawer with back navigation",
        "Navigate back from group-chat info panel"
      ]
    },
    {
      "role": "admin",
      "capabilities": [
        "View announcements detail drawer with back navigation"
      ]
    },
    {
      "role": "parent",
      "capabilities": [
        "Navigate back from group-chat info panel on mobile"
      ]
    }
  ],
  "functionalRequirements": [
    {
      "id": "FR-001",
      "priority": "Must",
      "description": "The system SHALL render a horizontal 3-zone row: [back button, left-aligned] [title, center] [actions slot, right-aligned]. The component SHALL accept props: backLabel (string, required), onBack (() => void, required), title (string, optional), actions (React.ReactNode, optional).",
      "trigger": "Parent component renders DetailPanelHeader",
      "preconditions": ["backLabel and onBack props are provided"],
      "postconditions": ["Header row is visible with back button; title and actions zones render when props provided"],
      "errorConditions": ["If backLabel is empty string, back button aria-label falls back to a generic fallback key — FE must ensure a non-empty label is always passed"]
    },
    {
      "id": "FR-002",
      "priority": "Must",
      "description": "The system SHALL render the back button as a ghost-variant Button containing a Lucide ChevronLeft icon (16px) and the backLabel text. The button SHALL have min-h-[44px] and min-w-[44px]. The button aria-label SHALL equal the backLabel prop value.",
      "trigger": "Component renders",
      "preconditions": [],
      "postconditions": ["Back button meets 44×44px minimum touch target", "aria-label is descriptive (e.g. 'Quay lại danh sách thông báo')"],
      "errorConditions": []
    },
    {
      "id": "FR-003",
      "priority": "Must",
      "description": "The system SHALL call onBack when the user clicks the back button, presses Enter or Space while the back button is focused.",
      "trigger": "User activates back button via pointer or keyboard",
      "preconditions": ["Component is rendered", "onBack prop is a function"],
      "postconditions": ["Parent receives the callback and handles navigation (close drawer, pop route, etc.)"],
      "errorConditions": ["If onBack throws, error boundary at parent level handles it; component does not catch"]
    },
    {
      "id": "FR-004",
      "priority": "Must",
      "description": "The system SHALL render the title zone (center) using text-base font-bold text-foreground. On viewports below 768px the title SHALL truncate with ellipsis if it exceeds available width (max-w with overflow-hidden truncate).",
      "trigger": "title prop is provided",
      "preconditions": [],
      "postconditions": ["Title visible on desktop (768px+); truncated with ellipsis on mobile (375px)"],
      "errorConditions": ["If title is not provided, the center zone is empty — layout still holds 3-zone structure"]
    },
    {
      "id": "FR-005",
      "priority": "Must",
      "description": "The system SHALL render the actions slot (right zone) when the actions prop is provided. On mobile (below 768px) action text labels SHALL be hidden (md:hidden on label span) leaving icon-only buttons visible. Icon-only buttons in the actions slot MUST have their own aria-label — this is the responsibility of the caller passing the actions node.",
      "trigger": "actions prop is provided",
      "preconditions": [],
      "postconditions": ["Actions visible on desktop; icon-only on mobile"],
      "errorConditions": []
    },
    {
      "id": "FR-006",
      "priority": "Must",
      "description": "The system SHALL be wired in the announcements detail drawer, replacing the existing back affordance. The backLabel SHALL resolve to t('announcements.backToList') at the call site.",
      "trigger": "User opens an announcement detail",
      "preconditions": ["announcements.backToList i18n key exists (confirmed present)"],
      "postconditions": ["Drawer header shows 'Quay lại danh sách thông báo' back label"],
      "errorConditions": []
    },
    {
      "id": "FR-007",
      "priority": "Must",
      "description": "The system SHALL be wired in the messaging group-info panel, replacing the existing AlertDialog-based back affordance. The backLabel SHALL resolve to t('messaging.chat.backToList') at the call site.",
      "trigger": "User opens group info panel in messaging",
      "preconditions": ["messaging.chat.backToList i18n key exists (confirmed present)"],
      "postconditions": ["Panel header shows a back label resolved from messaging namespace"],
      "errorConditions": []
    },
    {
      "id": "FR-008",
      "priority": "Must",
      "description": "The system SHALL be wired in the exam-builder header as a navigation affordance for returning from exam editing. The backLabel SHALL be resolved by the exam-builder caller from its own i18n namespace.",
      "trigger": "User is within the exam builder view",
      "preconditions": ["Exam builder screen is rendered"],
      "postconditions": ["Header provides consistent back navigation matching announcements and messaging instances"],
      "errorConditions": []
    },
    {
      "id": "FR-009",
      "priority": "Should",
      "description": "The system SHALL apply consistent focus-ring styling to the back button using the --ring token; the focus ring SHALL never be suppressed with outline:none without a replacement.",
      "trigger": "User navigates to back button via keyboard Tab",
      "preconditions": [],
      "postconditions": ["Focus ring is visible with --ring token styling"],
      "errorConditions": []
    }
  ],
  "nonFunctionalRequirements": [
    {
      "id": "NFR-001",
      "category": "Accessibility",
      "requirement": "Back button aria-label must equal the backLabel prop value (must be descriptive, not 'Back'). Minimum touch target 44×44px (min-h-[44px] min-w-[44px]) on the back button.",
      "measurableTarget": "WCAG 2.5.5 AA target size minimum 44×44px; 1.4.3 contrast for button text ≥4.5:1; 2.4.6 descriptive aria-label verified by fe-accessibility-auditor."
    },
    {
      "id": "NFR-002",
      "category": "Accessible",
      "requirement": "Icon-only back button fallback: when backLabel text is hidden by overflow truncation or design constraint, aria-label on the button element still exposes the full descriptive label to assistive technology.",
      "measurableTarget": "Screen reader announces descriptive label regardless of visual truncation."
    },
    {
      "id": "NFR-003",
      "category": "Responsive",
      "requirement": "At 375px: title truncates with ellipsis; actions zone shows icon-only (label text hidden via md:hidden). At 768px+: full title and labeled actions. No layout break at 320px.",
      "measurableTarget": "Tested at 320, 375, 768, 1280px. No horizontal overflow; no z-index collision with drawer/sheet overlay."
    },
    {
      "id": "NFR-004",
      "category": "i18n",
      "requirement": "Component contains no hardcoded strings. All display text (backLabel, title) is passed by caller as resolved i18n strings.",
      "measurableTarget": "Zero hardcoded Vietnamese or English UI strings in component source; bunx tsc --noEmit passes."
    }
  ],
  "uiStates": ["default (backLabel + no title + no actions)", "with-title", "with-actions", "with-title-and-actions", "mobile-collapsed-actions"],
  "dataDependencies": [
    {
      "source": "mock",
      "entity": "No BE dependency — purely presentational. Navigation behavior controlled by parent.",
      "sensitivity": "Public"
    }
  ],
  "scope": {
    "inScope": [
      "New shared component: src/components/shared/detail-panel-header/ (index.ts + component file + .stories.tsx)",
      "Wire into announcements detail drawer (backLabel = announcements.backToList)",
      "Wire into messaging group-info panel (backLabel = messaging.chat.backToList)",
      "Wire into exam-builder header",
      "Storybook stories: default, with-title, with-actions, mobile viewport at 375px"
    ],
    "outOfScope": [
      "Breadcrumb trail (multi-level) — component provides single-level back navigation only",
      "Progress steps or wizard header — separate concern (see US-E17.13 SetupStepper)",
      "Route manipulation (push/pop/replace) — parent owns navigation logic; component only calls onBack",
      "RosterBreadcrumb in admin-roster — that component is a feature-specific variant and not a consolidation target unless admin-roster opens to a detail panel with back nav"
    ],
    "externalDependencies": [
      "src/components/ui/button/ (ghost variant — already exists)",
      "lucide-react ChevronLeft icon"
    ]
  },
  "assumptions": [
    "[ASSUMPTION] The messaging group-info-panel currently uses AlertDialog for its back navigation; the FE team must replace that usage with DetailPanelHeader and retain any existing close/dismiss behavior.",
    "[ASSUMPTION] The exam-builder caller will supply its own i18n backLabel key — no new key is needed in this story if an appropriate key already exists in the exam namespace.",
    "[ASSUMPTION] No title prop is required for the announcements drawer usage; the drawer itself has its own heading. The component must work correctly when title is undefined."
  ],
  "openQuestions": []
}
```

---

## 3. Prioritized Requirements Summary (MoSCoW)

| ID | Requirement | Priority | Rationale |
|----|-------------|----------|-----------|
| FR-001 | Component API (3-zone row, props) | Must | Foundation; all instances depend on this |
| FR-002 | Back button: ghost variant, 44px, aria-label | Must | WCAG 2.5.5 touch target; a11y |
| FR-003 | onBack called on click/keyboard | Must | Core navigation behavior |
| FR-004 | Title truncation on mobile | Must | Responsive spec from design-spec.jsonc |
| FR-005 | Actions slot, icon-only on mobile | Must | Design-spec responsive rule |
| FR-006 | Wire announcements detail drawer | Must | Named consumer in DR-011 scope |
| FR-007 | Wire messaging group-info panel | Must | Named consumer in DR-011 scope |
| FR-008 | Wire exam-builder header | Must | Named consumer in DR-011 scope (≥3 = shared) |
| FR-009 | Focus ring via --ring token | Should | Keyboard UX quality |
| NFR-001 | 44×44px touch target + aria-label | Must | WCAG 2.5.5 AA |
| NFR-002 | aria-label visible even when text truncated | Must | Accessibility |
| NFR-003 | Responsive 320px–1280px | Must | Product NFR baseline |
| NFR-004 | No hardcoded strings | Must | i18n rule |

---

## 4. Handoff Notes

**For ba-integration-analyst:** No BE integration required. This is a pure presentational component.

**For ba-use-case-modeler:** Three wiring use cases needed:
1. UC-announcements-back: Given user is viewing an announcement detail, When they click back, Then the announcements list view is restored and focus returns to the announcement list item.
2. UC-messaging-back: Given user has opened group info panel, When they click back, Then the panel closes and chat view is restored.
3. UC-exam-builder-back: Given user is in exam builder, When they click back, Then the exam list or parent view is restored (unsaved-changes guard if applicable is a separate story concern).

Storybook AC: story must include a 375px viewport story with truncated title and icon-only actions.

**Component canonical home:** `src/components/shared/detail-panel-header/` — composed, used by ≥3 screens (announcements, messaging, exam-builder). Per component-organization.md decision 0026.

**i18n key mapping:**

| Key path | Status | Usage |
|----------|--------|-------|
| `announcements.backToList` | Confirmed present | FR-006 backLabel for announcements |
| `messaging.chat.backToList` | Confirmed present | FR-007 backLabel for messaging |

No net-new i18n keys required for this story. Exam-builder backLabel key sourced from exam namespace at implementation time.
