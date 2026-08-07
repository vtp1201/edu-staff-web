# US-E18.54 Academic-records viewer remodel via member-read + client-side year grouping (BE, confirms US-064)

## Status

implemented

## Lane

normal

> Genuinely large model remap (same class as US-E18.7/ADR 0053, US-E18.12/ADR
> 0054) — normal lane per this epic's own precedent for big-drift-but-no-new-
> mutation stories, but budget engineer + reviewer time accordingly.

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm: `src/features/academic-records/` (read-only viewer slice only — the seal/unseal slice from US-E18.13/24/43 is UNTOUCHED, separate repository)
- Shared contract/file: none new — this closes a standing gap (`academic-records.di.ts`'s viewer factory has been PERMANENTLY force-mocked since US-E18.21)

## Ground truth (fe-lead, verified against local `edu-api` checkout, US-064 confirms; BE's 2026-08-07 response §2)

BE's answer to the "viewer học bạ year-grouping" question this epic has
carried as an open item since US-E18.13/US-E18.21:

- **`classId`+`termId` is the FINAL aggregate model** — seal/unseal/approval
  semantics are permanently keyed on the `(class, term)` tuple (ADR 0047,
  BE-side). There will be **no year-grouping on the wire, ever** — do not
  design around a future denormalization landing.
- **BUT** a per-student READ-ACROSS-EVERYTHING endpoint already exists (not
  new — US-064, just never consumed by this viewer):
  `GET /api/v1/members/{memberId}/academic-records` →
  `ListStudentAcademicRecordsResponse { studentMemberId, records:
  AcademicRecordResponse[] }`. Each `AcademicRecordResponse`:
  `{classId, termId, studentMemberId, status (PENDING|SEALED|UNSEALED),
  gradeSnapshot: GradeSnapshotItemResponse[], termAverage, sealedAt,
  sealedBy, resealCount}`. `gradeSnapshot` items:
  `{subjectId, columnId, columnName, columnType, coefficient, value}` — a
  DYNAMIC per-subject column array (same "no fixed tx1/tx2/giuaKy/cuoiKy
  slots" model already handled by US-E18.7's assessment-scheme wiring, ADR
  0053 — reuse that pattern's mental model, don't re-derive it).
  - RBAC: ADMIN/MANAGER any student, STUDENT self, PARENT linked-child — same
    role gate already established for the single-record endpoint.
- **No `academicYearLabel` on the record row.** Year-grouping is explicitly a
  CLIENT-SIDE join: resolve each record's `classId` against the class's own
  `academicYearLabel` (already a real, required field on `ClassResponse`
  since US-E18.30 — `GET /classes/{classId}` is real). No student-name/DOB
  fields either (same "no identity fields" gap class as every other roster/
  directory endpoint in this epic — degrade gracefully, don't invent one).
- BE explicitly offered: if the client-side join proves too costly/awkward,
  file a NEW ask for a small denormalization (`academicYear` column added to
  the record row + backfill) — "làm được nhanh nhưng cần story riêng". If
  you hit real pain implementing the join (e.g. N+1 class-detail fetches for
  a student with many years of records), FLAG THIS as a new ask rather than
  building an elaborate workaround — a simple bounded fan-out (dedupe
  classIds, one call per distinct class, cached per-request) is fine; if it
  needs a batch class-lookup endpoint that doesn't exist, that's the ask.

## Current state (read before designing anything)

`src/features/academic-records/domain/repositories/i-academic-records.repository.ts`:
`getRecord(studentId, yearId?)` / `listYears(studentId)` — this whole
interface's SHAPE assumes a year-keyed model (`yearId` param, a `listYears`
enumeration call) that has NEVER matched the real contract and now provably
never will. This interface needs a REAL REDESIGN, not a patch:
- `AcademicRecord`/`AcademicYear`/`TermRecord`/`SubjectScore` entities
  (`academic-record.entity.ts`) all assume fixed `tx1`/`tx2`/`giuaKy`/
  `cuoiKy` slots + year-grouping AS the primary read shape. These need to
  become derived/computed CLIENT-SIDE views over a flatter
  `classId+termId`-keyed record list, not the wire shape itself.
- `bootstrap/di/academic-records.di.ts`'s `makeRepository()` is
  UNCONDITIONALLY `MockAcademicRecordsRepository` (permanent, since
  US-E18.21 — "flipping `NEXT_PUBLIC_USE_MOCK=false` app-wide would
  otherwise silently break this screen"). This story is what finally
  removes that permanent block — but ONLY for this viewer slice; the
  SEPARATE seal/unseal repository (`makeSealRepository()`, same DI file)
  is UNTOUCHED, already real for its own operations since US-E18.13/24/43 —
  do not conflate the two repositories or their DI factories.
- 4 consumer routes: `student/academic-record`, `parent/children/[id]/academic-record`,
  `admin/students/[id]/academic-record`, `teacher/students/[id]/academic-record`
  (per grep — confirm this list is complete before starting, there may be
  more). All share `academic-record-screen.tsx`/`.i-vm.ts` — check whether
  ALL four need the SAME remodeled VM shape or whether role-specific
  differences already exist (e.g. does admin see something student doesn't?).

## Scope

1. Redesign `IAcademicRecordsRepository`'s interface to match the real
   member-read shape: something like `getRecords(memberId): Promise<Result<
   AcademicRecordRow[]>>` returning the FLAT `classId+termId`-keyed list (no
   `yearId` param, no separate `listYears` call — the single member-read
   returns everything).
2. Redesign the domain entities to be a CLIENT-SIDE VIEW built from the flat
   record list: group by resolved `academicYearLabel` (from the classId→class
   join), then by `termId`, deriving `SubjectScore`-equivalent rows from each
   record's dynamic `gradeSnapshot` (mirror how US-E18.7's assessment-scheme
   or the seal feature already derive a per-subject rollup from a dynamic
   column array — reuse that derivation logic's SHAPE if not the literal
   code, don't invent a third convention for "dynamic columns → per-subject
   average" in this codebase).
3. Wire the real repository: `GET /members/{memberId}/academic-records` (one
   call, no pagination per the schema) + a bounded, deduped class-detail
   fan-out (`GET /classes/{classId}` per distinct classId in the result) to
   resolve `academicYearLabel`/`className`/`gradeLevel` — compose this in
   `bootstrap/di` per decision 0017 (cross-feature composition), reusing
   whatever real class-read client this app already has (check
   `class-management` feature's real repository before adding a new HTTP
   client for this).
4. Remove the permanent mock-force in `academic-records.di.ts`'s
   `makeRepository()` — flip to the standard `USE_MOCK ? Mock : Real` gate.
   Leave `makeSealRepository()` completely untouched.
5. Update `MockAcademicRecordsRepository` to emit data in the NEW shape
   (flat records, not pre-grouped years) so mock and real share one mapper/
   grouping function — same "mock produces wire-shaped data, one grouping
   function serves both" principle used elsewhere in this epic.
6. Update all 4 consumer routes' VM-building code for the new entity shape.
   Missing student-identity fields (name/DOB) — degrade gracefully (omit or
   placeholder, never fabricate).
7. Error-code mapping: reuse whatever `AcademicRecordsFailure` codes already
   exist for the RBAC gate (self/linked-child/admin) — this is the SAME gate
   already ground-truthed for the single-record endpoint, don't re-derive.
8. If the classId→year join proves genuinely painful (N+1 without a batch
   endpoint), STOP and write the new ask in Evidence rather than building
   something elaborate — this is an explicit escape hatch the coordinator
   authorized.

## NOT in scope

- Seal/unseal repository and its 6 real methods (US-E18.13/24/43) — completely
  separate, untouched.
- `sealed-students` listing, audit-trail (#21, still open, unrelated).
- Any new UI visual design — this is a data-shape remap under the EXISTING
  screen, not a redesign (design-review gate only needed if the actual
  rendered layout changes, not just the data source).

## Acceptance Criteria

- Real mode: a STUDENT can view their own academic record, grouped by year
  (client-derived), showing every class-term they've had a record for.
- Real mode: a PARENT can view a linked child's record the same way.
- Real mode: ADMIN/MANAGER/teacher-with-access can view any student's record.
- No fabricated year-grouping — if the classId→year join can't resolve a
  year for some record, degrade that entry clearly (don't silently drop it,
  don't fabricate a year).
- `USE_MOCK=true` unchanged in outward behavior (same demoable states).
- `makeSealRepository()`/seal-unseal flows: zero behavior change (regression
  guard).

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | mapper/grouping-function tests (dynamic gradeSnapshot → per-subject rollup, multi-year grouping, missing-year degrade), repository test (member-read + class-fan-out, dedup proof via call-count) |
| Integration | real interceptor pipeline test |
| E2E | Storybook interaction for all 4 consumer routes' updated states (loading/empty/error/multi-year) |
| Platform | `bun vitest run` zero-regression (including zero regression to seal/unseal's own test suite), `bun run build` mock+real |
| Release | merged to main, branch deleted |

## Harness Delta

- TEST_MATRIX row for academic-records viewer real-mode.
- Answer the "viewer học bạ" open item in the FE→BE report (mark answered, note any new ask filed if the join proved painful).
- EPIC-OVERVIEW.md Wave 8 row.
- `docs/product/screens.md` note for the 4 consumer routes if behavior changed materially.

## Evidence

### The classId→year join: PARTIALLY viable — a new ask WAS filed (#47)

Not straightforward, and not for the reason the packet anticipated (N+1 cost).
The blocker is **RBAC**, ground-truthed in `edu-api/services/core`'s Go source:

| Read carrying `academicYearLabel` | Allow-list | Usable? |
| --- | --- | --- |
| `GET /classes/{classId}` (`get_class.go`) — the read the packet suggested | ADMIN/SUPER_ADMIN/MANAGER, TEACHER **assigned** | ❌ 403 for STUDENT **and** PARENT — i.e. for the two primary AC roles |
| `GET /classes/{classId}/students/{studentMemberId}` (`get_student_enrollment.go`) | ADMIN/SUPER_ADMIN/MANAGER, TEACHER assigned, **STUDENT-self** | ✅ chosen — strictly dominates the above on role coverage |
| `GET /members/{memberId}/enrollment` (`get_member_enrollment.go`) | + **linked PARENT** | ❌ keyed BY yearLabel (year→class), the INVERSE of the needed join, and the year set cannot be enumerated |

Implemented: ONE collaborator — the enrollment point read — deduped per distinct
`classId`, capped at 24 calls, fail-soft per class. It covers ADMIN/MANAGER,
STUDENT-self and assigned TEACHERs with a single call shape (no per-role
strategy zoo). It costs `className`/`gradeLevel` (absent from
`EnrollmentResponse`), so the viewer no longer prints a class label rather than
printing a uuid.

**PARENT cannot resolve any year** — no class-context read in `core` admits the
PARENT role at all. Rather than build a per-role workaround, the escape hatch
was taken for that residue: **ask #47** (denormalize `academicYear` onto
`AcademicRecordResponse` — the denorm BE pre-offered) was filed in
`docs/reports/2026-08-07-fe-to-be-academic-record-viewer-asks.md`. Until it
lands, a parent's records render in the "Chưa xác định năm học" bucket with its
own `role="status"` notice: shown, never dropped, never given an invented year
(AC-4 satisfied, AC-2 partially).

### Second finding → ask #48: TEACHER is not allowed to read at all

`ListStudentAcademicRecordsUseCase` gates ADMIN/MANAGER/SUPER_ADMIN,
STUDENT-self, PARENT-linked-child, `default: forbidden` — **TEACHER is absent**.
The 4th consumer route (`/teacher/students/[id]/academic-record`, which exists
since US-E14.5) therefore always shows the `forbidden` state in real mode. The
route was NOT hidden and no data is simulated; BE is asked to either grant
TEACHER (assigned-class scoped) or declare it out of scope so the route can be
removed.

### Un-force-mock + seal regression

`makeRepository()` is the standard `USE_MOCK ? Mock : Real` gate again;
`makeSealRepository()` in the same file was not modified (verified by
`git diff` — the only change to that function's block is zero lines).
`academic-records.di.test.ts` (renamed from `academic-records-force-mock.di.test.ts`)
keeps BOTH seal cases (mock mode → `MockAcademicRecordsSealRepository`, real
mode → `HybridAcademicRecordsSealRepository` with `ensureFreshSession` called)
and the whole seal test suite (`academic-records-seal.repository.test.ts`,
`academic-records-seal-hybrid.repository.test.ts`,
`academic-records-seal.mock.repository.test.ts`, `seal-batch.mapper.test.ts`,
the 5 seal use-case suites, `academic-record-seal-container.test.tsx`) is
untouched and green.

### Consumer routes (grep-confirmed complete: exactly 4)

`student/academic-record`, `parent/children/[studentId]/academic-record`,
`admin/students/[studentId]/academic-record`,
`teacher/students/[studentId]/academic-record` — all four share
`buildAcademicRecordVM` and needed no per-role VM difference. Only the student
route changed shape: it now passes `SELF_MEMBER_ID` and the real memberId is
resolved server-side from the token `sub` claim (a literal `"me"` on the wire
would 400/403), failing closed to `forbidden` when unresolvable.

### Proof

- `bun vitest run` — **500 files / 3879 tests green** (a first cold-cache run
  showed 9 unrelated 5s-timeout flakes in RSC page tests; a warm re-run is fully
  green, and the same files pass in isolation).
- `bunx tsc --noEmit` — clean. `bun lint` — clean (1 pre-existing warning +
  1 info elsewhere in the repo). `bun run build` — green.
- Storybook: `bunx vitest run --config vitest.storybook.mts` — 157 files /
  1239 green; the academic-record file is 12 stories including the two new
  degrade states.

### UI note for the design-review gate

This is a data-source remap, but the rendered layout DID change (unavoidably):
the student identity block and the conduct column/footer are gone (no wire
source), and the fixed 4-column score table became a dynamic column axis derived
from `gradeSnapshot`. Flagged to `fe-lead` for the gate.
