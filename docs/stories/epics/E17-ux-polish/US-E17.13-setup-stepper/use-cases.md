# US-E17.13 — Setup Stepper Progress Bar: Use Cases & Acceptance Criteria

**Story ID:** US-E17.13
**Epic:** E17 — UX Polish: Confirmations, Navigation, Loading & Feedback
**UC Author:** ba-use-case-modeler

---

## 1. Use Case Scope Summary

**Total UCs:** 4
**Actors:** Admin only (school setup is role-gated to admin)
**System boundary:** Feature-local changes to `src/features/admin-school-setup/presentation/school-setup-screen/school-setup-screen.tsx`. No new shared component. No BE integration. No new i18n keys (all 5 stepper keys are confirmed present).

**Changes in scope:** (1) replace `scaleX` transform with `transition-[width]` on progress fill, (2) add "BƯỚC N/M" step counter, (3) add per-step status icons (done/current/pending), (4) correct `role="progressbar"` with integer `aria-valuenow`, `aria-valuemin=0`, `aria-valuemax=100`, and `aria-label` from i18n key, (5) gate fill transition with `motion-safe:`.

---

## 2. Actor Catalogue

| Actor / Role | Type | Capabilities in Scope |
|---|---|---|
| Admin | Human, internal | Navigates school setup screen; sees progress bar fill, step counter, per-step status icons |
| Screen reader user | Assistive technology | Receives `role="progressbar"` with `aria-valuenow`, per-step `aria-label` from i18n keys |

---

## 3. Use Case Catalogue

### UC-E17.13-001 — Progress Bar Fill Reflects Current Progress

**Primary Actor:** Admin
**Preconditions:**
1. Admin is on the school setup screen.
2. `getSetupProgress()` returns `{ completedSteps: number, totalSteps: number }`.
3. At least 0 steps are complete; total steps is a positive integer (e.g. 5).

**Main Success Scenario:**
1. Progress fill div width = `(completedSteps / totalSteps * 100)%` set as inline style.
2. Fill uses `bg-primary` color.
3. Track uses `bg-muted`, `h-1.5`, `rounded-full`, placed at the top of the setup guide card.
4. Progress fill transition uses `motion-safe:transition-[width] duration-[400ms] ease-out`.
5. Screen-reader-accessible: progress bar element has `role="progressbar"`, `aria-valuenow` = `Math.round(completedSteps / totalSteps * 100)` (integer 0–100), `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-label = t('adminSchoolSetup.stepper.ariaLabel')`.

**Alternative Flows:**
- A1 (0 steps complete): Fill width = 0%, `aria-valuenow=0`, all steps show pending icon.
- A2 (All steps complete): Fill width = 100%, `aria-valuenow=100`, all steps show done icon, counter shows "BƯỚC N/N".

**Exception Flows:**
- E1 (`getSetupProgress()` returns undefined or invalid): Progress bar defaults to 0% width; `aria-valuenow=0`; no crash.

---

### UC-E17.13-002 — "BƯỚC N/M" Step Counter

**Primary Actor:** Admin
**Preconditions:**
1. Admin is on the school setup screen with valid step data (current, total both defined).

**Main Success Scenario:**
1. Step counter renders above or adjacent to the progress bar.
2. Counter text: `t('adminSchoolSetup.stepper.progress', { current, total })`.
3. `current` = index of the first non-complete step + 1 (1-based); if all steps complete, `current = total`.
4. Typography: `text-xs font-bold text-muted-foreground uppercase tracking-wide`.
5. Counter updates as steps are completed.

**Alternative Flows:**
- A1 (0 steps complete, N total): Counter shows "BƯỚC 1/N" (current step = 1, i.e. the first incomplete step is step 1).
- A2 (K of N complete): Counter shows "BƯỚC K+1/N".
- A3 (All N steps complete): Counter shows "BƯỚC N/N".

**Exception Flows:**
- E1 (`current` or `total` undefined): Counter element is not rendered (guarded with conditional); no broken interpolation placeholder is visible.

---

### UC-E17.13-003 — Per-Step Status Icons

**Primary Actor:** Admin
**Preconditions:**
1. Admin is on the school setup screen.
2. `STEP_DEFS` array defines all setup steps.
3. `getSetupProgress()` indicates which steps are complete, which is current, which are pending.

**Main Success Scenario:**
1. Each step in the step list renders a status icon according to its status:
   - **Complete**: Check icon, color `text-edu-success`, `aria-label = t('adminSchoolSetup.stepper.stepComplete')`.
   - **Current** (first incomplete step): Clock or Loader2 icon, color `text-primary`, `aria-label = t('adminSchoolSetup.stepper.stepCurrent')`.
   - **Pending** (incomplete, not current): Circle icon, color `text-muted-foreground`, `aria-label = t('adminSchoolSetup.stepper.stepPending')`.
2. If Loader2 is chosen for the current step, its spin animation is gated with `motion-safe:animate-spin`.
3. Status icons are not `aria-hidden`; they carry their `aria-label` for screen reader users.

**Alternative Flows:**
- A1 (Step status indeterminate): Treated as pending — Circle icon with stepPending aria-label.

---

### UC-E17.13-004 — Motion-Safe Transition Behavior

**Primary Actor:** Admin
**Preconditions:**
1. Admin is on the school setup screen.
2. A step is completed (progress state changes).

**Main Success Scenario (motion allowed):**
1. User's OS has `prefers-reduced-motion: no-preference`.
2. Admin completes a step → `completedSteps` increases by 1.
3. Progress fill width transitions from old value to new value with `transition-[width] duration-[400ms] ease-out`.
4. Transition is visible as a smooth left-to-right grow animation over 400ms.

**Alternative Flow (motion reduced):**
1. User's OS has `prefers-reduced-motion: reduce`.
2. Admin completes a step.
3. Progress fill width jumps to the new value instantly (no transition).
4. Zero transition frames are fired.

---

## 4. Acceptance Criteria

### UC-E17.13-001: Progress Bar Fill

**AC-E17.13-01 — Fill width equals completedSteps/totalSteps percentage**
Given admin is on the school setup screen with 2 of 5 steps complete,
When the component renders,
Then the progress fill div has `width: 40%` (2/5 × 100) set as an inline style.

**AC-E17.13-02 — Fill uses bg-primary; track uses bg-muted**
Given the progress bar renders,
When inspecting the fill element,
Then the fill element has `bg-primary` (uses `--edu-primary` token),
And the track element has `bg-muted`, `h-1.5`, `rounded-full`.

**AC-E17.13-03 — Progress bar at top of setup guide card**
Given the setup guide card renders,
When the component is visually inspected,
Then the progress bar track+fill is the topmost element in the card.

**AC-E17.13-04 — role=progressbar with correct aria attributes**
Given the progress bar element renders with 2 of 5 steps complete,
When the element is inspected for accessibility attributes,
Then it has `role="progressbar"`,
And `aria-valuenow="40"` (integer, `Math.round(40)` = 40),
And `aria-valuemin="0"`,
And `aria-valuemax="100"`,
And `aria-label` equals the resolved value of `t('adminSchoolSetup.stepper.ariaLabel')`.

**AC-E17.13-05 — aria-valuenow is always an integer**
Given `completedSteps=1` and `totalSteps=3` (33.33%),
When `aria-valuenow` is set,
Then it equals `33` (Math.round(33.33) = 33), not `33.33`.

**AC-E17.13-06 — 0% state: fill width=0 and aria-valuenow=0**
Given no steps are complete,
When the component renders,
Then the fill width is `0%`,
And `aria-valuenow="0"`.

**AC-E17.13-07 — 100% state: fill width=100 and aria-valuenow=100**
Given all steps are complete,
When the component renders,
Then the fill width is `100%`,
And `aria-valuenow="100"`.

**AC-E17.13-08 — scaleX transform is replaced by width approach**
Given the existing implementation uses `transform: scaleX(...)` on the fill div,
When US-E17.13 is implemented,
Then the fill div no longer uses `transform: scaleX(...)` or `transition-[transform]`,
And instead uses an inline `width` style + `motion-safe:transition-[width]`.

---

### UC-E17.13-002: Step Counter

**AC-E17.13-09 — Counter shows "BƯỚC N/M" with correct values (vi locale)**
Given admin has completed 2 of 5 steps (current step = 3),
When the screen renders in vi locale,
Then the step counter shows the resolved value of `t('adminSchoolSetup.stepper.progress', { current: 3, total: 5 })`,
Which in Vietnamese reads as "BƯỚC 3/5" (or whatever the key value is).

**AC-E17.13-10 — Counter typography uses correct tokens**
Given the step counter renders,
When inspecting the element,
Then it uses `text-xs font-bold text-muted-foreground uppercase tracking-wide` Tailwind classes.

**AC-E17.13-11 — Counter hidden when current or total are undefined**
Given `getSetupProgress()` returns undefined or incomplete data,
When the component renders,
Then the step counter element is not rendered (conditional guard),
And no broken interpolation placeholder (`{current}` or `{total}`) appears in the UI.

**AC-E17.13-12 — Counter updates as steps are completed**
Given the admin completes step 3 of 5 (counter was "BƯỚC 3/5"),
When the step completion triggers a state update,
Then the counter updates to show "BƯỚC 4/5".

---

### UC-E17.13-003: Per-Step Status Icons

**AC-E17.13-13 — Complete step shows check icon with text-edu-success**
Given a step is marked as completed in `getSetupProgress()`,
When the step list renders that step,
Then a Check icon is shown with color `text-edu-success`,
And the icon has `aria-label` equal to the resolved value of `t('adminSchoolSetup.stepper.stepComplete')`.

**AC-E17.13-14 — Current step shows clock/spinner icon with text-primary**
Given a step is the first non-complete step (current step),
When the step list renders that step,
Then a Clock or Loader2 icon is shown with color `text-primary`,
And the icon has `aria-label` equal to the resolved value of `t('adminSchoolSetup.stepper.stepCurrent')`.

**AC-E17.13-15 — Loader2 spin is motion-safe gated**
Given the FE team chooses Loader2 for the current step icon,
And the user's OS has `prefers-reduced-motion: reduce`,
When the current step icon renders,
Then `animate-spin` is not applied (gated by `motion-safe:animate-spin`),
And the Loader2 icon is visible but static.

**AC-E17.13-16 — Pending step shows circle icon with text-muted-foreground**
Given a step is not yet current and not yet complete,
When the step list renders that step,
Then a Circle icon is shown with color `text-muted-foreground`,
And the icon has `aria-label` equal to the resolved value of `t('adminSchoolSetup.stepper.stepPending')`.

**AC-E17.13-17 — Status icons are NOT aria-hidden**
Given any step status icon (done, current, pending) is rendered,
When inspecting the icon element,
Then it does not have `aria-hidden="true"`,
And its `aria-label` is a non-empty i18n-resolved string.

**AC-E17.13-18 — Example: 2 complete, 1 current, 2 pending out of 5**
Given the admin has 2 of 5 steps complete,
When the step list renders,
Then step 1 and step 2 show Check icon (text-edu-success, stepComplete aria-label),
And step 3 shows Clock/Loader2 icon (text-primary, stepCurrent aria-label),
And step 4 and step 5 show Circle icon (text-muted-foreground, stepPending aria-label).

---

### UC-E17.13-004: Motion-Safe Transition

**AC-E17.13-19 — Motion: transition-[width] fires when motion is allowed**
Given `prefers-reduced-motion: no-preference` is active,
When admin completes a step and `completedSteps` increments,
Then the progress fill width transitions smoothly with `transition-[width] duration-[400ms] ease-out`.

**AC-E17.13-20 — Motion: no transition when reduced-motion is set**
Given `prefers-reduced-motion: reduce` is active,
When admin completes a step,
Then the progress fill width jumps to the new value instantly,
And zero transition frames are fired.

**AC-E17.13-21 — Motion-safe gate is on the fill element Tailwind class**
Given the fill element is inspected,
Then the transition class is `motion-safe:transition-[width]` (not `transition-[transform]` or an unconditional `transition-[width]`).

---

### Responsive and No Hardcoded Strings

**AC-E17.13-22 — Responsive: no overflow at 320px**
Given the admin is on the school setup screen on a 320px viewport,
When the guide card with stepper renders,
Then there is no horizontal overflow,
And the step counter text at `text-xs` does not wrap in a way that breaks the layout.

**AC-E17.13-23 — Responsive: correct at 375px**
Given a 375px viewport,
When the setup screen renders,
Then the progress bar and step counter display correctly without overlap or truncation issues.

**AC-E17.13-24 — i18n: no hardcoded strings in stepper**
Given the school-setup-screen component source is reviewed,
Then zero hardcoded Vietnamese or English strings are present for the stepper counter, status labels, or progress bar aria-label,
And all strings are resolved via the confirmed-present i18n keys,
And `bunx tsc --noEmit` passes.

---

### Feature-Local Placement

**AC-E17.13-25 — Placement: stepper stays feature-local**
Given the school setup stepper is implemented,
When the project structure is inspected,
Then no shared `SetupStepper` component has been created in `src/components/shared/`,
And the implementation resides in `src/features/admin-school-setup/presentation/school-setup-screen/`.

---

## 5. Edge Case Matrix

| Scenario | 0 steps complete | K of N complete | all steps complete | getSetupProgress undefined | prefers-reduced-motion | 320px | 375px | Loader2 chosen |
|---|---|---|---|---|---|---|---|---|
| Fill width | 0% | (K/N × 100)% | 100% | 0% (default) | instant jump | correct | correct | N/A |
| aria-valuenow | 0 | Math.round(K/N×100) | 100 | 0 | instant change | correct | correct | N/A |
| Counter | "BƯỚC 1/N" | "BƯỚC K+1/N" | "BƯỚC N/N" | not rendered | instant update | no overflow | no overflow | N/A |
| Step icons | all pending (circle) | K check + 1 current + rest pending | all check | all pending (circle) | current icon: static (no spin) | visible | visible | motion-safe:animate-spin |
| Transition | motion-safe fires | motion-safe fires | motion-safe fires | no transition | not fired | N/A | N/A | N/A |

---

## 6. Open Questions

**OQ-E17.13-01** [OPEN QUESTION] Which lucide icon should represent the "current" step — `Loader2` (animated spinner, motion-safe gated) or `Clock` (static)? Design-spec says "spinner or clock". FE team to decide and document. If `Loader2`, `motion-safe:animate-spin` must be applied. If `Clock`, no animation concern.

**OQ-E17.13-02** [OPEN QUESTION] What is the exact `getSetupProgress()` return shape for determining `current` step number for the counter? The assumption is `current = index of first non-complete step + 1 (1-based)`. FE team to verify against the existing function return shape and confirm this matches the `t('adminSchoolSetup.stepper.progress', { current, total })` interpolation expectation.
