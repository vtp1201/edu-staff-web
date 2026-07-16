# US-E18.7 Assessment scheme + grade scale wiring — path fix + DTO remap

## Status

in-progress

## Lane

normal

## Dependencies

- Depends on: US-E18.0 (gateway smoke, proof-of-pattern — implemented).
- Blocks: none.
- Feature module(s) chạm: `src/features/assessment-scheme/**` (domain
  untouched except adding `termId`/`effectiveFrom` fields; infra dtos/mappers/
  repository rewritten), `src/features/assessment-scheme/presentation/
  assessment-scheme-screen/**` (adds a small Term selector, reusing the
  existing `Select` pattern from `teaching-plan`'s
  `subject-class-term-selector.tsx`), `src/app/[locale]/t/[tenant]/(app)/
  admin/assessment/{page.tsx,actions.ts}`, `src/bootstrap/di/
  assessment-scheme.di.ts` (+ `ensureFreshSession`), `src/bootstrap/di/
  grades.di.ts` (thread a `termId` default through the already-existing but
  currently-dormant real-branch call to `getAssessmentScheme`).
- Shared contract/file: `messages/{vi,en}.json` `assessmentScheme.*` namespace
  — REUSE existing keys, add only the genuinely new ones (server error codes
  that had no prior mapping, term-selector labels). No other in-flight branch
  (solo mode, confirmed via `git fetch --prune` — remote has only `origin/main`).

## Product Contract

The epic table (`EPIC-OVERVIEW.md` Wave 2) labels this US "path" drift:
drop `/config/` from `grade-scale`, add trailing `/terms/{termId}` to
`assessment-schemes`. Ground-truthing against
`edu-api/services/core/docs/openapi.yaml` (lines ~2000–2166) confirmed the
path-level fix but also found the same pattern documented in US-E18.1/US-E18.2
("MATCH held at path level only, DTO audit found real drift") — here the drift
is deeper again: **both endpoints have separate Request vs Response schemas
that don't match the web's read/write-the-same-object assumption, and several
domain concepts the web invented (band thresholds/colors, "count" per column,
"weight sums to 100") have zero wire representation.**

### 1. Path fix (as labeled)

| Web (old) | Real (`core/docs/openapi.yaml`) |
| --- | --- |
| `GET/PUT /core/api/v1/config/grade-scale` | `GET/PUT /core/api/v1/grade-scale` (no `config/` segment) |
| `GET/PUT /core/api/v1/subjects/{subjectId}/assessment-schemes/{yearLabel}` | `GET/PUT /core/api/v1/subjects/{subjectId}/assessment-schemes/{yearLabel}/terms/{termId}` |

`termId` is a genuinely new required path param (`AssessmentSchemeResponse`
requires it too — `academicYearLabel` + `termId` are both on the wire). The
web screen has never modeled term at all (only grade level → subject → year).
No existing calendar/term-service round trip is wired to this screen, so —
matching the precedent already in this repo (`teaching-plan`'s
`MOCK_TERMS = ["HK1", "HK2"]` constant, no calendar fetch) — this US adds the
same lightweight, hardcoded `["HK1", "HK2"]` term selector rather than
inventing a new calendar-integration dependency out of scope. This is the one
genuinely-new (if minimal) piece of UI in this "wiring-only" story — see
§Design Notes for the a11y/design-review implication.

### 2. Error taxonomy (ground-truthed, not guessed)

Read `services/core/internal/assessment/core/domain/error/config.go` (Go
source, not just `ERROR_CODES.md` prose — matches the precedent from
US-E18.6, which found IAM's convention diverges from the documented one).
For `core`, `pkg/kit/response/error.go`'s `codeFromKey()` uppercases every
`apperror.AppError` message key (`"grade_scale_forbidden"` →
`"GRADE_SCALE_FORBIDDEN"`) before it reaches the wire — **decision `0008`
(UPPER_SNAKE) holds for `core`**, unlike `iam` (US-E18.6 finding). The old
`mapFailure` in this repository guessed a single shared `ASSESSMENT_FORBIDDEN`
/`ASSESSMENT_WEIGHTS_INVALID`/`GRADE_SCALE_THRESHOLDS_INVALID` — none of these
strings exist on the wire; every real error would have silently fallen to
`"unknown"`.

| Real wire `error.code` | HTTP | Old (never matched) | New `AssessmentSchemeFailure` |
| --- | --- | --- | --- |
| `GRADE_SCALE_FORBIDDEN` | 403 | `ASSESSMENT_FORBIDDEN` | `forbidden` (kept, shared with assessment-scheme) |
| `GRADE_SCALE_NOT_FOUND` | 404 | `GRADE_SCALE_NOT_FOUND` (already correct) | `not-found` (kept) |
| `GRADE_SCALE_INVALID_TYPE` | 400 | *(unmapped)* | `invalid-scale-type` (new) |
| `GRADE_SCALE_LETTER_GRADES_REQUIRED` | 422 | `GRADE_SCALE_THRESHOLDS_INVALID` (never matched) | `letter-grades-required` (new, replaces the guessed type) |
| `ASSESSMENT_SCHEME_FORBIDDEN` | 403 | `ASSESSMENT_FORBIDDEN` | `forbidden` (kept) |
| `ASSESSMENT_SCHEME_NOT_FOUND` | 404 | `ASSESSMENT_SCHEME_NOT_FOUND` (already correct) | `not-found` (kept) |
| `ASSESSMENT_SCHEME_COLUMN_IN_USE` | 409 | *(unmapped — new BE concept)* | `column-in-use` (new) |
| `ASSESSMENT_SCHEME_MAX_COLUMNS` | 422 | *(unmapped)* | `max-columns` (new) |
| `ASSESSMENT_SCHEME_INVALID_COLUMN` | 400 | `ASSESSMENT_WEIGHTS_INVALID` (never matched — wrong semantic, "weights sum to 100" is a web-only client rule, not a BE check) | `invalid-column` (renamed — real check is name/type/coefficient/duplicate-ordinal, not weight-sum) |

`SUBJECT_NOT_FOUND` (used by `listSubjectsForGrade`, out of this US's real
scope — see §4) stays mapped to `not-found`, unchanged.

### 3. DTO / mapper remap (request ≠ response on the wire)

**Grade scale** — `SetGradeScaleRequest{scaleType, minValue?, maxValue?,
letterGrades?, effectiveFrom}` vs `GradeScaleResponse{tenantId, scaleType,
minValue?, maxValue?, letterGrades?, effectiveFrom, updatedAt}` (all numeric
fields are wire **strings**, e.g. `"10.0"` — not JSON numbers). `scaleType`
enum is `HE_10|HE_4_GPA|LETTER_ABCD`, mapped to the existing domain
`SCALE_10|SCALE_4|LETTER`.

The domain `GradeScale.bands` (with `colorToken`, continuous-coverage
`minThreshold`) is a **web-only presentational concept BE does not model for
numeric scales** — `GradeScaleResponse` only carries `letterGrades` (used
when `scaleType === LETTER_ABCD`) and `minValue`/`maxValue` bounds. Decision
(kept consistent with the calc consumer, `grades` feature, which reuses this
same domain `AssessmentScheme`/`GradeScale` shape untouched — see
`src/features/grades/domain/entities/grade-book.entity.ts` — so the domain
model must NOT change):

- Read: `scaleType === LETTER_ABCD` with a non-empty `letterGrades` → derive
  `bands` from the real letters (sorted desc by `minScore`, `colorToken`
  assigned by rank: 1st `success`, 2nd `primary`, middle `warning`, last
  `error` — deterministic, cosmetic only, never sent back). Otherwise
  (`HE_10`/`HE_4_GPA`, BE carries no bands) → fall back to the existing local
  `GRADE_SCALE_PRESETS[type].bands` (already in
  `grade-scale.entity.ts` — no new data invented, reuses what's already
  there).
- Write: `minValue = "0"`, `maxValue = String(scale.maxScore)`; `letterGrades`
  populated ONLY for `LETTER` type, derived from the edited bands (each band's
  `minThreshold` → `minScore`, next-higher band's threshold minus 0.1 (or
  `maxScore` for the top band) → `maxScore`); omitted for numeric types (BE
  schema allows it optional). `effectiveFrom` is a genuinely new required wire
  field the domain didn't have — added `effectiveFrom: string` (ISO
  date-time) to `GradeScale`, round-tripped from the last GET, defaulted to
  `new Date().toISOString()` when there is no prior read (first-ever save).

  **Residual risk (documented, not blocking)**: band threshold/color
  customization for `HE_10`/`HE_4_GPA` scales has **no BE-side persistence** —
  editing bands for those two types is decorative only until/unless BE adds a
  banding concept for numeric scales. Flagged as a cross-repo ask below.

**Assessment scheme** — `SetAssessmentSchemeRequest{columns: [{name,
columnType, coefficient, ordinal}]}` (no `subjectId`/`yearLabel`/`termId` in
the body — those are path params only) vs `AssessmentSchemeResponse{tenantId,
subjectId, academicYearLabel, termId, columns: [{columnId, name, columnType,
coefficient, ordinal}], updatedAt}`.

- `columnId` ↔ domain `id`; `name` ↔ `label`; `columnType` passthrough
  (`TX|GK|CK`, already matches).
- `coefficient` (BE: `number`, `exclusiveMinimum: 0, maximum: 10.0`, no
  sum-to-100 rule — a coefficient-weighted average, mathematically equivalent
  to a percentage-weighted one under a constant scale factor) ↔ domain
  `weight` (`1–100`, must sum to 100, enforced by
  `validate-assessment-scheme.use-case.ts` — kept **unchanged**, not weakened).
  Mapping: `coefficient = weight / 10` (write), `weight = coefficient * 10`
  (read) — a lossless, reversible unit scaling for schemes this UI creates
  (weight always sums to 100 ⟹ coefficient always sums to 10, safely under the
  10.0-per-column max even in the degenerate single-column case). **Residual
  risk (documented)**: a scheme created by some OTHER client with coefficients
  that don't follow this repo's `/10` convention (BE doesn't enforce any
  particular sum) would read back as weights not summing to 100, which this
  UI's own `validateAssessmentScheme` would then reject on next edit — grade
  calculation itself is unaffected (BE owns weighted-average math), only this
  admin editor's re-save path. Flagged as a cross-repo ask below.
- `ordinal` (BE required, position) has no domain field — the web never
  models column reordering (no drag/move-up/down in
  `assessment-scheme-screen.tsx`). Derived from array index (`i + 1`) at
  write-time; not carried in the domain entity.
- `count` ("số lần kiểm tra" — number of individual assessments folded into
  one column) has **zero wire representation** — not in
  `AssessmentColumnRequest`/`AssessmentColumnResponse` at all. BE's grade-entry
  model (`GradeEntryResponse`, keyed by
  `classId+subjectId+termId+studentMemberId+columnId`) implies one value per
  column per student, not multiple raw sub-scores — this field describes a
  concept BE doesn't support without further product/BE work (out of scope,
  same class of finding as US-E18.5's roster fields / US-E18.3's `restore`).
  Decision: on real reads, `count` defaults to a fixed non-persistent `1`
  (existing UI element stays, but stops reflecting saved state); never sent on
  write (BE ignores unknown JSON fields; the request DTO simply omits the
  key). Flagged as a cross-repo ask below.

### 4. Out of scope (left mock, explicit)

`listSubjectsForGrade` (`ASSESSMENT_EP.subjectsByGrade`) stays **mock-first,
unchanged** by this US. Ground-truthing `GET /api/v1/subjects` found it has
**no `gradeLevel` query filter** — only `status` + cursor pagination
(`SubjectResponse` does carry a `gradeLevel` field, so filtering would have to
happen client-side across a paginated fetch). This call site legitimately
belongs to US-E18.3 (subject-catalogue wiring, not yet done per
`EPIC-OVERVIEW.md`) — wiring it here would duplicate/conflict with that US's
real listing work. Left as a forward note in `EPIC-OVERVIEW.md`.

## Relevant Product Docs

- `docs/product/design-spec.jsonc` — assessment-scheme screen entry (layout
  unchanged; only the new Term selector is additive, styled with the existing
  `Select`/`Label` primitives already used by the grade-level/subject
  selectors on the same screen — no new tokens).
- `docs/TEST_MATRIX.md` row `US-E12.6` (original screen) — this US updates it
  in place (still one screen, now BE-real for these two endpoints).

## Acceptance Criteria

- `GET/PUT /core/api/v1/grade-scale` (no `config/` prefix) and
  `GET/PUT /core/api/v1/subjects/{subjectId}/assessment-schemes/{yearLabel}/terms/{termId}`
  are the paths the real repository calls.
- Repository maps real request/response DTOs (strings for numeric wire
  fields, `coefficient`↔`weight` unit conversion, `ordinal` derived from
  array order, `letterGrades`↔`bands` per §3) with unit-tested mappers.
- `mapFailure` branches on the ground-truthed UPPER_SNAKE codes in §2; no
  guessed code strings remain.
- `validateAssessmentScheme`/`validateGradeScale` client-side rules are
  **unchanged** (not weakened) — this US only fixes the wire translation.
- A minimal `["HK1", "HK2"]` term selector is added to the assessment-scheme
  screen (reusing the existing `Select` pattern), gating
  `onLoadAssessmentScheme`/`onSaveAssessmentScheme` on a selected term; a11y
  parity with the existing grade/subject selectors (label, keyboard, 44px
  target).
- Mock repository updated to require/accept `termId` and simulate the new
  shape truthfully (doesn't just keep the old 2-arg signature).
- `ensureFreshSession()` wired into `assessment-scheme.di.ts`'s `!USE_MOCK`
  branch before `createServerHttpClient()` (playbook step 6).
- `grades.di.ts`'s dormant real-branch `resolveScheme` call is updated to
  pass a `termId` (default `"HK1"`, consistent with its existing default
  `subjectId`/`yearLabel` params) — compiles and stays functionally
  equivalent (still `USE_MOCK` in practice; not exercised by grades' own
  tests today via the mock path).
- Full existing test suite stays green (zero regression) + `bun run build`.

## Design Notes

- Commands: `saveGradeScaleAction`, `saveAssessmentSchemeAction` (unchanged
  server-action shape; validation still runs client-side before the repo
  call).
- Queries: `loadSubjectsForGradeAction` (unchanged, stays mock),
  `loadAssessmentSchemeAction` (gains a `termId` param).
- API: see §1–§4 above.
- Tables: none (no DB — this is a BE-consuming FE repo).
- Domain rules: `validateAssessmentScheme`/`validateGradeScale` unchanged.
- UI surfaces: `assessment-scheme-screen.tsx` gains one small `Select` (Term)
  next to the existing grade-level/subject selectors — same visual pattern,
  no new tokens, no layout change beyond the added control. Because this is a
  genuine (if minimal) UI addition, `fe-tech-lead-reviewer` +
  `fe-accessibility-auditor` run in parallel as usual, and the change goes
  through the design-review gate before closing — NOT treated as a11y/DR
  "n/a", since UI was touched (unlike the pure-repository US-E18.6).

## Validation

`scripts/bin/harness-cli story update --id US-E18.7 --status implemented --unit 1 --integration 1 --e2e 0 --platform 0` once proof exists below.

| Layer | Expected proof |
| --- | --- |
| Unit | Mapper tests (grade-scale request/response round trip incl. `letterGrades`↔`bands`, coefficient↔weight scaling, ordinal-from-index) + `mapFailure` new-code branches. |
| Integration | Real repository test against the new paths/shapes (mocked `AxiosInstance`) + updated `MockAssessmentSchemeRepository` tests (now term-scoped). |
| E2E | Storybook interaction covering the new Term selector states (no term selected / HK1 / HK2, load error). |
| Platform | `tsc --noEmit`, `bun lint`, `bun run build`, full `bun vitest run` zero-regression vs baseline. |
| Release | tech-lead + a11y verdicts, design-review gate PASS. |

## Harness Delta

- `US-E18.7` row added to `docs/TEST_MATRIX.md` (new row, separate from the
  original `US-E12.6` screen row — this US is the BE-wiring increment).
- ADR `0053` registered (see `docs/decisions/0053-assessment-scheme-grade-scale-wiring-contract.md`)
  for the wire-mapping conventions (coefficient scaling, letterGrades/preset
  fallback, non-persistent `count`).
- `EPIC-OVERVIEW.md` Wave 2 row annotated **Done** + cross-repo asks #10–#12
  appended.

## Evidence

(added after implementation + review)
