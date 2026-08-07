---
name: pattern-first-ui-for-a-stubbed-read
description: Un-mocking a repo method that had ZERO callers — verify the packet's claims about existing helpers, delete the fiction field, and REPLACE the mock-only surface instead of adding a second one
metadata:
  type: project
---

US-E18.48: `getConflicts()` was a permanent `[]` stub with no callers anywhere;
the story both wired it real and built its first UI.

**Verify the packet's read of existing code — it can be wrong.** The packet
described `detectConflicts()` as "a PURE client-side per-cell highlighter over
the current screen's loaded slots". Grep said otherwise: its ONLY caller is
`MockTimetableRepository`, and `presentation/` never imports it. It is the
**mock's conflict ENGINE** — the `USE_MOCK` stand-in for the BE scan. That
reframes the "should they coexist?" question entirely: they are not two
competing features, they are the two implementations of one port, so the mock
engine gets EXTENDED to match the new BE semantics (second conflict kind, the
BE's deterministic sort order) rather than kept "separate but equal".

**A method that was always `[]` in real mode leaves a fiction field.**
`TimetableData.conflicts` was hard-coded `[]` by the real mapper. Once the scan
exists, delete the field rather than leaving two conflict sources — deleting it
also revealed that the per-cell highlight had been dead in real mode all along,
and wiring the highlight to the scan fixed that for free.

**A zero-caller read still usually has a mock-only UI already.** Do NOT add the
new panel beside it (decision 0026 duplication). Here the handoff's
`ConflictSummary` was fed by the fiction field; the new `ConflictScanPanel`
REPLACED it, reusing its header shell so the visual language is unchanged.

**Two BE kinds with different enforcement need different tone AND copy.** ADR
0128: teacher clash is rejected on write, room clash is detected on read only.
Modelled as a discriminated union so `room` on a teacher conflict is a compile
error; teacher → `error` tone, room → `warning` tone + an explicit "needs manual
resolution" line. A Storybook play asserts the room row does NOT render the
teacher label.

**Other reusable bits:**
- `truncated` (bounded scan) is a HINT, never an error: render the rows AND a
  `role="status"` warning strip.
- A secondary read on a screen gets `Result<T>` + a `{status:"ok"|"error"}` VM
  union so a failed scan is structurally unable to render as "no conflicts";
  page moves to `Suspense` + `Promise.all` so the heavy tenant-wide read is not
  serial with the primary one. See [[pattern-nonblocking-overlay-query]].
- Mock parity for a bounded scan: give the mock a small cap (5) so `truncated`
  is demoable in dev without a synthetic flag — and it turns off naturally as
  the operator resolves conflicts.
- Go `omitempty` ⇒ the kind-defining field is ABSENT, not `null`/`""`. Drop
  entries that cannot be narrowed (unknown future `type`, missing field) rather
  than coercing them into an unattributable row.
- Assert the flat path explicitly: `expect(url).not.toContain("/classes/")` — a
  whole-tenant endpoint sitting next to class-scoped siblings is easy to nest by
  reflex. See [[pattern-real-mode-that-was-never-real]].
