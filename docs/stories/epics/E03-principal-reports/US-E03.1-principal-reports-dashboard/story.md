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

Implemented by `fe-nextjs-engineer` (TDD, red→green→refactor) on branch
`feat/us-e03.1-principal-reports`. Review gate (`fe-tech-lead-reviewer` /
`fe-accessibility-auditor` / design-review / `fe-qa-playwright`) is a separate
follow-up owned by `fe-lead` — NOT self-approved here.

### Proof commands (all run in the worktree, no `--no-verify`)

| Tier | Command | Result |
| --- | --- | --- |
| Unit + Integration | `bun vitest run` | **260 files, 1439 tests passed** (incl. 46 new reports tests) |
| Storybook interaction | `bunx vitest --config vitest.storybook.mts run src/features/principal/presentation/reports` | **5 files, 15 stories passed** |
| Types | `bunx tsc --noEmit` | **exit 0** (typed i18n keys → no key drift) |
| Lint/format | `bun lint` | **exit 0** (2 pre-existing warnings in unrelated files, none in reports) |
| Build | `bun run build` | **exit 0**; `/[locale]/t/[tenant]/principal/reports` route emitted |

### New tests (map to TEST_MATRIX)

- **Unit (domain):** 5 use-case specs — thin-delegate behavior + null-trend
  pass-through + failure rethrow (15 assertions).
- **Unit (mapper):** DTO→entity, null-trend preservation, term/status literals.
- **Unit (mock repo, anti-demo AC-05.3):** fresh instance called 3× never
  rejects; `forceNextFailure` is the ONLY reject path and is one-shot (negative
  proof — no hidden default); injected-clock generating→ready transition;
  2 independent transitions (AC-07.4); no-ghost-row on generate failure
  (AC-07.3). No ordinal/counter/session forced-failure logic exists.
- **Unit (poll predicate):** `getReportsPollInterval` pure-function test
  (generating→5000ms, else false) — no fake timers (state-design §10).
- **Unit (export):** `buildReportsCsv` deterministic + comma-escaping +
  throws-on-missing-summary (no partial file).
- **Integration (repo↔HTTP):** envelope unwrap, cursor pagination read,
  error-code→failure mapping (network/term-not-found/unauthorized/generation).
- **Storybook interaction:** per-region loading/empty/error/success + chart
  `role=img`/dual-flag low-attendance + disabled-download gating + screen-level
  Success and PartialRegionError (one region errors while the other 3 succeed,
  AC-01.3).

### Judgment calls / descoping notes (for `fe-lead`)

1. **FR-009 Export Excel — shipped as client-side CSV, not binary `.xlsx`.**
   A genuine `.xlsx` needs a zip/XML dependency (new dep + ADR). Per plan.md
   D-3 / spec §8's "minimal or defer" allowance, this ships a pure,
   unit-tested client-side CSV export (UTF-8 BOM → Excel-openable, Vietnamese
   safe), triggered by the toolbar's primary "Xuất Excel" button (kept visible
   per design-spec). Zero TanStack Query involvement (state-design §6). **Flag:**
   if a true binary `.xlsx` is required, that needs a library + ADR — surfacing
   for `fe-lead`'s call.
2. **Repository convention = throwing** (`Promise<Entity>`, Server Action is the
   catch→`errorKey` boundary), per the packet's `IPrincipalReportsRepository`
   signature and the `discipline` precedent — NOT the `Result<T,F>` shape the
   sibling `principal-teachers` uses.
3. **`RegionEmptyState` takes resolved `title`/`desc` strings** (not `titleKey`)
   — typed next-intl `t()` rejects an arbitrary `string` key, so the calling
   region translates and passes strings. Minor deviation from
   component-architecture §6's `titleKey` prop, made for type-safety.
4. **`RadioGroup`/`RadioGroupItem` `variant="segmented"`** added in place
   (no fork, no new token — Radix `data-state` drives styling) per
   component-architecture §6/§8.
5. **Term-switch re-fetch is URL-driven** (`?termId=`); Storybook's static
   `useSearchParams` mock can't reflect `router.replace`, so the term-switch +
   4-region-settle interaction is left to the Playwright/E2E tier
   (`fe-qa-playwright`) per spec §10 — the SB layer proves per-region states +
   partial-failure isolation statically instead.

### Review gate results (`fe-lead`)

**`fe-tech-lead-reviewer`: Approved.** Independent re-run of `tsc --noEmit` /
`bun lint` / `bun vitest run` confirmed green (1439 tests). §0 anti-demo check
(highest-severity risk on this story) independently re-verified clean: the
mock repository's only reject path is the explicit one-shot
`forceNextFailure`, empty by default; grep of the whole reports tree +
route files for ordinal/counter/session/demo-forced-failure patterns found
none. 4 non-blocking [CONSIDER]/[nit] items noted (CSV-vs-.xlsx button copy
honesty, global `retry:1` not gated on `error.retryable`, a stale JSDoc, a
cast) — accepted as-is for this normal-lane Should-adjacent story, no rework
required.

**`fe-accessibility-auditor`: 1 blocker + 5 major + 1 minor found, ALL FIXED**
by `fe-nextjs-engineer` (commit `fb50e1f`) and re-verified green
(`tsc`/`lint`/`vitest run` 1439/`bun run build`):
- A11Y-001 (blocker) — status badge missing icon+text (FR-006/AC-04.1) → added
  `CheckCircle2`/`Loader2` icons per status.
- A11Y-002a/002b (major) — segmented-radio pill + table download button below
  44×44 touch target → `min-h-11` / `size="icon"`.
- A11Y-003 (major) — attendance chart bar-fill non-text contrast (WCAG 1.4.11,
  <3:1) → added `border-edu-warning-text`/`border-edu-success-text` (fills
  unchanged, semantics preserved).
- A11Y-004 (major) — segmented-pill selected-state text 4.41:1 → swapped to
  existing `--edu-primary-accessible` token (4.88:1); confirmed component-local
  fix using an already-existing token, not a new systemic finding.
- A11Y-005 (major) — chart `aria-label`s missing value range → interpolated
  min/max (subject chart) and lowest/highest (attendance chart) into the
  existing i18n `ariaLabel` keys.
- A11Y-007 (minor) — 2 regions' simultaneous loading announcements identical
  → `ChartSkeleton` now takes a distinct `srLabel` per region.

**impeccable / design-system conformance (`fe-lead` review):** read
`reports-screen.tsx` + `term-radio-group.tsx` + the 4 region components
against `docs/product/design-spec.jsonc`'s `screens.reports` entry — layout
`maxWidth 1200` / toolbar / charts grid (`minmax(0,3fr) minmax(0,2fr)`) /
segmented term-radiogroup all match the spec verbatim; tokens-only throughout
(no raw color found); `StatCard`/`StatusBadge`/`StatCardSkeletonGrid` reused
unmodified; no anti-pattern requiring `polish` beyond the a11y findings above
(already fixed). No conflict between impeccable guidance and the design
system encountered.

```text
Design review: pass
- design-system: conform (token/typography/component OK, verified against
  design-spec.jsonc screens.reports)
- a11y: WCAG AA OK after A11Y-001..007 fixes (blocker+5 major+1 minor, all
  resolved and re-verified); keyboard OK; reduced-motion OK (motion-safe
  inherited from Skeleton primitive, untouched)
- impeccable audit: 0 new finding beyond the accessibility-auditor's (already
  folded in above); no design-system conflict
- states: loading/empty/error/success OK per region (AC-04.7 distinctness
  confirmed in component-architecture.md + Storybook coverage); responsive
  320px grid (`grid-cols-1` → `lg:grid-cols-[...]`) confirmed by layout read;
  full 320/375/768/1280 viewport matrix left to `fe-qa-playwright`
```
