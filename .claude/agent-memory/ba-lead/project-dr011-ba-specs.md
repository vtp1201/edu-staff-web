---
name: project-dr011-ba-specs
description: DR-011 UX Polish P2+P3 BA specs — US-E17.8–E17.13 story packets, epic placement, i18n gap, dependency map
metadata:
  type: project
---

DR-011 (UX Polish: Confirmations, Navigation, Loading & Feedback) BA pipeline completed 2026-06-21. All 6 stories placed in existing E17-ux-polish epic continuing from US-E17.7 (DR-010 P1 batch).

**Why E17 (not a new epic):** DR-011 and DR-010 are both cross-cutting UX polish DRs — no new screens, no new tokens, no new BE services. Same epic is correct.

**Story IDs assigned:**
- US-E17.8 — DestructiveConfirmDialog shared component (UX-02)
- US-E17.9 — DetailPanelHeader shared component (UX-04)
- US-E17.10 — Loading skeletons: StatCardSkeleton + TableRowSkeleton (UX-05)
- US-E17.11 — Touch target ≥44px grade rows + violation rows (UX-08)
- US-E17.12 — Contextual toast with entity/count/timestamp (UX-06)
- US-E17.13 — Setup stepper Bước N/M counter (UX-07)

**Build order:** P2 (E17.8 → E17.9 → E17.10 → E17.11) before P3 (E17.12 → E17.13)

**Dependency note:** US-E17.11 and US-E17.2 both touch `components/shared/grade-book-table/grade-book-table.tsx`. Non-overlapping changes (E17.2 = overflow/min-width/border-r; E17.11 = min-h-[44px] rows). FE claim check required — cannot run in parallel.

**Net-new i18n key added in this session:**
- `discipline.violations.successContext` = "Đã ghi nhận vi phạm của {studentName}" (vi)
- `discipline.violations.successContext` = "Violation recorded for {studentName}" (en)
- Added atomically to both vi.json + en.json as part of US-E17.12 scope

**Stepper reconciliation decision (OQ-E17.13-02):**
Existing school-setup-screen uses scaleX(N/100) GPU-composited approach (consistent with US-E16.4 pattern). Design-spec says transition-[width]. Recommendation: KEEP scaleX, add motion-safe: prefix if missing. The real deliverable is the "BƯỚC N/M" counter text and per-step status labels.

**Consolidation scope for US-E17.8 (7 files to migrate):**
1. exam-bank/presentation/exam-bank-screen/delete-confirm-dialog.tsx
2. exam-bank/presentation/exam-bank-screen/publish-confirm-dialog.tsx
3. grades/presentation/grade-approval-screen/components/approve-confirm-dialog.tsx
4. grades/presentation/grade-approval-screen/components/bulk-lock-dialog.tsx
5. admin-roster/presentation/student-roster-screen/components/unenroll-confirm-dialog.tsx
6. admin-settings/presentation/admin-settings-screen/switch-confirm-dialog.tsx
7. admin/class-management/presentation/class-management-screen/archive-class-dialog.tsx

**Commit:** 9496c74 on main (27 files, 5197 insertions)

**Why:** DR-011 delivered by /uiux on 2026-06-21; BA pipeline run same day.
**How to apply:** When FE builds these stories, point at spec.md in each packet. E17.8 is a foundation story — FE should claim and build it first (or at least create the shared component) before wiring instances in other features.
