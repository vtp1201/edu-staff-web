# US-E15.3 Principal Member Schedule (index page — closes dead sidebar link)

## Status

planned

## Lane

normal

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm: `src/features/timetable/` (new thin use-case
  `get-member-timetable.use-case.ts` wrapping the ALREADY-REAL
  `IWeeklyTimetableRepository.getByMember`), `src/features/principal/`
  (reuse `get-principal-teachers.use-case.ts` as the picker source), route
  `app/[locale]/t/[tenant]/(app)/principal/schedule/page.tsx`
- Shared contract/file: `features/timetable/presentation/timetable-view/` (the
  `TimetableView` component + `child-picker.tsx` pattern — REUSE the picker
  pattern for a teacher-picker, do not fork `TimetableView` itself)

## Product Contract

Sidebar nav (`nav-config.ts`, principal role) links to `/principal/schedule`
but the route does not exist. This adds a principal-facing schedule viewer:
pick a teacher (from the existing principal teacher roster,
`get-principal-teachers.use-case.ts`, already implemented in US-E13.5) and view
that teacher's weekly timetable.

Ground-truthed reuse — **no BE gap, no mock-first needed**:
`RealWeeklyTimetableRepository.getByMember(memberId)` (US-E18.26) is already
wired to the real `GET /members/{memberId}/timetable` endpoint and is
role-agnostic (member-scoped, not caller-role-scoped) — the parent view already
calls it successfully with a CHILD's memberId; this story calls it with a
TEACHER's memberId instead. This is the exact repository primitive the
domain-layer doc comment on `IWeeklyTimetableRepository` anticipates
("the by-member fetch... backs the student self-view... and the parent's
per-child view") — extending it to a THIRD caller (principal viewing a
teacher) is additive, not a new BE integration.

## Relevant Product Docs

- No `docs/product/design-spec.jsonc` entry for this screen. Reuse the
  `TimetableView` component + the parent screen's picker pattern
  (`getChildListAction`/`initialChildId` swapped for a teacher list/id) — same
  visual layout, no new tokens.

## Acceptance Criteria

- Given a principal opens `/principal/schedule`, they see a teacher picker
  (reuse the existing principal teacher list) defaulting to the first teacher,
  and that teacher's weekly timetable renders below (reuse `TimetableView`).
- Given the principal switches teachers via the picker, the timetable
  refetches for the newly selected teacher (`getByMember(newTeacherId)`).
- Given the school has zero teachers, the picker + timetable show the existing
  empty state (reuse, no new empty-state component).
- Given the timetable fetch 404s (`TIMETABLE_MEMBER_NOT_RESOLVABLE` — no
  published schedule for that teacher), the screen shows the SAME "not
  published yet" empty state the teacher/parent views already show.
- Week navigation (prev/next) reuses the existing `week-nav.tsx`.
- WCAG 2.1 AA: picker is a proper labelled combobox/select, keyboard operable,
  focus visible, no color-only day/period distinction (already established by
  US-E15.1/E15.2 — do not regress).

## Design Notes

- Commands: none (read-only).
- Queries: `getPrincipalTeachersAction()` (existing, US-E13.5) for the picker
  source; NEW `getMemberTimetableAction(memberId, weekStart?)` Server Action →
  NEW `get-member-timetable.use-case.ts` → existing `getByMember` repository
  method (no new repository code, no new DTO).
- API: `GET /members/{memberId}/timetable?termId=` — already implemented,
  ground-truth against `TIMETABLE_VIEW_EP.memberTimetable` (no new endpoint
  constant needed).
- Domain rules: none new — reuses `toTimetableViewFailure` mapping as-is.
- UI surfaces: `app/[locale]/t/[tenant]/(app)/principal/schedule/page.tsx` (RSC)
  + a NEW small `teacher-picker.tsx` (feature-local under
  `features/timetable/presentation/timetable-view/`, sibling to
  `child-picker.tsx` — same component shape, different data source; confirm
  with `fe-component-architect` whether to extract a shared generic
  `member-picker` instead of two near-identical pickers, per decision `0026`).

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `get-member-timetable.use-case.test.ts` |
| Integration | none new (repository already covered by US-E18.26) |
| E2E | Storybook interaction: picker switch → refetch, empty state, not-published state |
| Platform | `bun build` clean |
| Release | design-review gate + a11y audit green |

## Harness Delta

Registered via `harness-cli story add --id US-E15.3`.

## Evidence

(fill after implementation)
