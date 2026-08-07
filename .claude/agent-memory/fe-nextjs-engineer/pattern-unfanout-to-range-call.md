---
name: pattern-unfanout-to-range-call
description: US-E18.47 — collapsing an N-call-per-day FE fan-out into one BE range call on the SAME route; what the old per-day error handling was really encoding, and why the call-COUNT is the only assertion that proves the story
metadata:
  type: project
---

US-E18.47 (attendance history: `Promise.allSettled` over ≤31 per-day GETs →
one `GET …/attendance?startDate&endDate`, BE US-187).

**Why:** the packet's AC is a *cost* claim ("N days = 1 call, not N"). A
result-shape test passes identically before and after the refactor, so it
proves nothing. Only a call-count assertion can fail on a regression.

**How to apply:**

1. **Assert the count, on the filtered URL.** `get.mock.calls.filter(([url]) =>
   url === EP.x(id))` has length 1 — filtering matters because the unrelated
   roster/paginated drain uses the same `get` spy. Pick a window at the real
   upper bound (31 days) so the old code would have produced 31.
2. **Mutually-exclusive query modes need a NEGATIVE assertion.** The same route
   serves single-day (`date`) and range (`startDate`+`endDate`); sending both is
   a `400`. `expect(params).not.toHaveProperty("date")` is the guard that stops a
   future edit from re-adding the old param. One endpoint constant, two param
   shapes — no second endpoint variant needed.
3. **Read what the per-day error branch was really encoding before deleting it.**
   Old `aggregateDaySummaries` had 3 branches (fulfilled / rejected
   `ATTENDANCE_NOT_FOUND` / rejected-other → omit the day, re-throw only if ALL
   days failed). Two of them collapsed to the SAME zero-count summary, i.e. there
   was no "never recorded" vs "recorded empty" distinction to preserve — the wire
   never carried one. The third (silent per-day partial degrade) simply cannot
   exist with one call. Say both explicitly in the packet/TEST_MATRIX; "nothing
   was lost" is a claim that must be argued, not asserted.
4. **The flat range response has no per-day placeholder** — seed a zero-count
   bucket for EVERY enumerated date first, then fold records into it, and ignore
   records dated outside the range instead of inventing a day. That keeps the
   `AttendanceDaySummary[]` output contract (one row per requested day, requested
   order) so the UI diff is zero.
5. **Prove the new error codes at the REPOSITORY seam even when the failure
   mapper already lists them.** `ATTENDANCE_INVALID_DATE_RANGE` /
   `ATTENDANCE_DATE_RANGE_TOO_LARGE` were already in `INVALID_REQUEST_CODES`
   from the earlier story — the mapper unit test doesn't prove the repo actually
   lets them through `toAttendanceFailure`.
6. **A cost-justified constant survives its justification.** `MAX_HISTORY_DAYS =
   31` exists in ADR `0058` §5 *because* of the fan-out cost this story deletes.
   Leave it, flag to `fe-lead` that the ADR reasoning is now stale — changing a
   documented number silently turns a product call into an invisible one.
