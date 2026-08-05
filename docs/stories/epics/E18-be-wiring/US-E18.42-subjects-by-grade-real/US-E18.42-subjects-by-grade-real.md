# US-E18.42 listSubjectsForGrade real (BE US-177 gradeLevel filter)

## Status

implemented

## Lane

normal

## Dependencies

- Depends on: none (BE US-177, merged `edu-api` main `7e76c0a3`, 2026-08-04)
- Blocks: none
- Feature module(s) chạm: `src/features/assessment-scheme/`
- Shared contract/file: `ASSESSMENT_EP.subjectsByGrade`, `GET /core/api/v1/subjects`

## Ground truth (fe-lead, verified before delegating)

`docs/reports/2026-08-04-be-to-fe-response.md` §"#12": `GET /subjects` now
accepts an optional `gradeLevel=` query param (int 1..13), AND'd with the
existing `status=` filter, applied BEFORE pagination (every page returned is
fully matching, no client-side re-filter needed). Out-of-range or non-numeric
`gradeLevel` → `422 VALIDATION_FAILED` on field `gradeLevel`.

**Important nuance — this is NOT a from-scratch wire-up.** Read
`src/features/assessment-scheme/infrastructure/repositories/assessment-scheme.repository.ts`
`listSubjectsForGrade()` and `src/bootstrap/endpoint/assessment-scheme.endpoint.ts`
first: the real repository ALREADY calls
`GET /core/api/v1/subjects?gradeLevel=${gradeLevel}&status=ACTIVE` today, and
`bootstrap/di/assessment-scheme.di.ts` is a PLAIN `USE_MOCK ? Mock : Real` gate
(not a hybrid/force-mock) — so in real mode this call was ALREADY being made
before this BE batch landed. The endpoint file's own comment
(`// UNCHANGED — still mock-first (real GET /subjects has no gradeLevel
filter...)`) is now STALE — it describes a state the BE has since fixed
(US-177). The actual gap before this story: BE previously either 400'd on the
unknown param or silently ignored it (ground-truth which one it was, if you
can tell from the diff / error taxonomy — not critical, just don't assume).

## Scope

1. Ground-truth `GET /subjects`'s FULL contract now (not just the
   `gradeLevel` delta) against `services/core/docs/openapi.yaml` — confirm
   pagination shape (cursor-based per decision 0008's list convention) and
   whether this call site currently drains all pages or only reads the first.
   **Check the `subject-catalogue` feature (US-E18.3) for the established
   cursor-drain pattern** for the SAME `/subjects` endpoint — if that feature
   already has a "list all subjects, following `nextCursor` until `hasMore`
   is false" helper, this call site should reuse the identical pattern (BE's
   "filter applied before pagination" guarantee only means each PAGE is
   correct, not that there's only one page — a grade can plausibly have more
   subjects than one page size). Do not invent a second draining
   implementation if one already exists.
2. Re-ground-truth the error taxonomy for THIS specific call
   (`422 VALIDATION_FAILED` field `gradeLevel`, likely also whatever
   `status=` misuse already maps to) — check `mapFailure`/`toFailure` in this
   repository file for what it currently maps and fix/extend as needed.
   Branch on `error.code`, never on message (decision 0008).
3. Fix the stale comment in `assessment-scheme.endpoint.ts` (the
   `subjectsByGrade` doc-comment) — this is now real, ground-truthed against
   US-177, not "still mock-first". Also revisit US-E18.7's story doc note
   ("`listSubjectsForGrade` stays mock — no gradeLevel filter") if it's
   inaccurate now; you don't need to edit that story file yourself, just flag
   it in this story's Evidence for fe-lead to sync EPIC-OVERVIEW.md.
4. Confirm the `raw:true`/top-level-axios-config bug class from
   `EPIC-OVERVIEW.md` §"Bug class xuyên suốt: vị trí `raw: true`" does not
   apply here (this call site doesn't currently use `raw:true` — if you add
   cursor draining and need `meta.pagination`, make sure `raw: true` goes at
   the TOP LEVEL of the axios config object, not nested in `params`).
5. Update `MockAssessmentSchemeRepository`'s `listSubjectsForGrade` if its
   mocked filtering behavior would now diverge from the real one (e.g. if you
   add pagination draining, the mock should still behave correctly for
   `USE_MOCK=true` tests — check it already filters by `gradeLevel`
   correctly, per the existing `mock-assessment-scheme.repository.test.ts`).

## NOT in scope

- `gradeScale`/`assessmentScheme` GET/PUT — already real since US-E18.7,
  untouched.
- Subject-catalogue's OWN listing screen/CRUD (US-E18.3) — only reuse its
  draining helper if one exists, don't modify that feature.

## Acceptance Criteria

- Real mode: the grade-scoped subject picker in the assessment-scheme screen
  returns the FULL set of subjects for a grade (not just page 1, if the
  tenant has more subjects than one page).
- Out-of-range `gradeLevel` maps to a sensible, presentable failure (not
  `unknown`).
- `USE_MOCK=true` behavior unchanged (mock already filters correctly, keep
  passing tests).

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | repository test: gradeLevel filter, 422 mapping, pagination-drain if added |
| Integration | real interceptor pipeline test (guard against the `raw:true` bug class) if draining is added |
| E2E | none new |
| Platform | `bun vitest run` zero-regression, `bun run build` mock+real |
| Release | merged to main, branch deleted |

## Harness Delta

- TEST_MATRIX row for assessment-scheme subject picker real-mode.
- Close ask #12 in the FE→BE report.
- EPIC-OVERVIEW.md Wave 6 row + correct the stale US-E18.7 note if found inaccurate.

## Evidence

### Ground truth re-verified (edu-api `main`)

- `services/core/docs/openapi.yaml` `GET /api/v1/subjects`: optional `status`
  (`ACTIVE|ARCHIVED`) + optional `gradeLevel` (integer, min 1, max 13) + `cursor`
  + `limit` (1..200), "filters are ANDed. Filtering is applied before
  pagination". Responses: `200 SubjectList`, `422 ValidationError`, `401`.
- `internal/curriculum/adapter/http/dto/subject.go` — `ListSubjectsQuery`
  binds ONLY `gradeLevel` (`*int`, `validate:"omitnil,min=1,max=13"`);
  `subject_handler.go:97` comments that a bind failure can only mean a
  non-numeric `gradeLevel` → `apperror.NewValidationError([{Field:"gradeLevel",
  Tag:"numeric"}])`. `subject_list_query_test.go` proves `0`, `14`, `-1`, `abc`
  all return `VALIDATION_FAILED` blaming `gradeLevel`, and that omitting the
  param keeps the pre-US-177 behavior.
  → **Answer to the packet's open question:** pre-US-177 the param was silently
  IGNORED (it was simply not bound), not 400'd. So real mode was returning
  *every* ACTIVE subject of every grade to the grade picker.

### The real finding — the DTO was mock-era invention (worse than the filter gap)

`SubjectForGradeDto` was `{ id, name, gradeLevel, requiredAssessmentCount }` —
a shape **no endpoint has ever emitted**. The real `SubjectResponse` ids as
`subjectId` and nests the count as `master.requiredExamCount` (exactly as the
subject-catalogue feature's own `SubjectResponseDto` declares for the SAME
endpoint, US-E18.3). So before this story, real mode produced
`{ id: undefined, requiredAssessmentCount: undefined }` for every subject in the
picker — i.e. the picker was broken in real mode in a way no test could see,
because the fixture matched the invented type. Replaced by a real
`SubjectListItemDto` + `SubjectMasterFieldsDto`; `mapSubjectForGrade` now renames
`subjectId`→`id` and collapses absent/`0` `requiredExamCount` → `null` (the Go
struct embeds `MasterFieldsBody` by value with no `omitempty`, so `master` is
always present and `0` means "unset" — same convention as subject-catalogue's
mapper).

### Cursor draining (packet §1)

`subject-catalogue` DOES have the established drain helper for this same
endpoint (`SubjectCatalogueRepository.fetchAllSubjectDtos`: `params: {...cursor}`
+ top-level `raw: true`, loop while `pagination.hasMore && pagination.nextCursor`).
That feature is NOT modified and its private helper is not importable across
features, so the identical pattern is reproduced inline in
`listSubjectsForGrade` (documented as such). `raw: true` sits at the TOP level of
the axios config, a sibling of `params` — asserted twice: structurally in the
unit test and behaviourally in a new real-`unwrapResponse` interceptor-pipeline
describe (the bug class from `EPIC-OVERVIEW.md` §"Bug class xuyên suốt").
The endpoint constant changed from the query-string-baked
`subjectsByGrade(gradeLevel)` to path-only `subjects` so filters + cursor travel
as axios `params`.

### Error taxonomy (packet §2)

`VALIDATION_FAILED` is `core`'s SHARED validation code (`pkg/kit/response`), not
subject-specific — mapping it blindly would misattribute a grade-scale
`letterGrades` rejection as a bad grade level. So the new failure
`invalid-grade-level` fires only when `error.fields[]` blames `gradeLevel`
(proved by a positive AND a negative test). `errorInvalidGradeLevel` added to
`FAILURE_KEY` + `messages/{vi,en}.json`.

### Doc corrections (packet §3)

- `assessment-scheme.endpoint.ts` — the "UNCHANGED — still mock-first (real GET
  /subjects has no gradeLevel filter)" comment is gone; replaced by the real
  contract + drain/`raw`-placement note.
- `assessment-scheme.di.ts` — "the `core` service is not live yet" was stale;
  now states this is a plain `USE_MOCK` gate over a FULLY real repository.
- `mock-assessment-scheme.repository.ts` — `listSubjectsForGrade` doc now states
  the contract it mirrors (single grade, ACTIVE-only, already fully drained,
  unknown grade → empty list not failure). Behavior unchanged; its tests pass
  untouched.
- **For `fe-lead` to sync:** US-E18.7's story doc + its `TEST_MATRIX` row claim
  "`listSubjectsForGrade` stays mock (real `GET /subjects` has no gradeLevel
  filter — belongs to US-E18.3)". Both halves are now inaccurate: the filter
  exists (US-177) and the call site was never mock-gated. `EPIC-OVERVIEW.md`
  Wave 6 row + ask #12 closure still to be recorded by `fe-lead`.

### Proof (run in this worktree)

- `bunx tsc --noEmit` — clean.
- `bun vitest run` — **477 files / 3562 tests pass**, zero regression.
- `bunx vitest run --config vitest.storybook.mts src/features/assessment-scheme`
  — 10/10 pass.
- `bun lint` — clean for every touched file (1 pre-existing unrelated warning +
  1 info in `features/messaging/.../message-context-menu.tsx`, untouched here).
- `NEXT_PUBLIC_USE_MOCK= bun run build` — green (real mode).

### Not done here (deliberate)

`loadSubjectsForGradeAction` still swallows a failure into `[]` (pre-existing
behavior, unchanged) — so `invalid-grade-level` is presentable but currently only
reachable through `initialError`/future callers. Changing that action's signature
(and the screen's empty-vs-error branch) is a UI-behavior change outside this
story's "wire the real filter" scope; flagged for `fe-lead` if desired.
