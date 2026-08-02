# US-E13.9 Teacher Students Roster (index page — closes dead sidebar link)

## Status

planned

## Lane

normal

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm: `src/features/teacher/` (new use-case + presentation screen), route `app/[locale]/t/[tenant]/(app)/teacher/students/page.tsx`
- Shared contract/file: none (composes existing `list-my-classes.use-case.ts` + `get-class-students.use-case.ts`; does not touch admin-roster)

## Product Contract

Sidebar nav (`nav-config.ts`, teacher role) already links to `/teacher/students`
but no index route exists — only `teacher/students/[studentId]/academic-record`
(reachable only by direct URL, unreachable via UI). This story adds the missing
index: a read-only list of every student across all of the signed-in teacher's
classes, letting the teacher navigate into a class roster or a student's
academic record.

Ground-truthed reuse (no new BE gap): `list-my-classes.use-case.ts` (teacher's
classes) + `get-class-students.use-case.ts` (per-class roster, already real —
`teacher-class.repository.ts`) are both wired. This story adds ONE new
aggregating use-case, `list-my-students.use-case.ts`, composing them (same
"self-scope composition" pattern as `getByTeacher` in the timetable feature —
`Promise.all` across classes, de-dupe students who share ≥2 classes by
`studentId`, keep the FIRST class match for display). No admin-roster
component may be reused directly (that feature's mutations — enroll/unenroll/
transfer — are ADMIN-only and out of scope; a shared read-only list-row
component MAY be promoted to `components/shared/` if the shape is identical to
the existing `teacher-class-students-screen` roster row — check before adding a
new one, per decision `0026`).

## Relevant Product Docs

- `docs/product/screens.md` (add a row after this is delivered)
- No `docs/product/design-spec.jsonc` entry exists yet for this screen — no
  uiux Design Request either. Build BY REUSE against the existing
  `teacher-class-students-screen` visual pattern (list/table + search + class
  filter) — do not invent new tokens/layout. Flag to fe-lead if a genuinely new
  pattern is needed (it should not be).

## Acceptance Criteria

- Given a teacher with ≥1 assigned class, when they open `/teacher/students`,
  then they see every student across all their classes in one list (name,
  class, avatar-initials), de-duplicated if a student appears in >1 class.
- Given a teacher with zero assigned classes, when they open the page, then
  they see an empty state (reuse `ListSkeleton`/`ListError`/empty pattern from
  `components/shared/`, do not hand-roll a new one).
- Given the aggregating fetch partially fails (one class's roster call
  errors), the screen must not blank out the classes that DID resolve —
  degrade per-class, never all-or-nothing (mirror the `getByTeacher`
  enrollment-degrades-independently posture in timetable).
- Given a teacher clicks a student row, they navigate to that student's
  academic record (`/teacher/students/[studentId]/academic-record`) — the
  existing route, now finally reachable from the UI.
- Search/filter by name and by class (client-side filter over the aggregated
  list is acceptable — no new BE endpoint needed).
- WCAG 2.1 AA: keyboard-navigable rows, visible focus ring, list announced via
  semantic table/list markup, name is the visible+accessible label (not just an
  avatar).

## Design Notes

- Commands: none (read-only screen).
- Queries: `listMyClassesAction()` (existing) → `getClassStudentsAction(classId)`
  (existing) per class, composed by the NEW `list-my-students.use-case.ts`.
- API: `GET /classes` (teacher-scoped), `GET /classes/{classId}/students`
  (`core`, real, already wired in `teacher-class.repository.ts`) — ground-truth
  against `services/core/docs/openapi.yaml` before writing the DTO if the shape
  has drifted since US-E13.1.
- Tables: n/a (client aggregation only).
- Domain rules: de-dupe by `studentId`; keep first class encountered (stable
  order = `list-my-classes` response order).
- UI surfaces: `app/[locale]/t/[tenant]/(app)/teacher/students/page.tsx` (RSC) +
  `features/teacher/presentation/teacher-students-roster-screen/` (new,
  1-screen-only home per decision `0026` — promote to `components/shared/` only
  if a 2nd screen needs the identical row component).

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `list-my-students.use-case.test.ts` — aggregation, de-dupe, partial-failure degrade |
| Integration | none new (repositories already covered by US-E13.1) |
| E2E | Storybook interaction: list render, empty state, search filter, row → academic-record link |
| Platform | `bun build` clean |
| Release | design-review gate + a11y audit green |

## Harness Delta

Registered via `harness-cli story add --id US-E13.9`.

## Evidence

(fill after implementation)
