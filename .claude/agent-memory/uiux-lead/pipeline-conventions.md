---
name: pipeline-conventions
description: Conventions learned from DR-001 trial run — what works, what to watch
metadata:
  type: feedback
---

## Pipeline execution order (DR-001 result)

For a screen whose JSX already exists in design_src/edu/:
1. Read DR file + all referenced JSX screens before spawning anything.
2. Skip uiux-researcher + uiux-wireframe-designer — already done by handoff.
3. Skip uiux-brainstormer — DR prescribes layout; no fork needed.
4. Run uiux-designer (design-spec.jsonc entry) + uiux-ux-writer (i18n gap-fill) IN PARALLEL.
5. Run docs (DR mark delivered + README) + ADR registration simultaneously.
6. Design-review gate: run impeccable audit yourself (lead) — don't spawn for this.
7. Commit on branch, run vitest, record trace.

## What worked

- Spawning uiux-designer + uiux-ux-writer in parallel saved significant time.
- uiux-ux-writer correctly identified ~51 missing keys from the existing 60-key base.
- uiux-designer wrote 732 lines of design-spec.jsonc correctly — faithful to assessment.jsx.
- Running contrast ratio Python inline catches a11y issues faster than spawning an agent.
- Checking git diff --stat before committing catches unwanted staged files.

## Watch-outs

- If an agent edits a shared file (design-spec.jsonc) while you also try to edit it,
  the Edit tool will fail with "file modified since read". Always let the agent finish first,
  or let the agent do all the writing and you do only additive edits after.
- design-spec.jsonc edit: use the LAST section's closing `}` pattern to anchor the edit.
  The file ends with `  }\n}` — match `"ProgressBar": { ... }\n  }\n}` exactly.
- branch type "docs/" is allowed by lefthook for design work (confirmed).

## i18n conventions for assessment

- Namespace: "assessmentScheme"
- vi.json = source; en.json must mirror every key at same path.
- The JSX uses inline t('vi','en') calls — the UX writer maps these to key names.
- Some keys have near-duplicates (addBand vs addBandLabel, addColumn vs addColumnLabel).
  Flag to FE team to consolidate at implementation time.
- Template interpolations like {value}, {presetName} are valid in next-intl messages.

**Why:** DR-001 was the first full pipeline trial. These conventions are confirmed to work.

**How to apply:** Use for all subsequent DRs where assessment.jsx-style screens exist.
