---
name: dr-003-reconcile-pattern
description: DR-003 teaching-plan reconcile result — pattern for already-implemented screens where only design-spec.jsonc gap exists
metadata:
  type: project
---

Teaching-plan (DR-003) was already fully implemented: `src/features/teaching-plan/` (domain/infra/presentation), `design_src/edu/teaching-plan.jsx` (1108 lines), `screens.md` entries, and all 52 `teachingPlan.*` i18n keys in `messages/vi.json`.

**The only real gap: `docs/product/design-spec.jsonc` had zero "teachingPlan" entry.**

Added: full normative `"teachingPlan"` entry covering both role variants (teacher-edit + principal-review), all 6 states (loading/empty/draft/submitted/approved/rejected), layout tokens (padding, card radius, table min-width), component list (reuse + screenLocal), BE data shape, responsive breakpoints (1320/1024/768/375), and a11y notes for /fe.

**Why:** Same pattern as DR-002 (grade-book). Harness screens that were implemented before design-spec entries were mandated have this gap. Reconcile = add the spec entry only.

**How to apply:** For any future "already implemented" DR, check `design-spec.jsonc` first. If missing → add the entry; zero new i18n keys unless a new copy path is genuinely absent. Mark DR delivered immediately.

**Stale US note:** DR-003 header said "US-E13.2" but that maps to Attendance BE Wiring in Harness. Actual implementation US is US-E11.4. Corrected in DR file + README. Pattern: always verify US mapping against `screens.md` before closing DR.
