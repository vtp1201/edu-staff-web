# US-E18.56 Consume denormalized `academicYear` — drop the enrollment-resolve fan-out

## Status

in-progress

## Lane

normal

## Dependencies

- Depends on: none (US-E18.54, already merged, is the baseline this modifies)
- Blocks: US-E18.57 (same feature module — run SEQUENTIALLY, not in parallel)
- Feature module(s) chạm: `src/features/academic-records/` (viewer read slice only — seal/unseal untouched)
- Shared contract/file: `AcademicRecordRowDto` (`infrastructure/dtos/academic-record-response.dto.ts`), `TermRecord`/`AcademicYear` entities, `build-academic-record.ts`, `academic-records.repository.ts`, `academic-records.di.ts`

## Ground truth (BE response 2026-08-08 §2, edu-api main `b5a13cc1`)

`GET /core/api/v1/members/{memberId}/academic-records` now returns, on each
`AcademicRecordResponse` row, an **additive `omitempty` field**:

```jsonc
{ "classId": "...", "termId": "...", "status": "SEALED",
  "academicYear": "2025-2026",   // NEW — string, e.g. "2025-2026"
  "termAverage": "8.50", "gradeSnapshot": [...], "resealCount": 0 }
```

- Field name on the wire is **`academicYear`** (not `academicYearLabel`).
- **New seals**: always populated (BE carries it from the grade entries at
  seal time — no extra read).
- **Pre-migration-051 seals**: heal LAZILY on this exact list read — first
  call resolves+persists it BE-side; heal never overwrites a value already
  present; heal is best-effort (lookup failure ⇒ field still absent, read
  still 200). FE consequence: `academicYear` can legitimately be **absent**
  on a genuinely old, unhealed row on its very first read — this is not an
  error and must degrade exactly like today's "unresolved year" bucket does,
  not be treated as a bug.
- The single-record endpoint
  (`GET /classes/{classId}/terms/{termId}/students/{studentId}/academic-record`)
  also gained the field but does **not** heal it — **irrelevant to this repo**:
  `AcademicRecordsRepository.getRecords()` only ever calls the member-list
  endpoint (confirmed by reading `academic-records.repository.ts` — no other
  call site exists). Do not add a call to the single-record endpoint for this
  story.
- Migration 051 is a BE-side deploy-order dependency (must run before the new
  core binary) — no FE action, just don't assume the field is universally
  present in a real environment mid-rollout; the `omitempty`/fail-soft
  contract already covers that.

## Current state (read before touching anything)

- `enrollment-year.resolver.ts` (`makeEnrollmentYearResolver`) does a bounded
  (`MAX_CLASS_YEAR_LOOKUPS = 24`), deduped, fail-soft fan-out over
  `GET /classes/{classId}/students/{studentMemberId}` to build a
  `classId → academicYearLabel` map — this is the exact mechanism ask #47 was
  filed to eliminate, and it is now dead weight once `academicYear` rides the
  record row directly. It also NEVER worked for PARENT (out of that
  endpoint's RBAC allow-list) — that was the "Chưa xác định năm học" bucket's
  whole reason to exist for that role.
- `academic-records.repository.ts#getRecords()` calls `this.resolveYears(...)`
  (the injected fan-out) AFTER mapping rows, to build the `years` map passed
  into `buildAcademicRecord(studentMemberId, rows, years)`.
- `build-academic-record.ts#buildAcademicRecord()` groups `TermRecord[]` by
  `yearByClassId.get(record.classId) ?? UNRESOLVED_YEAR_ID` — it takes the
  year map as a THIRD parameter, not a field already on the record.
- `bootstrap/di/academic-records.di.ts#makeRepository()` composes
  `makeEnrollmentYearResolver(http)` as the 2nd constructor arg.
- `MockAcademicRecordsRepository` + its fixtures currently emit rows with no
  year and rely on a mock year-resolver equivalent (check
  `mocks/academic-records.mock.repository.ts` + `mocks/fixtures.ts` before
  assuming the shape) — these must gain the field too so mock and real share
  the identical `buildAcademicRecord` grouping path (no shape divergence).

## Scope

1. **DTO**: add `academicYear?: string` to `AcademicRecordRowDto`
   (`infrastructure/dtos/academic-record-response.dto.ts`) — optional,
   `omitempty` semantics, matches the wire exactly (do not rename to
   `academicYearLabel`).
2. **Entity**: add `academicYear: string | null` to `TermRecord`
   (`domain/entities/academic-record.entity.ts`) — `null` when the wire key is
   absent (mirror the existing `orNull()` convention already used for
   `sealedAt`/`sealedBy`/etc in the mapper).
3. **Mapper**: `mapAcademicRecordRow()` sets `academicYear: orNull(dto.academicYear)`.
4. **Grouping**: `buildAcademicRecord()` drops its 3rd parameter
   (`yearByClassId: Map<string, string>`) entirely and groups by
   `record.academicYear ?? UNRESOLVED_YEAR_ID` directly off each `TermRecord`.
   Update its doc comment (currently describes an injected classId→year join
   that no longer exists).
5. **Repository**: `AcademicRecordsRepository` drops the `resolveYears`
   constructor parameter and the `this.resolveYears(...)` call entirely —
   `getRecords()` now calls `buildAcademicRecord(studentMemberId, rows)` with
   no year map. Keep `resolveSubjectNames` (unrelated collaborator, unchanged).
6. **DI**: `bootstrap/di/academic-records.di.ts#makeRepository()` stops
   constructing/passing `makeEnrollmentYearResolver(http)`.
7. **Delete** `enrollment-year.resolver.ts` + its test
   (`enrollment-year.resolver.test.ts`) — it has exactly one consumer (grep-
   confirm before deleting) and that consumer is gone. Do not leave it as
   unused dead code.
8. **Endpoint constant cleanup**: check `bootstrap/endpoint/admin-roster.endpoint.ts`'s
   `studentEnrollmentPath` — if `enrollment-year.resolver.ts` was its only
   caller, decide whether to remove it or leave it (grep other consumers
   first; `admin-roster` feature may use the same enrollment endpoint for its
   own roster screen — do NOT delete a constant a different feature still
   needs).
9. **Mock repository + fixtures**: give `MockAcademicRecordsRepository`'s
   fixture rows an `academicYear` value per row (wire-shaped, matching the
   "mock produces wire-shaped data, one grouping function serves both" rule
   already established in this feature) and remove whatever mock-side
   year-resolution shim existed for the old 3-arg `buildAcademicRecord` call.
10. **Degrade UX unchanged, but re-verify its trigger**: the "Chưa xác định
    năm học" / `UNRESOLVED_YEAR_ID` bucket, its `role="status"` notice, and the
    `unresolvedYear.description` i18n copy all STAY — they now trigger only on
    a genuinely absent `academicYear` (rare, pre-heal old row) instead of on
    every PARENT read. Do not delete this fallback path; do not reword its
    copy to imply it can no longer happen.
11. Update the doc comments in `academic-record.entity.ts` (currently says the
    year is "resolved client-side... from a classId → academic-year
    resolution supplied by the repository's injected resolver" — now false)
    and in `academic-records.repository.ts`'s class doc (currently documents
    `resolveYears` as one of "two OPTIONAL collaborators").

## NOT in scope

- Seal/unseal repository (`makeSealRepository()`), completely untouched.
- The single-record endpoint / any new call to it.
- US-E18.57 (teacher homeroom grant) — do not pre-emptively touch teacher-role
  code paths here; that is the next US, sequentially, in the SAME feature
  module (branch must be merged before US-E18.57 branches off `main`).
- Any visual/layout change — this is a pure data-source simplification. The
  YearTimeline/AcademicRecordTable components are unaffected; only the
  grouping key's SOURCE changes (from an injected map to a field already on
  the row). If the rendered output is byte-identical for a resolved year, no
  design-review gate is needed beyond confirming that (see AC).

## Acceptance Criteria

- Real mode: a PARENT viewing a linked child's record now sees the correct
  resolved year label for every SEALED (and any post-051-migration) row —
  the previous universal "Chưa xác định năm học" bucket for PARENT is gone in
  practice (though the bucket itself, and its markup, still exist for the
  rare unhealed-old-row case).
- Real mode: STUDENT/ADMIN/MANAGER continue to see correct year grouping —
  zero regression versus the enrollment-fan-out era, and with FEWER network
  calls (no more per-classId enrollment point-reads).
- A record with the wire key absent still renders in the unresolved bucket,
  never fabricates a year, never drops the record.
- `enrollment-year.resolver.ts` no longer exists; no dangling import of it
  anywhere (grep-clean).
- `USE_MOCK=true` unchanged in outward behavior (same demoable states, same
  or better fixture-year coverage).
- Seal/unseal flows: zero behavior change (regression guard, same suites
  green as US-E18.54 left them).
- No visual regression: Storybook snapshots/interaction states for
  multi-year, unresolved-bucket, and single-year still pass; if the parent
  route's unresolved-bucket story is now unreachable in real-shaped fixtures,
  keep ONE story exercising it via a fixture that omits `academicYear`
  (proves the fallback path isn't dead code).

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | mapper test (new `academicYear` field mapping, present/absent), `buildAcademicRecord` test updated for 2-arg signature (group-by-field, unresolved-bucket-on-absent), repository test (no `resolveYears` call, call-count assertion removed/updated) |
| Integration | `academic-records.di.test.ts` — confirm `makeEnrollmentYearResolver` no longer constructed; env-matrix (mock/real) still green |
| E2E | Storybook interaction — parent route now resolves a year in the default fixture; one story keeps the unresolved-bucket path alive via an explicit no-`academicYear` fixture |
| Platform | `bun vitest run` zero-regression incl. seal/unseal suites, `bunx tsc --noEmit`, `bun lint`, `bun run build` (mock AND real, i.e. `NEXT_PUBLIC_USE_MOCK=false`) |
| Release | merged to main, branch deleted |

## Harness Delta

- `harness-cli story update --id US-E18.56 --status implemented --unit 1 --integration 1 --e2e 1 --platform 1` once proof exists.
- `docs/TEST_MATRIX.md` row for the academic-records viewer real-mode year
  resolution — update the existing US-E18.54 row's note rather than adding a
  parallel one if one already covers this surface.
- Mark ask #47 answered/closed in a follow-up consumption report (batch report
  covering all 4 US-E18.56..59, written after all four land).

## Evidence

(fe-nextjs-engineer / fe-tech-lead-reviewer / fe-accessibility-auditor / fe-qa-playwright fill in below as work proceeds.)
