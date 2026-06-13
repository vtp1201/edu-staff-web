---
description: Run the Frontend Developer (FE) team on a request — Harness-bound Next.js implementation pipeline
argument-hint: <what to build/fix, e.g. "implement US-E12.4 student roster" or "fix hydration error on dashboard">
---

Delegate this request to the **FE team** by invoking the `fe-lead` agent (Task tool,
`subagent_type: fe-lead`). Do NOT implement it yourself and do NOT pick individual
`fe-*` specialists directly — `fe-lead` owns the Feature Intake gate, the story-packet
workspace, pipeline ordering, the design-review gate, and the mandatory review/a11y/QA gates.

Pass to `fe-lead`:
- The request verbatim: $ARGUMENTS
- The repo root and the instruction to bind all output to the **Harness surface**
  (`AGENTS.md`, `.claude/CLAUDE.md`, `docs/FEATURE_INTAKE.md`): plan phases and design notes
  inside the story packet `docs/stories/epics/E<NN>-<domain>/US-E<NN>.<n>-<slug>/`, ADRs under
  `docs/decisions/` (next ≥ 0023), registered via `scripts/bin/harness-cli`. No top-level
  `plans/`, no parallel `docs/<discipline>/` tree.
- The reminder that all code must follow `.claude/rules/*`: Clean Architecture per-feature +
  layer directives, TDD red→green→refactor, tokens-only design system (`src/app/tokens.css`),
  WCAG 2.1 AA, Tailwind v4 (`@theme`, no `tailwind.config.ts`), TanStack Query (no global store),
  next-intl typed messages (vi source + en mirror), BE contract (envelope/camelCase/service map/
  token hybrid), design-review gate (`docs/DESIGN_REVIEW.md` + `/impeccable`).

Remind `fe-lead` of the **parallel branch workflow** (decision `0025`, `.claude/rules/parallel-workflow.md`):
before any code — `git fetch --prune`, run the **claim check** (remote `feat/us-*` branches = US other
teams are working on) and **dependency check**; if the requested US is claimed or constrained by an
in-flight US, pick an alternative and explain why. Claim the US by creating its branch and pushing it
immediately (early push). When the US is done and the gate is green, **auto-merge `--no-ff` into `main`**
(no PR) and **delete the branch local + remote** — without waiting for a per-US merge request.

Scope guard: this is **frontend implementation**. Pure requirements analysis / specification
belongs to the BA team (`/ba`) — `fe-lead` should hand such requests back. Backend Go code
belongs to edu-api's BE team — never touch it; consume its contracts instead.

When `fe-lead` returns, relay its summary, deliverable paths (code, packet, ADRs), proof
(unit/integration/e2e, `tsc`, `bun build`, design-review verdict, a11y status), harness story
flags set, and any open questions back to me.
