---
name: e17-dr011-batch-spec-pattern
description: Pattern for 6-story batch from DR-011 cross-cutting UX polish; no new tokens; only one net-new i18n key; stepper reconciliation pattern
metadata:
  type: project
---

# E17 DR-011 Batch Spec Pattern (US-E17.8–E17.13)

6 stories from a single design request (DR-011); all are cross-cutting UX polish without new screens or tokens. Delivered 2026-06-21.

**Why:** DR-011 follows DR-010 precedent — one DR for related cross-cutting interaction patterns rather than 6 DRs.

**Build order:** P2 first (E17.8 → E17.9 → E17.10 → E17.11), then P3 (E17.12, E17.13). P2 and P3 can run in parallel after P2 claim check passes.

**Cross-file conflict:** US-E17.11 and US-E17.2 both touch `grade-book-table.tsx` — non-overlapping changes but must not be claimed simultaneously.

**Net-new i18n key:** Only one across all 6 stories — `discipline.violations.successContext` in US-E17.12. Must be added to both vi.json and en.json atomically.

**Stepper reconciliation (US-E17.13):** Existing `scaleX` transform → replace with inline `width` style + `motion-safe:transition-[width]`. Do NOT revert to scaleX. This pattern may recur on future progress bar upgrades.

**Consolidation pattern (US-E17.8):** 7 feature-local AlertDialog wrappers + 3 net-new instances → single shared component. Always list migration targets explicitly in spec FR-009 for FE to track.

**How to apply:** When a DR covers multiple cross-cutting patterns with no BE integration, write all specs in one pass; batch the traceability by story rather than by service. Flag any cross-file claim dependencies explicitly in both spec.md §5 Dependencies and story.md Dependencies section.
