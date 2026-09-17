---
name: project-infra-backlog-batch7-guard-idspace-contrast
description: INFRA-backlog-batch7 (#1/#16/#17) — admin-guard E2E gap + DEFAULT_ROUTE layer relocation, discipline id-space bug, year-timeline contrast; first-time contrast-story-on-alpha-tint pitfall caught by reviewer
metadata:
  type: project
---

Closed harness backlog #1, #16, #17 in one packet (`INFRA-backlog-batch7-guard-idspace-contrast`,
merged c1a5a2ec), cross-epic (E12 admin-guard follow-up + E24 discipline/academic-records) — used
an `INFRA-*` id (`docs/stories/epics/INFRA-toolchain/`) rather than forcing it into one epic,
same pattern as prior INFRA-* infra fixes.

**#17 (real data bug, highest priority as asked)**: `teacher/discipline`/`principal/discipline`
`availableClasses` unioned mock-space classIds (violations/conductSummary, still force-mocked,
backlog #4 BE-blocked) with real core class UUIDs (leaveRequests, real since US-E24.20). Grepped
every consumer: `leave-tab.tsx` never reads `availableClasses` at all; `violations-tab.tsx`
(filter dropdown + new-violation form default classId) and `conduct-tab.tsx` (filter dropdown)
only ever compare against mock-space ids. Fix: drop `leaveRequests` from the union entirely — no
consumer needed it. Reviewer found an EXTRA angle the packet undersold: both dropdowns render
`classId` as the visible `<SelectItem>` label, so pre-fix a real UUID was being DISPLAYED to
users, not just latent. Filed backlog #19 for the sibling risk once #4 un-mocks (dropdown will
need `{id,label}[]` then).

**#1**: `DEFAULT_ROUTE` lived in `components/layout/.../nav-config.ts` but was imported by
`bootstrap/tenant/role-guard.ts` — backwards layer direction, tracked-not-fixed since US-E12.8.
Relocated to new `bootstrap/tenant/default-route.ts`. First round left a "backward-compat"
re-export in nav-config.ts pointing back at bootstrap/tenant — reviewer correctly called this a
half-finished relocation (zero remaining production consumers) and had it deleted, with the one
remaining test (`nav-config.test.ts`) repointed directly to `@/bootstrap/tenant`. Also added
`admin/layout.test.ts` mirroring `principal/layout.test.ts`'s direct RSC-layout redirect-digest
test recipe — `admin/layout.tsx` was the ONE namespace guard (of 5, after
INFRA-rsc-layout-guards-role-groups) that never got this test style. Filed backlog #18 for the
other 3 (teacher/student/parent) — same gap, not folded in.

**#16 — key lesson, save this**: contrast fix on `bg-primary/10`/`bg-primary/15` (alpha-blended
tints, Tailwind v4 `color-mix()`) is a DIFFERENT proof shape than the established
`timetable-tab.stories.tsx#PrimaryLightContrast` precedent (opaque `bg-edu-primary-light`). An
alpha tint's `getComputedStyle().backgroundColor` resolves to an `oklab(... / <alpha>)` STRING in
real Chromium, not `rgb(...)`. A naive port of the opaque-background `contrastRatio()` helper
(regex `\d+` extraction) silently parses garbage digits out of that string and produces a ~3e8
"ratio" that passes `toBeGreaterThanOrEqual()` for ANY input color — a false-green a11y gate.
Caught only by `fe-tech-lead-reviewer` re-running the assertion by hand in real Chromium, not by
`fe-accessibility-auditor` (who re-verified the FINAL numbers independently but didn't catch that
the in-story assertion itself was vacuous) or by my own read of the code. Fix: for alpha-tint
contrast stories, either (a) drop the in-story ratio recompute and rely on exact resolved-`color`
equality only (what actually gave the RED pre-fix / GREEN post-fix signal), documenting
hand/reviewer-measured ratios in comments instead, or (b) pin the background with an exact
composited `rgb()` and hard-code it. Chose (a) — smaller, honest. **Before reusing any
`contrastRatio()`-style helper on a NEW pairing, check whether the background is opaque
(`bg-edu-*-light`, safe) or alpha (`bg-*/NN`, unsafe for that helper) first.**

Both reviewers independently re-measured the WCAG numbers by hand and landed within ~0.4 of each
other and of my own estimate — same conclusions each time (item 1 = premise correction/margin
improvement, item 2 = genuine AA failure) — a third independent convergence on this exact pattern
of "the filed number is close but not exact, the conclusion survives."
