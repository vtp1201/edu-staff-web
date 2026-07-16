# US-E18.12 Grades contract remap — per-cell entry/submit + term lock, permanently-blocked admin batch oversight

## Status

planned

## Lane

high-risk

(hard-gate flags: data-loss-adjacent — term `lock` is irreversible; PII —
student grades; weakening-validation risk if state-machine transitions are
mis-mapped. See `docs/decisions/0054-grades-wiring-contract-remap.md`.)

## Dependencies

- Depends on: US-E18.7 (assessment-scheme + grade-scale wiring — real,
  provides the scheme/scale grade entry validates against), US-E18.1
  (calendar — `resolveCurrentTermId` term resolution), US-E18.11 (timetable —
  precedent for composing `GET /classes` real listing; `ensureFreshSession`
  pattern).
- Blocks: US-E18.13 (academic-records seal — depends on this US's term-lock
  semantics, `UNLOCKED_GRADES_EXIST` on seal).
- Feature module(s) chạm: `src/features/grades/**` (domain entities/failures/
  use-cases rewritten for per-cell status; infra dtos/mappers/repositories
  rewritten; presentation — grade-entry-screen + grade-book-screen get a
  per-cell status affordance, grade-approval-screen unchanged/stays mock),
  `src/bootstrap/di/grades.di.ts` (+ `ensureFreshSession`), `src/bootstrap/
  endpoint/grades.endpoint.ts` (full remap), new `src/bootstrap/lib/
  resolve-my-grade-subjects.ts` (compose real class-subject picker, mirrors
  `resolve-current-term.ts` precedent), the 6 route pages under
  `src/app/[locale]/t/[tenant]/(app)/{teacher,admin,principal,student,parent}/
  grade*/`.
- Shared contract/file: `messages/{vi,en}.json` `grades.*` namespace — reuse
  existing keys, add only genuinely new ones (per-cell status labels,
  submit/lock actions, new error codes). Solo mode confirmed via
  `git fetch --prune` (remote has only `origin/main`).

## Product Contract — ground-truthed against `edu-api`

Ground-truthed `services/core/docs/openapi.yaml` (`GradeEntry`/`GradeReport`
tags, ~L2167–2609) + Go domain source
(`internal/assessment/core/domain/entity/grade_entry.go`,
`internal/assessment/core/domain/error/grade.go`,
`pkg/kit/response/error.go`'s `codeFromKey`) against the current mock model.
Full analysis + decision in **ADR `0054`**. Summary:

### 1. Identity/granularity remap

| Web (old, invented) | Real (`core`) |
| --- | --- |
| Opaque `classSubjectId` ("csId") | `(classId, subjectId, termId, academicYearLabel)` — independent real ids |
| Row-level `publishStatus` (DRAFT/PENDING_APPROVAL/PUBLISHED) | **Per-cell** `GradeEntryStatus` (DRAFT/SUBMITTED-dead/PENDING_APPROVAL/PUBLISHED/LOCKED), keyed `(studentMemberId, columnId)` |
| `publishGrades(csId, term)` (bulk, whole sheet) | `POST .../grades/{studentId}/columns/{columnId}/submit` (per cell; no bulk submit exists) |
| `GradeApprovalBatch` (one row per class-subject pending review, admin dashboard) | **No wire equivalent at all** — no batchId, no display fields, no tenant-wide pending-approval rollup |
| `requestGradeRevision` (reject batch → DRAFT) | **No wire equivalent** — `GradeEntry` state machine is strictly forward, no reject transition (unlike `StudentConductGrade`, which has one) |

### 2. Real endpoints wired

| Operation | Method + path | Actor |
| --- | --- | --- |
| Enter/update grade | `PUT /classes/{classId}/subjects/{subjectId}/terms/{termId}/grades/{studentId}/columns/{columnId}` | TEACHER (assigned) |
| Submit grade | `POST .../grades/{studentId}/columns/{columnId}/submit` | TEACHER (assigned) |
| Approve grade | `POST .../grades/{studentId}/columns/{columnId}/approve` | ADMIN/MANAGER |
| Lock term | `POST /classes/{classId}/subjects/{subjectId}/terms/{termId}/lock` | ADMIN/MANAGER |
| List grades (class view) | `GET .../grades?year=` | TEACHER (assigned)/ADMIN/MANAGER |
| Student self / parent-linked grades | `GET /members/{memberId}/grades?year=` | STUDENT-self/PARENT(linked)/ADMIN/MANAGER |

State machine (ground-truthed, `grade_entry.go`): `DRAFT → (PUBLISHED |
PENDING_APPROVAL) → PUBLISHED → LOCKED`. Strictly forward. `SUBMITTED` enum
value is dead code (`Submit()` never sets it — jumps straight to PUBLISHED
self-publish or PENDING_APPROVAL admin-approval mode). No reject transition.

### 3. Scope split (per ADR 0054)

**Wired REAL:**
- `IGradesRepository` (teacher entry) — enter/submit/list, per-cell status.
- `IGradeBookRepository` (read-only multi-role) — teacher/admin/principal via
  `listGrades`; student self + parent-linked via `getStudentGrades`
  (`/members/{id}/grades`) — genuinely wireable (unlike timetable's blocked
  self-scope discovery, ask #15 — this endpoint needs only the studentMemberId,
  no classId).
- Class-subject picker: new `resolve-my-grade-subjects.ts` composes the
  already-real `teacher-class`/`class-management` listings (`GET /classes`
  role-filtered + per-class `GET .../subjects`) into real
  `(classId, subjectId, subjectName, className)` tuples — no separate
  teacher-subject-assignment list endpoint exists, so this is an
  over-inclusive picker (may list subjects in a class the teacher isn't
  individually assigned to); the entry endpoint's own
  `403 GRADE_ENTRY_TEACHER_NOT_ASSIGNED` gate is the actual authority.

**STAYS MOCK-FIRST PERMANENTLY (force-mock regardless of `USE_MOCK`,
matching US-E18.8/US-E18.9's blocked-stub pattern):**
- `IGradeApprovalRepository` (admin batch-list/detail/approve/request-revision/
  bulk-lock dashboard) — no batchId resolution path, no display fields, no
  tenant-wide pending-approval rollup, and `request-revision` has zero wire
  equivalent. Ground-truthed real error taxonomy (11 `GRADE_ENTRY_*`/
  `GRADE_SCALE_*` codes) kept in the repository's dormant real-mode branch,
  unit-tested, for when a rollup endpoint unblocks it (cross-repo ask below).
- `get-child-list` (parent child-switcher, `ChildSummary` needs name/avatar/
  className) — `GET /members/{id}/linked-students` (`LinkedStudentsResponse`)
  carries no display fields at all (same recurring gap as asks #6/#7/#9/#13,
  and identical to timetable's already-accepted blocked `getChildren`, ask
  #15 — **confirms the pattern a 6th time**, for parent role generally, not
  just per-feature). `getChildGrades(childId, term)` itself (once a childId is
  known) is real-wireable via the same `getStudentGrades` call as self-view —
  only the switcher/picker is blocked.

## Error taxonomy (ground-truthed, `pkg/kit/response/error.go: codeFromKey`
UPPER_SNAKE confirmed — same as US-E18.7/E18.8/E18.9/E18.11)

| Failure type | HTTP | Code |
| --- | --- | --- |
| `forbidden` | 403 | `GRADE_ENTRY_FORBIDDEN`, `GRADE_ENTRY_TEACHER_NOT_ASSIGNED` |
| `not-found` | 404 | `GRADE_ENTRY_NOT_FOUND` |
| `invalid-value` | 400 | `GRADE_ENTRY_INVALID_VALUE` |
| `not-draft` | 409 | `GRADE_ENTRY_NOT_DRAFT` |
| `not-pending-approval` | 409 | `GRADE_ENTRY_NOT_PENDING_APPROVAL` |
| `not-published` | 409 | `GRADE_ENTRY_NOT_PUBLISHED` |
| `locked` | 409 | `GRADE_ENTRY_LOCKED` |
| `scale-not-configured` | 422 | `GRADE_SCALE_NOT_CONFIGURED` |
| `scheme-not-configured` | 422 | `ASSESSMENT_SCHEME_NOT_CONFIGURED` |
| `column-not-in-scheme` | 400 | `GRADE_ENTRY_COLUMN_NOT_IN_SCHEME` |
| `student-not-enrolled` | 400 | `GRADE_ENTRY_STUDENT_NOT_ENROLLED` |
| `network-error` | ≥500 / transport | — |
| `unknown` | fallback | — |

`GRADE_ENTRY_NOT_SUBMITTED` (409) exists in the doc but has no reachable
trigger from the web (no path drives an entry through `SUBMITTED`) — map it
defensively to `not-draft`-adjacent fallback, documented as dead in practice.

## Design Notes (workflow-state UI — design-review + a11y gate applies)

Per-cell status replaces row-level `publishStatus`. `fe-state-engineer` +
`fe-component-architect` own the concrete contract; constraints to honor:

- `StudentScoreRow.scores` becomes `Record<columnId, { value: number | null;
  status: GradeEntryStatus }>` (was `Record<columnId, number | null>`).
- A derived row-level badge is still useful for scanning a class roster at a
  glance — define it as a pure function over the row's cell statuses (e.g.
  "all cells LOCKED" → locked; "any cell DRAFT" → draft/incomplete; etc.) —
  do NOT invent a second server-side status.
- The "submit" action (was "Publish") fans out `submit` over every DRAFT cell
  in view — no bulk endpoint exists. Surface partial-failure clearly (some
  cells may 409 `GRADE_ENTRY_NOT_DRAFT` if raced) — do not silently swallow.
- Status is never color-only (accessibility.md) — icon/label pairing required
  per cell state (5 states: draft/pending-approval/published/locked, plus the
  dead `submitted` treated as an alias of pending-approval if ever seen).
- Term lock stays a distinct, explicit, confirmable action (irreversible per
  the real state machine — `LOCKED` has no way back) — reuse the existing
  destructive-confirm pattern (`DestructiveConfirmDialog`, per
  `component-organization.md` — do not fork a new confirm dialog).

## Cross-repo findings (append to `EPIC-OVERVIEW.md` §Cross-repo requests)

18. **(US-E18.12, 2026-07-16)** No tenant/school-wide "grade entries pending
    approval" rollup exists — `GET .../grades` requires an already-known
    `(classId,subjectId,termId)` triple. The admin batch-oversight dashboard
    (`grade-approval-screen`) has no way to populate itself. Ask: either (a) a
    rollup endpoint (e.g. `GET /tenants/{id}/grade-entries?status=
    PENDING_APPROVAL`), or (b) accept this stays mock-first indefinitely.
19. **(US-E18.12, 2026-07-16)** No reject/request-revision transition exists
    for `GradeEntry` (unlike `StudentConductGrade`, which has one). Ask: add a
    `PENDING_APPROVAL → DRAFT` (or `→ REJECTED`) transition mirroring the
    conduct-grade reject flow, if admin-requested revision is a real product
    requirement.
20. **(US-E18.12, 2026-07-16) [confirms #6/#7/#9/#13/#15's premise a 6th
    time]** `LinkedStudentsResponse` (`GET /members/{id}/linked-students`)
    carries zero display fields (no student name/class) — same class of gap
    across every "list linked/related entities" endpoint audited so far in
    this epic. The parent child-switcher (grades AND timetable, both) stay
    mock-first until either IAM ships a batch profile lookup (ask #6/#7) or
    this endpoint is denormalized with a display name + current class.

## Design Source

No new screen. Existing screens keep their layout; only the per-cell status
affordance (badge/icon set) and the submit/lock actions change semantics —
subject to design-review + a11y gate like US-E18.10's `revise` state.
