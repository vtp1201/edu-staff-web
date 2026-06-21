# US-E17.13 Setup Stepper Progress Bar

## Status

planned

## Lane

normal

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm:
  - `src/features/admin-school-setup/presentation/school-setup-screen/` (feature-local only)
- Shared contract/file: none

## Product Contract

The school setup screen's existing progress bar (currently using `scaleX` transform) is upgraded to use an inline `width` style with `motion-safe:transition-[width] duration-[400ms] ease-out`. A "BƯỚC N/M" step counter is added above the progress bar using `t('adminSchoolSetup.stepper.progress', { current, total })`. Each step in the step list shows a status icon: Check icon (`text-edu-success`) for complete steps, Clock/Loader2 icon (`text-primary`) for the current step, Circle icon (`text-muted-foreground`) for pending steps — each with an i18n `aria-label`. The `role="progressbar"` gets corrected `aria-valuenow` (integer 0–100), `aria-valuemin="0"`, `aria-valuemax="100"`, and `aria-label`. Admin only.

## Relevant Product Docs

- `docs/design-requests/DR-011-ux-polish-interactions.md` §UX-07
- `docs/product/design-spec.jsonc` → `interactionPatterns.setupStepper`
- `docs/stories/epics/E17-ux-polish/US-E17.13-setup-stepper/spec.md`
- `.claude/rules/component-organization.md` (feature-local — single screen; promote only when second onboarding screen added)

## Acceptance Criteria

- AC-E17.13-01: With 2 of 5 steps complete, fill div has `width: 40%` as inline style.
- AC-E17.13-04: Progress bar has `role="progressbar"`, `aria-valuenow="40"`, `aria-valuemin="0"`, `aria-valuemax="100"`, and `aria-label` from `t('adminSchoolSetup.stepper.ariaLabel')`.
- AC-E17.13-08: Fill div no longer uses `transform: scaleX(...)` after this story; uses inline `width` style.
- AC-E17.13-09: Counter shows `t('adminSchoolSetup.stepper.progress', { current: 3, total: 5 })` when 2 of 5 steps complete.
- AC-E17.13-13: Complete steps show Check icon with `text-edu-success` and `aria-label` from `stepComplete` key.
- AC-E17.13-14: Current step shows Clock/Loader2 icon with `text-primary` and `aria-label` from `stepCurrent` key.
- AC-E17.13-19: With `prefers-reduced-motion: no-preference`, fill transitions with `transition-[width] duration-[400ms] ease-out` on step completion.
- AC-E17.13-20: With `prefers-reduced-motion: reduce`, fill width jumps instantly; zero transition frames.

## Design Notes

- Commands: none
- Queries: reads existing `getSetupProgress()` return shape from `admin-school-setup` feature
- API: none
- Tables: none
- Domain rules:
  - `current` for counter = index of first non-complete step + 1 (1-based); if all complete, current = total
  - `aria-valuenow` = `Math.round(completedSteps / totalSteps * 100)` (always integer)
  - Counter guard: if `current` or `total` undefined, do not render counter (no broken interpolation)
  - Status icons: NOT `aria-hidden` — each carries its own `aria-label`
- UI surfaces:
  - Modify: `src/features/admin-school-setup/presentation/school-setup-screen/school-setup-screen.tsx`
  - Update: corresponding `.stories.tsx` file with progress states (0/2/5 of 5)
- i18n keys used (all existing, confirmed):
  - `adminSchoolSetup.stepper.ariaLabel`
  - `adminSchoolSetup.stepper.progress` (interpolation: `{current, total}`)
  - `adminSchoolSetup.stepper.stepComplete`
  - `adminSchoolSetup.stepper.stepCurrent`
  - `adminSchoolSetup.stepper.stepPending`

## Validation

When updating durable proof status, use numeric booleans:
`scripts/bin/harness-cli story update --id US-E17.13 --unit 1 --integration 0 --e2e 1 --platform 0`.

| Layer | Expected proof |
|---|---|
| Unit | Vitest: progress % calculation (2/5 = 40, 1/3 = 33 via Math.round); counter `{current, total}` params; `aria-valuenow` is integer; step icon rendering per status |
| Integration | None |
| E2E | Storybook: steps 0/2/5 of 5 showing correct fill width, counter text, and icon states; `aria-valuenow` assertion; `motion-safe:transition-[width]` class present on fill element |
| Platform | Manual `prefers-reduced-motion: reduce` test: instant fill jump; Loader2 icon static (no spin) |
| Release | n/a |

## Harness Delta

No harness changes required. No new endpoints, tokens, or net-new i18n keys.

## Evidence

Add Storybook screenshot links after implementation.
