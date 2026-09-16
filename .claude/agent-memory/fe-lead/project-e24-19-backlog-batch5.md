---
name: project-e24-19-backlog-batch5
description: US-E24.19 backlog batch 5 (#3 contrast, #15 dangling aria-controls) — premise-correction pattern, text-primary token-resolution trap
metadata:
  type: project
---

US-E24.19 (merged `ff0e37c3`) closed backlog #3 (day-card/upcoming-period-panel
`text-primary` on `bg-edu-primary-light` contrast) and #15 (`year-timeline.tsx`
dangling `aria-controls`, the deliberate US-E24.18 #11 follow-up). Solo run, no
worktree needed (no other in-flight `feat/us-*`/`fix/*` branch at claim time).

**#15** was a clean repeat of #11's fix pattern: `year-timeline.tsx` has
exactly ONE consumer (verified by grep), so — unlike `ChildSwitcher` — no
`idPrefix` namespace guard was needed. Just `aria-controls={active ? ... :
undefined}`. Precedent transferred cleanly, zero surprises.

**#3 uncovered a real backlog-item premise error, not just a code fix.** The
backlog/packet claimed `text-primary` on `bg-edu-primary-light` = 2.94:1
(assuming `text-primary` → `--edu-primary` #5d87ff). WRONG: `globals.css`'s
`@theme inline { --color-primary: var(--primary) }` routes the `text-primary`
utility through `--primary`, which is aliased to `--edu-primary-dark` (#4570ea,
ADR 0023) — NOT the `:root { --color-primary: var(--edu-primary) }` decl in
`tokens.css:112` (a decision-0007 tenant-override slot no utility under
`@theme inline` actually reads). Real pre-fix value: **3.93:1, already over
the 3:1 large-text/UI floor**. `fe-nextjs-engineer` found this unprompted while
implementing (reverted the fix, observed the actual pre-fix computed color in
a real-Chromium story), and both `fe-tech-lead-reviewer` and
`fe-accessibility-auditor` independently re-derived the same conclusion by
different methods (source-reading the CSS cascade; hand-computing WCAG
luminance). Three-way independent convergence on a correction to MY OWN
packet — trust this pattern (see [[project-e18-be-wiring]]'s "reviewer +
a11y independent convergence" note, same shape here one level up: engineer +
reviewer + auditor).

**Lesson: any future contrast claim citing a shadcn semantic name
(`text-primary`, `bg-primary`, etc.) must be verified through the ACTUAL
`@theme inline` → `--primary` → `--edu-*` alias chain in `globals.css`, never
assumed to equal the same-named `--edu-*` token.** `tokens.css` also declares
its own `--color-primary`/`--color-*` bindings for tenant-override purposes,
but those are dead for utility-generation purposes once `globals.css`'s
`@theme inline` redeclares the same variable name later in the cascade — a
trap that produced this exact wrong number. Grep `globals.css` for `--primary:`
(both `:root` and `.dark`) before trusting any `--edu-primary`-based contrast
math.

**Handling a self-authored premise error found by the team:** did NOT quietly
patch the number and ship — corrected the packet's Item #3 section explicitly
(marked "Premise correction (post-implementation, confirmed by...)"),
corrected `docs/TEST_MATRIX.md`'s row text, and closed the harness backlog
item's outcome note with the corrected number + explicit "not an actual AA
violation as filed" — so a future reader trusts the harness record over a
stale packet paragraph. Filed a NEW backlog item (#16) for two sibling
`text-primary`-on-primary-tint pairs in `year-timeline.tsx` the reviewer
spotted while reading that file — did not fold them into #3's scope.

**Dark-mode regression from an accessibility "fix":** round-1 fix
(`text-edu-primary-accessible`, 4.35:1 light) made dark mode WORSE (2.54:1 vs
pre-fix 2.81:1 — both already failed 3:1, so not a new failure, but going
backward on the very pairing under test was worth a same-branch round-2 fix:
`dark:text-edu-primary` override, 3.77:1 dark, ADR-0077-shaped class-level
override, no new token). Any token swap for a light-mode contrast fix must
also be checked against that token's `.dark` value before shipping — `--edu-*`
tokens frequently have asymmetric light/dark contrast profiles.

`impeccable` design-review gate: ran the detector CLI directly via
`node .claude/skills/impeccable/scripts/detector/cli/main.mjs <files>`
(no Claude Code slash-command context available to a subagent/lead outside
interactive session) — 0 findings, exit 0 with empty stdout (the script only
prints on nonzero findings). This is the same mechanism prior sessions called
"`impeccable detect.mjs`" — confirmed reusable pattern for scripted design-review audits.
