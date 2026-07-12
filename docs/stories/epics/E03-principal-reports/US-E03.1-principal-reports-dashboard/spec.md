# Feature Spec — Principal Reports Dashboard (US-E03.1)

Status: Draft   Lane: normal
Sources: `requirements.md` (TR-031, FR-001..FR-011, NFR-001..NFR-007),
`integration.md` (INT-001..INT-005), `use-cases.md` (UC-01..UC-07,
AC-01.1..AC-07.6) — all in this packet — plus `docs/product/design-spec.jsonc`
`screens.reports` entry and `docs/product/screens.md` Reports row.

---

## ⚠️ 0. MUST-READ CALLOUT — Anti-Demo-Behavior (NFR-005 / AC-05.3)

**This is called out first, on purpose, because it is the single easiest
mistake to make when building from the reference mockup.**

`design_src/edu/reports.jsx` (`ReportsScreen`) implements a `failedOnce` demo
pattern: the FIRST manual refresh in the mockup's local demo state *always*
simulates a failure (to let design review exercise the `EduError` + retry
pattern on demand), and only succeeds on the second/retried attempt.

**This is a design-review demo artifact only. It is NOT a product requirement
and MUST NOT be ported into shipped code, in any form:**

- ❌ No ordinal/counter logic ("fail on call #1, succeed after") anywhere in
  the mock repository, TanStack Query configuration, use-case, or
  presentation code.
- ❌ No session-based or timer-based forced failure.
- ❌ No "always show the error state once for demo purposes" behavior of any
  kind reaching production code paths.

**Correct production behavior (FR-011, NFR-005):** the error state for any of
the 4 dashboard regions, and for the manual-refresh action itself, triggers
**1:1 with an actual failed fetch/operation outcome** — nothing else. A fresh
session, first-ever refresh, against a mock repository configured to succeed
(the default configuration), **MUST succeed** with no error shown.

`fe-qa-playwright` verification (per AC-05.3, mandatory, standalone):

1. Inspect the mock repository source for any ordinal/counter/session-based
   forced-failure logic — must find none.
2. E2E: confirm the very first refresh in a clean browser/session context
   succeeds when the mock is in its default (success) configuration.
3. E2E: confirm an error state appears **only** when the mock/fetch layer is
   explicitly configured or forced to reject (e.g. a dedicated
   "reject once" test helper invoked by the test itself, not baked into
   default runtime behavior).

If `fe-nextjs-engineer` needs a way to *exercise* the error state for
Storybook/manual QA, it must be an explicit, opt-in test/story control (e.g. a
Storybook arg or a mock-repository constructor flag defaulting to "succeed"),
never a hidden default. See `spec.md` §5 for full state requirements.

---

## 1. Scope & Objectives

**Purpose:** give the principal a single, term-scoped view of school-wide
academic performance, attendance trend, and incident counts, plus access to
generated periodic reports, from `(app)/principal/reports`.

**In-scope:**
- Term-filtered stat cards, subject-average chart, attendance-trend chart,
  periodic-reports table (FR-002..FR-007).
- Manual refresh with real (non-scripted) loading/error/success states
  (FR-010/FR-011, NFR-005).
- Principal-only route gating, server-side (FR-001/NFR-007).
- "New report" generation as a Should-priority, mock-first async affordance
  with a recommended polling mechanism (FR-008/NFR-004).
- "Export Excel" as a Should-priority affordance, recommended scope =
  client-side generation from already-rendered data (FR-009); full AC
  deferred (see §8).

**Out-of-scope:**
- Editing/correcting underlying academic, attendance, or discipline records
  from this screen.
- Report content/detail view — only list + download affordance.
- Scheduling/automating recurring report generation.
- Any teacher/student/parent-facing reporting.

**Definitions:**
- **Term** — one of `"HK1"` (Semester I) | `"HK2"` (Semester II) |
  `"FULL_YEAR"` (Full year). Exactly one is selected at all times.
- **Region** — one of the 4 independently-loading/erroring sub-views: stat
  cards, subject-average chart, attendance-trend chart, periodic-reports
  table.
- **MOCK-FIRST** (decision `0014`) — built against a typed domain repository
  interface with a mock implementation now; swappable to a real HTTP
  implementation later without touching `domain/`.

## 2. Actors & Roles

| Role | Access | Notes |
| --- | --- | --- |
| `principal` | Full — term selection, view all 4 regions, refresh, New report (Should), Export Excel (Should) | Sole authorized role for this screen |
| `teacher` / `student` / `parent` | None | Server-side redirect to own workspace on any navigation attempt (nav link or direct URL); no report data ever fetched or rendered (FR-001, NFR-007) |
| Unauthenticated | None | Redirected to `/login`; role check never reached |

There is no partial/permission-scoped UI variant within the screen for other
roles — the negative case (redirect) IS the full role-variant coverage
(UC-06/AC-06.5).

## 3. Functional Requirements

### FR-001 — Principal-only route gate
Priority: Must. Source: TR-031/FR-001, UC-06.
"The system SHALL restrict `(app)/principal/reports` to users holding the
`principal` role for the active tenant, server-side; other authenticated
roles SHALL be redirected to their own workspace; unauthenticated users
SHALL be redirected to `/login`."
- AC (Given/When/Then):
  1. Given a principal-resolved session, When navigating to
     `/principal/reports`, Then the screen renders and UC-01's initial fetch
     begins (AC-06.1).
  2. Given a `teacher`/`student`/`parent` session, When navigating (nav or
     direct URL) to `/principal/reports`, Then redirected server-side to the
     user's own workspace, and zero requests to
     `/core/api/v1/principal/reports/*` fire (AC-06.2/06.4).
  3. Given no valid session, When navigating to `/principal/reports`, Then
     redirected to `/login` before any role check (AC-06.3).
- Dependencies: none (entry use case).

### FR-002 — Term selector
Priority: Must. Source: TR-031/FR-002, UC-01.
"The system SHALL provide a term radiogroup with exactly three mutually
exclusive options — Semester I, Semester II, Full year — defaulting to the
BE-resolved current/active semester (`[ASSUMPTION]`: Semester II if
unresolvable)."
- AC:
  1. Given first navigation this session, When the initial fetch resolves,
     Then the radiogroup shows the BE-resolved current term pre-selected
     without requiring a click (AC-01.2).
  2. Given the radiogroup is focused, When arrow keys are used, Then
     selection moves between the 3 options per native `role=radio` behavior
     with a visible focus ring (AC-01.6).
- Dependencies: INT-001..004 all accept `termId`.

### FR-003 — Term change drives synced re-fetch of all 4 regions
Priority: Must. Source: TR-031/FR-003, UC-01.
"The system SHALL re-fetch and re-render stat cards, subject-average chart,
attendance-trend chart, and periodic-reports table whenever the term
selection changes, keeping all 4 regions in sync with the selected term."
- AC:
  1. Given HK1 fully rendered, When the principal selects "Semester II",
     Then all 4 regions show their own skeleton then re-render with HK2
     data; radiogroup reflects the new selection (AC-01.1).
  2. Given a term switch where one region's fetch fails and the other 3
     succeed, Then only the failed region shows error+retry; the newly
     selected term is not discarded, other regions render normally
     (AC-01.3).
  3. Given rapid HK1→HK2→Full-year switching before HK1 resolves, When the
     stale HK1 response arrives after Full-year is active, Then it is
     discarded — screen reflects Full-year only (AC-01.4, race).
- Dependencies: FR-002; INT-001..004.

### FR-004 — Stat cards with trend
Priority: Must. Source: TR-031/FR-004, UC-01 (implicit render step).
"The system SHALL render 4 stat cards (total students, school average,
attendance rate, incidents this term), each with a 'vs last term' trend
delta, for the selected term; the trend indicator SHALL be omitted (not
shown as a misleading 0%) when no prior-term baseline exists."
- AC:
  1. Given INT-001 resolves with all trend fields non-null, Then all 4 cards
     show current value + trend delta labeled "so với HK trước"/"vs last
     term".
  2. Given a trend field resolves `null` (no baseline), Then that card omits
     the trend indicator entirely rather than showing 0%.
- Dependencies: INT-001.

### FR-005 — Subject-average + attendance-trend charts, text-exposed values
Priority: Must. Source: TR-031/FR-005, UC-02, UC-03.
"The system SHALL render a subject-average bar chart (one bar per subject,
0–10 scale) and an attendance-trend column chart (weekly %, last 6 weeks),
with every data value also exposed as visible text, not chart-only; both
charts SHALL carry `role=\"img\"` with a descriptive `aria-label`; weeks with
attendance rate < 96% SHALL be flagged via both color AND numeric-label
style, never color alone."
- AC:
  1. Given INT-002 resolves with ≥1 subject, Then the chart renders one bar
     per subject with a visible numeric label per bar (AC-02.1) and
     `role="img"` + summarizing `aria-label` (AC-02.2).
  2. Given INT-003 resolves with 6 weeks, Then the chart renders one column
     per week with a visible "%" label per column (AC-03.1); weeks with
     `rate < 96` are flagged via color AND distinct label style, verified by
     the label style differing even with color simulated as removed
     (AC-03.2).
  3. Given `subjects: []` or `weeks: []`, Then the dedicated empty state
     (FR-007 pattern) renders, distinct from loading/error, NOT a rendering
     error (AC-02.3, AC-03.4).
- Dependencies: FR-002/FR-003; INT-002, INT-003.

### FR-006 — Periodic-reports table
Priority: Must. Source: TR-031/FR-006, UC-04.
"The system SHALL render a periodic-reports table (columns: name, term,
created date, status, download) scoped to the selected term; status SHALL be
communicated via icon+text badge, never color alone; download SHALL be
disabled via the `disabled` attribute (not opacity alone) unless
`status === \"ready\"`."
- AC:
  1. Given INT-004 resolves with ≥1 report, Then all 5 columns render;
     status is an icon+text badge (AC-04.1).
  2. Given a row `status: "generating"`, Then its download action carries
     the `disabled` attribute, is unreachable via Tab, and re-enables
     automatically on transition to `"ready"` (AC-04.2, see UC-07).
- Dependencies: FR-002/FR-003; INT-004.

### FR-007 — Periodic-reports empty state
Priority: Must. Source: TR-031/FR-007, UC-04.
"The system SHALL show a dedicated empty state for the periodic-reports
table when the selected term has zero reports, visually and structurally
distinct from loading and error states; stat cards and charts SHALL continue
to render independently even when the report list is empty."
- AC:
  1. Given INT-004 resolves with `[]` for the selected term, Then a
     dedicated empty-state illustration/copy replaces the table while stat
     cards/charts render their own (possibly non-empty) data independently
     (AC-04.3).
  2. Given loading, empty, and error states in isolation, Then no two of the
     three are visually/structurally identical (AC-04.7).
- Dependencies: INT-004.

### FR-008 — "New report" generation (Should)
Priority: Should. Source: TR-031/FR-008, UC-07. Conditioned on mock-first
per integration.md (no confirmed BE contract).
"The system SHALL provide a 'New report' action that requests generation of
a new report for the selected term (mock-first, INT-005); on success a new
row SHALL appear with `status: \"generating\"`, later transitioning to
`\"ready\"` (see NFR-004); on request failure, no ghost row SHALL be added."
- AC:
  1. Given INT-005 resolves successfully, Then a new row appears immediately
     with `status: "generating"` and a disabled download (AC-07.1).
  2. Given INT-005 itself rejects, Then an inline/toast error is shown and
     NO new row is added (AC-07.3).
  3. Given 2 reports are simultaneously `"generating"`, When a poll cycle
     runs, Then a single re-fetch covers both, each transitioning
     independently (AC-07.4).
- Dependencies: INT-005; FR-006 (table it appends to); NFR-004 (transition
  mechanism).

### FR-009 — "Export Excel" (Should, scope-recommended)
Priority: Should. Source: TR-031/FR-009. **Full AC deferred** — not one of
the 7 UCs modeled in use-cases.md (see §8 Open Questions). Recommendation
(integration.md §4, not a confirmed contract): client-side generation of a
`.xlsx` file from already-rendered dashboard data (stat cards +
subject-average + attendance-trend + current report-list page) for the
currently selected term.
"The system SHALL provide an 'Export Excel' action that produces a `.xlsx`
file covering the current term's dashboard view, generated client-side from
already-fetched data (recommendation, pending confirmation)."
- AC (minimal, provisional — expand once scope confirmed):
  1. Given dashboard data is loaded for the selected term, When "Export
     Excel" is clicked, Then a `.xlsx` file download is triggered containing
     the visible stat/chart/table data for that term.
  2. Given client-side generation fails (e.g. malformed data), Then an
     inline/toast error is shown; no partial/corrupt file is offered.
- Dependencies: FR-002 (term scope); library choice deferred to
  `fe-state-engineer`/`fe-nextjs-engineer` (not decided in this spec).

### FR-010 — Manual refresh
Priority: Must. Source: TR-031/FR-010, UC-05.
"The system SHALL provide a manual 'Refresh' action that re-fetches all
sub-views for the currently selected term, showing a loading state during
refresh, then success/error strictly per actual fetch outcome (see §0
anti-demo callout)."
- AC:
  1. Given a success state, When "Refresh" is clicked, Then a brief loading
     indicator appears and the screen re-renders with fresh data on success
     (AC-05.1).
  2. Given the mock/fetch layer is configured to reject, When "Refresh" is
     clicked, Then the affected region(s) show real error+retry, triggered
     strictly by that rejection (AC-05.2).
  3. Given refresh is pending, Then the button shows `aria-busy="true"` +
     spinner and cannot be clicked again until resolution (AC-05.4).
- Dependencies: FR-011.

### FR-011 — Real error state + retry
Priority: Must. Source: TR-031/FR-011, UC-05 (**+ §0 anti-demo callout is
the load-bearing rule here — read it first**).
"The system SHALL show an error state with retry whenever a reports data
fetch (initial load or refresh) actually fails, driven strictly by real
fetch outcome — never a scripted/demo failure (NFR-005)."
- AC:
  1. **AC-05.3 (mandatory, standalone)** — Given a fresh session with the
     mock repository configured to succeed (default), When the principal's
     first-ever refresh/initial load runs, Then it succeeds with NO error
     shown — no ordinal/counter/session-based forced-failure logic exists
     anywhere in shipped code.
  2. Given a retry is clicked and the re-issued fetch also genuinely
     rejects, Then the error state persists (same message + retry) with no
     silent infinite retry loop (AC-04.5, applies per-region).
- Dependencies: none (foundational).

## 4. Non-Functional Requirements

| NFR | Requirement | Measurable target | QA verification |
| --- | --- | --- | --- |
| NFR-001 A11y | Charts not color/value-only; every datum visibly labeled; `role="img"`+`aria-label`; status badges icon+text; radiogroup/download keyboard-operable | WCAG 2.1 AA — contrast ≥4.5:1 body, ≥3:1 UI/large text; zero color-only information; all interactive elements keyboard-reachable with visible focus ring | `/impeccable audit`; manual keyboard-only pass; automated axe/contrast check in Storybook |
| NFR-002 Responsive | Stat grid, chart row, table must not break narrow | No horizontal overflow/broken layout at 320px; verified at 375/768/1280px; stat grid auto-fit wrap; charts stack below 2-col breakpoint | Playwright viewport matrix 320/375/768/1280 |
| NFR-003 Performance | Loading feedback appears promptly | `EduSkeleton` (cards/chart/table-rows variant per region) visible within 320ms of navigation/term-change if data unresolved | Playwright timing assertion on skeleton mount |
| NFR-004 Performance (Should, provisional) | Async report-generation status reflected without full reload | Recommended: poll ≤10s interval while any row `generating`, capped/backed-off after bounded attempts (exact numbers left to `fe-state-engineer`) | Injected-clock unit test of poll loop (no real timers, per `tdd.md`); E2E confirms in-place row update, no navigation event |
| NFR-005 Security/Correctness | Production error UX driven solely by genuine failures — **see §0** | Zero ordinal/counter/session forced-failure logic in shipped code; first refresh in fresh session with default-success mock succeeds | Source inspection (no `failedOnce`-style logic) + E2E per AC-05.3 |
| NFR-006 i18n | All UI copy in `messages/{vi,en}.json` under `reports` namespace; subject names/week labels/report titles are mock/seed data, not catalogue | Zero hardcoded user-facing strings in `.tsx` outside messages; vi source + en mirror present for every key used | `bunx tsc --noEmit` (typed keys) + hardcoded-string grep (Vietnamese diacritics) per `i18n.md` |
| NFR-007 Security | Server-side role check, not client-side hide | Direct navigation by non-principal rejected/redirected server-side | E2E network assertion: zero requests to `/core/api/v1/principal/reports/*` for rejected role |

## 5. UI States & Flows

Each of the 4 regions (stat cards, subject-average chart, attendance-trend
chart, periodic-reports table) independently supports all 4 required states:

| State | Stat cards | Subject chart | Attendance chart | Reports table |
| --- | --- | --- | --- | --- |
| Loading | `EduSkeleton` cards variant, ≤320ms | Chart-shaped skeleton, ≤320ms | Chart-shaped skeleton, ≤320ms | `EduSkeleton` table-rows variant, ≤320ms |
| Empty | n/a — always 4 cards once term resolved | `subjects: []` → dedicated empty state (FR-005/FR-007 pattern) | `weeks: []` → dedicated empty state | `reports: []` for term → dedicated empty state; stat cards/charts unaffected |
| Error | Scoped error+retry, independent of other regions | Scoped error+retry | Scoped error+retry | Scoped error+retry; retry fails again → error persists, no loop |
| Success | 4 cards + trend (trend omitted if no baseline) | Bars + numeric labels + `role=img`/`aria-label` | Columns + %labels + low-attendance dual-flag + `role=img`/`aria-label` | Rows with icon+text status badge, disabled-attribute download gating |

**Key flow — term-change sync (UC-01):** term selection → 4 parallel fetches
issued for the new `termId` → each region independently skeletons then
renders/errors → stale (previous-term) responses arriving late are discarded,
never overwrite the currently-selected term's render (AC-01.4).

**Key flow — manual refresh (UC-05): see §0 above — this is the flow the
anti-demo assertion governs.** Refresh re-issues the current term's fetch(es);
success/error is 1:1 with the real outcome, never a scripted first-failure.

**Key flow — report generation + polling (UC-07, provisional mechanism):**
"New report" click → INT-005 POST → success appends a `generating` row (no
row on failure) → poll cycle (≤10s, recommended) re-fetches the list while
any row is `generating` → matching row flips to `ready` in place, download
enables, no full page reload → polling stops when no `generating` rows
remain.

## 6. Data & Integration

All 5 endpoints below are **MOCK-FIRST** (integration.md; decision `0014`) —
no `core` (or any) BE endpoint exists for this screen's aggregation shapes
today. Build against domain interface `IPrincipalReportsRepository` with a
mock implementation in
`src/features/principal/infrastructure/reports/repositories/mocks/`.

**Domain entities (camelCase, no DTO/HTTP concerns):**
```ts
interface SubjectAverage { subjectId: string; subjectName: string; average: number }
interface AttendanceTrendPoint { weekLabel: string; rate: number }
interface ReportListItem {
  id: string; name: string; term: "HK1" | "HK2" | "FULL_YEAR";
  createdAt: string; status: "ready" | "generating";
}
interface ReportsSummary {
  totalStudents: number; totalStudentsTrend: number | null;
  schoolAverage: number; schoolAverageTrend: number | null;
  attendanceRate: number; attendanceRateTrend: number | null;
  incidentCount: number; incidentCountTrend: number | null;
}
```

### INT-001 — Dashboard summary (stat cards)
- Service: `core` (MOCK-FIRST) — `GET /core/api/v1/principal/reports/summary?termId={termId}`
- Auth: protected, role `principal`
- Request: `termId` — `"HK1"|"HK2"|"FULL_YEAR"`
- Response: `ReportsSummary` (see above)
- Errors → UI: network/5xx → stat-card region scoped error, retry re-issues
  fetch (retryable); 403 → should not reach client (server gate), if surfaced
  → redirect; `TERM_NOT_FOUND` → fallback to most recent term/HK2
  (`[ASSUMPTION]`, not retryable)
- Pagination: none. Loading: `EduSkeleton` cards, ≤320ms. No empty concept
  (always 4 cards once term resolved).

### INT-002 — Subject-average chart data
- Service: `core` (MOCK-FIRST) — `GET /core/api/v1/principal/reports/subject-averages?termId={termId}`
- Auth: protected, role `principal`
- Request: `termId`
- Response: `{ subjects: SubjectAverage[] }`
- Errors → UI: fetch failure → chart region scoped error, independent of
  other regions; `subjects: []` → empty state (FR-007), not a rendering error
- Pagination: none. Loading: chart skeleton, ≤320ms.

### INT-003 — Attendance-trend chart data
- Service: `core` (MOCK-FIRST) — `GET /core/api/v1/principal/reports/attendance-trend?termId={termId}`
- Auth: protected, role `principal`
- Request: `termId`
- Response: `{ weeks: AttendanceTrendPoint[] }` (last 6 weeks)
- Errors → UI: fetch failure → chart region scoped error; `weeks: []` →
  empty state
- Pagination: none. Loading: chart skeleton, ≤320ms. `rate < 96` flagged via
  color AND numeric-label style (NFR-001), not color alone.

### INT-004 — List periodic reports
- Service: `core` (MOCK-FIRST) — `GET /core/api/v1/principal/reports?termId={termId}&cursor={cursor}`
- Auth: protected, role `principal`
- Request: `termId`; `cursor` (optional, pagination)
- Response: `ReportListItem[]`
- Pagination: cursor-based (`meta.pagination.nextCursor`/`hasMore`, envelope
  convention decision `0008`); realistically a school generates few reports
  per term — `fe-state-engineer` may reasonably choose single-page `useQuery`
  over `useInfiniteQuery` (integration.md §6 open note, low priority).
- Errors → UI: fetch failure → table region scoped error; empty `[]` →
  dedicated empty state (FR-007), distinct from loading/error.
- Loading: `EduSkeleton` table-rows variant, ≤320ms.

### INT-005 — Trigger report generation ("New report")
- Service: `core` (MOCK-FIRST, stub only — Should priority) — `POST /core/api/v1/principal/reports`
- Auth: protected, role `principal`
- Request: `termId`
- Response: `{ id: string; status: "generating" }` (initial state only —
  never returns `"ready"` synchronously)
- Errors → UI: generation request fails → inline/toast error, table
  unaffected, no ghost row added.
- Async transition (`generating` → `ready`): **recommended mechanism =
  polling** (not confirmed BE contract) — re-fetch INT-004's list (or a
  per-report status endpoint) at ≤10s interval while any row is
  `generating`, capped/backed-off after a bounded number of attempts (exact
  numbers deferred to `fe-state-engineer`). Mock implementation should
  simulate the transition after a short fixed delay, testable via injected
  clock (`tdd.md`), not real timers. If BE later ships a push channel
  (noti/SSE, decision `0009`) instead, this mechanism-level detail is
  superseded; the user-visible outcome (row appears/transitions/no ghost
  rows on failure) is unaffected.

### Auth & security (all 5 endpoints)
- All protected, role `principal`, server-side gate at the route level
  (FR-001/NFR-007) — never client-side-only hide.
- No PII in any payload — all entities are school-wide numeric aggregates or
  non-identifying report metadata (`Internal` sensitivity). Re-classify to
  `Confidential` + flag an ADR if a future real payload adds any
  student-identifiable row to the report list.
- Bearer token handled server-side per existing pattern
  (`bootstrap/lib/http.server.ts`, decision `0018`) — no new client-side
  token handling introduced.
- `termId` is the only outbound query parameter across GET endpoints.

## 7. Use Case Summary

| UC ID | Title | FR coverage | AC count |
| --- | --- | --- | --- |
| UC-01 | Select term — synced re-fetch of all dashboard regions | FR-002, FR-003 | 6 (AC-01.1–01.6) |
| UC-02 | Subject-average bar chart render + text/table fallback | FR-005 | 6 (AC-02.1–02.6) |
| UC-03 | Attendance-trend chart render + text fallback | FR-005 | 6 (AC-03.1–03.6) |
| UC-04 | Periodic-reports table — load/empty/error/success | FR-006, FR-007 | 7 (AC-04.1–04.7) |
| UC-05 | Manual refresh — real-failure-only error state (NFR-005) | FR-010, FR-011 | 4 (AC-05.1–05.4) |
| UC-06 | Principal-only route gate | FR-001, NFR-007 | 5 (AC-06.1–06.5) |
| UC-07 | Report generation status transition (polling, provisional) | FR-008, NFR-004 | 6 (AC-07.1–07.6) |

FR-009 (Export Excel) has no dedicated UC in this pass — see §8.

## 8. Constraints & Assumptions

**Technical constraints:**
- All 5 backing endpoints are MOCK-FIRST; no real `core` service contract
  exists yet for this screen's aggregation shapes (confirmed by exhaustive
  grep of existing features — see integration.md §5).
- Report generation async mechanism (poll vs. push) is a **recommendation**,
  not a confirmed BE contract.
- Excel export implementation scope (client-side vs. BE file) is a
  **recommendation**, not confirmed; library choice explicitly deferred to
  `fe-state-engineer`/`fe-nextjs-engineer`.

**Confirmed [ASSUMPTION]s:**
- Default term selection = BE-resolved current/active semester, or Semester
  II if unresolvable.
- Trend deltas compare to the immediately preceding term; omitted (not shown
  as 0%) when no preceding term exists.
- "New report" generation is asynchronous (status starts `generating`, later
  `ready`) rather than synchronous.
- Excel export scope resolution deferred to integration analysis
  (recommendation given, not confirmed).
- An authenticated user with an unresolved/pending role for the current
  tenant is treated as non-principal until resolved (redirected, UC-06 A1).

**[GAP] / [CONFLICT] / [OPEN QUESTION] (all carried from requirements.md,
integration.md, use-cases.md — none introduced here):**
- `[OPEN QUESTION]` Which `core`/`lms` endpoint(s), if any, will actually
  back this screen's 5 data needs, and under what real path/shape? This
  spec's paths (`/core/api/v1/principal/reports/*`) are a web-side proposed
  contract for the mock, not BE-confirmed. File a BE follow-up once `core`
  service scoping begins.
- `[OPEN QUESTION]` Exact poll interval/backoff numeric values (NFR-004) —
  left to `fe-state-engineer`.
- `[OPEN QUESTION]` Whether report-list cursor pagination is realistically
  needed at all — `fe-state-engineer` may choose single-page `useQuery`.
- `[OPEN QUESTION]` UC-03/AC-03.2: only one attendance threshold (<96%) is
  specified — should a second, more severe band (e.g. <90%) get distinct
  treatment? Not specified; flag to `ba-lead` before chart contract is
  finalized.
- `[OPEN QUESTION]` UC-04 edge matrix: exact pagination UX for the reports
  table (load-more vs. infinite scroll vs. none) — unresolved, left to
  `ba-lead`/`fe-state-engineer`.
- `[OPEN QUESTION]` UC-07: if a term-change re-fetch happens while a report
  is `generating` for a DIFFERENT term, should polling for that row
  continue, pause, or stop? Recommendation: continue in background (reports
  outlive the currently-viewed term) — judgment call, not a confirmed rule.
- `[OPEN QUESTION]` UC-07/E3: should a single failed poll attempt (transient
  network error, not a generation failure) surface a user-visible error, or
  retry silently on the next interval? Leaning silent-retry (consistent with
  NFR-005's spirit) but not explicitly specified.
- `[OPEN QUESTION]` FR-009 (Export Excel) full AC were explicitly out of
  scope for the use-case-modeling pass — a dedicated UC-08 + AC set should be
  written once export scope is confirmed or `fe-state-engineer` commits to
  the client-side-render recommendation as shipped behavior. §3/FR-009 above
  gives a minimal provisional AC set to unblock initial implementation.
- `[OPEN QUESTION]` Whether `role=principal` resolution can genuinely be
  "pending/unresolved" as a transient state for this specific route, or
  whether the app's auth model guarantees resolution by render time — assumed
  the latter is more likely true elsewhere in the app, not verified against
  this specific route in this pass.
- No `[CONFLICT]` identified across requirements.md / integration.md /
  use-cases.md for this story — all three inputs are internally consistent
  (this is itself notable and confirmed, not a gap).

## 9. Traceability Matrix

| Requirement | Source | Use Case(s) | Integration(s) | Priority |
| --- | --- | --- | --- | --- |
| FR-001 Principal-only route gate | TR-031/FR-001 | UC-06 | none (gate precedes all fetches) | Must |
| FR-002 Term selector (3 options) | TR-031/FR-002 | UC-01 | INT-001..004 (all accept `termId`) | Must |
| FR-003 Term change syncs all 4 regions | TR-031/FR-003 | UC-01 | INT-001, INT-002, INT-003, INT-004 | Must |
| FR-004 Stat cards + trend | TR-031/FR-004 | UC-01 (render step) | INT-001 | Must |
| FR-005 Subject/attendance charts, text-exposed | TR-031/FR-005 | UC-02, UC-03 | INT-002, INT-003 | Must |
| FR-006 Periodic-reports table | TR-031/FR-006 | UC-04 | INT-004 | Must |
| FR-007 Reports empty state | TR-031/FR-007 | UC-04 | INT-004 | Must |
| FR-008 New report generation | TR-031/FR-008 | UC-07 | INT-005 (+ poll of INT-004) | Should |
| FR-009 Export Excel | TR-031/FR-009 | none dedicated (§8) | none (client-side, recommendation) | Should |
| FR-010 Manual refresh | TR-031/FR-010 | UC-05 | INT-001..004 (re-issue) | Must |
| FR-011 Real error state + retry (§0 anti-demo) | TR-031/FR-011 | UC-05 | INT-001..004 | Must |
| NFR-001 A11y (charts, badges, keyboard) | TR-031/NFR-001 | UC-01, UC-02, UC-03, UC-04 | INT-001..004 | Must |
| NFR-002 Responsive 320–1280px | TR-031/NFR-002 | UC-02, UC-03, UC-04 | n/a | Must |
| NFR-003 Perceived performance (skeleton ≤320ms) | TR-031/NFR-003 | UC-01..04 | INT-001..004 | Must |
| NFR-004 Async status reflection (poll/push) | TR-031/NFR-004 | UC-07 | INT-005 (+ INT-004 poll) | Should |
| NFR-005 No scripted demo failure (§0) | TR-031/NFR-005 | UC-05 (AC-05.3) | INT-001..004 | Must |
| NFR-006 i18n | TR-031/NFR-006 | all UCs (copy) | n/a | Must |
| NFR-007 Server-side role check | TR-031/NFR-007 | UC-06 | none (pre-fetch gate) | Must |

## 10. Handoff to FE

**What `fe-lead` should build:**
- New feature sub-tree `src/features/principal/reports/` (domain entities,
  `IPrincipalReportsRepository` interface, mock repository implementation,
  presentation components) — net-new, no reuse of existing per-student/
  per-class repositories (integration.md §5 explicitly warns against
  smuggling aggregation logic into the presentation layer).
- Route `(app)/principal/reports` with server-side role gate (RSC-level
  check, consistent with the existing `(app)/admin/layout.tsx` pattern per
  `screens.md`'s admin-namespace-guard note).
- 4 independently-stated regions (stat cards / subject chart / attendance
  chart / reports table), each wired to its own TanStack Query key so
  loading/empty/error/success is scoped per region, not global.
- Term radiogroup driving all 4 query keys' `termId` param.
- Manual refresh action + "New report" (Should) + "Export Excel" (Should)
  per §3/FR-008/FR-009.
- **Read §0 before writing the mock repository or refresh logic** — do not
  port `design_src/edu/reports.jsx`'s `failedOnce` pattern.

**Suggested lane:** normal (per story.md; no high-risk markers — no auth/
payment/irreversible-action surface here).

**Design references:** `design_src/edu/reports.jsx` (`ReportsScreen`,
reference mockup — note the `failedOnce` demo caveat, §0) and
`docs/product/design-spec.jsonc` `screens.reports` entry (toolbar, statGrid,
charts, periodicReportsTable, states, a11y — normative layout values).

**Proof owed (maps to TEST_MATRIX rows):**
- Unit: domain entity/use-case tests (trend-omit-when-no-baseline,
  term-scoped data assembly), mock repository poll-transition test with
  injected clock, failure→region-scoped-state mapping.
- Integration: repository↔mock-boundary contract tests per INT-001..005;
  a dedicated test asserting NO ordinal/counter/session-based forced-failure
  logic exists in the mock repository or query layer (AC-05.3 proof).
- E2E: term-switch sync (AC-01.*), all 4 states × 4 regions, route-gate
  redirect + network assertion (AC-06.2/06.4), anti-demo assertion (fresh
  session first refresh succeeds, AC-05.3), polling transition in place
  without navigation (AC-07.2).
- Design-review gate: chart `role=img`+`aria-label`, contrast, responsive
  320/375/768/1280, before story close.
