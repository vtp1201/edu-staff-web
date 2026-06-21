---
name: grades-e13-baseline
description: GradeBook feature (E13.6/E13.7) — existing contracts, repository interface, mock patterns, failure union
metadata:
  type: project
---

## US-E13.6 (implemented) — wired contracts

- Service: `core` (mock-first, decision 0014)
- Endpoint constant file: `src/bootstrap/endpoint/grades.endpoint.ts`
- `GRADES_EP.childGrades(childId)` → `/core/api/v1/parent/children/${childId}/grades`
- `GRADES_EP.myGrades` → `/core/api/v1/students/me/grades`
- `GRADES_EP.gradeBook(csId)` → `/core/api/v1/class-subjects/${csId}/gradebook`
- Repository interface: `IGradeBookRepository` at `src/features/grades/domain/repositories/i-grade-book.repository.ts`
  - Methods: `getGradeBook(csId, term)`, `getMyGrades(term)`, `getChildGrades(childId, term)`
- Mock: `MockGradeBookRepository` at `src/features/grades/infrastructure/repositories/mocks/grade-book.mock.repository.ts`
  - `getChildGrades` currently returns a single static row (MOCK_GRADE_BOOK_ROWS[1]) regardless of childId
  - US-E13.7 must make this childId-aware (dispatch on childId to return different per-child datasets)
- `GradeBook` entity: `src/features/grades/domain/entities/grade-book.entity.ts`
- `GradesFailure` union: `not-found | forbidden | score-out-of-range | already-published | incomplete-scores | network-error | unknown | not-pending-approval | not-published | invalid-revision-note | batch-locked`
- ViewModel: `GradeBookScreenVM` at `src/features/grades/presentation/grade-book-screen/grade-book-screen.i-vm.ts`
  - Does NOT yet have a `childrenList` field — US-E13.7 adds this

## US-E13.7 — new integration need

- `childrenList: { childId, name, className }[]` required to render `ChildSwitcher`
- `activeChildId` is local UI state only — not a server session claim
- No `GET /parent/children` endpoint exists in any registered endpoint constant file
- Best-fit service is ambiguous: `iam` (user/member data) vs `core` (enrollment/class records)
- Story Design Notes assert this comes from "parent profile/session claim" — unresolved; flag as OPEN QUESTION
- Mock seed: `VIEWER_CHILDREN` in `design_src/edu/gradebook.jsx` line 404
  - `[{ id: 'c1', name: 'Nguyễn Minh Khoa', avatar: 'NK', color: T.primary, classId: '11A2' }, { id: 'c2', name: 'Nguyễn Thu Hà', avatar: 'NH', color: T.success, classId: '8B1' }]`

**Why:** core service not built; iam has no parent/children endpoint registered. Neither confirmed.
**How to apply:** always flag child-list endpoint as mock-first until edu-api confirms service placement. MockGradeBookRepository.getChildGrades must be made childId-aware for US-E13.7.
