# 0045 UI/UX Design Team (`/uiux`) — Harness-bound, upstream design-authoring

Date: 2026-06-19

## Status

Accepted

## Context

A generic off-the-shelf "UI/UX Team" was installed via `fkit` into `.claude/agents/` (flat:
`lead`, `ui-ux-designer`, `researcher`, `brainstormer`, `wireframe-designer`,
`design-system-builder`, `ux-writer`, `docs-manager`, `product-manager`) plus a generic root
`CLAUDE.md` template. As shipped it diverged from this repo's Harness setup:

- bare agent names (`lead`, `researcher`, …) — ambiguous against existing `fe-lead`/`ba-lead`;
- unaware of Harness (story packets, decisions, intake, `harness-cli`);
- wrong canonical homes: it wrote to invented trees (`docs/design-guidelines.md`,
  `docs/design-tokens.yaml`, `docs/ux-copy-*.md`) and designed in loose HTML, while this repo's
  design truth is `design_src/edu/*.jsx` + `src/app/tokens.css` + `docs/product/design-spec.jsonc`,
  copy is i18n in `messages/{vi,en}.json`, and the design system is supreme (ADR 0011/0012/0044);
- `product-manager` overlapped the existing BA team;
- the root `CLAUDE.md` template conflicted with `.claude/CLAUDE.md` (the real instructions) and
  polluted every session's context.

Meanwhile a design-authoring gap was real: design currently arrives only via the legacy handoff
(`design_src/edu/*.jsx`, ADR 0044) and ad-hoc `docs/design-requests/DR-*.md` — there was no team
that authors/extends those upstream of `/ba` → `/fe`.

## Decision

Rebuild the team as a **third Harness-bound team**, mirroring the `/fe` and `/ba` conventions:

1. **Namespaced + foldered**: `.claude/agents/uiux/*.md`, all agents renamed `uiux-*`, entered
   only via `/uiux` → `uiux-lead`. Command `.claude/commands/uiux.md`.
2. **Role = upstream design-authoring**: `/uiux (design) → /ba (spec) → /fe (build)`. The team
   STOPS before `src/` app code.
3. **Canonical homes only** (no parallel doc trees): Design Request `docs/design-requests/DR-NNN-<slug>.md`;
   reference mockup `design_src/edu/<slug>.jsx`; normative layout = entry in
   `docs/product/design-spec.jsonc`; UX copy = i18n keys for `messages/{vi,en}.json`; terminology
   in `docs/GLOSSARY.md`; design changelog `docs/design-changelog.md` (only new file allowed).
4. **Design system is supreme**: tokens-only; a new token needs an ADR first; the team audits/
   extends but never reinvents palette/font/layout. `uiux-design-system-builder` proposes token
   additions + flags an ADR (no parallel token YAML); `uiux-ux-writer` outputs i18n keys.
5. **Output medium = JSX + tokens** (matches `design_src/edu/*.jsx`); Figma/Pencil MCP allowed for
   exploration only, must be exported back to JSX + design-spec.
6. **Multi-team / shared-source workflow**: 1 DR = 1 `docs/dr-NNN-<slug>` branch, claimed by early
   push; shared-file (tokens/design-spec/messages) dependency check; auto-merge on gate-green, no
   PR — codified in `.claude/rules/uiux-workflow.md` (adapts ADR 0025/0033).
7. **Kept `uiux-product-manager`** (per owner) but rescoped to product *what/why* (lightweight PRD),
   explicitly distinct from `ba-requirements-analyst` (engineering *how*/AC).
8. **Deleted** the flat install files and the conflicting root `CLAUDE.md`.

## Alternatives Considered

1. Keep the generic team as-is — rejected: name collisions, ignores Harness + design system, drifts.
2. Make it a design-review/audit-only team — rejected: overlaps `fe-accessibility-auditor` +
   `/impeccable` and leaves the authoring gap unfilled.
3. Keep HTML/Figma as the deliverable medium — rejected: FE builds from `design_src/edu/*.jsx` +
   `tokens.css`; loose HTML/Figma forces a lossy re-translation and token drift.

## Consequences

Positive:

- Symmetric three-team model (`/uiux`, `/ba`, `/fe`); single entry per team; no name collisions.
- Design artifacts land where FE/BA already read them; design system stays the source of truth.
- Session context no longer polluted by a stray root `CLAUDE.md`.

Tradeoffs:

- `uiux-product-manager` ↔ `ba-requirements-analyst` seam must be respected to avoid overlap.
- Design branches add `docs/dr-*` to the in-flight branch namespace (claim discipline required).

## Follow-Up

- First real `/uiux` run on a pending DR (e.g. DR-001 Assessment Scheme) to validate the pipeline.
- Create `docs/design-changelog.md` on first delivery (managed by `uiux-docs-manager`).
