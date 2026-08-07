---
name: pattern-unfake-non-persistent-field
description: E18.49 — un-faking a field an earlier ADR declared "client-only/non-persistent"; absent-vs-null on the wire, omit-vs-null on write, and why "no wire representation" defaults are the bug
metadata:
  type: project
---

# Un-faking a field a prior ADR called "non-persistent"

E18.49 (BE US-189): grade-scale `bands` + assessment-column `requiredCount` had
been recorded by ADR 0053 as "client-only, never sent back". BE later shipped
both. **Why:** an earlier wiring story's *documented limitation* is a claim with
an expiry date — when BE closes it, the old workaround becomes an active data
bug (band edits silently discarded on save; a fabricated `count: 1` on read).
**How to apply:** when a packet says "field X is now real", grep the ADR that
declared it fake and amend its Status — the stale ADR is drift, and its own
"Revisit if/when…" follow-up is usually the exact thing that just landed.

## The two default-shaped bugs to hunt

1. **Unconditional preset fallback.** `mapGradeScale()` did
   `type === "LETTER" ? derive : PRESETS[type].bands` — the preset was not a
   fallback, it was the ONLY path for numeric scales. Fix keeps the preset but
   only when the response truly carries none. Prove it with
   `expect(bands).not.toEqual(PRESETS.SCALE_10.bands)`, not just a positive assert.
2. **Hardcoded scalar with a "no wire representation" comment.** `count: 1`.
   The replacement must NOT re-default: absent → `null`, and the entity widens
   to `number | null` because "unset" is a real state. Lock it with a NEGATIVE
   assertion (`some(c => c.count === 1) === false`) — a positive `toEqual([null])`
   alone would still pass a `?? 1` written later.

## Wire-shape traps (openapi alone did not say)

- Go `Bands []GradeBandResponse \`json:"bands"\`` (**no** `omitempty`) ⇒ empty
  serialises as **`null`**, not `[]`, not absent. Read path must treat all three
  identically → DTO type `bands?: T[] | null`.
- Response `RequiredCount *int \`json:",omitempty"\`` = absent when unset;
  Request has no `omitempty` but `validate:"omitnil"` ⇒ omit is fine, explicit
  `0` is rejected. So write with a conditional spread (`...(x !== null ? {k:x} : {})`)
  and assert `Object.keys(dto)` — `toEqual` hides an `undefined` value.
- A decimal-string field (`minThreshold`, like `minValue`/`maxValue`) needs a
  parse-failure branch. Falling back to the preset is honest; `Number("n/a")`
  becoming a `0`-threshold band is inventing data.
- PUT is a full replace (checked the Go use-case) ⇒ omitting genuinely clears.

## One 422 code covering N sub-cases

`GRADE_SCALE_INVALID_BANDS` bundles label/threshold/order/count/wrong-scale-type
with **no `error.fields[]`**. Map it to one failure (`invalid-bands`) and mirror
the BE's rules client-side so the admin sees WHICH rule broke. Mirror carefully:
the ≤10 cap is numeric-scales-only (a LETTER scale serialises up to 64
`letterGrades`), so the validator needs a `scaleType` param — a required 3rd
param is better than a defaulted one (2 call sites, compiler finds them).

## Copy nuance: persisted ≠ enforced

`requiredCount` is explicitly "display metadata only — the backend does not
enforce it". Removing a "not saved" hedge is right for `bands`; for
`requiredCount` the hint must STAY, reworded to informational
("Dự kiến N bài", never "phải nhập đủ"). Also: a newly added row must start
UNSET — seeding it with `1` persists a value the admin never chose.

Related: [[pattern-real-mode-that-was-never-real]],
[[pattern-tiered-response-widening]], [[pattern-unmock-anticipatory-dto]].
