# Feature Spec — Setup Stepper Progress Bar (US-E17.13)

**Status:** Draft
**Lane:** normal
**Priority:** P3
**Sources:** requirements.md + use-cases.md (this packet) · DR-011 §UX-07 · design-spec.jsonc#interactionPatterns.setupStepper · E17-ux-polish epic

---

## 1. Scope & Objectives

**Purpose:** Upgrade the existing school setup screen stepper to add: (a) correct `transition-[width]` progress fill replacing the current `scaleX` transform, (b) "BƯỚC N/M" counter, (c) per-step done/current/pending status icons, (d) corrected `role="progressbar"` aria attributes.

**In scope:**
- `src/features/admin-school-setup/presentation/school-setup-screen/` — all changes are feature-local
- Replace `scaleX` transform with inline `width` style + `motion-safe:transition-[width] duration-[400ms] ease-out`
- Add step counter: `t('adminSchoolSetup.stepper.progress', { current, total })` above/near progress bar
- Add per-step status icons: Check (done), Clock or Loader2 (current), Circle (pending) with i18n `aria-label`
- Correct `role="progressbar"` with integer `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-label=t('adminSchoolSetup.stepper.ariaLabel')`
- Storybook story update for school-setup-screen to show progress states

**Out of scope:**
- Creating a shared `SetupStepper` component (feature-local only per FR-007)
- Changes to `STEP_DEFS` content or `getSetupProgress()` business logic
- Actual setup step completion logic (visual progress display only)

**Definitions:**
- *completedSteps:* Number of completed steps from `getSetupProgress()`
- *totalSteps:* Total number of steps from `getSetupProgress()`
- *current step (counter):* Index of the first non-complete step + 1 (1-based). If all steps complete, current = total.

---

## 2. Actors & Roles

| Actor | Role | Screen |
|---|---|---|
| Admin | Internal | School setup screen only (role-gated; only admin accesses this screen) |
| Screen reader user | Assistive technology | `role="progressbar"` with `aria-valuenow`; per-step `aria-label` from i18n keys |

---

## 3. Functional Requirements

### FR-001 — Progress Fill: Width-Based Transition (Replaces scaleX)
**Priority:** Must
**Source:** TR-E17.13-FR-001 / UC-E17.13-001

The system SHALL replace the existing `scaleX` transform on the progress fill element with:
- Inline style: `width: (completedSteps / totalSteps * 100)%`
- Transition: `motion-safe:transition-[width] duration-[400ms] ease-out`

**Stepper reconciliation note:** The current implementation uses `scaleX(N/100)` transform. The design-spec calls for `transition-[width]`. The spec recommends keeping the `motion-safe:` prefix gate (decision: add `motion-safe:` if missing) and switching to width-based approach per design-spec. Do NOT revert to scaleX after this story. The `motion-safe:transition-[width]` class is the normative target.

**AC:**
- Given admin is on school setup screen with 2 of 5 steps complete, Then fill div has `width: 40%` as inline style.
- Given prefers-reduced-motion: no-preference and admin completes a step, Then fill width transitions smoothly with `transition-[width] duration-[400ms] ease-out`.
- Given prefers-reduced-motion: reduce and admin completes a step, Then fill width jumps instantly (no transition frames fired).
- Given existing scaleX implementation found, Then fill div no longer uses `transform: scaleX(...)` after this story.

---

### FR-002 — Progress Bar Track and Fill Tokens
**Priority:** Must
**Source:** TR-E17.13-FR-002 / UC-E17.13-001

Track: `bg-muted h-1.5 rounded-full`. Fill: `bg-primary`. Progress bar placed at the top of the setup guide card.

**AC:**
- Given progress bar renders, Then fill element has `bg-primary`; track element has `bg-muted`, `h-1.5`, `rounded-full`.
- Given setup guide card renders, Then progress bar track+fill is the topmost element in the card.

---

### FR-003 — "BƯỚC N/M" Step Counter
**Priority:** Must
**Source:** TR-E17.13-FR-003 / UC-E17.13-002

The system SHALL render a step counter with `t('adminSchoolSetup.stepper.progress', { current, total })`. Typography: `text-xs font-bold text-muted-foreground uppercase tracking-wide`. Counter conditionally rendered (guard if `current` or `total` undefined).

**AC:**
- Given admin has 2 of 5 steps complete (current step = 3), When vi locale, Then counter shows `t('adminSchoolSetup.stepper.progress', { current: 3, total: 5 })` (reads as "BƯỚC 3/5").
- Given counter inspected, Then typography is `text-xs font-bold text-muted-foreground uppercase tracking-wide`.
- Given `getSetupProgress()` returns undefined, Then counter element not rendered; no broken `{current}/{total}` placeholder.
- Given admin completes step 3 of 5, When state updates, Then counter updates to "BƯỚC 4/5".

---

### FR-004 — Per-Step Status Icons
**Priority:** Must
**Source:** TR-E17.13-FR-004 / UC-E17.13-003

Each step in the step list renders a status icon:
- **Complete:** Check icon, `text-edu-success`, `aria-label = t('adminSchoolSetup.stepper.stepComplete')`
- **Current** (first incomplete step): Clock or Loader2 icon, `text-primary`, `aria-label = t('adminSchoolSetup.stepper.stepCurrent')`
- **Pending:** Circle icon, `text-muted-foreground`, `aria-label = t('adminSchoolSetup.stepper.stepPending')`

Icons are NOT `aria-hidden` — they carry their `aria-label`.

**[OPEN QUESTION — OQ-E17.13-01]** Which icon for "current" step: `Loader2` (animated, motion-safe gated) or `Clock` (static)? **Recommended default:** Use `Loader2` with `motion-safe:animate-spin`. The animated state is a useful affordance for "in progress"; the `motion-safe:` gate ensures reduced-motion compliance.

**AC:**
- Given step is complete, Then Check icon shown with `text-edu-success` and `aria-label = t('adminSchoolSetup.stepper.stepComplete')`.
- Given step is current (first non-complete), Then Clock/Loader2 icon shown with `text-primary` and `aria-label = t('adminSchoolSetup.stepper.stepCurrent')`.
- Given step is pending, Then Circle icon shown with `text-muted-foreground` and `aria-label = t('adminSchoolSetup.stepper.stepPending')`.
- Given Loader2 chosen for current step and `prefers-reduced-motion: reduce`, Then `animate-spin` not applied; icon visible but static.
- Given any step status icon, Then it does NOT have `aria-hidden="true"` and `aria-label` is a non-empty i18n-resolved string.
- Given 2 of 5 steps complete, Then step 1+2 show Check (success), step 3 shows current icon (primary), steps 4+5 show Circle (muted).

---

### FR-005 — Correct role=progressbar Attributes
**Priority:** Must
**Source:** TR-E17.13-FR-005 / UC-E17.13-001

The system SHALL preserve and correctly set `role="progressbar"` on the fill element or its wrapper with:
- `aria-valuenow`: `Math.round(completedSteps / totalSteps * 100)` (integer 0–100)
- `aria-valuemin="0"`
- `aria-valuemax="100"`
- `aria-label = t('adminSchoolSetup.stepper.ariaLabel')`

**AC:**
- Given 2 of 5 steps complete, Then `aria-valuenow="40"` (Math.round(40) = 40).
- Given 1 of 3 steps complete, Then `aria-valuenow="33"` (Math.round(33.33) = 33).
- Given 0 steps complete, Then `aria-valuenow="0"`.
- Given all steps complete, Then `aria-valuenow="100"`.
- Given progress bar renders, Then `aria-label` equals `t('adminSchoolSetup.stepper.ariaLabel')`.

---

### FR-006 — Motion-Safe Gate on Transition
**Priority:** Must
**Source:** TR-E17.13-FR-006 / UC-E17.13-004

The system SHALL gate fill transition with `motion-safe:transition-[width]`. When `prefers-reduced-motion: reduce`, fill width updates instantly.

**AC:**
- Given `prefers-reduced-motion: no-preference`, When step completes, Then fill transitions with `transition-[width] duration-[400ms] ease-out`.
- Given `prefers-reduced-motion: reduce`, When step completes, Then fill jumps instantly; zero transition frames.
- Given fill element inspected, Then transition class is `motion-safe:transition-[width]` (not unconditional `transition-[width]` or `transition-[transform]`).

---

### FR-007 — Feature-Local Only (No Shared Component)
**Priority:** Should
**Source:** TR-E17.13-FR-007

The setup stepper SHALL remain feature-local in `src/features/admin-school-setup/presentation/school-setup-screen/`. Promote to `src/components/shared/setup-stepper/` only when a second onboarding screen requires a stepper pattern.

**AC:**
- Given implementation complete, Then no shared `SetupStepper` component has been created in `src/components/shared/`.

---

## 4. Non-Functional Requirements

### NFR-001 — Accessibility: WCAG 4.1.2 Progressbar Name/Role/Value
**Source:** TR-E17.13-NFR-001
`role="progressbar"` with `aria-valuenow` (integer 0–100), `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-label` from i18n key.
**Measurable target:** Screen reader announces current percentage; verified by `fe-accessibility-auditor`.

### NFR-002 — Accessibility: Status Icon aria-labels
**Source:** TR-E17.13-NFR-002
Per-step status icon `aria-label` from i18n keys (not hardcoded, not `aria-hidden`).
**Measurable target:** Zero hardcoded status strings; `bunx tsc --noEmit` passes.

### NFR-003 — Accessibility: Motion-Safe Transition Gate
**Source:** TR-E17.13-NFR-003
Fill transition gated by `motion-safe:`.
**Measurable target:** Zero transition frames in browser with `prefers-reduced-motion: reduce`.

### NFR-004 — Responsive: No Overflow at 320px
**Source:** TR-E17.13-NFR-004
Guide card with stepper must not overflow horizontally at 320px. Step counter at `text-xs` must not wrap awkwardly at 375px.
**Measurable target:** No horizontal overflow at 320px; step counter visible at 375px.

### NFR-005 — i18n: No Hardcoded Strings
**Source:** TR-E17.13-NFR-005
All stepper text uses i18n keys. Zero hardcoded Vietnamese or English strings.
**Measurable target:** `bunx tsc --noEmit` passes; grep for hardcoded strings in stepper code returns zero.

---

## 5. UI States & Flows

| State | `completedSteps` | Fill Width | Counter | Step Icons |
|---|---|---|---|---|
| `step-0-of-N` | 0 | 0% | "BƯỚC 1/N" | All Circle (pending) |
| `step-K-of-N` | K | (K/N × 100)% | "BƯỚC K+1/N" | K Check + 1 current + rest Circle |
| `step-N-of-N` | N | 100% | "BƯỚC N/N" | All Check |
| `reduced-motion` | any | instant jump | same | current icon: static (no spin) |
| `getSetupProgress undefined` | — | 0% (default) | not rendered | all pending (Circle) |

---

## 6. Data & Integration

No backend integration. Progress state comes from existing `getSetupProgress()` utility and `STEP_DEFS` in the `admin-school-setup` feature.

**[OPEN QUESTION — OQ-E17.13-02]** What is the exact `getSetupProgress()` return shape? **Recommended default:** FE reads existing implementation. `completedCount` and `totalSteps` are already available from `getSetupProgress()`. `current` for the counter = index of first non-complete step + 1 (1-based); if all complete, current = total. FE verifies this interpretation against the existing function and documents if different.

**External dependencies:**
- `lucide-react` — `Check`, `Circle`, and (`Loader2` or `Clock`) icons
- `getSetupProgress()` — existing utility in `admin-school-setup` feature
- All 5 `adminSchoolSetup.stepper.*` i18n keys (all confirmed present)

---

## 7. Use Case Summary

| UC ID | Title | FR Coverage | AC Count |
|---|---|---|---|
| UC-E17.13-001 | Progress Bar Fill Reflects Current Progress | FR-001, FR-002, FR-005 | AC-01 through AC-08 |
| UC-E17.13-002 | "BƯỚC N/M" Step Counter | FR-003 | AC-09 through AC-12 |
| UC-E17.13-003 | Per-Step Status Icons | FR-004 | AC-13 through AC-18 |
| UC-E17.13-004 | Motion-Safe Transition Behavior | FR-006 | AC-19 through AC-21 |

---

## 8. Constraints & Assumptions

**Technical constraints:**
- `Math.round()` is required for `aria-valuenow` — fractional percentages must become integers.
- The guard on counter rendering (`if (current && total)`) must prevent broken `{current}/{total}` placeholders from appearing if `getSetupProgress()` returns undefined.
- `motion-safe:transition-[width]` in Tailwind v4 requires the `[width]` custom property syntax (not `transition-[transform]`).

**Confirmed assumptions:**
- [ASSUMPTION] `school-setup-screen.tsx` already has `role="progressbar"` and `getSetupProgress()` wired. This story modifies the visual implementation (scaleX → width), not the data logic.
- [ASSUMPTION] `adminSchoolSetup.stepper.progress` key has interpolation slots `{current}` and `{total}` matching the "BƯỚC {current}/{total}" pattern in vi.json.

**[OPEN QUESTION] OQ-E17.13-01:** Loader2 vs Clock for current step icon. **Recommended default:** `Loader2` with `motion-safe:animate-spin` — the animated state is a useful affordance for "in progress"; motion-safe gate ensures reduced-motion compliance. FE decides and documents.

**[OPEN QUESTION] OQ-E17.13-02:** `getSetupProgress()` return shape for `current` counter. **Recommended default:** FE reads existing implementation; `completedCount` and `totalSteps` are available; `current = completedCount + 1` (1-based, capped at total). FE verifies.

---

## 9. Traceability Matrix

| Requirement | Source | Use Case(s) | Integration | Priority |
|---|---|---|---|---|
| FR-001 (Width-based fill) | TR-E17.13-FR-001 + design-spec.jsonc#setupStepper.visual.progressBar | UC-E17.13-001 | None | Must |
| FR-002 (Track/fill tokens) | TR-E17.13-FR-002 + design-spec.jsonc#setupStepper.tokens | UC-E17.13-001 | None | Must |
| FR-003 (Step counter) | TR-E17.13-FR-003 + design-spec.jsonc#setupStepper.visual.stepCounter | UC-E17.13-002 | i18n: `adminSchoolSetup.stepper.progress` | Must |
| FR-004 (Per-step icons) | TR-E17.13-FR-004 + design-spec.jsonc#setupStepper.visual.stepItems | UC-E17.13-003 | i18n: stepComplete, stepCurrent, stepPending | Must |
| FR-005 (role=progressbar attrs) | TR-E17.13-FR-005 + design-spec.jsonc#setupStepper.a11y | UC-E17.13-001 | i18n: `adminSchoolSetup.stepper.ariaLabel` | Must |
| FR-006 (motion-safe gate) | TR-E17.13-FR-006 + design-spec.jsonc#setupStepper.visual.progressBar.transition | UC-E17.13-004 | None | Must |
| FR-007 (Feature-local only) | TR-E17.13-FR-007 | All UCs | None | Should |
| NFR-001 (WCAG 4.1.2) | TR-E17.13-NFR-001 | UC-E17.13-001 (AC-04, AC-05) | None | Must |
| NFR-002 (Status icon aria) | TR-E17.13-NFR-002 | UC-E17.13-003 (AC-17) | i18n: stepComplete, stepCurrent, stepPending | Must |
| NFR-003 (motion-safe) | TR-E17.13-NFR-003 | UC-E17.13-004 (AC-20, AC-21) | None | Must |
| NFR-004 (Responsive 320px) | TR-E17.13-NFR-004 | All UCs (AC-22, AC-23) | None | Must |
| NFR-005 (No hardcoded strings) | TR-E17.13-NFR-005 | All UCs (AC-24) | i18n: all 5 keys below | Must |

### i18n Key Coverage

| i18n Key Path | vi Value | en Value | Status | Used in |
|---|---|---|---|---|
| `adminSchoolSetup.stepper.ariaLabel` | (progress bar aria label) | (progress bar aria label) | Existing (confirmed) | FR-005 (AC-04) |
| `adminSchoolSetup.stepper.progress` | "BƯỚC {current}/{total}" | "STEP {current}/{total}" | Existing (confirmed) | FR-003 (AC-09) |
| `adminSchoolSetup.stepper.stepComplete` | (complete step label) | "Complete" | Existing (confirmed) | FR-004 (AC-13) |
| `adminSchoolSetup.stepper.stepCurrent` | (current step label) | "In progress" | Existing (confirmed) | FR-004 (AC-14) |
| `adminSchoolSetup.stepper.stepPending` | (pending step label) | "Pending" | Existing (confirmed) | FR-004 (AC-16) |

**No net-new i18n keys required for US-E17.13.** All 5 keys confirmed present.

---

## 10. Handoff to FE

**What `fe-lead` should build:**

1. **Replace `scaleX`** on progress fill div with inline `width` style + `motion-safe:transition-[width] duration-[400ms] ease-out`.
2. **Add step counter** above/near progress bar with `t('adminSchoolSetup.stepper.progress', { current, total })` and `text-xs font-bold text-muted-foreground uppercase tracking-wide`.
3. **Add per-step status icons** (Check/Loader2 or Clock/Circle) with i18n `aria-label` on each icon.
4. **Correct `aria-valuenow`** to `Math.round(completedSteps / totalSteps * 100)` (integer); ensure `aria-valuemin="0"` and `aria-valuemax="100"` and `aria-label` are present.
5. **Storybook:** stories for 0/2/5 of 5 steps complete + reduced-motion state + `aria-valuenow` assertion.

**Lane:** normal

**Proof owed (TEST_MATRIX rows):**

| Layer | Expected proof |
|---|---|
| Unit | Vitest: progress % calculation (2/5 = 40, 1/3 = 33 Math.round); counter text params; `aria-valuenow` integer |
| Integration | None |
| E2E | Storybook: steps 0/2/5 of 5; `aria-valuenow` assertion; motion-safe transition present on fill element |
| Platform | Manual `prefers-reduced-motion: reduce` check (instant fill jump, no spin on Loader2) |
