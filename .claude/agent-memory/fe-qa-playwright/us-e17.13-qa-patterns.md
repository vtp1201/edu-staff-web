---
name: us-e17.13-qa-patterns
description: Setup stepper progress bar QA — SVG .className is SVGAnimatedString not string (use getAttribute("class")); aria-label with i18n interpolation often unasserted; CONDITIONAL PASS closing 2 real gaps
metadata:
  type: project
---

US-E17.13 (setup stepper width-based progress bar, DR-011 §UX-07): CONDITIONAL
PASS → closed to clean by adding assertions (no defects found in prod code).

**Gap pattern: `aria-label` with i18n interpolation is easy to leave unasserted.**
Both `StepperZeroOfFive`/`StepperTwoOfFive` stories asserted `aria-valuenow`/
`aria-valuemin`/`aria-valuemax` but never asserted the `role="progressbar"`
element's `aria-label` value itself (AC-04) — even though it has `{current}`/
`{total}` interpolation via `t('stepper.ariaLabel', {...})`, which is exactly
the kind of assertion easy to skip because it "looks covered" by the valuenow
checks. Always grep the JSX for every `aria-label={t(...)}` on the tested
element and confirm each one has a corresponding `toHaveAttribute("aria-label", ...)`
in the play function, not just presence-of-role.

**SVG icon `.className` in `@storybook/addon-vitest` (Playwright/browser mode)
returns `SVGAnimatedString`, not a plain string** — `icon.className` on a
`lucide-react` `<svg>` gives `[object SVGAnimatedString]`/empty array in
assertions (`expected [] to include 'text-primary'`), NOT the class string.
Use `icon.getAttribute("class")` instead. `div`/`span`/`button` elements are
fine with `.className` (plain string) — this only bites `<svg>`/other SVG DOM
elements. Confirmed on lucide-react `Check`/`Loader2`/`Circle` icons.

**Deliberate AC-vs-code deviation, correctly a11y-audited:** story.md's literal
AC-13 text says "Check icon with `text-edu-success`", but the actual
implementation puts `bg-edu-success` on the badge *circle* div and
`text-edu-text-primary` on the icon itself (contrast fix, confirmed by
`fe-accessibility-auditor`, commented inline `/* A009 fix: check icon on
success bg uses text-edu-text-primary (7.17:1) */`). Verified this is the
correct WCAG-driven token choice (not a bug) before writing the test —
asserted `text-edu-text-primary` on the icon + `bg-edu-success` on the closest
ancestor `div`, not the AC's literal wording. See also
[[us-e17.10-qa-patterns]] on the "evidence-in-story.md deviation" pattern.

**Baseline noise confirmed, not a regression:** `bun vitest:storybook run`
(full suite) shows 17 pre-existing failing files (timetable, discipline,
teaching-plan, exam-bank, lesson-bank, messaging, class-management, etc.) —
none touch `admin-school-setup`; this matches the documented 17-file
`useRouter` "invariant expected app router to be mounted" baseline from
[[us-e17.4-qa-patterns]]/[[us-e17.8-qa-patterns]]/[[us-e17.10-qa-patterns]].
Scoped run (`bun vitest:storybook run school-setup-screen`) is the right
signal for this story — 6/6 pass.

**Gotcha explicitly worth re-verifying every stepper-like story:** with 0-of-5
steps complete, step index 0 must render as "current" (Loader2), not "pending"
(Circle) — `isCurrent = !done && i === progress.currentStep - 1` and
`currentStep` for all-incomplete = `firstIncomplete + 1` = 1, so step 0 is
current. `StepperZeroOfFive`'s play fn already asserted
`stepCurrent` count=1 / `stepPending` count=4 correctly — this was flagged in
the task brief as "a known gotcha the engineer had to fix once already", so
double-check this exact assertion exists and passes rather than assuming.

`bun run build` (not `bun build`) is the correct command for the Next.js
production build — `bun build` alone is Bun's own bundler CLI and errors with
"Missing entrypoints".
