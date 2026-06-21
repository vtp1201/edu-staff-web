---
name: dr-010-reconcile-pattern
description: Handoff-readiness spec gap closure for E13.7/E09.4/E11.5 — design-spec was the only gap; 14 new i18n keys for E11.5
metadata:
  type: project
---

DR-010 (docs/dr-010-handoff-readiness) — pre-handoff gap closure session for 4 groups:

**E16.1–E16.5 (DR-009):** Fully delivered. Design-spec updates were inline scatter-patches to
existing sections (not a top-level E16 block) — that is the correct approach for retrofit fixes.
Commits: da31df8..8f5177b. No gaps.

**E13.7 (gradeBook ChildSwitcher):** design_src/edu/gradebook.jsx had ChildSwitcher (~line 1081)
and VIEWER_DATA_BY_CHILD (~line 367). design-spec.jsonc had ChildSwitcher mentioned inline in
gradeBook.parent.extras but no component-level spec. Gap: added gradeBook.parent.childSwitcher
full spec (layout, button states, a11y tablist/tab/tabpanel, keyboard, states).
i18n: gradeBook.childSwitcherLabel added to vi + en. No new tokens needed.

**E09.4 (ParentDisciplineScreen):** design_src/edu/discipline.jsx had full ParentDisciplineScreen
(~line 969). discipline i18n had discipline.studentConduct.* covering parent view. design-spec.jsonc
discipline section had NO parent variant. Gap: added discipline.parent full spec (childSelector,
conductCard, violationHistory, leaveRequestForm, leaveHistory, states, a11yNotes). No new i18n keys
needed (keys already existed under discipline.studentConduct).

**E11.5 (Mixed Exam / submitted_pending_essay):** design_src/edu/exam.jsx had full
submitted_pending_essay handling (~lines 620–728). exams.result design-spec had only base E11.1
spec. Gap: added exams.result.mixedExamPendingEssay with all sub-sections. 14 new i18n keys
added (exam.status.submittedPendingEssay, exam.cta.viewPendingResult, exam.filter.pendingEssay,
exam.briefing.mixedType/mixedTypeValue/essayGradingNote, exam.result.mcqLabel/partialResultBadge/
pendingEssayTitle/pendingEssayBody/essayPending/essayQuestionLabel, exam.taking.essayPlaceholder/
essayCharCount/essayEmptyWarning).

**Gate:** 839/839 tests pass; bun run build green (tsc 0 errors). Merged commit 41eaf34.

**Why:** design-spec.jsonc is the normative contract /ba reads for AC and /fe reads for implementation.
Missing entries = /ba and /fe must guess from design_src/*.jsx without a structured spec reference.

**How to apply:** Before handing off any group to /ba, verify design-spec.jsonc has a dedicated
spec entry (not just inline mentions). If missing, close the gap on a docs/dr-* branch.
i18n keys: only add what the design_src mockup actually needs that isn't already in messages/*.json.
