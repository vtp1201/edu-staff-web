---
name: project-us-e247-class-list-plan
description: US-E24.7 teacher class-list-by-role + KPI plan — key contract corrections vs packet text
metadata:
  type: project
---

Plan: `docs/stories/epics/E24-learning-class-hub/US-E24.7-class-list-by-role/PLAN.md`.

Ground-truthed against `edu-api/services/core/docs/openapi.yaml` +
`openapi.draft.yaml` (not just the packet/epic prose) and found 4 corrections:

- `absentToday`/`pendingGrading` (US-255 draft) are fields ADDED DIRECTLY onto
  `ClassResponse`'s TEACHER branch — NOT a separate per-class KPI endpoint. So
  GVBM's 2 tiles need zero extra HTTP call once BE ships (mapped in the same
  `toTeacherClass` pass); only GVCN's `attendanceRate`/`openViolations`/
  `pendingLeave` need a real per-class fan-out (`getHomeroomKpi`).
- `attendanceRate` (US-245 draft) requires `termId` and **no term-source
  helper exists anywhere in this repo** (grepped, confirmed absent) — stays
  permanently mock-only in this story regardless of draft-vs-shipped status.
- `GET /conduct/student-violations?classId=` has **no `state` query param** —
  packet's "ask #8 xác nhào param" was answerable straight from openapi.yaml:
  filter client-side for `state === "SUBMITTED"` after draining. But
  `GET /conduct/student-leave-requests?classId=` for a GVCN caller IS already
  server-filtered to SUBMITTED-only (homeroom inbox) — no client filter.
- Both violation/leave calls ARE reachable today (real, not force-mock)
  because the teacher already knows `classId` from the class list — this
  sidesteps discipline feature's usual classId-discovery blocker. Call
  `DISCIPLINE_EP.*` directly from teacher-class infra; never import
  `features/discipline` (its real repo is a permanent blocked stub).

Also: `teachingSubjectIds` is REAL/shipped (not draft, despite being new).
Subject id→name resolved via already-shipped `GET /core/api/v1/subjects`
(`ASSESSMENT_SCHEME_EP.subjects`, open to any authenticated tenant member,
only POST is ADMIN-gated) — same batch-resolve composition pattern as the
existing IAM member-name resolver in `teacher-class.repository.ts`.

Existing `class-card.tsx`/`teacher-classes-screen.i-vm.ts` predate this US
(simple `isHomeroom` boolean, icon box, 3-button footer w/ 2 coming-soon
tooltips) — v3 mockup has none of that → this is a card+VM **rewrite**, not
an additive extension.
