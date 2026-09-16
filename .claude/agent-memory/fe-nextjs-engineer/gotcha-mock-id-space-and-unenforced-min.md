---
name: gotcha-mock-id-space-and-unenforced-min
description: US-E24.20 fix round — a fan-out over REAL ids dies on disjoint mock id spaces (match on the shared display name at the one seam that sees both); and `min` on a date input is NOT enforced when submit is a plain button
metadata:
  type: feedback
---

**1. Replacing `execute({})` with a per-id fan-out silently empties every mock
screen whose fixtures use a DIFFERENT id space.** Discipline's leave fixtures
seeded `classId` with the class NAME (`"10A1"`), the teacher-class mock uses
`cls-10a1`, the principal class mock uses `c-10a1` — three non-intersecting
spaces that the old unfiltered call hid. **Why:** mock fixtures are written per
feature and nobody reconciles ids across features until a cross-feature call
appears. **How to apply:** whenever a change makes one feature pass another
feature's ids, diff the two id spaces FIRST. Fix it in the receiving MOCK
repository (the only seam that sees both) by matching `classId === x ||
className === y` — never by editing the fixtures or the other features' mocks
(that just moves the coupling). The display passthrough param the fan-out
already carries is usually the shared key. Regression test asserts BOTH caller
shapes (`{classId:"cls-10a1",className:"10A1"}` and `{classId:"c-10a1",…}`) so
it can't rot silently. Related:
[[pattern-page-level-fanout-and-modal-conversion]].

**2. `<input type="date" min=…>` is decorative when the submit control is a
plain `<button onClick>` outside a `<form>`** — the browser never runs
constraint validation, so a TYPED past date submits. A story asserting
`toHaveAttribute("min", iso)` passes while the guard is absent. **How to apply:**
put the rule in the disabled predicate (`startDate < minDate`) and make the
story TYPE the bad value and assert `toBeDisabled()` — fill the other required
fields first so the assertion isn't satisfied by an unrelated invalid state, and
prove red by reverting the predicate. This class of bug survived a whole story
because the attribute assertion looked like coverage.

**3. A doc that a story made false is part of that story.** Consolidating onto a
shared dialog left `docs/product/design-spec.jsonc` describing an inline panel,
a deleted field, and a client `minLength` that only ever existed server-side —
update the normative entry + add a `docs/design-changelog.md` line in the same
fix round, and keep server-only rules labelled as server-only.
