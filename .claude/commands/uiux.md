---
description: Run the UI/UX Design team on a request — Harness-bound, upstream design-authoring pipeline (research → wireframe → reference mockup → UX copy → docs), feeds /ba then /fe
argument-hint: <what to design, e.g. "design the exam-bank screen (DR-005)" or "audit the gradebook UI for a11y + tokens">
---

Delegate this request to the **UI/UX team** by invoking the `uiux-lead` agent (Task tool,
`subagent_type: uiux-lead`). Do NOT do the design yourself and do NOT pick individual
`uiux-*` specialists directly — `uiux-lead` owns the Feature Intake gate, the Design Request
packet, pipeline ordering, the design-system-supremacy rule, and the design-review gate.

Pass to `uiux-lead`:
- The request verbatim: $ARGUMENTS
- The repo root and the instruction to bind all output to the **Harness surface**
  (`AGENTS.md`, `.claude/CLAUDE.md`, `docs/FEATURE_INTAKE.md`): design work lives as a
  **Design Request** `docs/design-requests/DR-NNN-<slug>.md`; the reference mockup is a JSX file
  `design_src/edu/<slug>.jsx`; the normative per-screen layout is an entry in
  `docs/product/design-spec.jsonc`; UX copy is i18n keys for `messages/{vi,en}.json`. ADRs under
  `docs/decisions/` (next ≥ 0045), registered via `scripts/bin/harness-cli`. No parallel
  `docs/<discipline>/` tree, no `docs/design-guidelines.md`, no `docs/design-tokens.yaml`.
- The reminder that the **design system is supreme** (decisions `0011`/`0012`/`0044`):
  `src/app/tokens.css` + `.claude/rules/design-system.md` + the handoff baseline win over any
  trend/external suggestion. Tokens-only (no raw color); a new token needs an ADR FIRST. Honor
  `.claude/rules/`: `accessibility.md` (WCAG 2.1 AA + motion-safe), `component-organization.md`
  (one component, one home), `i18n.md` (copy → messages), `tailwind-v4.md`, `impeccable.md`.

Remind `uiux-lead` of the **multi-team / parallel workflow** (`.claude/rules/uiux-workflow.md`,
adapting `parallel-workflow.md` decisions `0025`/`0033`): `git fetch --prune`, run the claim check
(remote `docs/dr-*` / `feat/us-*` branches = work other sessions claimed) and the shared-file
dependency check (`tokens.css`, `design-spec.jsonc`, `design-system.md`, `messages`); claim a DR by
early-pushing its `docs/dr-NNN-<slug>` branch; verify `git branch --show-current` before every
commit; auto-merge `--no-ff` into `main` on gate-green (no PR) and delete the branch.

Scope guard: this is **design authoring only** — it STOPS at the DR + reference mockup +
design-spec entry + copy keys. Writing app code in `src/` is the FE team (`/fe`); engineering
requirements/AC is the BA team (`/ba`); backend Go is edu-api's BE team. `uiux-lead` must end with
an explicit handoff note: run `/ba` (spec) then `/fe` (build) on the delivered design.

When `uiux-lead` returns, relay its summary, the deliverable paths (DR, `design_src/edu/<slug>.jsx`,
`design-spec.jsonc` entry, copy keys, any ADR), the design-review verdict + a11y/contrast/state
coverage, the Harness/DR status, and the handoff note back to me.
