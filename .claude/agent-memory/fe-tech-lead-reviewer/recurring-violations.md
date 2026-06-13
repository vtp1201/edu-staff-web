---
name: recurring-violations
description: Issues I repeatedly flag in edu-staff-web reviews — check these early
metadata:
  type: feedback
---

Watch for these (each has bitten a story here):

- **Raw `text-white`/`bg-white` on edu-* surfaces** — engineers reach for `text-white` on
  `bg-edu-error`/`bg-edu-success` instead of the `*-foreground` token. Blocking. See [[conventions]].
  - **Special blocking case: `text-white` on `bg-edu-warning`** (`#ffae1f` yellow) ≈ 1.7:1 contrast —
    fails WCAG 1.4.3 AND the named rule in `accessibility.md` ("KHÔNG đặt text trắng trên --edu-warning
    → dùng --edu-warning-foreground" `#2A3547`). Watch for a single `text-white` shared across a
    button whose bg switches `conflictClass ? bg-edu-warning : bg-edu-primary` — the warning branch
    is the failure. (US-E12.4 add-student-panel transfer button.) Note `text-white` IS established
    precedent on `bg-edu-primary`/`bg-destructive` (shadcn button/badge, subject-catalogue) → only
    SHOULD-FIX there; warning-yellow is the hard gate.
- **Declared-but-unproduced failure types** — a `Failure` union member (e.g. `date-overlap`) with
  an i18n error key but NO use-case path that returns it = an unimplemented AC dressed up as done.
  Cross-check every AC validation rule against an actual `fail({type})` in a use-case.
- **Hardcoded Vietnamese in `.tsx`/actions** — mock-data nouns are fine, but UI-facing default
  strings (e.g. generated term name `Học kỳ N`) sent through the wire are borderline; flag if the
  string is user-visible copy rather than seed data.
- **`new Date()` in client handlers** for default values — non-deterministic; acceptable for a
  user-editable default but note it (the value becomes a real-clock dependency in any test).
- **Duplicate/placeholder i18n copy** — same message reused for two distinct slots (e.g. an info
  callout reusing `addYear.subtitle`) usually signals a missing dedicated key.

**Why:** these slip past tsc/lint/tests (all green) but violate AC or design-system gates.
**How to apply:** run the AC-rule ↔ failure-path cross-check and a raw-color grep on every UI story
before reading for style.
