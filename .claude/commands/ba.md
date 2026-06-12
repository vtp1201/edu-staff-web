---
description: Run the Business Analyst (BA) team on a request — Harness-bound, UI-focused analysis pipeline
argument-hint: <what to analyze, e.g. "requirements for the admin subject-catalogue screen">
---

Delegate this request to the **BA team** by invoking the `ba-lead` agent (Task tool,
`subagent_type: ba-lead`). Do NOT do the analysis yourself and do NOT pick individual
`ba-*` specialists directly — `ba-lead` owns the Feature Intake gate, story-packet creation,
and pipeline ordering.

Pass to `ba-lead`:
- The request verbatim: $ARGUMENTS
- The repo root and the instruction to bind all output to the **Harness surface**
  (`AGENTS.md`, `.claude/CLAUDE.md`, `docs/FEATURE_INTAKE.md`): story packets under
  `docs/stories/epics/E<NN>-<domain>/US-E<NN>.<n>-<slug>/`, ADRs under `docs/decisions/`
  (next ≥ 0023), registered via `scripts/bin/harness-cli`. No parallel `docs/<discipline>/`
  tree, no top-level `plans/`.
- The reminder to anchor UI analysis in `docs/product/screens.md` + `docs/product/design-spec.jsonc`
  + `docs/product/roles-permissions.md`, and to map backend data needs against the edu-api
  contract + service map (`.claude/rules/api-integration.md`) — marking integrations mock-first
  when the service is not built (decision 0014).

Scope guard: this is **analysis/specification only**. Writing UI code is the FE team's job
(`/fe`) — `ba-lead` must stop at an engineering-ready spec and hand off. Backend Go work is
edu-api's BE team.

When `ba-lead` returns, relay its summary, the deliverable paths (packet + ADRs), the
acceptance-criteria coverage, the FE handoff note, and any open questions back to me.
