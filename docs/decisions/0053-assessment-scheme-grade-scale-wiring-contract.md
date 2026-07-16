# 0053 Assessment-scheme + grade-scale wiring contract (US-E18.7)

Date: 2026-07-16

## Status

Accepted

## Context

US-E18.7 (epic E18 BE-wiring wave) was scoped by `EPIC-OVERVIEW.md` as a
"path fix" (drop `/config/` from grade-scale, add trailing `/terms/{termId}`
to assessment-scheme). Ground-truthing against
`edu-api/services/core/docs/openapi.yaml` + the Go domain error source
(`services/core/internal/assessment/core/domain/error/config.go`) found the
drift is much deeper, matching the pattern already documented in
US-E18.1/US-E18.2 ("MATCH label held at path level only"):

1. Grade-scale and assessment-scheme each have **separate Request vs Response
   schemas** on the wire; the web repository currently reads and writes the
   same object shape.
2. Several domain concepts the web invented for its editor UI —
   `GradeScaleBand` (threshold + `colorToken`), `AssessmentColumn.count`
   (number of sub-assessments folded into one column), and
   `AssessmentColumn.weight` validated to sum to 100 — have **no 1:1 wire
   representation**. BE's `GradeScaleResponse` only carries `letterGrades`
   for `LETTER_ABCD` scales (nothing for numeric scales); BE's
   `AssessmentColumnResponse` carries `coefficient` (an unconstrained-sum
   weighted-average multiplier, ≤10.0 per column) and `ordinal` (position),
   not `count` at all.
3. The old `mapFailure` guessed shared codes (`ASSESSMENT_FORBIDDEN`,
   `ASSESSMENT_WEIGHTS_INVALID`, `GRADE_SCALE_THRESHOLDS_INVALID`) that never
   match the real wire — ground-truthed the actual UPPER_SNAKE codes from
   `pkg/kit/response/error.go`'s `codeFromKey()` (uppercases the Go
   `apperror.AppError` i18n-key message), confirming decision `0008` holds for
   `core` (unlike `iam`, per US-E18.6's finding of a lowercase divergence
   there — the two services are NOT the same convention despite sharing the
   documented "UPPER_SNAKE" expectation).
4. The `grades` feature (US-E14.2/US-E14.4, already implemented) reuses this
   same domain `AssessmentScheme`/`GradeScale` shape unchanged
   (`calculate-weighted-average.use-case.ts`, `grade-book.entity.ts`) — the
   domain model cannot be redesigned without rippling into an already-shipped,
   already-tested feature outside this US's scope.

A decision was needed on how far to remap: reshape the domain model to match
BE 1:1 (large ripple into `grades`, arguably a redesign — high-risk lane), or
keep the domain model exactly as-is and put 100% of the translation in the
infrastructure layer (mapper + DTOs), accepting that a few UI concepts become
non-persistent/decorative under the real API.

## Decision

Keep the domain entities (`GradeScale`, `AssessmentScheme`, `AssessmentColumn`)
**unchanged** — the `grades` feature's weighted-average calculation and the
editor's client-side validation (`validate-grade-scale.use-case.ts`,
`validate-assessment-scheme.use-case.ts`) keep their exact current semantics,
not weakened. All translation happens in
`assessment-scheme/infrastructure/{dtos,mappers,repositories}`:

- **Grade scale bands**: `LETTER_ABCD` derives `bands` from the real wire
  `letterGrades` (deterministic rank→colorToken: 1st `success`, 2nd `primary`,
  middle `warning`, last `error`). `HE_10`/`HE_4_GPA` (no wire bands) fall
  back to the already-existing local `GRADE_SCALE_PRESETS[type].bands` —
  reusing data already in the codebase, inventing nothing new. Band edits for
  numeric scales are **not persisted** to BE (BE has no such concept) —
  cosmetic-only until/unless BE adds one.
- **`coefficient` ↔ `weight`**: `coefficient = weight / 10` on write,
  `weight = coefficient * 10` on read. This is a lossless, reversible unit
  scaling (not a business-rule change) for any scheme this UI creates: weight
  summing to 100 ⟹ coefficient summing to 10, always within BE's per-column
  ≤10.0 bound. A scheme created by another client with a different
  coefficient convention would round-trip into a weight-sum that fails this
  UI's own re-save validation (documented residual risk, not a blocker —
  BE's own grade calculation is unaffected either way, since BE, not this
  client, computes the weighted average from `coefficient`).
- **`ordinal`**: derived from array position at write-time (`index + 1`) —
  the web never models column reordering, so this is a safe, lossless
  encoding of "the order the admin left the columns in."
- **`count`**: zero wire representation. Reads default it to a fixed,
  non-persistent `1`; writes omit the key entirely. Same class of finding as
  US-E18.3's `restore` (web-only) / US-E18.5's roster display fields
  (BE has no source of truth) — documented, not solved here.
- **`termId`**: a genuinely new required path/response field. Added a
  lightweight `["HK1", "HK2"]` term selector to the assessment-scheme screen,
  matching the existing hardcoded-terms precedent already in this codebase
  (`teacher/teaching-plan/page.tsx`'s `MOCK_TERMS`) rather than introducing a
  new calendar-service dependency out of scope for a "path fix" US.
- **Error codes**: ground-truth from Go source (not `ERROR_CODES.md` prose
  alone, matching the US-E18.6 precedent) — full remap in `story.md` §2.
- **`listSubjectsForGrade`**: left mock-first, untouched. Real
  `GET /api/v1/subjects` has no `gradeLevel` filter (cursor-paginated by
  `status` only) — wiring it belongs to US-E18.3 (subject-catalogue), not
  duplicated here.

## Alternatives Considered

1. **Full domain redesign to match BE 1:1** (rename `weight`→`coefficient`,
   drop the sum-to-100 rule, drop bands for numeric scales, add `ordinal` as
   an explicit reorderable field). Rejected: ripples into the already-shipped
   `grades` feature's weighted-average math and UI, is a genuine semantic
   change to validation (dropping sum-to-100 counts as "weakening
   validation" — a hard-gate flag), and is a much bigger change than a
   "normal" lane path-fix US should carry. Would need its own high-risk-lane
   story if ever pursued.
2. **Skip the deep remap, ship only the literal path-string fix** (as the
   epic table literally said). Rejected: the request/response body shapes
   genuinely differ (confirmed above) — a pure path-string fix would 400/422
   on every real save and silently corrupt reads (wrong field names), which
   is worse than staying mock — matches the precedent set by US-E18.1/US-E18.2
   choosing to remap once real drift was found mid-implementation.
3. **Require BE to add a numeric-scale banding concept + a `count`-per-column
   concept before wiring at all.** Rejected for now (cross-repo ask logged,
   not a blocker) — the two config endpoints (scaleType/columns/coefficients)
   are still meaningfully real-wired; band/count are secondary, cosmetic
   sub-features of the same screen.

## Consequences

Positive:

- `grades` feature (687 already-passing tests) is fully insulated from this
  wiring change — zero ripple, matching the epic's "zero regression" AC.
- Weighted-average grade math stays byte-for-byte the client rule it always
  was; only the wire encoding of the same numbers changed.
- Error handling now actually matches real BE responses instead of silently
  falling to `unknown` for every real error (previously 100% of guessed codes
  were wrong).

Tradeoffs:

- Grade-scale band customization is decorative-only for `HE_10`/`HE_4_GPA`
  scales under the real API (no BE persistence) until BE adds the concept.
- `count` (assessments per column) is non-persistent under the real API.
- A scheme created by a hypothetical other BE client with a different
  coefficient convention could trip this UI's own weight-sum-100 validation
  on re-save (BE itself is unaffected — its grading math doesn't care).

## Follow-Up

- Cross-repo asks #10–#12 appended to
  `docs/stories/epics/E18-be-wiring/EPIC-OVERVIEW.md` (numeric-scale banding
  concept, per-column assessment count, `GET /subjects` gradeLevel filter for
  US-E18.3 coordination).
- Revisit if/when BE adds banding for numeric scales or a `requiredCount`-like
  field to `AssessmentColumnResponse`.
