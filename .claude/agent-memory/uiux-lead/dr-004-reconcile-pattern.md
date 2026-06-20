---
name: dr-004-reconcile-pattern
description: DR-004 Lesson Bank reconcile — already implemented US-E11.2; stale US in DR header; only gap was design-spec.jsonc
metadata:
  type: project
---

DR-004 Lesson Bank (2026-06-20) — fully implemented (US-E11.2, E11-lms-exams epic).

**Facts confirmed:**
- `src/features/lesson-bank/` (domain + infra + presentation) fully built
- Route `/teacher/lesson-bank` exists and builds clean
- `design_src/edu/lesson-bank.jsx` exists (1506 handoff) — LessonBankScreen + UploadLessonDrawer + LessonDetailSheet
- Design-review gate: APPROVED in story packet
- `lessonBank.*` i18n namespace complete in vi.json + en.json (~65 keys)
- `design-spec.jsonc` had NO lessonBank entry — this was the only real gap

**Stale US:** DR header said US-E13.3 — that is "Class Log" (classops.jsx); Lesson Bank is US-E11.2.

**Action taken:** Zero new i18n keys. Added full normative design-spec.jsonc entry `lessonBank` covering: layout, header, filterBar (with owner-toggle), gridCard, listView, fileTypes vocab, visibility vocab, uploadDrawer (480px slide-in), FAB, uploadPlaceholder (in-progress/error states), detailSheet, deleteDialog, toast, emptyStates, skeleton, roleVariants (teacher vs principal), API contract (mock-first), a11y notes, responsive breakpoints.

**Pattern:** Same as DR-002 and DR-003 — ALREADY_IMPLEMENTED + only gap = design-spec.jsonc. Third confirmation of the pattern: later DRs in this batch should be checked for this before any design work.

**Why:** All four concurrent DRs (002–005) cover screens from 1506 handoff batch, all of which had already been fully implemented by /fe in parallel with the design authoring phase.

**How to apply:** For any pending DR, do the already-implemented check before opening a branch. If feature folder + route + i18n namespace all exist, it's a reconcile: only add the design-spec.jsonc entry.
