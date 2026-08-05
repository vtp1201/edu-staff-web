# US-E18.40 Teachers screen repoint (#44 = option b) + subject-assignments compose

## Status

in-progress

## Lane

normal

## Dependencies

- Depends on: none (BE US-144 already shipped/consumed via US-E18.23; BE US-181 already merged `edu-api` main)
- Blocks: none
- Feature module(s) chạm: `src/features/principal/` (teachers sub-feature), `src/bootstrap/di/principal-teachers.di.ts`, `src/bootstrap/endpoint/class.endpoint.ts`
- Shared contract/file: `iam-directory`'s `SearchMembersUseCase` (already the app's single directory client — reuse, do not fork), `CLASS_EP`

## Ground truth (fe-lead, verified before delegating)

`docs/reports/2026-08-04-be-to-fe-response.md` §"#44": `GET /core/api/v1/teachers`
will NOT be implemented (option b). FE must repoint to IAM member directory:
`GET /iam/api/v1/tenants/{tenantId}/members?role=TEACHER` (US-144, already
shipped and already consumed elsewhere via `iam-directory`'s
`SearchMembersUseCase` — see `src/bootstrap/di/class-management.di.ts`'s
`makeClassManagementRepository()` for the EXACT precedent: it composes
`makeSearchMembersUseCase()` with `role: "TEACHER"` and a server-derived
`tenantId` from the token claim).

`docs/reports/2026-08-05-be-to-fe-response.md` §"#44 follow-up → US-181": new
route `GET /core/api/v1/classes/{classId}/subject-assignments` (ADMIN/
SUPER_ADMIN/MANAGER, or a TEACHER assigned to that class) → `data:
SubjectAssignmentResponse[]`, shape `{classId, subjectId, teacherMemberId,
assignedAt, assignedBy}`, unpaginated (≤~15 rows/class), empty class → `[]`.
**This is a NEW path segment** (`/subject-assignments`), distinct from
`GET /classes/{id}/subjects` (curriculum `ClassSubject` listing, US-057,
unrelated — `CLASS_EP.classSubjects` must NOT be reused for this). No
tenant-wide compose endpoint exists — "môn dạy / số lớp phụ trách" per teacher
must be derived client-side by composing per-class reads and grouping by
`teacherMemberId`.

## Current state (read before touching anything)

`src/features/principal/infrastructure/teachers/repositories/principal-teachers.repository.ts`:
- `listTeachers()` hits `CLASS_EP.principalTeachers` (`/core/api/v1/teachers`)
  — dead path, always errors in real mode. **THIS is what must repoint.**
- `listClasses()` hits `CLASS_EP.classes` — already real + enriched with
  `studentCount`/`homeroomTeacherId`/`homeroomTeacherName` since US-E18.30
  (comment in the file itself confirms this). Reuse this for homeroom
  derivation — do NOT add a second classes fan-out.
- `getClassSubjects(classId)` hits `CLASS_EP.classSubjects` — this is the
  CURRICULUM ClassSubject listing (US-057), genuinely unrelated to
  subject-assignments. Leave it untouched unless you find it's dead code once
  the screen is repointed (check callers first).
- `assignHomeroomTeacher`/`assignSubjectTeacher` — mutation endpoints, NOT
  ground-truthed by this BE batch. Leave their behavior/wire calls unchanged;
  only touch them if the teacherId TYPE changes (IAM `memberId === userId`
  per ask #7's resolution note, so no type change expected — confirm, don't
  assume).
- `PrincipalTeacher` entity (`principal-teacher.entity.ts`): `teacherId`,
  `displayName`, `email`, `primarySubjectName`, `homeroomClassId/Name`,
  `subjectAssignments: SubjectAssignment[]` (`classSubjectId, classId,
  className, subjectId, subjectName, hasConflict`), `status`.
- `bootstrap/di/principal-teachers.di.ts` — plain `USE_MOCK ? Mock : Real`
  gate already (no hybrid needed here structurally, but `listTeachers` never
  actually returns anything usable in real mode today).

## Scope

1. **Repoint `listTeachers()`** off `CLASS_EP.principalTeachers` onto the IAM
   directory, following `class-management.di.ts`'s exact composition pattern:
   inject a `SearchMembersUseCase`-backed callback into
   `PrincipalTeachersRepository`'s constructor (mirror how
   `ClassManagementRepository` takes a callback, NOT the raw use-case, to keep
   the repository's own domain-facing signature simple — check that file for
   the shape). Remove `CLASS_EP.principalTeachers` from `class.endpoint.ts`
   once nothing references it (grep first).
   - `MemberListItem`/`MemberBatchItem` (whichever `SearchMembersUseCase`
     returns) has `displayName`/`email`/`roles`, NOT `status`
     (ACTIVE/ON_LEAVE) or subject/homeroom fields — map what's available,
     decide (and document) what `status` becomes (IAM has no leave-status
     concept on this endpoint; check if `MemberListItem` has a `status` field
     at all — it does per US-E18.23's notes, ground-truth it) and what
     happens to `primarySubjectName`/`homeroomClassId/Name`/
     `subjectAssignments` (populated by step 2, or `null`/`[]` if step 2 is
     out of budget for a given teacher).
2. **Compose subject-assignments** for "môn dạy / số lớp phụ trách": for each
   class in the already-real `listClasses()` result, call
   `GET /classes/{classId}/subject-assignments` (NEW endpoint, add to
   `CLASS_EP`), group all returned rows by `teacherMemberId`, and populate
   `subjectAssignments`/`primarySubjectName` per teacher. Homeroom
   (`homeroomClassId/Name`) is already derivable from `listClasses()`'s
   enriched `homeroomTeacherId`/`homeroomTeacherName` fields — match by
   `teacherId === homeroomTeacherId`, no extra call needed.
   - **Bound the fan-out.** This is a per-class fan-out over the tenant's
     FULL class list (not paginated further per BE's note — unpaginated
     response per class, ≤15 rows). If the tenant's class count is large,
     this is N calls on every screen load. Pick and document an explicit
     bound (e.g. if `classes.length` exceeds some threshold you choose,
     degrade `subjectAssignments`/`primarySubjectName` to empty/null rather
     than fan out unboundedly — never block the teacher list itself on this).
     State the exact number you chose and why in the story's Evidence.
   - `SubjectAssignmentResponse` has no `subjectName`/`className` — resolve
     `subjectName` via whatever subject lookup the app already has (check
     `assessment-scheme`/`subject-catalogue` feature for an existing
     subject-by-id resolver before inventing a new HTTP call); `className`
     already available from the `listClasses()` result you're iterating.
   - `hasConflict` on `SubjectAssignment` has no wire source at all
     (`SubjectAssignmentResponse` doesn't carry it) — decide: drop the field,
     always `false`, or keep as a client-only concept with a code comment
     explaining it's decorative. Do NOT invent a conflict-detection endpoint
     call.
3. Update the mock repository to mirror the NEW real shape/behavior
   (`MockPrincipalTeachersRepository` should keep working with
   `USE_MOCK=true`, but its data should not contradict what the real
   composition can actually produce — e.g. don't keep hand-authored
   `status: "ON_LEAVE"` teachers if the real source has no such concept and
   you decided to always show `"ACTIVE"`).
4. Error mapping: `toFailure()` in the repository currently branches on
   `TEACHER_ASSIGNMENT_CONFLICT`/`TIMETABLE_CONFLICT` — these were guessed for
   the old dead endpoint; re-ground-truth against `subject-assignments`'s
   actual error surface (`services/core/docs/{openapi.yaml,ERROR_CODES.md}`)
   and the IAM directory's error surface (already-ground-truthed via
   `iam-directory`'s own failure mapping — reuse, don't re-derive) instead of
   assuming the old codes still apply.
5. `ensureFreshSession()` — confirm `principal-teachers.di.ts`'s `makeRepo()`
   wires it before `createServerHttpClient()` in the real branch (playbook
   step 6, decision 0018) — it currently does NOT appear to, add it if
   missing.

## NOT in scope

- `getClassSubjects` (curriculum ClassSubject, US-057) — untouched.
- `assignHomeroomTeacher`/`assignSubjectTeacher` mutation wire calls — leave
  as-is unless you find the id-type actually changed (unlikely, note if so).
- Any new design/UI beyond what's needed to render whatever fields you decide
  to populate vs. drop — no new component, this is a data-source swap.

## Acceptance Criteria

- Real mode: teachers screen lists real TEACHER-role members from the IAM
  directory (no more dead-endpoint failure).
- Real mode: "môn dạy / số lớp phụ trách" populated from composed
  subject-assignments where within the documented bound; gracefully empty
  (not crashing/erroring the whole screen) beyond the bound.
- `USE_MOCK=true` unchanged behavior contract (mock updated to match the new
  real shape's honest capabilities, not a richer fantasy shape).
- Zero regression on `assignHomeroomTeacher`/`assignSubjectTeacher` mutation
  flows (unchanged).

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | repository composition test (mock `SearchMembersUseCase` + subject-assignments fan-out, verify grouping/bounding logic), mapper test |
| Integration | repository contract test against the ground-truthed error taxonomy |
| E2E | none new unless UI surface for the bound-degraded state needs a Storybook case |
| Platform | `bun vitest run` zero-regression, `bun run build` mock+real |
| Release | merged to main, branch deleted |

## Harness Delta

- TEST_MATRIX row for teachers screen real-mode.
- Close ask #44 in the FE→BE report.
- EPIC-OVERVIEW.md Wave 6 row.

## Evidence

### Fan-out bound: **40 classes** (`MAX_SUBJECT_ASSIGNMENT_FANOUT`)

Exported from `principal-teachers.repository.ts` (so the tests assert against the
constant, not a copy). Rationale:

- covers a realistic Vietnamese school — 3 grade levels × ~12 classes = 36;
- `listTeachers()` fans out over `listClasses()`, which reads exactly ONE page of
  `GET /classes`; core's page size is default **20**, max **100**
  (`list_classes.go`), so 40 is 2× today's real ceiling and is only reachable if
  a future caller raises `limit`;
- past it, ONE RSC render would issue >40 blocking upstream calls on top of the
  IAM directory drain and the `GET /subjects` drain.

Beyond the bound the composition degrades to **homeroom-only** (free — it comes
from the class list itself) with `subjectAssignments: []` /
`primarySubjectName: null`. The teacher roster is never blocked on the
enrichment: a class-list failure, a per-class 403 and a subject-catalogue failure
each degrade only what they cover. Proven by call-count tests at exactly 40 and
at 41 classes.

### Decisions on fields with no wire source

| Field | Decision |
| --- | --- |
| `SubjectAssignment.hasConflict` | **DELETED** (entity, DTO, table badge, sheet tooltip, `sheet.conflictWarning` i18n key). No read carries it; conflicts are a write-time `409 TIMETABLE_TEACHER_CONFLICT` owned by the timetable feature. Keeping an always-`false` flag would have been dead, misleading UI. |
| `SubjectAssignment.classSubjectId` | **DELETED**. An assignment is keyed by `(classId, subjectId)` (BE allows one teacher per pair); the curriculum `ClassSubject` uuid is a different aggregate. React keys use the composite. |
| `SubjectAssignment.subjectName` | `string \| null` — resolved from ONE `GET /subjects` drain (any authenticated member may read it, `list_subjects.go`); unresolvable → `null` → `table.unknownSubject` placeholder, **never** the raw uuid. |
| `PrincipalTeacher.primarySubjectName` | **DERIVED** (most-taught resolvable subject, ties alphabetical) and documented as a display summary, not an authority — neither IAM nor core has such a field. |
| `PrincipalTeacher.status` | `MemberListItem.status` DOES exist → `ACTIVE \| INACTIVE \| SUSPENDED`. `ON_LEAVE` deleted everywhere (screen tone map, timetable `teacher-picker.tsx`, i18n, mock, stories) — IAM has no leave concept, so that badge was fiction. `LEFT` is impossible (BE excludes LEFT from the directory list). |

### Two real bugs found while ground-truthing (fixed here)

`assignHomeroomTeacher` and `assignSubjectTeacher` sent `{ teacherId }`, but
`AssignHomeroomRequest`/`AssignSubjectTeacherRequest` require
`{ teacherMemberId }` (`required,uuid` — verified in core's Go http dto, not just
`openapi.yaml`). Every real-mode write would have been rejected. The VALUE is
unchanged (IAM `memberId === userId`), only the field name was wrong — so the
story's "only touch if the id TYPE changes" condition did not anticipate this
class of break.

### Out-of-scope gap discovered (NOT fixed — needs its own story)

`getClassSubjects()` maps a DTO no core endpoint returns:
`GET /classes/{id}/subjects` answers `ClassSubjectResponse`
(`classSubjectId`, `lockedFields.subjectName`, `status`, cursor-paginated), not
`{id, classId, subjectId, subjectName, teacherId, teacherName}`. The assignment
sheet's GVBM subject picker is therefore broken in real mode independently of
this repoint. `subject-assignments` (added here) + `lockedFields.subjectName`
would fix it in one pass — precedent for the join already exists in
`bootstrap/lib/resolve-my-grade-subjects.ts`.

### Proof (run in this worktree)

- `bun vitest run` → **478 files / 3580 tests pass** (zero regression).
- `bun vitest --config vitest.storybook.mts run` on the two touched story files
  → **23/23 pass**.
- `bunx tsc --noEmit` → clean. `bun lint` → clean.
- `bun run build` → green with `NEXT_PUBLIC_USE_MOCK` unset (real) AND `=true`.

New/changed tests: `principal-teachers.repository.test.ts` (29),
`principal-teachers.mapper.test.ts` (10), `principal-teachers.di.test.ts` (7,
new env-matrix + port-pinning proof).

### Known limitation

Enrichment failures degrade **silently**: a class-list outage or a per-class 403
renders the same "Chưa phân công" as a genuinely unassigned teacher. Signalling
it (US-E13.9's `failedClassCount` precedent) needs an aggregate return type on
`IPrincipalTeachersRepository.listTeachers()`, rippling into the use-case, VM,
page and i18n — deliberately not done inside this story's scope.
