# Integration Map — US-E03.1 Principal Reports Dashboard

## 1. Integration Overview

- **Endpoints consumed:** 0 REAL, 5 MOCK-FIRST (INT-001..INT-005).
- **Services touched:** `core` (all 5, per service map decision `0017` — school-wide
  academic/attendance/discipline aggregation + report records are `core` bounded
  context). No `iam`/`lms`/`noti`/`social` dependency for this screen's data.
- **Reuse-vs-net-new finding (see §5):** checked existing implemented features for
  a reusable aggregation. **None found.** Every existing academic/attendance/
  discipline use-case in this repo is **per-student or per-class**, not
  **school-wide**. This screen needs a *new* rollup shape the BE `core` service
  does not yet expose — confirmed **mock-first** (decision `0014`), matching the
  requirements doc's own flag. This is a BE gap, not a web wiring gap.
- **Risk notes:**
  - All 5 data needs (stat cards, subject-average chart, attendance-trend chart,
    report list, report generation) are unconfirmed BE capabilities. Building
    against `IPrincipalReportsRepository` + mock now, swappable later without
    touching `domain/`.
  - FR-008 (generate) / NFR-004 (poll vs push) and FR-009 (Excel export) carry
    open questions — resolved as *recommendations*, not confirmed BE contracts,
    per task instructions. Flag to `ba-lead` for an ADR only if/when the BE
    contract firms up (premature to ADR a mock convention).
  - No individual student PII in any payload here — all entities are
    school-wide aggregates. Classification `Internal` holds (matches
    requirements.md's own sensitivity note); revisit if a future real payload
    embeds any student-identifiable rows in the report list.

## 2. Endpoint Catalogue

```
INT-001  Get dashboard summary (stat cards)
Service: core                         Method+Path: GET /core/api/v1/principal/reports/summary?termId={termId}
Status: MOCK-FIRST (no core endpoint exists; core service's public surface today
        only exposes per-class-subject gradebook (GRADES_EP.gradeBook), per-student
        myGrades/childGrades, and per-violation discipline records — no school-wide
        rollup. Confirmed by grep of src/bootstrap/endpoint/{grades,discipline}.endpoint.ts)
Protected: yes   Role required: principal
Request (outbound, camelCase): termId — "HK1"|"HK2"|"FULL_YEAR", selected term | none
Response payload (inbound, after envelope unwrap):
  totalStudents — number, current headcount | Internal
  totalStudentsTrend — number | null, delta vs last term (null when no baseline, FR-004) | Internal
  schoolAverage — number, 0–10 scale | Internal
  schoolAverageTrend — number | null | Internal
  attendanceRate — number, 0–100 percent | Internal
  attendanceRateTrend — number | null | Internal
  incidentCount — number, discipline incidents this term | Internal
  incidentCountTrend — number | null | Internal
Pagination: none
Errors → UI behavior:
  - NETWORK_ERROR / 5xx → generic failure → stat-card row shows scoped error state (FR-003), retry re-issues fetch | retryable
  - 403 FORBIDDEN → should not reach client (server-side role gate, FR-001/NFR-007) but if surfaced → redirect to own workspace, no data rendered
  - TERM_NOT_FOUND (assumed code) → fallback FR-002 assumption: default to most recent term/HK2 | not retryable, no user action
Empty / loading expectation: skeleton (EduSkeleton cards variant) within 320ms (NFR-003); no "empty" concept for stat cards (always 4 cards once term resolved)
```

```
INT-002  Get subject-average chart data
Service: core                         Method+Path: GET /core/api/v1/principal/reports/subject-averages?termId={termId}
Status: MOCK-FIRST (no existing endpoint; academic-records feature's
        IAcademicRecordsRepository.getRecord/listYears is per-student only —
        computing a school-wide per-subject average from many per-student
        records is not something the BE currently aggregates, and doing so
        client-side across the whole school is out of scope/expensive — this
        must be a BE rollup)
Protected: yes   Role required: principal
Request (outbound, camelCase): termId — selected term | none
Response payload (inbound, after envelope unwrap):
  subjects — array of:
    subjectId — string | Internal
    subjectName — string, already localized (mirrors SubjectScore.subjectName convention from academic-records) | Internal
    average — number, 0–10 scale | Internal
Pagination: none
Errors → UI behavior:
  - fetch failure → chart region shows scoped error (FR-003), independent of other sub-views
  - empty subjects[] → empty state (FR-007), not a rendering error
Empty / loading expectation: skeleton within 320ms; empty state if subjects.length === 0
```

```
INT-003  Get attendance-trend chart data
Service: core                         Method+Path: GET /core/api/v1/principal/reports/attendance-trend?termId={termId}
Status: MOCK-FIRST (no existing endpoint; attendance feature's
        IAttendanceRepository/AttendanceRoster is per-class-period roster data
        for marking attendance, not a school-wide weekly rate rollup — no
        existing use-case computes this shape)
Protected: yes   Role required: principal
Request (outbound, camelCase): termId — selected term | none
Response payload (inbound, after envelope unwrap):
  weeks — array of (last 6 weeks), each:
    weekLabel — string, e.g. "Tuần 1" (mock/seed data per NFR-006, not i18n catalogue) | Internal
    rate — number, 0–100 percent | Internal
Pagination: none
Errors → UI behavior:
  - fetch failure → chart region scoped error (FR-003)
  - empty weeks[] → empty state (FR-007)
Empty / loading expectation: skeleton within 320ms; rate < 96 flagged via color AND numeric-label style (NFR-001), not color alone
```

```
INT-004  List periodic reports
Service: core                         Method+Path: GET /core/api/v1/principal/reports?termId={termId}&cursor={cursor}
Status: MOCK-FIRST (no "report" feature exists anywhere in src/features — grep
        confirmed zero matches for a report-list domain entity/repository)
Protected: yes   Role required: principal
Request (outbound, camelCase): termId — selected term | none; cursor — pagination cursor | none
Response payload (inbound, after envelope unwrap): array of ReportListItem:
  id — string | Internal
  name — string, report title (mock/seed data, not i18n catalogue per NFR-006) | Internal
  term — "HK1"|"HK2"|"FULL_YEAR" | Internal
  createdAt — string, ISO date | Internal
  status — "ready" | "generating" | Internal
Pagination: cursor (meta.pagination.nextCursor / hasMore) — via useInfiniteQuery if list can exceed one page; small school-wide report lists may realistically fit one page, but contract still declares cursor support per envelope convention (decision `0008`)
Errors → UI behavior:
  - fetch failure → table region scoped error (FR-003), independent of stat cards/charts
  - empty list → dedicated empty state (FR-007), distinct from loading/error
Empty / loading expectation: skeleton (table rows variant) within 320ms; empty-state illustration/copy when zero reports for the term
```

```
INT-005  Trigger report generation ("New report", FR-008)
Service: core                         Method+Path: POST /core/api/v1/principal/reports
Status: MOCK-FIRST — stub only; FR-008 is explicitly "Should" priority pending BE
        confirmation. Recommendation below (§4) is NOT a confirmed BE contract.
Protected: yes   Role required: principal
Request (outbound, camelCase): termId — term to generate report for | none
Response payload (inbound, after envelope unwrap):
  id — string, new report id | Internal
  status — "generating" (initial state) | Internal
Pagination: none
Errors → UI behavior:
  - generation request fails → inline/toast error, periodic-reports table unaffected (FR-008 errorConditions)
Empty / loading expectation: n/a (action, not a list); new row appended optimistically or on response with status=generating, then transitions per §4 recommendation
```

## 3. Auth & Security

- All 5 endpoints: **protected**, role **principal** (server-side gate per
  FR-001/NFR-007 — route-level check in `(app)/principal/reports`, not just
  client-side hide; consistent with `roles-permissions.md`).
- No PII fields in any response payload — all entities are school-wide numeric
  aggregates or non-identifying report metadata (`Internal` sensitivity
  throughout). If a future real `core` payload adds student-identifiable rows
  to the report list, re-classify that field `Confidential` and flag an ADR.
- Bearer token handled server-side per existing pattern
  (`bootstrap/lib/http.server.ts` / decision `0018`) — no client-side token
  handling introduced by this screen.
- `termId` is the only outbound parameter across GET endpoints — no
  sensitive/PII query params.

## 4. Mock-first plan

Build against a typed `IPrincipalReportsRepository` interface (domain layer)
with a mock repository implementation
(`src/features/principal/infrastructure/reports/repositories/mocks/`), matching
the existing pattern already used in this repo (e.g.
`academic-records.mock.repository.ts`, `attendance.mock.repository.ts`,
`mock-principal-teachers.repository.ts`). Entity shapes (domain, camelCase, no
DTO/HTTP code — for `fe-component-architect`/`fe-nextjs-engineer` to implement):

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

**Recommendations for the two open BE-shaped questions (explicitly flagged as
recommendations, not confirmed contracts):**

- **FR-008/NFR-004 (report generation async mechanism):** recommend **polling**
  over push/SSE. Rationale: this is a request-triggered, one-off background job
  scoped to a single principal action (not a live multi-user event stream like
  chat/notifications, which is the `noti`/SSE use case per decision `0009`).
  Poll `GET /core/api/v1/principal/reports/{id}` (or re-fetch INT-004's list)
  at ≤10s interval while any row has `status: "generating"`, capped/backed-off
  after a bounded number of attempts (NFR-004's own measurable target). Mock
  implementation should simulate a `generating → ready` transition after a
  short fixed delay so `fe-nextjs-engineer` can build the poll loop against
  deterministic mock behavior (test with injected clock per `tdd.md`, not real
  timers).
- **FR-009 (Excel export scope):** recommend **client-side generation** from
  already-rendered dashboard data (stat cards + subject-average + attendance-
  trend + current report list page), since no BE file-generation endpoint is
  confirmed to exist. Library choice is explicitly deferred to
  `fe-state-engineer`/`fe-nextjs-engineer` — not decided here. If a BE
  file-generation endpoint for `core` surfaces later, this becomes a 6th real
  endpoint (`GET /core/api/v1/principal/reports/{id}/export`) and FR-009 error
  handling shifts from "client render failure" to "download/fetch failure" —
  re-open this doc at that point.

## 5. Reuse-vs-net-new finding (detailed)

Checked for an existing school-wide rollup before declaring mock-first, per
task instruction:

| Existing feature | Shape found | Reusable for this screen? |
| --- | --- | --- |
| `academic-records` (`IAcademicRecordsRepository`) | `getRecord(studentId, yearId?)` → **one student's** full academic history (`AcademicRecord.years[].terms[].subjects[]`); `listYears(studentId)` | **No.** Per-student only; no subject-average-across-school aggregation exists or is derivable without an expensive client-side fan-out across every student (explicitly out of scope for a dashboard fetch). |
| `attendance` (`IAttendanceRepository`, `AttendanceRoster`) | Per-class-period roster + records, used for marking/history in one class | **No.** No weekly school-wide attendance-rate rollup; shape is roster-centric, not trend-centric. |
| `discipline` (`DISCIPLINE_EP`) | Per-violation records, per-student conduct summary, per-child (parent) views | **No.** No school-wide incident-count-per-term aggregate endpoint. |
| `grades` (`GRADES_EP`) | Per-class-subject gradebook, per-student myGrades/childGrades | **No.** No cross-class/school average. |
| `principal/teachers` feature | Principal-scoped list of teachers/classes | Different domain (staffing), not applicable. |
| `principal-dashboard.tsx` (existing principal home) | Stat cards (teachers/students/classes/attendance) | **Confirms the gap**: this component's numbers are **hardcoded literals** (`"48"`, `"1,240"`, `"96.4%"`, static alerts array) — not sourced from any use-case or repository. It is not a real integration to reuse; it's further evidence no school-wide aggregation endpoint/use-case exists anywhere in this codebase yet. |
| `report` (any feature) | — | **None found.** Zero matches for a report-list domain entity/repository in `src/features/**`. |

**Conclusion:** no net-new-vs-reuse ambiguity — this is unambiguously net-new,
mock-first (decision `0014`), for all 5 endpoints. `fe-lead`/`fe-nextjs-engineer`
should build a new `principal/reports` feature module from scratch (domain
entities + `IPrincipalReportsRepository` + mock repo), not attempt to compose
existing per-student/per-class repositories into a rollup at the presentation
layer (that would smuggle aggregation logic into the client, violating Clean
Architecture's domain/infrastructure boundary and this repo's "no BE logic in
FE" constraint).

## 6. Open Questions

- `[OPEN QUESTION]` Confirm with the `core` service's BE team whether
  `/core/api/v1/principal/reports/*` (or equivalent) will actually be built, and
  under what path/shape — this doc's paths are a **web-side proposed contract**
  for the mock, not a BE-confirmed path. File a BE follow-up (per requirements
  doc's own instruction) once `core` service scoping begins.
  - **Recommendation, not decision:** if/when `core` ships, propose reusing the
    `/core/api/v1/principal/...` path prefix pattern already established by
    `GRADES_EP`/`DISCIPLINE_EP`'s `parent/children` convention, for consistency.
- `[OPEN QUESTION]` Poll interval/backoff exact values (NFR-004 says "≤10s,
  capped/backed-off after a bounded number of attempts") — left to
  `fe-state-engineer` to pick concrete numbers when wiring TanStack Query
  `refetchInterval`; not a contract decision for this doc.
- `[OPEN QUESTION]` Whether report list realistically needs cursor pagination
  at all (a school likely generates few periodic reports per term) — declared
  cursor-capable per envelope convention, but `fe-state-engineer` may reasonably
  choose a single-page `useQuery` over `useInfiniteQuery` if the mock/BE payload
  stays small. Flag to `ba-lead` only if this becomes contentious.
- No ADR raised: no new auth/token decision, no new service-map deviation
  (this screen fits cleanly under the existing `core` service per decision
  `0017`), no raw-color/token change. If `core`'s real contract later disagrees
  meaningfully with the shapes above (e.g. adds pagination differently, changes
  trend semantics), that's a contract-gap ADR trigger at that time — not now.
