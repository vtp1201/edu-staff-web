---
name: pattern-url-view-sub-zero-client
description: US-E24.4 — two URL params (?view + ?sub) replace a whole screen with zero Client Components; extract a shared fan-out by leaving the caller's test file untouched as the no-regression proof
metadata:
  type: project
---

Merging two sibling screens into one route as `?view=` + `?sub=` views
(US-E24.4: `/student/assignments` + `/student/exams` → `/student/courses`).

**Why:** the AC only named `?view=`, but putting the SUB-TAB in the URL too is
what makes the entire feature shippable with **zero `'use client'`** — every
pill and tab is a `<Link>`, the server renders only the active group, and
back/forward come free. A client toggle would have been a weaker position, not
a simpler one.

**How to apply:**

- Keep the route returning **ONE element** (`<Screen {...vm} />`) even when it
  serves several views — give the screen a `view` discriminant plus a nullable
  sub-VM (`cross: {...} | null`). Existing RSC page tests that assert
  `el.props.x` keep working, and the new views are provable from the same
  `params in → VM out` harness (no rendering needed).
- Parse params **defensively, never 404**: unknown `?view=` → default view;
  `?sub=` that the current view has no tab for → falls back (else the reader
  lands in a permanently empty group with no tab to leave by). Both parsers are
  pure fns next to the derive, unit-tested.
- Redirect the retired routes with `permanentRedirect` (308) + `tenantUrl()`;
  test by catching the `NEXT_REDIRECT;<type>;<url>;<status>;` digest (node env,
  no `next/navigation` mock) — see `students/page.test.ts` (E24.8) for the shape.

**Extracting a shared fan-out (the no-regression proof):** when a 2nd screen
needs the SAME N+1 (`listCourses` + `listItems`×N) but a different fold, move
the fan-out verbatim into a plain exported fn (`fetchCourseTimelines`), have the
old use-case call it, and **do not touch the old use-case's test file** — its
staying green unmodified IS the proof. Then give the helper its own test that
owns the degradation contract from then on.

Related: [[pattern-url-tab-shell-rsc]] (the teacher `?tab=` shell this mirrors),
[[pattern-fanout-partial-degrade]], [[gotcha-aria-label-on-span-and-tab-order]].
