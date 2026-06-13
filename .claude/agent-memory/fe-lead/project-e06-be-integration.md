---
name: project-e06-be-integration
description: E06 BE Integration epic status — which stories are done and what was wired
metadata:
  type: project
---

E06 BE Integration epic wires real BE through Kong gateway (ADR 0030, base URL decision).

**Why:** core/iam/lms services were mock-first (decision 0014); E06 lifts the mocks story-by-story.

**Status as of 2026-06-14:**
- US-E06.3 (Kong base URL): implemented
- US-E06.4 (IAM member/invitation): implemented
- US-E06.5 (core school+calendar): implemented
- US-E06.6 (core subject-catalogue): implemented — SubjectCatalogueRepository error-code mapping + cursor-pagination; ClassSubject wired
- US-E06.7 (core student-roster): implemented — RosterRepository two-step transfer; ROSTER_STUDENT_ALREADY_ENROLLED mapping
- US-E06.8 (core staffing): implemented — new feature module src/features/admin/staffing/; 3 entities (Department, PositionTitle, PositionAssignment); 10-variant StaffingFailure union; 6 use-cases (archive guards, MANAGE_SUBJECT_CONTENT scope constraint, assign-position with injected academicYearIsActive bool); StaffingRepository real + mock; staffing.endpoint.ts; staffing.di.ts; 32 new tests (18 unit + 14 integration); 284 total pass; no UI — screens.md updated as planned

**E06 epic COMPLETE.** All 6 stories implemented. Next epic needing wiring work: none remaining in E06.

**How to apply:** E12 has US-E12.6 (planned but design-blocked) and US-E12.9 (no packet). E07.6/E08.4 may be in chore/sync-matrix branch already. Check `git branch -a` and matrix before picking next.
