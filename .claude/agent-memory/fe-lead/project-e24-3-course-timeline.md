---
name: project-e24-3-course-timeline
description: US-E24.3 course timeline (week-grouped student view) implementation — rebuild pattern, shared-component promotion, TEMP-code discipline
metadata:
  type: project
---

US-E24.3 (course detail = 1 vertical week-grouped timeline, student mode) implemented and
merged (`24ce9f11`, worktree `us-e24.3`). Second US in the student sequence
(E24.2 done → E24.3 done → E24.5 next → E24.4 last), parallel to the teacher-branch session
(E24.7 merged mid-flight, required a real drift-merge before push).

**Why record this** — patterns/traps for E24.4/E24.5 (same feature module, same component tree):

- `lesson-player/` was fully REBUILT as `course-timeline/`, not refactored — the two-pane
  lesson reader didn't match the design's vertical-timeline shape. When a US packet says
  "rename X → Y", check whether it's actually a rebuild before delegating; briefing the
  engineer to "rename" when a rebuild is needed wastes a round.
- `item-type-chip.tsx`/`item-state-pill.tsx` promoted to `features/lms/presentation/shared/`
  on day 1 (not `components/shared/` — they're LMS-domain-specific, decision 0026 tier is
  "feature-shared", a gap in `component-organization.md` worth an ADR someday). E24.4/E24.5/
  E24.10 must import these, not fork new ones.
- **A11y lessons from E24.2 transferred cleanly this round** — zero blocking a11y findings
  (only 2 minor: `aria-controls` disclosure pairing, row hover affordance). Engineer
  proactively avoided colour-only status, tooltip-only disclosure, and clipped focus rings
  without being told twice. Confirms briefing "lessons from prior US" in the engineer prompt
  works — keep doing it for E24.5/E24.4.
- Real defensible **design-spec deviations** (opacity .72 dropped for contrast; lesson body
  auto-loads on expand instead of a "Xem bài giảng" button since the E24.5 target route
  doesn't exist yet) — recorded in packet Evidence + `design-spec.jsonc` status field BEFORE
  the design-review gate, per reviewer's explicit ask. Do this proactively for every US with
  a spec deviation, don't wait for reviewer to ask.
- TEMP code (`item-detail.tsx`, expand-inline block in `timeline-row.tsx`) is greppable via
  the literal string `TEMP (US-E24.3)` — brief E24.5's engineer to grep that string first
  thing and delete every hit + the `courses.timeline.itemDetail.*` i18n keys that die with it.
- Hand-written ISO-week algorithm (`group-items-by-week.ts`) — no `date-fns`/`dayjs` in deps,
  confirmed by two independent agents (planner + reviewer) via `package.json` grep. If E24.4
  needs date grouping/formatting again, reuse this helper — don't hand-roll a second one.
- **Pre-push gate can flake under CPU contention from a parallel worktree** (`test` job
  timed out mid-push twice while another session's `vitest --config vitest.storybook.mts`
  was running in a sibling worktree) — not a real failure, confirmed by re-running the exact
  same suite in isolation (green both times). Just retry the push; don't chase phantom
  failures when a sibling worktree is visibly busy (`ps aux | grep vitest`).
- Cross-session merge drift is real and lands cleanly when it happens: origin/main moved
  (US-E24.7 merged) between claim and push — `git merge --no-ff origin/main` on the feature
  branch auto-merged with zero conflicts (different feature modules, as the epic overview
  predicted). Always re-fetch immediately before the final merge step, not just at claim time.
