---
name: dr-005-reconcile-pattern
description: Exam-bank (DR-005) reconcile result — 4th confirmation of the reconcile pattern; stale US-E13.4 was actually US-E11.3
metadata:
  type: project
---

DR-005 (Exam Bank + Builder) was already fully implemented via US-E11.3 before this DR ran.
The only gap was the missing `examBank` entry in `docs/product/design-spec.jsonc`.

**Stale US pattern confirmed again**: DR header said "US-E13.4" — actual story was US-E11.3.
This is the 4th instance (DR-003, DR-004, DR-005 all had stale US numbers in their headers).
Always grep `docs/stories/` and `docs/product/screens.md` to confirm the real US before recording.

**What was delivered:**
- `docs/product/design-spec.jsonc` `examBank` entry (~450 lines): covers ExamBankScreen
  (list view, filter bar, exam cards with role-gated actions, status/type chips, all dialogs,
  toast, empty states, skeleton) + ExamBuilderScreen (top bar, metadata 6-column header,
  two-column body 30/70, question list with reorder per ADR 0043, question editor MCQ+essay,
  preview modal, validation gating) + admin variant differences + 12 a11y notes + responsive.
- DR-005 status corrected to `delivered`. README updated.
- `screens.md` "in-flight" note removed.
- 0 new i18n keys (71 existing `examBank.*` keys all reused). No new tokens. No ADR.

**Why:** design-spec was the canonical gap; the JSX handoff (1546 lines, 2 components) already
existed and the feature was production-merged.

**How to apply:** For any remaining DRs — check design-spec.jsonc first, grep for the slug key.
If missing, the spec entry is the deliverable. Do not regenerate i18n, do not touch design_src.

Related: [[dr-004-reconcile-pattern]], [[dr-003-reconcile-pattern]], [[dr-002-reconcile]]
