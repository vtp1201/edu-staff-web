# US-E20.5 Parent Attendance View (index page — closes dead sidebar link)

## Status

planned

## Lane

normal

## Dependencies

- Depends on: US-E20.4 (reuses the same child-selection UX/entity —
  `LinkedStudentSummary` — build after or alongside, share the picker if one is
  extracted there)
- Blocks: none
- Feature module(s) chạm: new `src/features/parent-attendance/` (or extend
  `src/features/attendance/` with a parent-facing use-case — decide with
  `fe-component-architect`/`fe-state-engineer` which module boundary fits; the
  existing `attendance` feature is entirely teacher/homeroom-scoped today, so a
  new sibling module is the more likely fit per Clean-Architecture
  per-feature convention), route
  `app/[locale]/t/[tenant]/(app)/parent/attendance/page.tsx`
- Shared contract/file: child picker — reuse `child-switcher`
  (`features/grades/presentation/child-switcher/`) rather than fork a third
  picker (timetable already has one, grades has one — this is the visual
  pattern to reuse, not the timetable one, since `child-switcher` is the
  "child + subject/scope" combo already used for `parent/grades`).

## Product Contract

Sidebar nav (`nav-config.ts`, parent role) links to `/parent/attendance` but
the route does not exist. This adds a per-child attendance history view for
the parent: pick a child, see their attendance records over a date range
(present/absent/late/excused).

**Ground-truthed BE gap (mock-first required, decision `0014`):**
`GET /members/{memberId}/attendance` (`core`, `services/core/docs/openapi.yaml`
line ~2757) is explicitly documented "Authorization: STUDENT (self only) or
ADMIN/SUPER_ADMIN" — **PARENT is not in the allowed-caller list**. This mirrors
the recurring "the role model structurally excludes this actor" pattern already
seen in this epic (US-E18.24) and in the timetable child-name gap (ask #20) —
it is a genuine BE gap, not a client bug. Build this screen **mock-first**
against `NEXT_PUBLIC_USE_MOCK` + `bootstrap/lib/mock.ts` (decision `0014`), and
fe-lead files a new cross-repo ask for edu-api's BE team to add PARENT to the
`getMemberAttendance` authorization list (or introduce a
`GET /parents/{id}/children/{childId}/attendance` parent-scoped variant) before
this can be un-mocked. Do NOT attempt to force-call the real endpoint with the
parent's own token — it will 403 by design, not by accident.

## Relevant Product Docs

- No `docs/product/design-spec.jsonc` entry for this screen. Reuse the
  existing attendance status badges/tone mapping (`attendance-status.entity.ts`,
  `class-status-tone.ts`-style semantic tokens) — present/absent/late/excused
  already have an established token mapping elsewhere in the app; do not invent
  new colors.

## Acceptance Criteria

- Given a parent with ≥1 linked child, `/parent/attendance` shows a child
  picker (reuse `child-switcher`) defaulting to the first child, and that
  child's attendance history for a sensible default range (e.g. current month)
  below.
- Given the parent switches children, the attendance list refetches for the
  newly selected child.
- Given a parent with zero linked children, the page shows the existing
  no-child empty state (consistent with `parent/grades`).
- Status is never conveyed by color alone (icon/label required per
  `.claude/rules/accessibility.md`).
- Mock-first: the screen is fully functional against
  `NEXT_PUBLIC_USE_MOCK=true` fixtures; when unmocked in a real environment the
  real repository throws a typed `forbidden`/`not-implemented` failure that
  degrades to an honest "not available yet" state rather than crashing (same
  posture as other mock-first BE gaps in this repo).
- WCAG 2.1 AA: date-range control and picker keyboard-operable, focus visible,
  table/list semantics for the attendance rows.

## Design Notes

- Commands: none (read-only).
- Queries: NEW `get-child-attendance.use-case.ts` (mirrors
  `get-child-grades.use-case.ts`'s shape) → mock repository only for now (real
  repository implementation may still be written contract-correct and force-
  routed to mock via a Hybrid composite, matching the `HybridWeeklyTimetableRepository`
  precedent — but ONLY if the real implementation is actually exercised
  somewhere; otherwise keep it mock-only and note the gap plainly, per the
  US-E18.20 lesson: never claim "force-mocked, matching X" without the code
  actually matching).
- API: none real yet (see BE gap above) — mock fixture shape can mirror
  `MemberAttendanceResponse` from `services/core/docs/openapi.yaml` so the DTO
  is ready to wire the day PARENT is added to that endpoint's ACL.
- Domain rules: date range validation mirrors BE's documented constraints
  (`endDate >= startDate`, ≤366 days) even in mock mode, so behavior doesn't
  change when unmocked later.
- UI surfaces: `app/[locale]/t/[tenant]/(app)/parent/attendance/page.tsx` (RSC)
  + `features/parent-attendance/presentation/parent-attendance-screen/` (new).

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `get-child-attendance.use-case.test.ts`, date-range validation |
| Integration | mock repository test only (no real HTTP boundary yet) |
| E2E | Storybook interaction: child switch → refetch, empty state, status badges render with icon+label |
| Platform | `bun build` clean |
| Release | design-review gate + a11y audit green |

## Harness Delta

Registered via `harness-cli story add --id US-E20.5`. Cross-repo ask filed:
"add PARENT to `GET /members/{memberId}/attendance` authorization (or a
parent-scoped child-attendance endpoint)" — track in the FE→BE asks report.

## Evidence

(fill after implementation)
