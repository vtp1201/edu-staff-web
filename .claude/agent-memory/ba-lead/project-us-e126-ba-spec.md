---
name: us-e126-ba-spec
description: BA spec produced retroactively for US-E12.6 Assessment Scheme Config (2026-06-20) — i18n consolidation decisions, token prereq, integration map
metadata:
  type: project
---

US-E12.6 BA spec delivered retroactively (implementation already done 2026-06-18).

**Why:** FE team built the screen without a formal BA spec; spec produced on 2026-06-20 after DR-001 was formally delivered by /uiux team. Serves as anchor for QA and future maintenance.

**How to apply:** When any future story extends or touches assessment-scheme config, read the spec first — it contains the authoritative i18n consolidation decisions and integration contract.

**Key decisions in the spec:**
- `totalWeightLabel` is canonical (not `weightSumLabel`) for the column header in the scheme editor
- `addBandLabel` is canonical (not `addBand`) for the add-band button
- `gradeLevelHeader` ("LỚP") is kept separately from `gradeLevelLabel` — they serve different UI surfaces (icon box vs dropdown label)
- Dead keys to prune: `applyPreset`, `presetTT22`, `yearLabel`, `yearLabelPlaceholder`
- `--edu-warning-text: #9a6a0f` (ADR 0046) is a BLOCKING prerequisite for NoSubjectsBanner title color; must be added to tokens.css before touching that component
- BE endpoints are mock-first (`core` service not built); yearLabel fixed to DEFAULT_YEAR = "2024-2025"

**Spec path:** `docs/stories/epics/E12-admin-core/US-E12.6-assessment-scheme--spec.md`
