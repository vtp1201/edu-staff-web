# CLAUDE.md

> **Authoritative project instructions live in [`.claude/CLAUDE.md`](.claude/CLAUDE.md)**
> (Clean Architecture, Tailwind v4, i18n, design system, BE integration) and the
> enforceable rules in [`.claude/rules/*`](.claude/rules/). The session also injects
> [`AGENTS.md`](AGENTS.md) (Harness bootstrap) via the SessionStart hook. Read those
> first — this file only documents the **agent teams**. On any conflict, `.claude/CLAUDE.md`,
> `.claude/rules/*`, and `src/app/tokens.css` win.

## Project

**edu-staff-web** — Next.js 16 (App Router) + React 19, TypeScript, Tailwind v4 + shadcn/ui,
TanStack Query, next-intl, bun + Biome, Vitest + Storybook + Playwright. Clean Architecture
per-feature. Runs on **Harness** (story packets under `docs/stories/epics/…`, ADRs under
`docs/decisions/`, tracked via `scripts/bin/harness-cli`).

## Agent Teams

Two Harness-bound teams live in `.claude/agents/`. Always enter through a **lead** (via its
slash command); never invoke individual specialists directly.

### Frontend Developer Team — `/fe` → `fe-lead` (`.claude/agents/fe/`)
Implements all frontend work. Pipeline:
```
Feature Intake → fe-planner → [fe-component-architect + fe-state-engineer] (parallel, when needed)
   → fe-nextjs-engineer (TDD) → [fe-tech-lead-reviewer + fe-accessibility-auditor] (parallel)
   → design-review gate (docs/DESIGN_REVIEW.md + /impeccable) → fe-qa-playwright → Harness proof
```
- `fe-lead` *(sonnet)* — entry point; owns intake, story packet, pipeline, gates.
- `fe-planner` *(sonnet)* — phased plan in the packet (no code).
- `fe-component-architect` *(sonnet)* — component tree + ViewModel/prop contracts.
- `fe-state-engineer` *(sonnet)* — TanStack Query keys/invalidation, RSC↔client boundary (no global store).
- `fe-nextjs-engineer` *(opus)* — the SOLE implementer; Clean-Arch layers, shadcn/Tailwind v4, i18n, strict TDD.
- `fe-tech-lead-reviewer` *(opus)* — mandatory quality gate (layers, types, tokens, i18n, security, tests).
- `fe-accessibility-auditor` *(sonnet)* — WCAG 2.1 AA audit (parallel with reviewer).
- `fe-qa-playwright` *(sonnet)* — Storybook interaction + Playwright E2E, Go/No-Go.
- `fe-debugger` *(sonnet)* — RCA for render/hydration/RSC/cache/build issues.

### Business Analyst Team (UI-focused) — `/ba` → `ba-lead` (`.claude/agents/ba/`)
Produces engineering-ready specs the FE team builds from; stops before code. Pipeline:
```
Feature Intake → ba-requirements-analyst → [ba-integration-analyst] → ba-use-case-modeler → ba-spec-writer
```
- `ba-lead` *(sonnet)* — entry point; intake + story packet + handoff to `fe-lead`.
- `ba-requirements-analyst` *(sonnet)* — TR-XXX requirements, actors/roles, scope.
- `ba-integration-analyst` *(sonnet)* — maps edu-api endpoints the screen consumes (service map; mock-first when absent).
- `ba-use-case-modeler` *(sonnet)* — use cases + Given/When/Then AC (loading/empty/error/success + role variants).
- `ba-spec-writer` *(sonnet)* — consolidated engineering-ready spec + traceability matrix.

### Model rationale (resource ↔ capability)
`opus` for the two highest-leverage, correctness-critical roles — `fe-nextjs-engineer` (the sole
implementer) and `fe-tech-lead-reviewer` (the last gate before merge). `sonnet` for orchestration,
planning, design, analysis, audit, QA, and debugging (strong reasoning at lower cost; these run
many turns). No `haiku` — even the checklist roles (a11y, QA) need nuance over JSX/tokens. Mirrors
edu-api's convention (heavy implementer = opus; leads/specialists = sonnet).

## Sibling repo
Backend is **edu-api** (Go microservices) with its own `/ba` and `/be` teams. This web team
**consumes** edu-api's REST contracts (`.claude/rules/api-integration.md` + the service's
`openapi.yaml`/`INTEGRATION.md`) — it never writes Go.

## Hard rules (see `.claude/rules/` for the enforceable detail)
- **TDD** red→green→refactor; no story `implemented` without real proof (`tdd.md`).
- **Tokens-only** design system — never raw color; new token needs an ADR first (`design-system.md`, `tailwind-v4.md`, `src/app/tokens.css`).
- **WCAG 2.1 AA** is a "done" criterion, not optional (`accessibility.md`).
- **i18n** — all UI strings in `messages/{vi,en}.json` (vi source + en mirror), typed, translated at presentation only (`i18n.md`).
- **Commits**: conventional `<type>(<scope>): <subject>`; merge to `main` via `git merge --no-ff` (no PR); never `--no-verify`.
- **Security** (`.claude/CLAUDE.md` §Company Security Policy): no secrets/PII client-side; no `dangerouslySetInnerHTML`/`eval` on unsanitized input; role-gated destructive UI; validated redirects.
