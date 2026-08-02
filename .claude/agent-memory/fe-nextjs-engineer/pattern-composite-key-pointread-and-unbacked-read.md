---
name: pattern-composite-key-pointread-and-unbacked-read
description: US-E18.32 moderation — a ScyllaDB clustering-column id needs a whole ReportRef tuple (no bookmarkable detail URL); an UNBACKED READ degrades like an unbacked write (zero HTTP + hide the surface); stats must be their own query, proven by call count
metadata:
  type: project
---

**A `{id}` path param is not always an address.** `social`'s
`GET /reports/{reportId}` needs `filedAt` (required) + `status` echoed from the
list row, because `reportId` is a ScyllaDB *clustering column*, not a partition
key. Consequences, all worth copying:

- Model the tuple as a domain type (`ReportRef {reportId, filedAt, status}` +
  `reportRefOf(entity)`), and make EVERY point-read/CAS write take it. Then a
  call site cannot forget the key — the CAS `filedAt` on `resolve` was gap #5
  and disappeared for free.
- Ship the detail as a **Sheet opened from the row**, never a route. That is not
  a preference: a `[reportId]` segment would be a URL a user can bookmark/paste,
  and it can never resolve. A Sheet makes the constraint *structurally*
  unviolatable. Say so in the doc comment or someone will "improve" it later.
- The TanStack query key must contain the WHOLE tuple, not the id — the same
  reportId in the other status partition is a different point-read.

**An unbacked READ degrades exactly like an unbacked write.** BE closed 4 of 5
gaps; the survivor was the audit trail. Serving it from the in-memory mock
behind real reads would be a *fabricated compliance trail* — as bad as
E18.31's fake publish. Correct posture (both halves, same as a write):
repo returns a typed failure with **zero HTTP** (never point it at a
similarly-named but different endpoint — the room `moderation-audit` is a
role/mute audit), and the UI **hides the whole tab** via a
`<capability>Enabled = USE_MOCK` VM flag, including forcing a deep-linked
`?tab=audit` back to the default tab. Prove the flag with a route `page.test.ts`
in both directions. When only ONE method is unbacked, this beats a Hybrid class:
DI stays a plain `USE_MOCK ? Mock : Real`.

**Counts that "must not be derived from a filtered page" need a call-count
test, not a comment.** Separate endpoint → separate repo method → separate
action → separate `useQuery`; then assert `listReports` issues exactly ONE GET
and never hits `/stats`, and that `getReportStats` sends no params at all. Also
seed a failed RSC stats read as `null`, NEVER zeros — zeros render as a genuine
"nothing to moderate".

**Read the filter's *semantics*, not just its existence.** Two traps in one
endpoint: (a) `status=all` is deliberately unsupported (two partition walks) →
delete the tab rather than fake a client-side merge, and make the URL parser
fall back for legacy `?status=all`; (b) `contentType`/`search` run over a
BOUNDED in-app scan, so an EMPTY page with `hasMore=true` is normal → keep
"load more" rendered on the empty-filtered state or the moderator is stranded
(the E18.29 lesson, second occurrence).

**Nullability again, harder.** The wire row had no reporter identity (omitted by
DESIGN, NFR-098-01 — permanent, not a backfill gap), no content preview/author,
no duplicate count, no resolve note. Make those `| null`, keep the null all the
way to the component, and render an explicit unavailable marker
(em-dash + `sr-only` "Không có dữ liệu") — never `"Ẩn danh"`/`"Người dùng"`.
`null` (not available) and `[]` (none exist) are different facts: a
"0 duplicates" line asserts something you never learned. Also flatten
two-field lifecycles (`status × resolutionOutcome`) into the entity union and
give the third outcome its own member — mapping `ESCALATE` to `dismissed`
misreports a severity decision as a no-op.

**Vitest flake to recognise (cost 40 min):** re-registering `vi.doMock` for a
module inside a test body when `beforeEach` already mocked the SAME module is
non-deterministic in full-suite runs — the earlier factory sometimes wins.
Symptom: an ordering assertion loses one entry (`["http"]` instead of
`["refresh","http"]`), passing standalone and failing ~40% in `bun vitest run`.
Fix: register the mocks ONCE in `beforeEach` writing into a shared ordered
`calls[]` array that every case reads. Verify a fix like this by looping the
full suite 5+ times, and check `main` in a throwaway `git worktree` before
blaming your branch.
