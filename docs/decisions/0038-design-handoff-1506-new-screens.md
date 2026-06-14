# 0038 Design Handoff 1506 — New Screen Baseline

Date: 2026-06-15

## Status

Accepted

## Context

On 2026-06-15 the design team delivered a second handoff folder:
`design_handoff_eduportal_2_1506`. This folder introduces 17 new or significantly
expanded design files relative to what the repo held from the 1406 handoff:

New files (not in design_src/edu/ before this ADR):
- exam.jsx            — Student exam: list + briefing + taking + results
- discipline.jsx      — Discipline screen (violations + conduct + leave) + student view
- messaging.jsx       — 2-pane messaging (Direct + Groups + chat window)
- notifications.jsx   — Notifications Center (type taxonomy + SSE fan-out + load-more)
- announcements.jsx   — Announcement composer (compose + preview + send pipeline)
- grade-entry.jsx     — Teacher grade entry (assessment scheme columns + state machine)
- gradebook.jsx       — Grade book multi-role view (teacher/principal/student/parent)
- grade-approval.jsx  — Admin grade approval pipeline (PENDING->PUBLISHED->LOCKED)
- academic-record-view.jsx — Hoc ba viewer (multi-year timeline, all roles)
- academic-records.jsx     — Admin academic record seal screen (bulk-seal + unseal)
- assessment.jsx      — Grade Scale + Assessment Scheme config (resolves DR-001)
- lesson-bank.jsx     — Lesson bank (teacher upload + manage, principal aggregate)
- exam-bank.jsx       — Exam bank + builder (teacher MCQ composer, admin view)
- teaching-plan.jsx   — Teaching plan / PPCT (compose + submit + approve/reject)
- staff-leave.jsx     — Staff leave management (admin approves teacher leave)
- audit-log.jsx       — Audit log (admin read-only, GDPR Nghi dinh 13/2023)
- admin-settings.jsx  — Admin operational settings (gradePublishMode)

Files already in the repo that were updated (1406 → 1506, enhanced or confirmed
identical; no structural regression detected on visual scan):
- exam.jsx was absent before; the 1506 version is the first shipped design.
- discipline.jsx was a 500-line placeholder in 1406; 1506 version is 935 lines with
  full DisciplineScreen, StudentDisciplineScreen, ViolationForm, ConductTab,
  LeaveManagementTab.
- messaging.jsx was absent before; the 1506 version (1807 lines) is the first design.

## Decision

1. All 17 new files are copied verbatim into `design_src/edu/` as the canonical
   design reference for their respective stories. They are authoritative in the same
   way as the 1406 files (decision 0021/0034 — visual/UX spec, not architecture).

2. `docs/product/screens.md` is updated to note the current design version as 1506
   and to add the new screen rows (design-ready status) for all affected stories.

3. New story packets are created for 16 User Stories across Epics E09, E10, E11,
   E12, E13, E14 (see TEST_MATRIX rows added 2026-06-15).

4. Previously design-pending stories are promoted to design-ready:
   - US-E12.6 / US-E14.1 (assessment scheme): resolved by assessment.jsx
   - US-E14.2 (grade entry): resolved by grade-entry.jsx

5. ADR 0037 governs the two-ADMIN unseal gate for US-E14.6 (high-risk).

6. The comparison baseline for future handoffs remains the ORIGINAL design source
   (design-spec.jsonc + screens.md as of each ADR), not the prior incremental
   handoff (consistent with ADR 0034 principle).

## Alternatives Considered

1. Treat 1506 as a separate design branch and keep 1406 files unmodified. Rejected:
   the 1506 files are additive (no regression to existing implemented screens) and
   the repo should always hold the latest normative design reference.

2. Defer new story definition until BE services are ready. Rejected: FE can implement
   mock-first (decision 0014); deferring spec work blocks planning and parallel work.

## Consequences

Positive:
- FE team can now pick up any of the 16 new stories using the design files in
  design_src/edu/ as the normative visual reference.
- DR-001 (assessment scheme design gap) is resolved.
- Full scope of the product is now specified at the story level.

Tradeoffs:
- 12 of the 16 new stories depend on BE services not yet built (mock-first).
  BE team must ship those services for production wiring.
- US-E14.6 (high-risk) requires ADR 0037 compliance in both FE and BE.

## Follow-Up

- FE team: pick up stories in dependency order (E09 and E10 can start immediately;
  E11/E13/E14 follow after E12 admin-core stories land).
- BA team: confirm staff-leave (US-E09.3) epic attribution — currently under E09
  (discipline-conduct) but staff leave is conceptually separate; revisit if the FE
  team signals a scope conflict.
- Review whether US-E12.12 (audit log) should be high-risk given GDPR requirements.
