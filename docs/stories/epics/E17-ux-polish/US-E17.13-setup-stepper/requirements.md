# US-E17.13 — Setup Stepper Progress Bar

**Story ID:** US-E17.13
**Epic:** E17 — UX Polish: Confirmations, Navigation, Loading & Feedback
**Design Request:** DR-011 (UX-07)
**Priority:** P3

---

## 1. Requirements Summary

The school setup screen already has `STEP_DEFS`, `getSetupProgress()`, and a `role="progressbar"` element, but it currently uses a `scaleX` transform on the fill div instead of the spec-required `transition-[width]`, and it has no "Bước N/M" counter or per-step status text. This story upgrades the existing feature-local implementation to add: (a) correct `transition-[width] duration-[400ms]` progress fill, (b) "BƯỚC N/M" counter, (c) per-step done/current/pending status icons. The component stays feature-local (one screen only). All i18n keys for this story are confirmed present. Only the admin role uses school setup.

---

## 2. Technical Requirements

```json
{
  "requirementId": "TR-E17.13",
  "title": "Setup Stepper — Progress Bar and Step Counter in School Setup Screen",
  "status": "Draft",
  "actors": [
    {
      "role": "admin",
      "capabilities": [
        "See progress bar tracking completed setup steps",
        "See 'BƯỚC N/M' counter showing current step position",
        "See per-step status icons (done / current / pending)"
      ]
    }
  ],
  "functionalRequirements": [
    {
      "id": "FR-001",
      "priority": "Must",
      "description": "The system SHALL replace the existing scaleX transform on the progress fill element with a width-based approach: the fill div width is set to '(completedSteps / totalSteps * 100)%' as an inline style. The fill transition SHALL use motion-safe:transition-[width] duration-[400ms] ease-out.",
      "trigger": "Setup progress state changes (a step is completed or page loads)",
      "preconditions": ["School setup screen is rendered", "getSetupProgress() returns current step data"],
      "postconditions": ["Progress fill width equals (completedSteps / totalSteps * 100)%; transitions smoothly on step completion for users without reduced-motion preference"],
      "errorConditions": ["If getSetupProgress() returns undefined or invalid, progress bar defaults to 0% width"]
    },
    {
      "id": "FR-002",
      "priority": "Must",
      "description": "The system SHALL render the progress bar track and fill with the correct tokens: track uses bg-muted with h-1.5 rounded-full; fill uses bg-primary. The progress bar SHALL be placed at the top of the setup guide card.",
      "trigger": "Setup screen renders",
      "preconditions": [],
      "postconditions": ["Track visible as muted rounded bar; fill grows left-to-right in primary color as steps complete"],
      "errorConditions": []
    },
    {
      "id": "FR-003",
      "priority": "Must",
      "description": "The system SHALL render a step counter above or near the progress bar with typography text-xs font-bold text-muted-foreground uppercase tracking-wide. The counter text SHALL be resolved from t('adminSchoolSetup.stepper.progress', {current, total}) where current is the current step number (1-based, not 0-based) and total is the total number of steps.",
      "trigger": "Setup screen renders",
      "preconditions": ["adminSchoolSetup.stepper.progress i18n key exists (confirmed present)"],
      "postconditions": ["Counter displays e.g. 'BƯỚC 2/5' for step 2 of 5 in Vietnamese locale"],
      "errorConditions": ["If current or total are undefined, counter is not rendered (guard with conditional)"]
    },
    {
      "id": "FR-004",
      "priority": "Must",
      "description": "The system SHALL render per-step status indicators next to each step item in the step list. A completed step SHALL show a check icon colored text-edu-success. The current step SHALL show a spinner or clock icon colored text-primary. A pending step SHALL show a circle icon colored text-muted-foreground. Status text for each step SHALL be resolved from the corresponding i18n key (adminSchoolSetup.stepper.stepComplete, adminSchoolSetup.stepper.stepCurrent, adminSchoolSetup.stepper.stepPending) and used as aria-label on the status icon.",
      "trigger": "Step list renders",
      "preconditions": ["STEP_DEFS and getSetupProgress() are available in the component"],
      "postconditions": ["Each step shows the correct icon and color based on its completion status"],
      "errorConditions": ["If a step's status is indeterminate, treat as pending"]
    },
    {
      "id": "FR-005",
      "priority": "Must",
      "description": "The system SHALL preserve and correctly use the existing role='progressbar' attribute on the progress fill element (or its wrapper). The aria-valuenow SHALL be the integer percentage (0–100) of completedSteps / totalSteps * 100. aria-valuemin='0' and aria-valuemax='100' must be present. aria-label SHALL be resolved from t('adminSchoolSetup.stepper.ariaLabel').",
      "trigger": "Progress bar element renders",
      "preconditions": ["adminSchoolSetup.stepper.ariaLabel i18n key exists (confirmed present)"],
      "postconditions": ["role='progressbar' with correct aria-valuenow, aria-valuemin, aria-valuemax, aria-label; screen reader announces progress"],
      "errorConditions": ["If pct is not an integer, round with Math.round() before passing to aria-valuenow"]
    },
    {
      "id": "FR-006",
      "priority": "Must",
      "description": "The system SHALL gate the progress bar fill transition behind motion-safe: Tailwind variant. When the user's OS has prefers-reduced-motion: reduce, the fill width updates instantly without animation.",
      "trigger": "Step completion updates progress state",
      "preconditions": [],
      "postconditions": ["Users with reduced-motion see immediate width change; users without see smooth 400ms transition"],
      "errorConditions": []
    },
    {
      "id": "FR-007",
      "priority": "Should",
      "description": "The system SHALL keep the setup stepper feature-local in src/features/admin-school-setup/presentation/school-setup-screen/. The component SHALL only be promoted to components/shared/ when a second onboarding screen requires a stepper pattern.",
      "trigger": "Component placement decision",
      "preconditions": [],
      "postconditions": ["No shared component created for this story; feature-local implementation only"],
      "errorConditions": []
    }
  ],
  "nonFunctionalRequirements": [
    {
      "id": "NFR-001",
      "category": "Accessibility",
      "requirement": "Progress bar element must have role='progressbar', aria-valuenow (integer 0–100), aria-valuemin='0', aria-valuemax='100', aria-label=t('adminSchoolSetup.stepper.ariaLabel'). Status icons must have aria-label from step status keys.",
      "measurableTarget": "WCAG 4.1.2 — name, role, value for progress bar; screen reader announces current percentage; verified by fe-accessibility-auditor."
    },
    {
      "id": "NFR-002",
      "category": "Accessibility",
      "requirement": "Per-step status icon aria-labels must use the correct i18n keys (stepComplete/stepCurrent/stepPending) — not hardcoded strings and not aria-hidden.",
      "measurableTarget": "Zero hardcoded status strings in component; bunx tsc --noEmit passes."
    },
    {
      "id": "NFR-003",
      "category": "Accessibility",
      "requirement": "Animation transition on progress fill must be gated by motion-safe: variant so prefers-reduced-motion: reduce users see instant updates.",
      "measurableTarget": "Zero transition applied in browser with prefers-reduced-motion: reduce; verified by fe-accessibility-auditor."
    },
    {
      "id": "NFR-004",
      "category": "Responsive",
      "requirement": "Progress bar and step counter must display correctly at 375px. The guide card containing the stepper must not overflow horizontally at 320px.",
      "measurableTarget": "No horizontal overflow at 320px; step counter text does not wrap awkwardly on 375px at text-xs size."
    },
    {
      "id": "NFR-005",
      "category": "i18n",
      "requirement": "All stepper text (counter, status labels, aria-label) must use i18n keys — no hardcoded strings.",
      "measurableTarget": "bunx tsc --noEmit passes; zero hardcoded strings in component."
    }
  ],
  "uiStates": ["step-0-of-N (0% fill, all pending)", "step-K-of-N (K/N*100% fill, K done, 1 current, rest pending)", "step-N-of-N (100% fill, all done)", "reduced-motion (instant fill update)"],
  "dataDependencies": [
    {
      "source": "mock",
      "entity": "No new BE dependency. Progress state comes from existing getSetupProgress() utility and STEP_DEFS in admin-school-setup feature. This is derived from existing setup entity state.",
      "sensitivity": "Internal"
    }
  ],
  "scope": {
    "inScope": [
      "src/features/admin-school-setup/presentation/school-setup-screen/ — upgrade progress bar fill from scaleX to transition-[width], add step counter, add per-step status icons",
      "Fix progress bar a11y: verify/correct aria-valuenow is integer percentage, aria-label present",
      "Add motion-safe: gate to transition-[width] if not already present",
      "Storybook story update for school-setup-screen to show progress states"
    ],
    "outOfScope": [
      "Creating a shared SetupStepper component — feature-local only (FR-007)",
      "Changes to STEP_DEFS content or getSetupProgress() business logic",
      "Actual setup step completion logic — only the visual progress display is in scope",
      "Any other admin setup screen behavior"
    ],
    "externalDependencies": [
      "lucide-react: Check, Clock (or Loader2), Circle icons for step status",
      "getSetupProgress() utility (already in admin-school-setup feature)",
      "adminSchoolSetup.stepper.ariaLabel i18n key (confirmed present)",
      "adminSchoolSetup.stepper.progress i18n key (confirmed present)",
      "adminSchoolSetup.stepper.stepComplete i18n key (confirmed present)",
      "adminSchoolSetup.stepper.stepCurrent i18n key (confirmed present)",
      "adminSchoolSetup.stepper.stepPending i18n key (confirmed present)"
    ]
  },
  "assumptions": [
    "[ASSUMPTION] The existing school-setup-screen.tsx already has role='progressbar' and getSetupProgress() wired; this story modifies the visual implementation (scaleX → width) without rewriting the data logic.",
    "[ASSUMPTION] The 'current step' for the counter (FR-003) is the index of the first non-complete step + 1. If all steps are complete, current = total. FE must confirm this interpretation against getSetupProgress() return shape.",
    "[ASSUMPTION] adminSchoolSetup.stepper.progress key has interpolation slots {current} and {total} that match the format 'BƯỚC {current}/{total}' in vi.json."
  ],
  "openQuestions": [
    "Which lucide icon should represent the 'current' step status — design-spec.jsonc says 'spinner or clock icon' — FE to choose between Loader2 (animated spinner, must be motion-safe gated) or Clock (static). If Loader2, add motion-safe:animate-spin gate."
  ]
}
```

---

## 3. Prioritized Requirements Summary (MoSCoW)

| ID | Requirement | Priority | Rationale |
|----|-------------|----------|-----------|
| FR-001 | Replace scaleX with transition-[width] for progress fill | Must | Design-spec.jsonc spec; existing impl is wrong |
| FR-002 | Track bg-muted / fill bg-primary at top of card | Must | Token compliance and visual spec |
| FR-003 | "BƯỚC N/M" counter display | Must | DR-011 core goal — step orientation |
| FR-004 | Per-step status icons (done/current/pending) | Must | DR-011 core goal — step status legibility |
| FR-005 | role='progressbar' + aria-valuenow/min/max/label | Must | WCAG 4.1.2; existing attr must be correct |
| FR-006 | motion-safe: gate on transition-[width] | Must | WCAG reduced-motion |
| FR-007 | Feature-local only — no shared component | Should | Component-organization rule (single screen) |
| NFR-001 | A11y: progressbar role + aria attrs | Must | WCAG 4.1.2 |
| NFR-002 | Status icon aria-labels from i18n keys | Must | A11y + i18n rule |
| NFR-003 | motion-safe gate on animation | Must | WCAG 2.3.3 |
| NFR-004 | No overflow at 320px | Must | Responsive baseline |
| NFR-005 | No hardcoded strings | Must | i18n rule |

---

## 4. Handoff Notes

**For ba-integration-analyst:** No BE integration. Progress state is derived client-side from STEP_DEFS and setup entity state already in the feature.

**For ba-use-case-modeler:** AC needed:
1. Given admin is on school setup screen with 2 of 5 steps complete, Then progress bar fill is 40% wide, counter shows "BƯỚC 3/5" (current step), completed steps show check icon (text-edu-success), current step shows clock/spinner icon (text-primary), pending steps show circle icon (text-muted-foreground).
2. Given admin completes a step, Then progress fill transitions to new width with 400ms ease-out (unless reduced-motion).
3. Given user has prefers-reduced-motion: reduce, Then progress fill jumps to new width instantly.
4. Given all 5 steps are complete, Then progress bar fill is 100%, counter shows "BƯỚC 5/5", all steps show check icon.

**Component canonical home:** `src/features/admin-school-setup/presentation/school-setup-screen/` — feature-local (single screen). Promote to `src/components/shared/setup-stepper/` only when a second onboarding screen is added.

**i18n key mapping:**

| Key path | Status | Usage |
|----------|--------|-------|
| `adminSchoolSetup.stepper.ariaLabel` | Confirmed present | FR-005 progress bar aria-label |
| `adminSchoolSetup.stepper.progress` | Confirmed present | FR-003 counter ({current}/{total}) |
| `adminSchoolSetup.stepper.stepComplete` | Confirmed present | FR-004 done step aria-label |
| `adminSchoolSetup.stepper.stepCurrent` | Confirmed present | FR-004 current step aria-label |
| `adminSchoolSetup.stepper.stepPending` | Confirmed present | FR-004 pending step aria-label |

No net-new i18n keys required for this story.
