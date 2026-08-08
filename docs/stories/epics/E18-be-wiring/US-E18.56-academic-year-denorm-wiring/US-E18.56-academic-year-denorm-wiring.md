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

### Tech-lead review (2026-08-08)

**Verdict: APPROVED.** No blocking findings. Two doc-integrity items must land
before the story is marked `implemented` (§Required changes 1–2); neither is a
behaviour defect. Explicit sign-off on **skipping the design-review gate** for
this story — see §Design system.

Checks actually run on this branch (`feat/us-e18.56-academic-year-denorm`, not
taken on trust):

| Command | Result |
| --- | --- |
| `bunx tsc --noEmit` | clean, exit 0 |
| `bun vitest run` | **517 files / 4079 tests passed**, 0 failed — matches the engineer's figure exactly |
| `bun vitest run src/features/academic-records src/bootstrap/di/academic-records.di.test.ts` | 18 files / 191 passed |
| `bun vitest run <all *seal*/*unseal* test files>` | **11 files / 127 passed** (regression guard) |
| `git diff main...HEAD --stat -- '**/*seal*'` | only `derive-year-seal-status.test.ts` **+1 line** (the required-field literal). `-- '**/academic-records-seal*'` = **0 lines** — the engineer's byte-identical claim on the seal repositories is TRUE |
| `bun lint` | 1 warning + 1 info, both `messaging/message-context-menu.tsx` — pre-existing, not in this diff |
| `bun vitest run --config vitest.storybook.mts` | run 1: 1 failed / 1284 passed; runs 2 and 3: **163 files / 1285 passed**, exit 0. Flake, NOT academic-records (see §Test coverage) |
| `bun run build` | green (exit 0) |
| `NEXT_PUBLIC_USE_MOCK=false bun run build` | green (exit 0) |
| `git diff main...HEAD --stat -- src/bootstrap/i18n` | **empty** — the "zero i18n keys" claim is TRUE |

**Contract ground truth re-verified** against
`docs/reports/2026-08-08-be-to-fe-response.md` §2 (not the packet's paraphrase):
the wire field is `academicYear`, and the report states verbatim "Field là
**`academicYear`**, không phải `academicYearLabel`". `AcademicRecordRowDto`
(`academic-record-response.dto.ts:41`) and the mapper
(`academic-record.mapper.ts:68`) both use that exact key — grep-confirmed, no
`academicYearLabel` anywhere in `features/academic-records/` except the one
stale doc line flagged below. The `omitempty` / lazy-heal / best-effort
semantics in the DTO doc comment match the report line-for-line.

**Architecture Compliance — PASS.** `academic-records.repository.ts:1` and
`mocks/academic-records.mock.repository.ts:1` keep `import "server-only"`;
`bootstrap/di/academic-records.di.ts:1` keeps it. The pure mapper still
correctly does NOT carry it (repo-wide convention, same as US-E18.54's review
recorded). `domain/` stays pure — `build-academic-record.ts` lost a parameter
and gained no import; `academic-record.entity.ts` gained a primitive field only.
Dependency direction is strictly IMPROVED: the repository no longer takes a
foreign-feature collaborator, and `bootstrap/di` composes one port instead of
two — decision `0017` still honoured (the surviving `resolveSubjectNames` join
lives in DI, not the repository).

**Code Quality — Excellent.** Zero `any`, zero non-null `!` in the diff
(grep-confirmed). The 3-arg → 2-arg collapse is the minimal change; the
`Map`-building code in `getRecords()` is deleted outright rather than left
inert. `MOCK_RECORDS_WITHOUT_ACADEMIC_YEAR` derives from the canonical fixture
with `delete stripped.academicYear` — the key is genuinely ABSENT, not `null` or
`""`, which is the only shape that actually exercises `orNull`'s undefined
branch. Making `TermRecord.academicYear` REQUIRED (not optional) was the right
call: `bunx tsc --noEmit` is the enforcement, and it surfaced exactly one other
`TermRecord` literal (`derive-year-seal-status.test.ts:13`), which was fixed. No
silently-wrong literal survives — the type checker proves that, not a grep.

**Data & Contract Review — PASS.**
- `orNull()` (`academic-record.mapper.ts:22-24`) is `raw === undefined ? null :
  raw`. Semantics transfer correctly: Go `omitempty` on a plain `string` omits
  the key for `""`, so absence arrives as `undefined` → `null` → the
  `UNRESOLVED_YEAR_ID` bucket. Never fabricates, never coerces.
- **Un-fan-out proof is real, not declarative.** Two independent tests, both
  re-run and inspected: (a) `academic-records.repository.test.ts:75-84` asserts
  `expect(get).toHaveBeenCalledTimes(1)` for 3 rows across 2 distinct classes —
  a call-COUNT proof that would fail if any per-class read were reintroduced;
  (b) `academic-records.di.test.ts:56` makes the stub **throw** on any
  unexpected URL (`throw new Error(\`unexpected call: ${url}\`)`) and then
  asserts `enrollmentCalls` has length 0 while the read still returns `ok`. The
  second is the stronger form and is exactly what the packet asked for.
- Failure mapping, envelope handling, and `raw:true` absence (endpoint is
  unpaginated) are untouched by this story and still correct.

**Design system & i18n — PASS.** Zero token/color/class changes anywhere in the
diff. **Design-review gate sign-off:** I read
`academic-record-screen.stories.tsx`'s full diff line by line — the only changes
are (1) `build()`'s first parameter switching from a `Map<string,string>` year
map to a wire payload, (2) `UnresolvedYear` passing
`MOCK_RECORDS_WITHOUT_ACADEMIC_YEAR`, (3) `UnresolvedSubjectNames` passing the
canonical payload explicitly, (4) a doc comment. **No JSX, no `className`, no
token, no component import changed.** Rendered output for a resolved year is
byte-identical. `fe-lead` may skip the full design-review pass for US-E18.56 on
that basis. i18n: `src/bootstrap/i18n` diff is empty and `unresolvedYear.*` copy
is untouched and still reachable (proven by the DI test AND the story).

**Security Review — PASS.** This story only REMOVES a collaborator and its
network calls; no new data reaches the client, no PII surface added, no token
handling touched. Nothing was left half-wired: the deleted resolver, its test,
its endpoint builder, and its mock shim (`MOCK_CLASS_YEARS`) are all gone
together, with no dangling import (verified by `tsc` + a grep for
`enrollment-year|makeEnrollmentYearResolver|ResolveYearByClassId|MAX_CLASS_YEAR_LOOKUPS|studentEnrollmentPath|MOCK_CLASS_YEARS`
over `src/` — the only hit is prose inside `admin-roster.endpoint.ts`'s doc
comment). Attack surface strictly shrinks.

**Deviation #1 (deleting `studentEnrollmentPath()`) — VERIFIED CORRECT.** I did
not take the report on trust: `git grep -n "studentEnrollmentPath" main -- src/`
returns exactly 5 hits, all inside `enrollment-year.resolver.ts`, its test, and
the endpoint file's own declaration + doc line. No other feature — including
`admin-roster`, whose DELETE still uses the retained `unenrollPath()` — ever
consumed it. The packet's "do NOT delete a constant a different feature still
needs" condition is satisfied, and the replacement doc comment records how to
re-add the builder. Deletion approved.

**Deviation #2 (`MOCK_RECORDS_WITHOUT_ACADEMIC_YEAR`) — approved and, in my
view, required.** Without it the degrade path becomes untested dead code, which
the packet's AC explicitly forbids.

**Test Coverage — PASS.** TDD proof is meaningful, not ceremonial: the
`build-academic-record` suite gained a case the OLD design could not express
(same `classId` in two different years splits correctly —
`build-academic-record.test.ts:106-117`), the mapper gained both the
present-verbatim and absent→`null` cases (including `"academicYear" in term`,
which catches a mapper that drops the key entirely), and the repository/DI
suites converted resolver-mock assertions into call-count/throw-on-unexpected
proofs. Net test count is down 5 (the deleted resolver suite) and up 3, which is
correct — those 5 tested a mechanism that no longer exists.

*Storybook flake note:* my first `vitest.storybook.mts` run had 1 failure; two
consecutive re-runs were 163/1285 green with exit 0, and the academic-records
stories (12) passed in all three runs plus in the scoped 18-file run. Consistent
with the known intermittent story in this repo — not attributable to this
branch.

#### Required changes

1. **[MUST FIX — before `--status implemented`] `docs/TEST_MATRIX.md` has no
   US-E18.56 row, and line 179's US-E18.54 row now describes deleted code as
   live proof.** It still reads "The year dimension is a DI-composed, deduped,
   bounded enrollment point-read join" and cites "`enrollment-year.resolver.test.ts`
   5" and "`academic-records.di.test.ts` 7 (… 4 records → 2 enrollment reads
   with the 403 class degrading)" — all three describe a mechanism and a file
   that no longer exist. The packet's §Harness Delta explicitly required
   updating that row rather than adding a parallel one. *Why:* the matrix is
   this repo's proof registry; a row citing a deleted test file makes the whole
   registry untrustworthy. *How:* amend the US-E18.54 row's note in place to
   say the year now rides the wire row (US-E18.56, ask #47/migration 051),
   drop the `enrollment-year.resolver.test.ts` citation, and restate the DI
   test as the ZERO-enrollment-call proof.

2. **[SHOULD FIX] `src/features/academic-records/domain/entities/academic-record.entity.ts:84`
   — one stale doc line survived the §11 sweep.** `AcademicYear.yearId` still
   reads `/** The resolved \`academicYearLabel\`, or {@link UNRESOLVED_YEAR_ID}. */`.
   `academicYearLabel` is now a *different* feature's wire field; this one is
   fed by `TermRecord.academicYear`. *Why:* the packet flagged doc accuracy as
   in-scope precisely because a wrong field name here is what sends the next
   reader to the wrong endpoint. *How:* one-line edit → "The row's own
   `academicYear`, or {@link UNRESOLVED_YEAR_ID}." Everything else in §11 (entity
   header, `UNRESOLVED_YEAR_ID`, repository class doc, use-case doc, DI factory
   doc, `ROSTER_EP.unenroll` doc) was updated correctly and accurately.

3. **[CONSIDER] The blank-label guard was lost in the migration.**
   `build-academic-record.ts:33` uses `record.academicYear ?? UNRESOLVED_YEAR_ID`,
   so a `""` or `"   "` value would produce a real year bucket with a blank
   label instead of degrading. The deleted resolver had an explicit guard for
   this (its test "omits a class whose row carries a blank academicYearLabel").
   Go `omitempty` on a plain `string` makes `""` unreachable from this endpoint
   today, so this is **not blocking** — but if you want the old defence back it
   is one token: `record.academicYear?.trim() ? record.academicYear : UNRESOLVED_YEAR_ID`.

4. **[CONSIDER — pre-existing, not this story's debt]** the stories file imports
   `infrastructure/mappers/…` and `infrastructure/repositories/mocks/fixtures`
   from under `presentation/`. That predates this branch (only the argument
   shape changed here) and is a deliberate "stories cannot drift from prod"
   choice on a non-shipped test artifact. Noting it so it is not mistaken for a
   new boundary crossing.

**Good work worth calling out:** the call-count/throw-on-unexpected-URL pair is
the right way to prove a *negative* (no call happened) — an assertion that the
resolver file is gone would have proved nothing about runtime. Making the entity
field required so `tsc` finds the stragglers, rather than optional so they stay
silently wrong, is the correct trade. And adding
`MOCK_RECORDS_WITHOUT_ACADEMIC_YEAR` instead of just deleting `MOCK_CLASS_YEARS`
kept a fallback path alive that would otherwise have quietly rotted.
