# 0054 Grades wiring contract remap — per-cell workflow, permanently-blocked admin batch oversight

Date: 2026-07-16

## Status

Accepted

## Context

US-E18.12 (epic E18-be-wiring) wires the `grades` feature to the real `core`
service. Ground-truthing `edu-api/services/core/docs/openapi.yaml`
(`GradeEntry`/`GradeReport` tags, lines ~2167–2609) plus the Go domain source
(`internal/assessment/core/domain/entity/grade_entry.go`,
`internal/assessment/core/domain/error/grade.go`) against the web's mock-first
model found drift far deeper than the epic table's "rất cao" label implied:

1. **Identity/granularity mismatch.** Web keys everything by an invented
   opaque `classSubjectId` ("csId") with a per-STUDENT-ROW `publishStatus`
   (`DRAFT`/`PENDING_APPROVAL`/`PUBLISHED`, one status per whole row across
   all columns). The real `GradeEntry` aggregate is keyed by
   `(classId, subjectId, termId, studentMemberId, columnId)` — status lives
   **per cell** (student × column), not per row, and not per class-subject.
2. **No "batch" concept exists on the wire at all.** `GradeApprovalBatch`
   (`className`/`subjectName`/`teacherName`/`studentCount`, one row per
   class-subject pending admin review) has zero wire representation — no
   `batchId`, no display-name fields (same recurring gap as cross-repo asks
   #6/#7/#9/#13), and **no tenant-wide "list entries pending approval"
   endpoint** — `GET /classes/{id}/subjects/{id}/terms/{id}/grades` requires
   already knowing the exact `(classId, subjectId, termId)` triple; there is
   no rollup across a school.
3. **No reject/revision-request capability at all.** Grade entry state
   machine (`grade_entry.go`) is `DRAFT → (PUBLISHED | PENDING_APPROVAL) →
   PUBLISHED → LOCKED`, strictly forward. There is no `reject` endpoint for
   `GradeEntry` (unlike `StudentConductGrade`, which does have one) — the
   web's `request-grade-revision` use-case has no BE equivalent whatsoever.
4. **Submit/lock/approve are real, per-cell/per-term operations** wired via
   `PUT .../grades/{studentId}/columns/{columnId}` (enter),
   `POST .../submit` (per cell), `POST .../approve` (per cell, ADMIN/MANAGER),
   `POST .../lock` (bulk, scoped to one `(classId,subjectId,termId)`). The
   `SUBMITTED` enum value is declared but dead code — `Submit()` always jumps
   straight to `PUBLISHED` (self-publish mode) or `PENDING_APPROVAL` (admin-
   approval mode), never sets `SUBMITTED`.
5. **Student/parent self-view is genuinely wireable** — `GET
   /members/{memberId}/grades` explicitly supports STUDENT-self / PARENT
   (linked, same `linked-students` port already wired in US-E18.11) /
   ADMIN / MANAGER, unlike timetable's blocked self-scope discovery (ask
   #15) — no classId is needed, only the studentMemberId.

## Decision

Split the feature's two repositories on wireability, matching the epic's
established "wire what's real, ground-truth + permanently-block what isn't"
pattern (US-E18.8 staff-leave, US-E18.9 teaching-plan):

- **`IGradesRepository` (teacher entry) + `IGradeBookRepository` (multi-role
  read) → wired REAL.** `classSubjectId` is retired at the repository
  boundary in favor of `(classId, subjectId, termId, academicYearLabel)`;
  `StudentScoreRow.scores` becomes a per-column `{ value, status }` cell map
  (status is per-cell, matching the wire) instead of a single row-level
  `publishStatus`. "Publish" is renamed **submit**: the teacher-facing action
  fans out `POST .../submit` over every DRAFT cell client-side (no bulk
  submit exists on the wire). Student/parent self-view wired via `GET
  /members/{memberId}/grades`.
- **`IGradeApprovalRepository` (admin batch oversight: list, detail, approve,
  request-revision, bulk-lock) stays a FORCE-MOCKED permanently-blocked
  stub**, regardless of `USE_MOCK` — the epic's third fully-blocked DI
  factory after `staff-leave.di.ts`/`teaching-plan.di.ts`. Reason: there is no
  way to resolve an invented `batchId` back to a real
  `(classId,subjectId,termId)` without the very tenant-wide list that doesn't
  exist; `request-revision` has zero wire equivalent; display fields
  (`className`/`subjectName`/`teacherName`/`studentCount`) don't exist. The
  real, ground-truthed `GRADE_ENTRY_*`/`GRADE_SCALE_*` error taxonomy (11
  codes, confirmed UPPER_SNAKE via `codeFromKey` in
  `pkg/kit/response/error.go`) is kept in the repository's dormant real-mode
  branch, unit-tested, for the day a rollup endpoint unblocks it (`approve`
  and `bulk-lock` themselves ARE per-cell/per-term real operations —
  only the batch list/detail source is missing).

## Alternatives Considered

1. Fan out a full-tenant scan (every class × every subject × every term,
   filtering client-side for PENDING_APPROVAL) to rebuild the batch list.
   Rejected — unbounded cost identical in shape to the roster/staff-leave
   fan-out gaps already rejected in US-E18.5/US-E18.8; no natural upper bound
   on class-subject-term combinations for a school.
2. Redesign the admin approval screen around the real per-cell granularity
   (drop "batch", show a flat pending-cell list) inside this US. Rejected —
   the screen has no data source to populate itself with even a flat list
   (still needs the missing tenant-wide query); redesigning UI with no real
   backing data would just move the mock one layer deeper. Left for a future
   US once cross-repo ask (below) lands.
3. Keep `classSubjectId` as a web-only concept, translating to
   `(classId,subjectId,termId)` via a lookup table maintained client-side.
   Rejected — no such mapping exists anywhere in the real domain; class and
   subject are already independent real ids (from `class-management`/
   `teacher-class`, both wired real since US-E18.4/US-E18.11), so composing
   them directly is simpler and doesn't invent a second identity system.

## Consequences

Positive:

- Teacher grade entry, multi-role grade book, and student/parent self-view
  — the highest-traffic, PII-bearing surfaces — run on the real contract.
- The permanently-blocked admin approval-list stays honest (mock, documented,
  ground-truthed error taxonomy ready) instead of a partially-real screen
  built on invented ids that would silently 404/produce wrong data.

Tradeoffs:

- Admin batch-oversight screen (`grade-approval-screen`) remains mock-first
  indefinitely — same category as staff-leave/teaching-plan. Term-level lock
  and per-cell approve, when invoked from a screen that already has direct
  `(classId,subjectId,termId)` context (e.g. a future admin grade-book action
  bar), are real-ready but have no current UI caller with that context.
- `GradeSheet`/`GradeBook` UI must render workflow status **per cell** now,
  not per row — a genuine (if scoped) UI change, gated through
  design-review + a11y like US-E18.10's `revise` state addition.

## Follow-Up

- Cross-repo ask (added to `EPIC-OVERVIEW.md` §Cross-repo requests): either
  (a) a tenant/school-wide "grade entries pending approval" rollup endpoint,
  or (b) a `reject`/`request-revision` transition for `GradeEntry` (mirroring
  `StudentConductGrade`'s reject) — needed before `grade-approval-screen` can
  wire real.
- US-E18.13 (academic-records seal) depends on this US's term-lock semantics
  (`UNLOCKED_GRADES_EXIST` on seal) — confirmed unaffected: seal reads
  `GradeEntryStatus` per the same real enum this decision wires.
