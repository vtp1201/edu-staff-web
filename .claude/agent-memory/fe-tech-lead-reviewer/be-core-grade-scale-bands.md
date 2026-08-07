---
name: be-core-grade-scale-bands
description: core grade-scale `bands` + assessment-column `requiredCount` wire contract (BE US-189) and the absent-vs-null traps
metadata:
  type: reference
---

Ground-truthed 2026-08-07 against `../edu-api/services/core` (US-189), consumed by US-E18.49.

- `GradeBand { label 1..32, minThreshold: STRING decimal maxLength 16 }`. `bands` is
  `maxItems: 10` on NUMERIC scales only (`HE_10`/`HE_4_GPA`); `LETTER_ABCD` uses
  `letterGrades` (`maxItems: 64`) and bands on a letter scale is a 422.
- Asymmetric Go tags (the trap): RESPONSE `Bands []GradeBandResponse json:"bands"` has **no
  `omitempty`** ⇒ empty arrives as `null`, so the read path must treat `null` === absent.
  RESPONSE `RequiredCount *int json:"requiredCount,omitempty"` ⇒ unset is **absent**, never
  `null`. REQUEST `RequiredCount *int json:"requiredCount" validate:"omitnil,min=1,max=100"` ⇒
  OMIT the key when unset (conditional spread); explicit `0`/out-of-range is rejected.
- `entity/grade_scale.go` `validateBands()`: trimmed label 1..32 runes, `numericWithin
  [minValue,maxValue]`, strictly decreasing in array order, ≤10. ALL of these collapse into ONE
  `422 GRADE_SCALE_INVALID_BANDS` with **no `error.fields[]`** — by design (validation-oracle
  avoidance, BE story Info-3). So a client-side mirror is the only way to tell the admin which
  rule broke; the failure key is a legitimate backstop, not the primary UX.
- `requiredCount` is **display metadata only — BE does not enforce it** against recorded grade
  entries. Any UI copy implying enforcement is a story-level defect.
- PUT set-grade-scale / set-assessment-scheme are FULL REPLACE — an omitted field genuinely
  clears it server-side.
- Consequence for review: FE `mapGradeScale()` may keep `GRADE_SCALE_PRESETS` as a fallback for
  absent/`null`/`[]` bands, but the preset must NOT be the unconditional path (that was the
  ADR-0053-era bug). Watch precision on write: `toFixed(1)` is lossless only while the band
  threshold input keeps `step="0.1"`.
