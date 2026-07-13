# US-E03.1 Principal Reports Dashboard

## Status

in-progress

## Lane

normal

## Dependencies

> Dùng cho parallel branch workflow (decision `0025`). Giúp fe-lead phát hiện ràng
> buộc với US team khác đang làm trước khi claim.

- Depends on: none blocking (per DR-019 / requirements.md §Dependencies)
- Blocks: none
- Feature module(s) chạm: `src/features/principal/` (net-new sub-tree
  `reports/` — domain entities, `IPrincipalReportsRepository`, mock repository,
  presentation components; matches `docs/product/screens.md`'s listed module
  for the Reports row)
- Shared contract/file: none dùng chung với US in-flight khác (net-new mock
  repository, không đụng `academic-records`/`attendance`/`discipline`/`grades`
  repositories hiện có — xem integration.md §5 reuse-vs-net-new finding)

## Product Contract

Principal-only, school-wide reports screen at `(app)/principal/reports`
(role-gated server-side, FR-001/NFR-007). A term selector (radiogroup:
Semester I / Semester II / Full year, defaulting to the BE-resolved current
term) drives four synchronized, independently-loading/erroring sub-views:

1. **Stat-card row** — 4 cards (total students, school average, attendance
   rate, incidents this term), each with a "vs last term" trend delta (omitted
   when no baseline).
2. **Subject-average bar chart** — one bar per subject (0–10 scale), every
   value also exposed as visible text; `role="img"` + descriptive `aria-label`.
3. **Attendance-trend column chart** — weekly % for the last 6 weeks, every
   value exposed as visible text; weeks with rate < 96% flagged via color AND
   distinct label style (never color alone).
4. **Periodic-reports table** — name / term / created date / status
   (ready|generating, icon+text badge) / download (disabled unless ready),
   with a dedicated empty state when the selected term has zero reports.

Plus: manual "Refresh" action (real fetch outcome only — see anti-demo
callout below), "New report" action (Should, mock-first async
generating→ready via polling), "Export Excel" action (Should, recommended as
client-side generation from already-rendered data — library choice deferred
to FE).

**Fully MOCK-FIRST (decision 0014).** No `core` (or any) BE endpoint exists
today for school-wide subject-average / attendance-trend / report-list
aggregation — confirmed by `ba-integration-analyst` grepping every candidate
feature (`academic-records` = per-student, `attendance` = per-class-period,
`discipline` = per-violation, `grades` = per-class-subject). Build against a
new `IPrincipalReportsRepository` domain interface + typed mock repository;
swap to real `core` endpoints later without touching `domain/`.

## Relevant Product Docs

- `docs/product/screens.md` — Reports row (`(app)/principal/reports`,
  `features/principal`, `reports.jsx`, DR-019).
- `docs/product/design-spec.jsonc` — `screens.reports` entry (toolbar,
  statGrid, charts, periodicReportsTable, states, a11y).
- `design_src/edu/reports.jsx` — reference mockup (`ReportsScreen`).
- `docs/design-requests/DR-019-principal-reports.md` — design request.
- This packet: `requirements.md` (TR-031), `integration.md` (INT-001..005),
  `use-cases.md` (UC-01..07, AC catalogue), `spec.md` (consolidated spec).

## Acceptance Criteria

Condensed; full Given/When/Then catalogue lives in `use-cases.md` §4 and is
consolidated with traceability in `spec.md` §3/§9. Highlights:

- FR-001/NFR-007 — non-principal (any role, incl. unauthenticated, incl. deep
  link) is redirected server-side; zero requests to
  `/core/api/v1/principal/reports/*` fire for a rejected role (AC-06.1–06.5).
- FR-002/FR-003 — term radiogroup (3 options, `role=radio`/`aria-checked`)
  drives synced re-fetch of all 4 regions; scoped partial failure and
  stale-response races are handled without discarding the new selection
  (AC-01.1–01.6).
- FR-004/FR-005 — stat cards + both charts render with mandatory visible
  numeric labels, `role="img"` + `aria-label`, and never rely on color alone
  for low-attendance flagging (AC-02.*, AC-03.*).
- FR-006/FR-007 — table renders with icon+text status badges, `disabled`-
  attribute download gating, and a dedicated empty state distinct from
  loading/error (AC-04.1–04.7).
- FR-010/FR-011 — manual refresh + real error+retry state, retry re-issues
  the same fetch, no silent infinite retry (AC-05.1, AC-05.2, AC-05.4).
- **FR-010/NFR-005 — ANTI-DEMO ASSERTION (mandatory, standalone, AC-05.3):**
  the reference mockup's `failedOnce` (first-refresh-always-fails) behavior in
  `design_src/edu/reports.jsx` is a design-review-only demo artifact and MUST
  NOT ship. Production error state triggers 1:1 with a genuine fetch failure
  only — the first refresh in a fresh session with a succeeding mock MUST
  succeed. See `spec.md` §5 dedicated callout.
- FR-008/NFR-004 (Should) — "New report" appends a `generating` row; polling
  (recommended mechanism, not confirmed BE contract) transitions it to `ready`
  without full page reload; failed generation request adds no ghost row
  (AC-07.1–07.6).
- FR-009 (Should, scope recommendation only) — Export Excel client-side
  generation from already-rendered dashboard data; full AC deferred pending
  scope confirmation (see `spec.md` §8).

## Design Notes

- Commands: `POST /core/api/v1/principal/reports` (INT-005, trigger
  generation) — MOCK-FIRST stub.
- Queries: `GET .../reports/summary`, `.../subject-averages`,
  `.../attendance-trend`, `.../reports` (INT-001..004) — all MOCK-FIRST, all
  parametrized by `termId`.
- API: see `spec.md` §6 for full request/response/error mapping per endpoint.
- Tables: none (no persistence layer here — mock repository holds in-memory
  seed data).
- Domain rules: `SubjectAverage { subjectId, subjectName, average }`;
  `AttendanceTrendPoint { weekLabel, rate }`; `ReportListItem { id, name, term,
  createdAt, status }`; `ReportsSummary { totalStudents, totalStudentsTrend,
  schoolAverage, schoolAverageTrend, attendanceRate, attendanceRateTrend,
  incidentCount, incidentCountTrend }` (all camelCase, per integration.md §4).
- UI surfaces: term radiogroup + refresh/export toolbar, 4-card stat grid, two
  charts (bar + column), periodic-reports table with header "New report"
  ghost action — layout per `design-spec.jsonc` `screens.reports`.

## Validation

When updating durable proof status, use numeric booleans:
`scripts/bin/harness-cli story update --id US-E03.1 --unit 1 --integration 1 --e2e 0 --platform 0`.

| Layer | Expected proof |
| --- | --- |
| Unit | Vitest — domain entities/use-cases (term-scoped data assembly, trend-omit-when-no-baseline rule), mock repository behavior (deterministic generating→ready transition via injected clock, NOT real timers per `tdd.md`), failure→UI-state mapping per region |
| Integration | Repository↔mock-boundary contract tests per INT-001..005 (request shape, response mapping, error→failure mapping); confirms no `failedOnce`/ordinal-forced-failure logic exists anywhere in the mock repository or query layer (AC-05.3) |
| E2E | Storybook interaction + Playwright: term-switch sync (AC-01.*), 4 region states (loading/empty/error/success), route-gate redirect (AC-06.*), anti-demo assertion (AC-05.3 — first refresh in fresh session succeeds), polling transition (AC-07.*) |
| Platform | Server-side role gate verified via network assertion (zero requests to `/core/api/v1/principal/reports/*` for non-principal, AC-06.2) |
| Release | Design-review gate (`docs/DESIGN_REVIEW.md`) green before close — chart a11y (role=img+aria-label), contrast, responsive 320/375/768/1280 |

## Harness Delta

- This story fills the pre-existing placeholder row for "Reports" in
  `docs/product/screens.md` (status `⬜` → to be updated to `🎨 design-ready`/
  `✅` by `fe-lead` per that doc's own convention once implemented — no BA-side
  edit needed now, `ba-spec-writer` does not touch code/status markers).
- No new ADR raised by this spec pass (integration.md §6 confirms: no new
  auth/token decision, no service-map deviation — fits existing `core`
  service per decision `0017`, no raw-color/token change). If BE's real
  `core` contract later disagrees meaningfully with the mock shapes in this
  packet, that is a contract-gap ADR trigger at that time, not now.
- `TEST_MATRIX.md` row to be added at `planned` status by `fe-lead`/
  `fe-planner` before implementation starts (per `tdd.md`).

## Evidence

Add commands, reports, screenshots, or links after validation exists.
