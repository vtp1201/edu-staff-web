---
name: pattern-fanout-partial-degrade
description: E13.9 cross-class aggregate — carry failedClassCount in the domain aggregate so a partial fan-out failure is announced, not silently dropped; plus two small test/query gotchas
metadata:
  type: feedback
---

When a use-case fans out over N sub-fetches and one fails, return a small
aggregate entity `{ rows, failedClassCount }` instead of a bare array, and render
a `role="status"` notice (`border-edu-warning/40 bg-edu-warning-light
text-edu-warning-foreground` is the established repo notice tone) when the count
is > 0.

**Why:** fe-lead's standing call (E13.9) — a prior epic had a MUST-FIX for a
silent data-loss bug from an unannounced partial fetch failure. "Degrade, never
all-or-nothing" is only half the rule; the other half is "never without a
signal". Silent degrade is a defect, not a simplification.

**How to apply:** only the load-bearing first call (the list you fan out FROM) is
whole-screen fatal; each per-item call degrades and increments the count. If the
composed use-case's `.execute()` always resolves a Result (never rejects), use
`Promise.all` + filter — `Promise.allSettled` is ceremony for an unreachable
rejection path.

**The aggregate has THREE states, not two.** `failedClassCount > 0 && rows.length
=== 0` (every sub-fetch failed) is NOT the empty state — rendering "you have no
X assigned" there is factually wrong copy and hides the retry. Branch on it
FIRST, render a retryable `ListError` with its own i18n keys, and suppress the
partial-degrade notice (the error card already says it). Same shape applies to
the visible-vs-announced count: if the sr-only live region announces the
FILTERED count, the visible header must too (`{count} / {total}`), or sighted
and screen-reader users read different numbers off the same table.

Canonical pager now exists: `components/shared/list-pagination` (promoted from
the two teacher roster screens). Pre-translated `navLabel`/`prevLabel`/
`nextLabel` + a `formatShowing({from,to,total})` callback — a function, not a
string, so the from/to arithmetic (the real duplication) lives in the component
while the ICU message stays at the caller. `t("showing", range)` does NOT
typecheck against next-intl's `Record<string, …>` values param; destructure and
rebuild the object literal.

Two adjacent gotchas confirmed here:
- A row name rendered as a bare text node next to an avatar/icon span inside the
  same `<a>` is NOT findable by `getByText(name)` (the matcher works on elements;
  the `<a>`'s textContent includes the initials). Wrap the name in its own
  `<span>`.
- A feature whose older sibling screens hand-roll skeleton/empty/error markup is
  NOT a licence to repeat it — new code uses `components/shared/list-skeleton`
  `/list-error`/`empty-state` (decision 0026); call the inconsistency out in the
  commit body so the reviewer reads it as deliberate.
