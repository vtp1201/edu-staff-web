# Implementation Plan — US-E03.1 Principal Reports Dashboard

## 1. Summary

**Feature:** Term-scoped principal reports dashboard — 4 stat cards, subject-average
bar chart, attendance-trend column chart, periodic-reports table, manual refresh,
"New report" (Should) with polling status transition, "Export Excel" (Should).
**Lane:** normal. **Route:** `(app)/principal/reports` (nav entry `reports` /
`FileText` already present in `nav-config.ts` — no nav change needed).
**Design source:** `design_src/edu/reports.jsx` (`ReportsScreen`) +
`docs/product/design-spec.jsonc` → `screens.reports` (toolbar/statGrid/charts/
periodicReportsTable/states/a11y — normative).
**Done when:** FR-001..FR-011 ACs pass (Should items FR-008/FR-009 at minimum
provisional AC), design-review gate green, `bun vitest run && bun build` clean,
`docs/TEST_MATRIX.md` row → `implemented`.

**⚠️ Read spec.md §0 before Phase 2** — the mockup's `failedOnce`
first-refresh-always-fails demo pattern (also referenced verbatim in
`design-spec.jsonc` → `screens.reports.states.error.pattern`, confirming it is a
documented demo artifact, not a contract) must never reach the mock repository,
query layer, or use-cases. See Phase 2 for the dedicated anti-demo proof.

**Key decisions / points to confirm with `fe-lead` (no ADR expected — no new
token, no new dependency):**

- **D-1 (route guard):** reuse the generic `evaluateAccess()` from
  `bootstrap/auth-guard/access-context.ts` (already supports `requiredRoles`),
  NOT a bespoke `evaluatePrincipalAccess` (unlike `admin`'s bespoke
  `evaluateAdminAccess`). Confirmed by reading both: `(app)/layout.tsx` already
  calls `evaluateAccess({ role, tokenTenantId, urlTenantId })` (no
  `requiredRoles`) and redirects to `/select-tenant` on any non-`allowed`
  verdict — tenant membership is therefore ALREADY validated before this
  nested layout runs. The `principal/reports/layout.tsx` guard only needs to
  re-derive `role` (`getAccessToken` + `decodeRoleClaim`, same primitives
  `admin/layout.tsx` uses) and re-run `evaluateAccess({ role, tokenTenantId,
  urlTenantId, requiredRoles: ["principal"] })` — reusing the SAME
  `tokenTenantId`/`urlTenantId` derivation as `(app)/layout.tsx` (mock-first
  branch included) so behavior is consistent. Unlike `evaluateAdminAccess`,
  `evaluateAccess` returns a bare verdict (no `redirectUrl`) — the layout maps
  verdicts itself: `"allowed"` → render; `"unauthenticated"` /
  `"tenant-mismatch"` → `/${locale}/select-tenant` (matches `(app)/layout.tsx`
  fallback); `"forbidden-role"` → `tenantUrl(tenant, DEFAULT_ROUTE[role])`
  (matches `admin/layout.tsx`'s `redirect-to-default` mapping). This avoids
  inventing a parallel bespoke-access-evaluator for a single-role namespace
  when the generic one already covers it — flag if `fe-lead` disagrees.
- **D-2 (charts):** no chart library in `package.json` today; the mockup
  renders bars/columns as styled `div`s (CSS height/width), not SVG/Canvas.
  Recommend continuing div-based chart components (tokens-only fills, `role=
  "img"` + `aria-label`, every value ALSO rendered as visible text per
  FR-005/NFR-001) — avoids a new dependency for two simple aggregate charts.
  Not proposing a chart library; if `fe-component-architect`/
  `fe-nextjs-engineer` find a strong reason to add one, that is their call to
  surface, not preempted here.
- **D-3 (FR-009 Export Excel scope):** deferred per spec §8 — flag as an open
  decision point for `fe-state-engineer`/`fe-nextjs-engineer`: either (a) a
  lightweight client-side `.xlsx`-writer (small, no-native-deps library) doing
  a minimal sheet from already-rendered data, or (b) defer to a fast-follow US
  if it meaningfully expands scope beyond a normal-lane story. This plan treats
  it as Phase 6 (optional/last, cut-able without blocking Must-priority work).
- **D-4 (FR-008 New report placement):** design-spec's `toolbar.actions` lists
  ONLY "Làm mới" (refresh, secondary) and "Xuất Excel" (primary) — the "New
  report" action ("Tạo báo cáo", ghost button, icon `plus`) lives in
  `periodicReportsTable.header`, NOT the page toolbar. Component tree must
  place it there, not as a third toolbar button — flag to
  `fe-component-architect`.

---

## 2. Phased Breakdown

### Phase 1 — Domain (TDD red-first)

**Goal:** Pure TypeScript domain for the 5 mock-first endpoints; thin use-cases
(no per-region business rules like `discipline`'s conduct-points — trend
omission is a pass-through nullable field, not a computed rule).

**Files:**

```
src/features/principal/domain/reports/
  entities/
    reports-summary.entity.ts     # ReportsSummaryEntity, Term
    subject-average.entity.ts     # SubjectAverageEntity
    attendance-trend-point.entity.ts  # AttendanceTrendPointEntity
    report-list-item.entity.ts    # ReportListItemEntity
  failures/
    principal-reports.failure.ts  # PrincipalReportsFailure union
  repositories/
    i-principal-reports.repository.ts  # IPrincipalReportsRepository
  use-cases/
    get-reports-summary.use-case.ts        + .test.ts
    get-subject-averages.use-case.ts       + .test.ts
    get-attendance-trend.use-case.ts       + .test.ts
    get-periodic-reports.use-case.ts       + .test.ts
    generate-report.use-case.ts            + .test.ts
```

**Entities (camelCase, matches spec.md §6):**

```ts
export type Term = "HK1" | "HK2" | "FULL_YEAR";

export interface ReportsSummaryEntity {
  totalStudents: number; totalStudentsTrend: number | null;
  schoolAverage: number; schoolAverageTrend: number | null;
  attendanceRate: number; attendanceRateTrend: number | null;
  incidentCount: number; incidentCountTrend: number | null;
}
export interface SubjectAverageEntity {
  subjectId: string; subjectName: string; average: number;
}
export interface AttendanceTrendPointEntity {
  weekLabel: string; rate: number;
}
export interface ReportListItemEntity {
  id: string; name: string; term: Term;
  createdAt: string; status: "ready" | "generating";
}
```

**Failure union:**

```ts
export type PrincipalReportsFailure =
  | { type: "network-error" }
  | { type: "term-not-found" }   // INT-001 [ASSUMPTION] fallback trigger
  | { type: "generation-failed" }
  | { type: "unauthorized" }
  | { type: "unknown"; message?: string };
```

**Repository interface:**

```ts
export interface IPrincipalReportsRepository {
  getReportsSummary(termId: Term): Promise<ReportsSummaryEntity>;
  getSubjectAverages(termId: Term): Promise<SubjectAverageEntity[]>;
  getAttendanceTrend(termId: Term): Promise<AttendanceTrendPointEntity[]>;
  getPeriodicReports(termId: Term, cursor?: string):
    Promise<{ items: ReportListItemEntity[]; nextCursor: string | null; hasMore: boolean }>;
  generateReport(termId: Term): Promise<ReportListItemEntity>; // always status:"generating"
}
```

**Test first (red before green):**

```ts
// get-reports-summary.use-case.test.ts
describe("GetReportsSummaryUseCase", () => {
  it("delegates to repo.getReportsSummary with the given termId")
  it("passes through trend fields verbatim, including null (no baseline omission logic in domain — presentation decides not to render)")
  it("rethrows repo failure unchanged (no swallow)")
})
// get-subject-averages / get-attendance-trend / get-periodic-reports.use-case.test.ts
//   — same thin-delegate shape; assert empty array passes through untouched
//     (empty-state decision belongs to presentation, not domain)
// generate-report.use-case.test.ts
describe("GenerateReportUseCase", () => {
  it("delegates to repo.generateReport(termId)")
  it("returned entity always has status 'generating' (contract assertion, not a domain rule — guards regression if mock ever violates INT-005)")
  it("rethrows repo failure unchanged, does not synthesize a partial row")
})
```

**Open item (flag to `fe-lead`, do not resolve unilaterally):** INT-001's
`TERM_NOT_FOUND → fallback to most recent term/HK2` — spec marks this
`[ASSUMPTION]`. Recommend the fallback happens **server-side** (BE resolves it
before ever emitting `TERM_NOT_FOUND`) so web's use-case stays a thin delegate
per above. If BE surfaces the error anyway, add a **presentation-level**
re-issue (query calls the summary fetch again with `"HK2"`), not a domain
special-case — keeps `GetReportsSummaryUseCase` free of a term-substitution
rule. Confirm with `fe-state-engineer` before wiring.

**Done when:** all use-case unit tests green via `bun vitest run`.

---

### Phase 2 — Infrastructure (mock-first, INT-001..005)

**Goal:** DTOs, mapper, mock repository (default-success, no ordinal/counter
forced-failure — §0), real-repository stub, endpoint constants, DI factories.
`NEXT_PUBLIC_USE_MOCK=true` path fully functional.

**Files:**

```
src/bootstrap/endpoint/
  principal-reports.endpoint.ts   # PRINCIPAL_REPORTS_EP constants

src/features/principal/infrastructure/reports/
  dtos/
    reports-summary-response.dto.ts
    subject-average-response.dto.ts
    attendance-trend-response.dto.ts
    report-list-item-response.dto.ts
  mappers/
    principal-reports.mapper.ts     # DTO → Entity, all 4 shapes  + .test.ts
  repositories/
    principal-reports.repository.ts        # implements I-repo — 'server-only'
    principal-reports.repository.test.ts    # contract test (envelope/error mapping)
    mocks/
      mock-principal-reports.repository.ts
      mock-principal-reports.repository.test.ts   # incl. anti-demo proof (below)
      fixtures.ts   # per-term summary/subjects/weeks/reports fixture data

src/bootstrap/di/
  principal-reports.di.ts   # 'server-only' — makeXxxUseCase() factories, mirrors principal-teachers.di.ts
```

**Endpoint constants (proposed web-side contract, INT-001..005, per spec.md
§6 — flagged `[OPEN QUESTION]` there as not BE-confirmed):**

```ts
export const PRINCIPAL_REPORTS_EP = {
  summary: "/core/api/v1/principal/reports/summary",
  subjectAverages: "/core/api/v1/principal/reports/subject-averages",
  attendanceTrend: "/core/api/v1/principal/reports/attendance-trend",
  list: "/core/api/v1/principal/reports",
  generate: "/core/api/v1/principal/reports",   // POST, same path as list
} as const;
```

**Mock repository design — the poll-transition + anti-demo requirement in one
mechanism:**

- Constructor takes an optional `now: () => number` clock (defaults to
  `Date.now`) — **not** a hidden counter. `generateReport()` stores a new
  `{ id, status: "generating", readyAt: now() + GENERATE_DELAY_MS }` entry
  in-memory; `getPeriodicReports()` on each call re-evaluates every
  `generating` entry against `now()` and flips it to `ready` once
  `now() >= readyAt`. This makes the "poll causes a status flip" behavior
  observable and unit-testable with Vitest fake-clock injection (pass a
  scripted `now` function) **without real timers and without any
  ordinal/session-based forced-failure logic** — satisfies both NFR-004's
  testability note and §0's anti-demo rule in the same design.
- Failure simulation is **opt-in only**: a constructor flag/method, e.g.
  `mockRepo.forceNextFailure("getReportsSummary")`, defaulting to unset
  (always succeeds). No default-path counter anywhere.

**Test first:**

```ts
// mock-principal-reports.repository.test.ts
describe("MockPrincipalReportsRepository", () => {
  it("getReportsSummary/getSubjectAverages/getAttendanceTrend/getPeriodicReports resolve successfully on a fresh instance with no configuration — called 3x in a row, never rejects (ANTI-DEMO PROOF, AC-05.3)")
  it("generateReport returns a new row with status 'generating', readyAt = now()+delay")
  it("getPeriodicReports flips a 'generating' row to 'ready' once injected clock passes readyAt, leaves it 'generating' before that")
  it("2 simultaneously generating rows each transition independently once their own readyAt passes (AC-07.4)")
  it("forceNextFailure('getReportsSummary') makes exactly the next call reject, then reverts to success — proves failure requires EXPLICIT opt-in, never a hidden default (AC-05.3 negative proof)")
  it("generateReport rejection (via forceNextFailure) adds no row to the list (AC-07.3 — no ghost row)")
})
// principal-reports.mapper.test.ts — DTO trend fields null/non-null passthrough per entity shape
// principal-reports.repository.test.ts — envelope unwrap, error→PrincipalReportsFailure mapping (network/5xx → "network-error"; TERM_NOT_FOUND → "term-not-found"), cursor pagination read from meta.pagination
```

**Done when:** mock repo + mapper + repo-contract tests green; `USE_MOCK=true
bun dev` renders all 4 regions with fixture data, no runtime errors.

---

### Phase 3 — Route guard (FR-001/NFR-007, UC-06)

**Goal:** Server-side principal-only gate scoped ONLY to `principal/reports`
(sibling principal routes keep today's behavior — no regression risk).

**Files:**

```
src/app/[locale]/t/[tenant]/(app)/principal/reports/
  layout.tsx   # RSC guard, see D-1 above
```

**Guard sketch (per D-1 — confirm with `fe-lead` before Phase 4 presentation
wiring depends on it):**

```ts
import "server-only";
import { redirect } from "next/navigation";
import { evaluateAccess } from "@/bootstrap/auth-guard";
import { getAccessToken } from "@/bootstrap/lib/auth-token.server";
import { decodeRoleClaim, decodeTenantId } from "@/bootstrap/lib/jwt";
import { DEFAULT_ROUTE } from "@/components/layout/app-shell/sidebar/nav-config";
import { tenantUrl } from "@/bootstrap/tenant/tenant-url";

export default async function PrincipalReportsLayout({ children, params }: {
  children: React.ReactNode;
  params: Promise<{ locale: string; tenant: string }>;
}) {
  const { locale, tenant } = await params;
  const token = await getAccessToken();
  const role = decodeRoleClaim(token ?? "");
  const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";
  const tokenTenantId = USE_MOCK ? tenant : decodeTenantId(token ?? "");

  const verdict = evaluateAccess({
    role, tokenTenantId, urlTenantId: tenant, requiredRoles: ["principal"],
  });

  if (verdict === "forbidden-role") {
    // biome-ignore lint/style/noNonNullAssertion: forbidden-role guarantees non-null role
    redirect(`/${locale}${tenantUrl(tenant, DEFAULT_ROUTE[role!])}`);
  }
  if (verdict !== "allowed") {
    redirect(`/${locale}/select-tenant`);
  }
  return <>{children}</>;
}
```

No new unit test needed for `evaluateAccess` itself (already covered in
`access-context.test.ts`); this layout's redirect behavior is proof owed at
E2E tier (AC-06.2/06.4 — zero requests to `/core/api/v1/principal/reports/*`
for a rejected role, AC-06.3 unauthenticated → `/login`-equivalent flow via
`/select-tenant`), per spec.md §10 "Proof owed".

**Done when:** direct navigation as `teacher`/`student`/`parent` redirects
server-side (manually verified in dev before QA formalizes it); `principal`
role renders through.

---

### Phase 4 — Presentation, region-by-region (hand off contracts to specialists)

**Goal:** Client components wired to 4 independently-stated regions +
toolbar/term-radiogroup. **This plan stays at sequencing level** — detailed
ViewModel/prop contracts are `fe-component-architect`'s output; detailed
TanStack Query key hierarchy + race/discard handling (AC-01.4) + poll-loop
wiring is `fe-state-engineer`'s output (both run in parallel after this plan,
per this repo's standard pipeline).

**Files (indicative, not final — architect owns exact shape):**

```
src/features/principal/presentation/reports/
  reports-screen.i-vm.ts
  reports-screen.tsx                  # 'use client' — term radiogroup + toolbar + 4 regions
  reports-screen.stories.tsx
  stat-grid/                          # 4x StatCard (shared, canonical) + skeleton
  subject-average-chart/              # div-based bar chart, role=img, per-bar visible label
  attendance-trend-chart/             # div-based column chart, role=img, <96% dual-flag
  periodic-reports-table/             # table + "Tạo báo cáo" ghost header button + status badge + disabled download
    periodic-reports-table.stories.tsx
```

**Reused primitives (search-before-write per `component-organization.md`):**
- `StatCard` (`components/shared/stat-card/`) — canonical, already confirmed
  by `design-spec.jsonc`'s `statGrid.component: "StatCard (canonical)"`. NO new
  stat card variant needed.
- `StatusBadge` (`components/shared/status-badge/`, per `discipline` plan
  precedent) — reuse for `ready`/`generating` tones (`success`/`warning`,
  icon+text, per `periodicReportsTable.statusBadges`).
- `EduSkeleton` (cards / chart-shaped / table-rows variants per §5 states
  table) and `EduError` (scoped per-region, retry) — confirm both already
  exist as shared components before Phase 4 starts; if a chart-shaped
  skeleton variant doesn't exist yet, add it to the existing `EduSkeleton`
  component (variant prop), not a new parallel skeleton component.

**Component tree sketch (architect refines):**

```
ReportsScreen (client)
  Toolbar
    TermRadioGroup (role=radiogroup, 3 options)
    RefreshButton (aria-busy while pending)
    ExportExcelButton (Should)
  StatGrid region        — own query key, own skeleton/error/success
    StatCard × 4
  ChartsRow
    SubjectAverageChart region   — own query key, own skeleton/error/empty/success
    AttendanceTrendChart region  — own query key, own skeleton/error/empty/success
  PeriodicReportsTable region    — own query key, own skeleton/error/empty/success
    "Tạo báo cáo" ghost button (header, NOT toolbar — D-4)
    StatusBadge per row
    disabled-attribute download per row
```

**Test first:** Storybook interaction (`play` function) per region — states:
loading / (empty where applicable) / error+retry / success, written before
data wiring. Additional dedicated story/test: term-switch triggers all 4
regions' skeletons then independent settle (mirrors AC-01.1), one region
forced-error via story arg while others succeed (AC-01.3) — uses the mock
repo's explicit opt-in failure flag from Phase 2, never a default.

**Done when:** `bun storybook` — all interaction tests pass; `/impeccable
audit` clean (contrast, chart `role=img`+`aria-label`, disabled-attribute
gating, responsive 320–1280px).

---

### Phase 5 — i18n

**Goal:** New namespace `reports` (or `principalReports` if `reports` collides
— check `messages/vi.json` for an existing top-level `reports` key from
another feature before naming) in `messages/{vi,en}.json`.

**⚠️ Shared-file conflict:** `messages/{vi,en}.json` is also being edited by
the parallel US-E19.2 session. Before final push: `git fetch origin && git
merge --no-ff origin/main`, re-run `bunx tsc --noEmit` to confirm no key
collision/drift, resolve any JSON merge conflict by hand (both additive
namespaces should coexist cleanly if names don't collide).

**Key structure (sketch, not final copy — `fe-nextjs-engineer` finalizes
wording against design-spec/mockup text):**

```jsonc
"reports": {
  "pageTitle": "...", "pageSubtitle": "...",
  "toolbar": { "termOptions": { "hk1": "Học kỳ I", "hk2": "Học kỳ II", "fullYear": "Cả năm" },
               "refresh": "Làm mới", "exportExcel": "Xuất Excel" },
  "stats": { "totalStudents": "Tổng số học sinh", "schoolAverage": "Điểm TB toàn trường",
             "attendanceRate": "Tỷ lệ chuyên cần", "incidents": "Vi phạm trong kỳ",
             "trendLabel": "so với HK trước" },
  "charts": { "subjectAverage": { "title": "...", "ariaLabel": "..." },
              "attendanceTrend": { "title": "...", "ariaLabel": "..." },
              "emptyState": "..." },
  "table": { "title": "...", "newReport": "Tạo báo cáo",
             "columns": { "name": "Tên báo cáo", "term": "Kỳ", "createdAt": "Ngày tạo",
                          "status": "Trạng thái", "download": "Tải về" },
             "status": { "ready": "Sẵn sàng", "generating": "Đang tạo…" },
             "emptyState": "..." },
  "errors": { "network-error": "...", "term-not-found": "...", "generation-failed": "...",
              "unauthorized": "...", "unknown": "..." }
}
```

Mock/seed fixture data (subject names, report titles) stay in `fixtures.ts`,
NOT in `messages/*` per `i18n.md`.

**Done when:** `bunx tsc --noEmit` clean (typed keys); zero hardcoded
Vietnamese-diacritic strings in `.tsx` outside messages/mocks.

---

### Phase 6 — Excel export (Should, FR-009 — cut-able)

**Goal:** minimal client-side `.xlsx` generation from already-rendered term
data, IF `fe-state-engineer`/`fe-nextjs-engineer` confirm scope (D-3). Kept as
its own phase so it can be dropped or fast-followed without blocking Must
work in Phases 1–5.

**Files (if in scope):**
```
src/features/principal/presentation/reports/export/
  export-reports-to-excel.ts   # pure function: (summary, subjects, weeks, reports, term) → Blob/Buffer
  export-reports-to-excel.test.ts
```

**Test first:** unit test asserting the generated workbook contains one sheet
per region with the exact currently-rendered values (deterministic — no
`Date.now()` in the generated content itself, or inject a clock for any
"generated at" timestamp per `tdd.md`); a failure-path test (malformed input)
returns an error rather than a partial file (AC per FR-009 §3).

**Done when:** minimal AC (FR-009 §3, 2 items) pass; if descoped instead, note
the descoping decision in `story.md` and file a fast-follow US.

---

### Phase 7 — Review + QA Gate

**Checklist:**

- [ ] `fe-tech-lead-reviewer`: layers correct (no infra import in
  presentation; guard layout is RSC-only; `server-only` in infra + DI);
  tokens-only (no raw color — chart fills use `var(--edu-*)` tokens per
  design-spec, no raw hex); i18n coverage; §0 anti-demo source-inspection
  (no ordinal/counter/session forced-failure anywhere).
- [ ] `fe-accessibility-auditor`: chart `role="img"`+`aria-label`; low-attendance
  weeks flagged by color AND label (not color alone); status badges icon+text;
  disabled download via `disabled` attribute (not opacity); radiogroup
  keyboard operability + visible focus ring; refresh button `aria-busy`.
- [ ] `/impeccable audit` — contrast/spacing/typography.
- [ ] `fe-qa-playwright` Go/No-Go — mandatory standalone AC-05.3 anti-demo
  verification (spec.md §0's 3-step check), term-switch sync + race discard
  (AC-01.4), route-gate redirect + network assertion (AC-06.2/06.4), polling
  transition in place without navigation (AC-07.2), viewport matrix
  320/375/768/1280.
- [ ] `docs/TEST_MATRIX.md` row US-E03.1 → `implemented`.
- [ ] `bun vitest run && bun build` green; `git merge --no-ff origin/main`
  resolved cleanly (shared `messages/*` file, US-E19.2 in flight).

---

## 3. Component + State Sketch (handoff, not final contract)

**State classification (no Zustand):**

| State | Type | Owner |
| --- | --- | --- |
| `termId` selection | URL or local (open — `fe-state-engineer` call; URL param `?termId=` would let a shared link deep-link a term, but adds route-param plumbing) | ReportsScreen |
| 4 regions' fetched data | Server state — TanStack Query, one key per region, `termId` in the key (`["principal","reports","summary",termId]` etc.) | `fe-state-engineer` to finalize |
| stale-response discard on rapid term switch (AC-01.4) | TanStack Query's built-in request cancellation/`enabled` + `termId` in queryKey (query key change auto-invalidates in-flight stale request) — confirm approach, don't hand-roll a race guard if the library already covers it | `fe-state-engineer` |
| polling while any row `generating` (NFR-004) | `refetchInterval` callback on the periodic-reports query, conditional on `data.some(r => r.status === "generating")`, capped/backed-off per open numeric question | `fe-state-engineer` |
| refresh-pending / aria-busy | Local UI (`isFetching`/`isRefetching` from the query) | Toolbar |
| Excel export trigger (Should) | Local UI (button pending state) | Toolbar |

**Specialists needed (standard pipeline, parallel after this plan):**
- `fe-component-architect`: exact ViewModel/prop contracts per region, `EduError`/`EduSkeleton` variant confirmation, `StatusBadge` tone extension (if `ready`/`generating` tones aren't already registered), div-chart component API (bars/columns as data-driven props, not hardcoded per screen).
- `fe-state-engineer`: query key hierarchy (above), race/discard mechanism, poll interval/backoff numbers (open per spec §8), single-page vs `useInfiniteQuery` call for INT-004 (spec leans single-page — low report volume per term), FR-009 library/approach if Phase 6 proceeds.

---

## 4. Risks, Dependencies, Open Questions

**Risks:**
- Anti-demo regression risk is the highest-severity risk on this story (§0) —
  mitigated structurally in Phase 2's mock design (opt-in-only failure) +
  Phase 7's mandatory standalone QA check. Any future edit to the mock repo
  MUST preserve "no argument, no config → always succeeds."
- `messages/{vi,en}.json` shared-file collision with parallel US-E19.2 — merge
  `origin/main` before final push (Phase 5 + Phase 7 checklist).
- Route guard (Phase 3) is scoped ONLY to `principal/reports` — confirm no
  other principal route accidentally inherits/needs this layout (it should
  not; sibling routes keep current, unguarded-at-namespace-level behavior,
  matching the story's explicit "stay in scope" instruction).

**Dependencies (per story.md, confirm none newly discovered):** none blocking
— all 5 backing endpoints are mock-first; no other US's contract is consumed.

**[OPEN QUESTIONS] (carried from spec.md §8, not resolved here):**
1. `[OPEN QUESTION]` Real BE endpoint shape for the 5 data needs — file a BE
   follow-up once `core` service scoping begins; web's proposed paths are not
   BE-confirmed.
2. `[OPEN QUESTION]` Exact poll interval/backoff numbers (NFR-004) — left to
   `fe-state-engineer`; this plan's mock design (readyAt vs injected clock) is
   agnostic to whatever number is chosen.
3. `[OPEN QUESTION]` `termId` as URL param vs local state — flagged above in
   §3; recommend `fe-state-engineer` decide based on whether deep-linking a
   term is a real product need (not specified in spec.md).
4. `[OPEN QUESTION]` Single-page vs `useInfiniteQuery` for INT-004 — spec
   leans single-page (low report volume/term); `fe-state-engineer` call.
5. `[OPEN QUESTION]` Second, more-severe attendance threshold band (<90%) —
   not specified; flag to `ba-lead` before the attendance chart's color-band
   logic is finalized in Phase 4 (currently only <96% per spec).
6. `[OPEN QUESTION]` FR-009 Export Excel — scope confirmation needed before
   Phase 6 starts (D-3); may be descoped to a fast-follow US without blocking
   this story's Must-priority close.
7. `[OPEN QUESTION]` TERM_NOT_FOUND fallback locus (server-side vs a
   presentation-level re-issue) — see Phase 1 note; confirm with `fe-lead`/
   `fe-state-engineer` before wiring INT-001 error handling.
8. `[OPEN QUESTION]` A single failed poll attempt (transient network error,
   not a generation failure) — silent retry on next interval (leaning, per
   spec's NFR-005 spirit) vs surfaced error — not explicitly specified;
   `fe-state-engineer` call.

**No `[CONFLICT]` identified** — spec.md confirms none across its own inputs;
this plan introduces none new.
