---
name: be-core-academic-record-member-read
description: core's per-student academic-record read (US-064) — RBAC allow-list, wire shape, and the denormalized academicYear that killed the year-resolve fan-out
metadata:
  type: project
---

Ground-truthed 2026-08-07 in the local `edu-api` checkout (US-E18.54 review);
amended 2026-08-08 (US-E18.56 review) against
`docs/reports/2026-08-08-be-to-fe-response.md` §2.

**`GET /api/v1/members/{memberId}/academic-records`** (`ListStudentAcademicRecordsUseCase`):
- allow-list = `SUPER_ADMIN | isAdminOrManager | STUDENT-self | PARENT-linked`,
  plus **TEACHER homeroom-SCOPED** since BE ADR 0136 (ask #48, consumed by
  US-E18.57, reviewed 2026-08-08). The teacher grant is a FILTER, not a gate:
  BE narrows `records[]` to the classes the caller is the CURRENT GVCN of, and
  zero homeroom overlap returns **`200 { records: [] }`, never a 403**. So for a
  teacher, "empty" is a SUCCESS and must render the empty state, not the
  forbidden alert. `default: forbidden` still stands for everyone else, and a
  genuine 403 still maps to `forbidden` — don't let an un-block story weaken it.
  BE exposes NO signal separating "genuinely 0 records" from "0 authorized
  records"; both are `records: []`. Do not simulate one client-side (a probe
  would be a scope leak) — one hedged message must cover both readings.
- UNPAGINATED: `{studentMemberId, records: AcademicRecordResponse[]}` — no envelope
  pagination, so `raw:true` is correctly absent.
- `AcademicRecordResponse` = `(classId, termId, studentMemberId)` + `status`
  (`PENDING|SEALED|UNSEALED`) + `gradeSnapshot[]` + `termAverage` +
  `sealedAt/sealedBy/unsealReason/unsealedBy/unsealedAt` (all Go pointers with
  `omitempty` ⇒ **ABSENT, not null**) + `resealCount`.
  `coefficient`/`value`/`termAverage` are **decimal STRINGS**. No class name, no
  student identity, no conduct grade — the `(class, term)` aggregate is final.

**`academicYear` IS on the row now (ask #47 → BE US-204, migration 051).**
- Wire key is exactly **`academicYear`**, NOT `academicYearLabel` (that name
  belongs to other features: grades, teacher-class, class-management, enrollment).
  Easy to get wrong — the rest of the repo uses the `Label` suffix.
- Plain Go `string` + `omitempty` ⇒ absence arrives as **key-missing/undefined**,
  and `""` is unreachable from the wire. `orNull()` (`undefined → null`) is the
  right mapper for it.
- New seals always carry it. Pre-051 seals **heal lazily on THIS list read only**
  (best-effort; the single-record endpoint does NOT heal) ⇒ a genuinely old row
  can legitimately arrive with the field absent on its first read. That must
  degrade into the unresolved-year bucket, never be treated as an error.
- **This killed the `classId → academicYearLabel` enrollment fan-out**
  (`GET /classes/{classId}/students/{studentMemberId}`) that US-E18.54 built.
  Deleted in US-E18.56 along with `studentEnrollmentPath()`. Nothing in this app
  reads that path with GET any more — re-add a builder if a screen ever needs it.
- Historical: PARENT is in NO class-context read's allow-list, which is why the
  parent path used to degrade universally. That is now fixed at the source.

**`GET /subjects`** is readable by any authenticated member
(`ListSubjectsUseCase`, `subjListDefaultLimit = 50`, `subjListMaxLimit = 200`) —
that is what makes it the `subjectId → name` source for student/parent surfaces.
Any full drain of it should pass `limit: 200`. This is the ONE remaining
DI-composed collaborator on the viewer repository.
