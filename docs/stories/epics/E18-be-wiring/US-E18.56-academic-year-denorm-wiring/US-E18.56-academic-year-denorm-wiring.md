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

### fe-nextjs-engineer — implementation (2026-08-08)

TDD red→green: the four affected suites were edited FIRST (2-arg
`buildAcademicRecord`, wire `academicYear` in the repository/DI fixtures, new
mapper present/absent cases) and run red — **14 failed / 32 passed** across
`build-academic-record.test.ts`, `academic-record.mapper.test.ts`,
`academic-records.repository.test.ts`, `academic-records.di.test.ts` — before a
single line of production code changed. Then green, then doc-comment refactor.

**Files changed** (17 tracked paths, seal slice byte-identical):

| Layer | File | Change |
| --- | --- | --- |
| domain/entities | `academic-record.entity.ts` | `+ academicYear: string \| null` on `TermRecord`; header + `UNRESOLVED_YEAR_ID` doc rewritten (the "injected resolver" sentence was false) |
| domain/use-cases | `build-academic-record.ts` | 3rd param `yearByClassId` DELETED; groups on `record.academicYear ?? UNRESOLVED_YEAR_ID`; doc rewritten |
| domain/use-cases | `build-academic-record.test.ts` | rewritten for the 2-arg signature (11 tests, incl. a NEW one the old join could not express: the same `classId` in two different years now splits correctly) |
| domain/use-cases | `derive-year-seal-status.test.ts` | its `TermRecord` literal gained `academicYear` (compile fallout of a required field) |
| infrastructure/dtos | `academic-record-response.dto.ts` | `+ academicYear?: string` (`omitempty`, exact wire name) |
| infrastructure/mappers | `academic-record.mapper.ts` | `academicYear: orNull(dto.academicYear)` |
| infrastructure/mappers | `academic-record.mapper.test.ts` | +2 tests (verbatim carry; ABSENT → `null` AND the key still present on the entity) |
| infrastructure/repositories | `academic-records.repository.ts` | `resolveYears` ctor param + call DELETED (`resolveSubjectNames` moves to arg 2); class doc rewritten |
| infrastructure/repositories | `academic-records.repository.test.ts` | fan-out assertions replaced by a call-COUNT proof (`get` called exactly once for 3 rows / 2 classes) + wire-field grouping + absent-field degrade |
| infrastructure/repositories | `enrollment-year.resolver.ts` + `.test.ts` | **DELETED** (grep-confirmed single consumer) |
| infrastructure/repositories/mocks | `fixtures.ts` | `record()` takes `academicYear`; every row carries one; `MOCK_CLASS_YEARS` deleted; NEW `MOCK_RECORDS_WITHOUT_ACADEMIC_YEAR` (key ABSENT, not `null`/`""`) keeps the degrade path alive |
| infrastructure/repositories/mocks | `academic-records.mock.repository.ts` | 2-arg `buildAcademicRecord`, year-map import gone |
| presentation | `academic-record-screen.stories.tsx` | `build()` now takes a wire PAYLOAD instead of a year map; `UnresolvedYear` drives the bucket from the year-less fixture; no component/markup change |
| bootstrap/di | `academic-records.di.ts` | `makeEnrollmentYearResolver(http)` no longer imported/constructed; factory doc rewritten. `makeSealRepository()` untouched |
| bootstrap/di | `academic-records.di.test.ts` | the "deduped and bounded fan-out" suite became a ZERO-enrollment-call proof (throws on any unexpected URL) + 3-bucket grouping incl. an unhealed row |
| bootstrap/endpoint | `admin-roster.endpoint.ts` | `studentEnrollmentPath()` DELETED (see deviation #1); `unenroll` doc updated |

**Proof commands actually run:**

- `bun vitest run` → **517 files / 4079 tests passed**, 0 failed (was 500/3879 at
  US-E18.54; the delta is other stories landing since, plus this story's net
  −5 resolver tests / +3 new ones).
- Seal regression guard, re-run explicitly by name:
  `academic-records-seal.repository.test.ts`,
  `academic-records-seal-hybrid.repository.test.ts`,
  `academic-records-seal.mock.repository.test.ts`, `seal-batch.mapper.test.ts`,
  `seal-academic-record` / `get-seal-status` / `initiate-unseal` /
  `confirm-unseal` use-case suites → **8 files / 101 tests passed**;
  `list-pending-unseal-requests.use-case.test.ts` → **3 passed** (9 files / 104
  total). Note: `get-seal-audit-trail.use-case` has **no** test file in the repo
  (pre-existing, not a regression of this story) — the packet's "5 seal
  use-case suites" is really 5 = the four above + `list-pending-unseal-requests`.
- `git diff main...HEAD -- '**/academic-records-seal*'` → **0 lines**.
- `bunx tsc --noEmit` → clean (exit 0). The only compile fallout of the new
  required entity field was `derive-year-seal-status.test.ts`, fixed above.
- `bun lint` → clean for this story after `bun lint:fix` (Biome reformatted one
  wrapped line in the stories file). Remaining repo-wide: **1 warning + 1 info,
  both pre-existing and untouched** — `message-context-menu.tsx:167`
  "suppression comment has no effect" (messaging feature) and one Biome info.
- `bun run build` → green. `NEXT_PUBLIC_USE_MOCK=false bun run build` → green.
- Storybook interaction suite `bun vitest run --config vitest.storybook.mts` →
  **163 files / 1285 tests passed**, including the 12 academic-record-screen
  stories (`UnresolvedYear` re-verified against the year-less fixture). The
  `<tfoot> cannot contain a nested <p>` console noise in that log comes from a
  different story (shadcn `TableFooter` default classes — the academic-record
  table's own `<tfoot>` has no `<p>`); it is pre-existing and non-failing.
- Grep: `enrollment-year.resolver|makeEnrollmentYearResolver|ResolveYearByClassId|MAX_CLASS_YEAR_LOOKUPS|studentEnrollmentPath|MOCK_CLASS_YEARS`
  over `src/` → the only hit is the *prose* mention inside the
  `admin-roster.endpoint.ts` doc comment explaining why the builder is gone.

### Deviations from Scope (both justified)

1. **Scope §8 left the `studentEnrollmentPath` decision open — I DELETED it.**
   Grep proved the resolver was its only caller anywhere in `src/`, and it was
   a one-line alias of `unenrollPath()` (same path, different verb), so keeping
   it would be exported dead code. The `unenroll` path CONSTANT stays — the
   admin-roster DELETE still uses it — and its doc comment now records how to
   re-add a GET builder if a screen ever needs the single-enrollment read.
2. **Scope §9's "mock-side year-resolution shim" is `MOCK_CLASS_YEARS`**, and
   instead of only deleting it I added `MOCK_RECORDS_WITHOUT_ACADEMIC_YEAR`.
   Without it the AC "keep ONE story exercising the unresolved bucket" would
   have had no wire-shaped source (every normal fixture row now resolves), and
   the degrade path would have become untested dead code.

### Notes for review

- No i18n keys added or changed; `unresolvedYear.*` copy is untouched (still
  reachable — proven by both the DI test and the Storybook story).
- No token, component, or markup change → no new design-system surface; the
  screen renders byte-identically for a resolved year (grouping key SOURCE
  changed, not its value).
- No ADR trigger: this is a data-source simplification within the existing
  contract, and it *removes* a cross-aggregate join rather than adding one.
- Real-mode network cost for this screen drops from `1 + N(distinct classes)`
  reads to `1` (plus the unchanged subject-catalogue read).
