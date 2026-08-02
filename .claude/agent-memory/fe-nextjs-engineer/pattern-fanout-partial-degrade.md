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

Two adjacent gotchas confirmed here:
- A row name rendered as a bare text node next to an avatar/icon span inside the
  same `<a>` is NOT findable by `getByText(name)` (the matcher works on elements;
  the `<a>`'s textContent includes the initials). Wrap the name in its own
  `<span>`.
- A feature whose older sibling screens hand-roll skeleton/empty/error markup is
  NOT a licence to repeat it — new code uses `components/shared/list-skeleton`
  `/list-error`/`empty-state` (decision 0026); call the inconsistency out in the
  commit body so the reviewer reads it as deliberate.
