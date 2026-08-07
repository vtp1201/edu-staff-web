---
name: be-core-academic-record-member-read
description: core's per-student academic-record read (US-064) — RBAC allow-list, wire shape, and the class-context read that is the ONLY student-readable year source
metadata:
  type: project
---

Ground-truthed 2026-08-07 in the local `edu-api` checkout (US-E18.54 review), not
just openapi.

**`GET /api/v1/members/{memberId}/academic-records`** (`ListStudentAcademicRecordsUseCase`):
- allow-list = `SUPER_ADMIN | isAdminOrManager | STUDENT-self | PARENT-linked`,
  then `default: forbidden`. **TEACHER is absent** → `/teacher/students/[id]/academic-record`
  renders `forbidden` in real mode, permanently, until ask #48 lands. Don't read that
  route as working.
- UNPAGINATED: `{studentMemberId, records: AcademicRecordResponse[]}` — no envelope
  pagination, so `raw:true` is correctly absent.
- `AcademicRecordResponse` = `(classId, termId, studentMemberId)` + `status`
  (`PENDING|SEALED|UNSEALED`) + `gradeSnapshot[]` + `termAverage` +
  `sealedAt/sealedBy/unsealReason/unsealedBy/unsealedAt` (all Go pointers with
  `omitempty` ⇒ **ABSENT, not null**) + `resealCount`.
  `coefficient`/`value`/`termAverage` are **decimal STRINGS**. No year, no class
  name, no student identity, no conduct grade — BE says the `(class, term)`
  aggregate is final FOREVER (no year-grouping on the wire, ever).
- Error codes: `academic_record_forbidden`/`_not_found` in Go, upper-cased by
  `pkg/kit/response/error.go` (`strings.ToUpper`) ⇒ **UPPER_SNAKE on the wire**.

**Year join — only one endpoint works for a STUDENT.**
`GET /classes/{classId}/students/{studentMemberId}` (`GetStudentEnrollmentUseCase`)
allows ADMIN/SUPER_ADMIN/MANAGER + TEACHER assigned + **STUDENT-self**, and carries
`academicYearLabel`. `GET /classes/{classId}` is ADMIN/MANAGER/assigned-TEACHER only.
**PARENT is in NEITHER** — a parent can never resolve a year for a linked child
(ask #47: denormalize `academicYear` onto the record row; BE pre-offered it).
So the parent path legitimately degrades to an "unresolved year" bucket.

**`GET /subjects`** is readable by any authenticated member
(`ListSubjectsUseCase`, `subjListDefaultLimit = 50`, `subjListMaxLimit = 200`) —
that is what makes it the `subjectId → name` source for student/parent surfaces.
Any full drain of it should pass `limit: 200`.
