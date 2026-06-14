---
name: project-1506-handoff
description: 1506 design handoff (2026-06-15) — 17 new design files, 16 new stories across 3 new epics + 4 existing epics, 2 ADRs
metadata:
  type: project
---

1506 handoff arrived 2026-06-15 at `/Users/vietthangpham/Downloads/design_handoff_eduportal_2_1506/`. All 17 new design files copied to `design_src/edu/`. Commit `661a7ea` on `main`.

**Why:** Design team completed the remaining major feature surfaces for the product. This handoff covers discipline/conduct, messaging, notifications, announcements, grade workflow (entry/approval/gradebook), academic records (hoc ba), lesson bank, exam bank, teaching plan, audit log, admin settings.

**How to apply:** Current design version = 1506. When new screens are requested, check `design_src/edu/` — all normative design files are now in the repo. ADR 0038 is the baseline record.

New epics created:
- E09-discipline-conduct: US-E09.1 (discipline screen), US-E09.2 (student conduct), US-E09.3 (staff leave)
- E10-communications: US-E10.1 (messaging), US-E10.2 (notifications), US-E10.3 (announcements)
- E11-lms-exams: US-E11.1 (student exam), US-E11.2 (lesson bank), US-E11.3 (exam bank), US-E11.4 (teaching plan)

New stories in existing epics:
- E12: US-E12.11 (admin settings — gradePublishMode REAL), US-E12.12 (audit log)
- E13: US-E13.6 (grade book multi-role)
- E14: US-E14.4 (grade approval), US-E14.5 (academic record viewer), US-E14.6 (HIGH-RISK seal, ADR 0037)

Design unblocked:
- US-E12.6 / US-E14.1 (assessment scheme): `assessment.jsx` now available — was design-pending (DR-001)
- US-E14.2 (grade entry): `grade-entry.jsx` now available

ADRs: 0037 (two-ADMIN unseal gate for E14.6), 0038 (1506 baseline)

All 16 stories registered in harness. All planned in TEST_MATRIX. exam.jsx + discipline.jsx + messaging.jsx (previously absent or placeholder in 1406) now fully specified.
