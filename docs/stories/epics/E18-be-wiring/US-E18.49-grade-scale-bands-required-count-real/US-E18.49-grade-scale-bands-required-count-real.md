# US-E18.49 Grade-scale bands + assessment-column requiredCount real (BE US-189)

## Status

implemented (2026-08-07)

## Lane

normal

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm: `src/features/assessment-scheme/`
- Shared contract/file: `ASSESSMENT_EP`, `assessment-scheme.mapper.ts`, `GradeScale`/`AssessmentColumn` entities

## Ground truth (fe-lead, verified before delegating against `edu-api` local checkout, US-189)

`edu-api/services/core/docs/openapi.yaml` (~L9145-9270):

**(#10) `GradeBand` on numeric scales — now REAL, persisted:**
- `GradeBand { label: string (1-32 chars), minThreshold: string (decimal,
  maxLength 16, e.g. "8.0") }` — **`minThreshold` is a STRING**, same decimal-
  string convention as `minValue`/`maxValue` elsewhere in this schema (NOT a
  number — parse/format like the existing `minValue`/`maxValue` handling in
  this same mapper file).
- `SetGradeScaleRequest.bands` / `GradeScaleResponse.bands`: optional array,
  `maxItems: 10`. **NOT allowed on `LETTER_ABCD`** (that scale type keeps
  using `letterGrades`, unchanged). Bands must be listed **highest-first with
  STRICTLY DECREASING thresholds**, each within `[minValue, maxValue]`.
- `422 GRADE_SCALE_INVALID_BANDS` (`ERROR_CODES.md:225`) covers: bands
  supplied on `LETTER_ABCD`; empty/over-32-char `label`; unparseable
  `minThreshold` or one outside `[minValue,maxValue]`; thresholds not
  strictly decreasing; more than 10 bands. One shared code for all these
  sub-cases — if you need to distinguish them in the UI, you'll need to
  re-derive which sub-case client-side from the request you sent (BE gives
  one generic code, not per-field detail on this one — confirm, don't assume
  `error.fields[]` disambiguates).

**(#11) `requiredCount` on `AssessmentColumnRequest`/`Response` — now REAL:**
- `requiredCount: integer, minimum 1, maximum 100, nullable` — optional on
  write (omit or send `null` when unspecified); **omitted entirely** on read
  when unspecified (not `null` in the response, per the schema's own
  description — confirm this exact absent-vs-null behavior against a live
  response if possible, or trust the openapi wording: "Omitted entirely when
  unspecified").
- Explicitly documented: **"Display metadata only — the backend does not
  enforce it against recorded grade entries."** Do NOT let any UI copy imply
  enforcement (e.g. don't say "phải nhập đủ N điểm" as if the system will
  block submission short of that count — say something like "Dự kiến N bài"
  / "expected N assessments", informational only).

## Current state (read before touching anything) — exact fields to un-fake

`src/features/assessment-scheme/infrastructure/mappers/assessment-scheme.mapper.ts`:

1. **`mapGradeScale()`** (bands section): currently —
   ```ts
   const bands =
     type === "LETTER" && dto.letterGrades && dto.letterGrades.length > 0
       ? bandsFromLetterGrades(dto.letterGrades)
       : GRADE_SCALE_PRESETS[type].bands;
   ```
   For `SCALE_10`/`SCALE_4` this ALWAYS falls back to the hardcoded preset —
   `dto.bands` (now real) is never read. Fix: read `dto.bands` for numeric
   types when present, mapping `minThreshold` (wire string) → domain number
   (parse like `maxValue` is parsed elsewhere in this file); fall back to the
   preset ONLY when the real response has no bands at all (a tenant that
   never customized bands) — this fallback-to-preset-when-absent behavior is
   still legitimate UX, just no longer the ONLY path.
2. **`toSetGradeScaleRequestDto()`**: currently only ever populates
   `letterGrades` for `type === "LETTER"` — numeric types send NOTHING for
   bands today (silently discarding any customization the admin made in the
   UI, since the UI already lets admins define bands for any scale type per
   the design-spec — re-read `EPIC-OVERVIEW.md`'s ask #10 note for this
   context). Fix: for `SCALE_10`/`SCALE_4`, serialize `scale.bands` →
   `GradeBand[]` (label + `minThreshold.toFixed(1)` or similar, matching the
   wire's string-decimal convention), sorted highest-first strictly
   decreasing (validate client-side before sending — defense in depth, BE
   422s anyway but don't rely solely on that for UX quality).
3. **`mapAssessmentScheme()`**: currently `count: 1` HARDCODED with a comment
   "`count` has no wire representation — fixed non-persistent default of 1
   (ADR 0053; never sent back on write)". Fix: read `dto.requiredCount` when
   present (→ domain `count`), decide how "omitted" maps to the domain
   `AssessmentColumn.count` field (the entity currently types `count: number`
   — you likely need `count: number | null` now, since "omitted" is a real,
   meaningful state distinct from any specific count value; do NOT default
   an absent `requiredCount` to `1` — that would be inventing data, same
   class of mistake as the old hardcode, just moved).
4. **`toSetAssessmentSchemeRequestDto()`**: currently never sends `count`
   back at all (search for where `AssessmentColumnRequestDto` is built).
   Fix: send `requiredCount` when the domain `count` is set (non-null),
   OMIT the field (not `null`) when unset — check whether axios/the DTO
   layer already has a convention for "send undefined = omit the key" vs.
   needing an explicit `delete` (this repo's conditional-spread pattern from
   other tiered-response stories, e.g. `dob`/`gender` in `iam-directory`, is
   the established idiom — reuse it).
5. **UI**: the assessment-scheme editor already lets admins define bands +
   set a column's "count" (per the design-spec, already-shipped UX per
   `EPIC-OVERVIEW.md`'s ask #10/#11 notes) — this story's job is almost
   entirely REPOINTING the persistence layer to actually save/load these
   values instead of discarding them; check whether any UI copy currently
   hedges ("giá trị này không được lưu" / "not persisted" style disclaimers)
   that should now be REMOVED since it IS persisted (bands) or clarified
   (requiredCount IS persisted but NOT enforced — different nuance, keep
   an "informational only" hint for requiredCount, remove any
   "not-saved" hint for bands).
6. Client-side band validation (mirror the BE's `422 GRADE_SCALE_INVALID_BANDS`
   rules defensively): ≤10 bands, label 1-32 chars trimmed, threshold within
   `[minValue,maxValue]`, strictly decreasing highest-first. Map the 422 to a
   clear, presentable failure (new failure type, e.g. `invalid-bands`) rather
   than falling through to `unknown`.

## NOT in scope

- `letterGrades`/`LETTER_ABCD` handling — unchanged, already correct.
- Anything in `subjectsByGrade`/subject-catalogue (US-E18.3/US-E18.42,
  separate concern).
- Any change to the assessment-scheme screen's overall structure beyond
  what's needed to actually persist bands/requiredCount and remove/adjust
  stale "not persisted" hints.

## Acceptance Criteria

- Real mode: an admin can define bands for a `SCALE_10`/`SCALE_4` scale, save,
  reload, and see the SAME bands (not the hardcoded preset).
- Real mode: an admin can set a column's `requiredCount`, save, reload, and
  see the same value; an unset `requiredCount` shows as unset (not `1`, not
  `0`, not `null` rendered as a number).
- UI copy for `requiredCount` never implies BE enforcement.
- Invalid bands (per the 422 rules) surface a clear, non-generic error.
- `LETTER_ABCD` scales still reject any attempt to send `bands` (client-side
  guard, matching BE's rule).
- `USE_MOCK=true` unchanged/extended consistently.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | mapper tests (bands round-trip for SCALE_10/SCALE_4, requiredCount present/absent — never defaulted, LETTER_ABCD never sends bands), 422 mapping test |
| Integration | repository contract test for the write path (exact request body shape) |
| E2E | Storybook interaction — band editor persists + reloads, requiredCount informational copy, invalid-bands error state |
| Platform | `bun vitest run` zero-regression, `bun run build` mock+real |
| Release | merged to main, branch deleted |

## Harness Delta

- TEST_MATRIX row for bands + requiredCount real-mode.
- Close asks #10 and #11 in the FE→BE report.
- EPIC-OVERVIEW.md Wave 7 row.

## Evidence

### Ground truth re-verified against the local `edu-api` checkout

- `services/core/docs/openapi.yaml` L9145-9270 — `GradeBand{label(1..32),
  minThreshold(string,≤16)}`, `SetGradeScaleRequest.bands`/`GradeScaleResponse.bands`
  (`maxItems: 10`), `AssessmentColumnRequest.requiredCount` (int 1..100, nullable)
  / `AssessmentColumnResponse.requiredCount` ("Omitted entirely when unspecified").
- Go source confirms two behaviours the openapi alone did not pin down:
  - `internal/assessment/adapter/http/dto/grade_scale_dto.go` — `Bands
    []GradeBandResponse \`json:"bands"\`` has **no `omitempty`** ⇒ an empty set
    serialises as `null`, so the read path must treat `null` exactly like absent.
  - `.../assessment_scheme_dto.go` — `RequiredCount *int \`json:"requiredCount,omitempty"\``
    on the RESPONSE (absent = unset) vs no `omitempty` + `validate:"omitnil"` on
    the REQUEST (omit is accepted; explicit `0` is rejected). Write path omits.
  - `.../core/domain/entity/grade_scale.go` `validateBands()` — the exact rules
    behind the single `GRADE_SCALE_INVALID_BANDS` 422 (trimmed label 1..32,
    threshold inside `[minValue,maxValue]`, strictly decreasing, ≤10, plus
    "bands on a letter scale"). `docs/ERROR_CODES.md:225` confirms one shared
    code with **no `error.fields[]` disambiguation** — hence the client-side
    mirror, so the admin sees which rule broke.
  - `.../usecase/set_assessment_scheme.go` — PUT is a full replace, so an
    omitted `requiredCount` genuinely clears it (no partial-update semantics).

### Neither field is ever silently defaulted

- `count`: an omitted `requiredCount` maps to `null`, asserted both positively
  (`toEqual([null,null,null])`) and negatively (`some(c => c.count === 1) === false`).
  Adding a column in the UI now starts UNSET, not at `1`.
- `bands`: the preset is used ONLY when the numeric response carries none
  (absent / `null` / `[]`) — the real-bands test asserts
  `not.toEqual(GRADE_SCALE_PRESETS.SCALE_10.bands)`. An unparseable threshold
  falls back to the preset rather than turning `NaN` into a `0` band.

### Proof commands (run from the worktree)

| Command | Result |
| --- | --- |
| `bun vitest run` | **487 files / 3726 tests passed**, 0 failed |
| `bunx vitest run --config vitest.storybook.mts assessment-scheme` | **13 stories passed** (3 new) |
| `bunx tsc --noEmit` | clean |
| `bun lint` | clean (1 pre-existing warning + 1 info, untouched files) |
| `bun run build` | green |
| `NEXT_PUBLIC_USE_MOCK=false bun run build` | green (`✓ Compiled successfully`) |

Red→green was real: the new/updated assertions failed 21/86 before the mapper,
validator, DTO and entity changes landed.

### Test counts by file

| File | Δ tests |
| --- | --- |
| `infrastructure/mappers/assessment-scheme.mapper.test.ts` | +14 (bands read/write/round-trip, requiredCount read/write/round-trip) |
| `infrastructure/repositories/assessment-scheme.repository.test.ts` | +4 tests +1 failure-mapping case (`GRADE_SCALE_INVALID_BANDS → invalid-bands`) |
| `domain/use-cases/validate-grade-scale.use-case.test.ts` | +5 (band-rule mirrors) |
| `domain/use-cases/validate-assessment-scheme.use-case.test.ts` | +3 (null / >100 / non-integer count) |
| `presentation/.../assessment-scheme-screen.stories.tsx` | +3 interaction stories |

### UI copy

No "not persisted" hedge existed in `messages/{vi,en}.json` (the ADR-0053
limitation was only ever recorded in code comments + the ADR, both now
corrected). Added: `columnCountHint` ("Dự kiến số bài — chỉ để tham khảo, hệ
thống không bắt buộc nhập đủ." / "Expected number of assessments — for reference
only; the system does not require them all."), `columnCountPlaceholder`
("Chưa đặt"/"Not set"), `errorInvalidBands`, `errorTooManyBands`,
`errorBandLabelRequired`, `errorBandLabelTooLong`; `errorInvalidCount` reworded
to the real 1..100 integer range. No copy implies BE enforcement of the count.

### Doc sync

- `docs/TEST_MATRIX.md` — US-E18.49 row, status `implemented`.
- `docs/stories/epics/E18-be-wiring/EPIC-OVERVIEW.md` — new **Wave 7** section + row.
- `docs/reports/2026-08-06-fe-to-be-asks.md` — asks **#10/#11 marked RESOLVED**.
- `docs/decisions/0053-*.md` — Status amended: its own "Revisit if/when BE adds
  banding / a `requiredCount`-like field" follow-up has landed; the two
  now-false consequences are called out explicitly.
