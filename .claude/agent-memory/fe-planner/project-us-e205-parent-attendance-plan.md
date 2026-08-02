---
name: project-us-e205-parent-attendance-plan
description: US-E20.5 parent attendance view plan — mock-only DI (no dead real-repo class), child-switcher cross-feature reuse + its promotion trigger, AttendanceStatus type-only reuse across features
metadata:
  type: project
---

US-E20.5 (parent attendance, `/parent/attendance` dead sidebar link) plan written
2026-08-02. Key decisions, verified against code at plan time:

- **New sibling feature `src/features/parent-attendance/`**, not extending
  `features/attendance` — that feature's entities/repo (`AttendanceRoster`,
  `ClassDate`, `IAttendanceRepository`) are 100% teacher/homeroom-shaped (class
  roster on a date, day-aggregate counts). Only `AttendanceStatus` (the union
  type) is reused, and only by **type-only cross-feature import**, not by
  extending `IAttendanceRepository`.
- **`child-switcher` (`features/grades/presentation/child-switcher/`) reused
  as-is**, imported directly from a second feature. Its data source
  (`makeGetChildListUseCase()` in `grades.di.ts`) is **permanently mocked**
  (ADR 0054) — same "role model / DTO has no display fields" gap as
  timetable's `TimetableChild` had. Do not fix this in a story that just wants
  to reuse the picker; that's a separate, already-accepted gap.
- **Component-organization trigger crossed**: `child-switcher` now consumed by
  2 features (grades + parent-attendance) → per `component-organization.md`'s
  literal "≥2 screens → shared/" rule this should promote to
  `components/shared/child-switcher/`. Flagged as open question for
  `fe-component-architect`, not resolved unilaterally by the planner.
- **Mock-only DI, no dead "real" repository class**: BE's
  `GET /members/{memberId}/attendance` (edu-api openapi.yaml ~L2757)
  authorizes STUDENT-self or ADMIN/SUPER_ADMIN only — PARENT excluded, 100%
  BE-side gap (cross-repo ask already filed by fe-lead). Since there's zero
  reachable real surface (unlike grades' Hybrid/partial-real precedent), this
  plan explicitly did NOT write an unreachable real repository class "for
  contract-readiness" — that's exactly the anti-pattern the repo's own
  **US-E18.20 lesson** warns against (never claim force-mock-matching-X without
  code actually matching). DTO/mapper ARE written contract-correct (mirrors
  `MemberAttendanceResponse`/`MemberAttendanceDayRecord` 1:1) so unmocking later
  is cheap, but the repository class itself stays mock-only.
- **Status vocabulary fully reused, zero new i18n keys for status**:
  `attendance.status.*` namespace + tone map (`present→success, late→info,
  excusedAbsent→warning, absent→error`) + shared `components/shared/status-badge`
  — already established by teacher-facing `attendance-history-day-summary-row.tsx`
  (ADR 0058, 4-state model). New `parentAttendance` i18n namespace only for
  screen-local chrome (title, date-range labels), not status labels.
- **No TanStack Query / client fetch needed** — mirrors `parent/grades`'s RSC +
  URL-searchParams pattern exactly (child switch = navigation, not client
  refetch). `fe-state-engineer` explicitly not needed for this story.
