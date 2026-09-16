---
name: mock-class-id-space-mismatch
description: Mock-mode class-id spaces do not intersect — any new fan-out over class ids renders EMPTY in mock mode; check fixtures before approving a fan-out
metadata:
  type: project
---

Three mock repositories use three different class-id spaces:

- `mock-teacher-class.repository.ts` → `cls-10a1`, `cls-11b2`, `cls-12c1`, `cls-10a3`
- `admin/class-management/.../mock-class-management.repository.ts` (also the
  principal class list via `makePrincipalClassesRepository`) → `c-10a1`, `c-10a2`,
  `c-11b1`, `c-12c1`, `c-12c2`
- `discipline/.../mocks/fixtures.ts` leave + conduct fixtures → the class NAME is
  used as the id (`classId: "11A2"`, `"11B2"`, `"12C1"`)

**Why:** caught on US-E24.20 (backlog #5). The teacher/principal discipline pages
replaced `getLeaveRequests({})` with a fan-out over real class ids; every mock
`classId` lookup then missed and both leave tabs went silently EMPTY in
`NEXT_PUBLIC_USE_MOCK=true` — the default demo/dev path. Unit tests never see it
(they mock the DI), `bun build` never sees it, and the story's own AC claimed
"mock mode unchanged".

**How to apply:** whenever a review covers a change from an unfiltered read to a
per-class (or per-student) fan-out, grep the mock fixtures for the id values the
fan-out will pass and confirm they intersect. Demand either aligned fixture ids
or a tolerant mock filter. See also [[exam-id-space-mismatch]] — same defect class.

**Accepted remedy (US-E24.20 fix round):** the MOCK repository — the one seam
that sees both id spaces — matches on `classId` OR the display `className` the
fan-out always supplies (`discipline.mock.repository.ts#getLeaveRequests`, with
`discipline.mock.repository.test.ts` covering `cls-…`, `c-…`, fixture-id, and
the no-params "return everything" branch). The REAL repository still sends only
`classId` on the wire and keeps `className` a display passthrough — verify that
split before approving this shape, otherwise the tolerance leaks into real mode.
