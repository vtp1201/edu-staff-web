---
name: pattern-status-union-extension
description: Extending a status string-union that feeds dynamic t(`ns.${status}`) — and nullable entity fields read across 4 call sites
metadata:
  type: feedback
---

When you add a member to a status string-union (e.g. ExamStatus + `submitted_pending_essay`)
that is also used as a DYNAMIC i18n key `t(`status.${status}`)`, typed next-intl breaks if
the JSON key is camelCase (`status.submittedPendingEssay`) while the union member is
snake_case. Fix: replace the dynamic `t(`ns.${x}`)` with an explicit exhaustive `switch`
mapper returning literal keys — do NOT rename the union member to match the key, and do NOT
add a duplicate snake_case JSON key.

**Why:** the JSON copy is authored by BA/UX with camelCase keys; the entity union is
snake_case (matches BE wire). They legitimately differ. A `switch` keeps both honest and
stays exhaustive (a new member fails tsc).

**How to apply:** any `Record<Union, X>` (e.g. STATUS_TONE) must also gain the new key or
tsc fails — that's the safety net telling you every call site. For nullable entity fields
(score/passed `number|null`), narrow with an `isResultFinal()` domain guard + an explicit
`if (score === null) return <PendingView/>` branch. A plain boolean guard does NOT narrow
the field type (status→score link isn't expressible), so re-check the field itself; NEVER
`?? 0`/`?? false` (fabricates wrong values). See [[gotcha-result-shape-and-dynamic-i18n]].

Discriminated answer union shared domain↔presentation: define it ONCE in the domain repo
interface (`SubmitAnswer`), re-export as the presentation `ExamAnswer` type — avoids drift.
