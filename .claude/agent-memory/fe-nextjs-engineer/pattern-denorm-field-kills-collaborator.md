---
name: pattern-denorm-field-kills-collaborator
description: "E18.56: BE denormalizing a field onto the row deletes a whole DI collaborator — the proof is a call-COUNT of 1, the risk is losing the degrade path's only trigger"
metadata:
  type: project
---

BE adding an `omitempty` field a FE fan-out used to compute ⇒ delete the
collaborator, not just its call site. E18.56: `academicYear` on every
academic-record row killed `enrollment-year.resolver.ts` + its endpoint builder
+ the `yearByClassId` 3rd param of the domain grouping function.

**Why:** the fan-out existed only because the field was missing; leaving it
"just in case" is exported dead code, and leaving the map parameter keeps two
sources of truth for the same key.

**How to apply:**
- The un-fan-out proof is a **call-COUNT** assertion (`get` called exactly once
  for N rows / M classes) + a DI test whose http stub **throws on any
  unexpected URL** — an absence assertion, not a happy-path one.
- Making the entity field REQUIRED (`string | null`) is deliberate: every
  `TermRecord` literal in unrelated tests fails to compile → you find all of
  them. Optional would have hidden them.
- **The degrade bucket loses its trigger.** Once every fixture row carries the
  field, the "unresolved" path becomes untested dead code. Add a wire-shaped
  fixture with the key **ABSENT** (`delete copy.field`, not `null`/`""`) and
  point the existing Storybook story at it — the FE fallback must survive
  because the wire contract still allows absence (lazy heal, best-effort).
- A grouping key that moved from an injected join to a per-row field can now
  express things the join could not (same `classId` in two years) — add that
  test; it documents why the new source is strictly better.
- Grep the deleted module's endpoint constant too: a builder like
  `studentEnrollmentPath()` can become callerless. Delete the builder, KEEP the
  path constant if another feature's verb still uses it, and say so in the doc.
