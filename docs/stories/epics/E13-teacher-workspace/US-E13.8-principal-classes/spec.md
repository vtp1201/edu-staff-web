# Feature Spec — Principal Classes / School-Wide Class List (US-E13.8)

Status: Draft   Lane: normal
Sources: `requirements.md` (TR-138, FR-001..012, NFR-001..006) ·
`integration.md` (INT-001, §5 repository-choice gap, §6 filter/search/sort
verdict, §7 open questions) · `use-cases.md` (UC-1, UC-2, AC-1.1..1.27,
AC-2.1..2.2, AC-X.1..X.3, Edge Case Matrix) · `docs/product/screens.md:84`
(Principal "Classes" row, design-vs-build gap) — **no `docs/product/design-spec.jsonc`
entry exists yet for this screen** (see §8 GAP).

## 1. Scope & Objectives

**Purpose:** Give the `principal` role a read-only, school-wide, paginated
list of all classes in the tenant for the active academic year — closing the
last design-vs-build gap on `screens.md`. This is a NEW presentation layer
over an EXISTING, real `core` data source (`GET /api/v1/classes`); no new
domain entity, DTO, or backend endpoint is introduced.

**In-scope (per requirements.md §scope.inScope):**
- New route `(app)/principal/classes` + presentation in
  `features/principal/presentation/classes/`.
- Data sourced from the `Class` entity via the resolved repository (see §6
  central open decision — which existing repository/use-case is called is an
  FE implementation decision, not prescribed here).
- Status filter (active/archived/all, default active).
- Grade-level and/or class-name filter-search (client-side).
- Sort by class name or grade level, ascending/descending (client-side).
- Cursor-based pagination (`{ raw: true }` + `parseEnvelope()`, explicit
  `limit=100`).
- Loading/empty/error/success states.
- Optional CTA linking out to `(app)/principal/teachers` (Could-have).

**Out-of-scope (per requirements.md §scope.outOfScope, all Won't/explicit
exclusions):**
- Create, rename, or archive a class — stays admin-only (`(app)/admin/classes`,
  US-E12.10).
- Homeroom-teacher assignment/reassignment UI — stays at
  `(app)/principal/teachers` (US-E13.5).
- Per-class average score / attendance % rollup — deferred, explicit N+1
  fan-out cost concern (FR-011).
- A new class-detail drill-down screen (roster/subjects per class) (FR-012).
- Any new entity, DTO, or repository method **unless** implementation finds a
  genuine contract gap while resolving §6's open decision (in which case the
  minimal necessary extension is acceptable, not a new feature).

**Definitions:**
- **Class row/card** — one rendering of the `Class` entity: `name`,
  `gradeLevel`, `status`, `academicYear`, `studentCount`,
  `homeroomTeacherId`/`homeroomTeacherName`.
- **Client-side filter/search/sort** — operates only on rows already fetched
  into the browser (current page + any previously "load more"'d pages), not
  a server-side query — because the `GET /api/v1/classes` wire contract has
  no `status`, `gradeLevel`, `name`, or `sort` query parameters (confirmed,
  integration.md §6).
- **The repository-choice gap** — see §6, the central open decision this spec
  surfaces prominently.

## 2. Actors & Roles

| Actor/Role | Visibility / capability |
| --- | --- |
| `principal` (MANAGER claim) | Full: view, filter (status/grade/name), sort, paginate (load more), navigate away via optional CTA. Read-only — no mutation control anywhere on this screen. |
| `teacher` | No access — redirected by the existing `(app)/principal/layout.tsx` guard; retains own scoped view at `(app)/teacher/classes` (US-E13.1). |
| `admin` | No access via this route — redirected; retains full CRUD at `(app)/admin/classes` (US-E12.10). |
| `student` / `parent` | No access — redirected; no distinct behavior between the two for this negative case. |
| `core` service (`GET /api/v1/classes`) | System/external — supplies `Class` rows + cursor pagination metadata; read-only dependency, no write side effect from this screen. |

No new RBAC surface: FR-008 reuses the existing `(app)/principal/layout.tsx`
route guard + `evaluateNamespaceAccess`, the same mechanism already proven for
US-E13.5.

## 3. Functional Requirements

### FR-001 — List renders from existing data source (Must, TR-138/UC-1)
The system SHALL display a list of all classes in the tenant for the
principal's active academic year, with no new use-case or repository method
strictly required to fetch the raw data (though the resolved repository must
satisfy FR-002/FR-007 — see §6).
- AC: AC-1.1 (loading), AC-1.2 (success, populated), AC-1.18 (request shape:
  explicit `academicYear` + `limit=100`).
- Dependencies: INT-001, §6 repository-choice resolution.

### FR-002 — Per-row fields, real data (Must, UC-1)
The system SHALL show, per class row/card: class name, grade level, homeroom
teacher name (or a localized "Chưa phân công" placeholder when
`homeroomTeacherId` is null), student count, and a status badge
(Đang học/Đã lưu trữ).
- AC: AC-1.2 (all fields visible), AC-1.3 (placeholder shown ONLY for classes
  genuinely lacking a homeroom teacher — **not** a hardcoded default for every
  row, per the Known Implementation Note / §6).
- Dependencies: INT-001, §6 (this FR is the one directly broken by the
  degraded repository path — see §6, non-negotiable).

### FR-003 — Status filter, default active (Must, UC-1)
The system SHALL let the principal filter the list by class status
(active/archived/all), defaulting to active only.
- AC: AC-1.8 (default on load), AC-1.9 (toggle, client-side, no extra network
  call), AC-1.10 (keyboard-operable).
- Dependencies: none beyond already-loaded rows (no server query param
  exists for status, integration.md §6).

### FR-004 — Grade-level / name filter-search (Should, UC-1)
The system SHALL let the principal filter or search the list by grade level
and/or class name, client-side against loaded rows.
- AC: AC-1.11 (grade filter), AC-1.12 (name search, case-insensitive, loaded
  rows only — documented limitation), AC-1.13 (combined AND semantics),
  AC-1.14 (interaction with pagination — newly appended rows also subject to
  the active filter).
- Dependencies: precedent already exists in
  `class-management.repository.ts`'s client-side `gradeLevel` filter.

### FR-005 — Sort by name/grade (Should, UC-1)
The system SHALL let the principal sort the list by class name or grade
level, ascending/descending, client-side.
- AC: AC-1.15 (name sort), AC-1.16 (grade sort), AC-1.17 (sort persists
  across filter changes within the session).
- Dependencies: no server-side `sort` param exists on the wire.

### FR-006 — Loading/empty/error states (Must, UC-1)
The system SHALL render distinct loading, empty, and error states,
independently addressable.
- AC: AC-1.1 (loading skeleton, ≤320ms), AC-1.4 (empty — zero classes
  tenant-wide, no "clear filters"), AC-1.5 (empty — filtered to zero, WITH
  "clear filters"), AC-1.6 (error — network/5xx/timeout, retry), AC-1.7
  (error — 403 CLASS_FORBIDDEN, defensive, no retry).
- Dependencies: INT-001 error mapping (§6/integration.md §2).

### FR-007 — Cursor-based pagination (Must, UC-1)
The system SHALL paginate the class list using `meta.pagination.nextCursor`/
`hasMore`, loading further pages via a "load more" control, without eagerly
fetching all classes in one request.
- AC: AC-1.18 (request shape — `{ raw: true }` + `parseEnvelope()`), AC-1.19
  (load more success — append, not replace), AC-1.20 (load more failure —
  existing rows preserved, inline retry), AC-1.21 (`hasMore=false` → no
  control shown), AC-1.22 (>100-class edge case — soft page cap, not a hard
  ceiling).
- Dependencies: INT-001, §6 (this FR is the other one broken by the degraded
  repository path — non-negotiable).

### FR-008 — Principal-only RBAC (Must, UC-1)
The system SHALL restrict this screen and route to the `principal` role only,
via the existing `(app)/principal/layout.tsx` guard + `evaluateNamespaceAccess`.
- AC: AC-1.23 (principal happy path), AC-1.24/1.25/1.26 (teacher/admin/
  student/parent blocked), AC-1.27 (defensive mid-session role-change 403).
- Dependencies: none new — reuses US-E13.5's proven mechanism.

### FR-009 — No mutation controls (Must, negative requirement)
The system SHALL NOT expose any create, rename, archive, or homeroom-teacher
-assignment action on this screen.
- AC: verified by absence across all UC-1/UC-2 AC; explicitly asserted in
  UC-2's boundary note (no inline assignment UI opens from the CTA).
- Dependencies: none.

### FR-010 — Optional CTA to teachers screen (Could, UC-2)
The system MAY provide a "Xem giáo viên"/"Quản lý GVCN" CTA (per-row or
global) navigating to `(app)/principal/teachers`, optionally pre-filtered.
- AC: AC-2.1 (CTA visible only in success state), AC-2.2 (navigation,
  keyboard-operable, no inline UI opens on this screen).
- Dependencies: `(app)/principal/teachers` (US-E13.5) as the navigation
  target.

### FR-011 — No per-class score/attendance rollup (Won't, explicit exclusion)
The system SHALL NOT fetch or display per-class average score or attendance
percentage in v1.
- AC: negative-scope assertion — no such field/call anywhere in this screen.
- Dependencies: none (explicit perf-driven exclusion, avoids N+1 fan-out
  across 38+ classes beyond what §6's resolved repository already pays for
  `studentCount`/homeroom).

### FR-012 — No new detail drill-down (Won't, explicit exclusion)
The system SHALL NOT introduce a new class-detail drill-down screen as part
of this US.
- AC: negative-scope assertion; any "view detail" affordance links to an
  existing screen (UC-2) or is deferred.
- Dependencies: none.

## 4. Non-Functional Requirements

| NFR | Requirement | Measurable target | QA verification |
| --- | --- | --- | --- |
| NFR-001 (a11y) | Filters/sort/pagination/retry fully keyboard operable; status conveyed by icon+label, not color alone; visible focus ring on every interactive element | WCAG 2.1 AA — text contrast ≥4.5:1, UI/icon contrast ≥3:1, touch targets ≥44×44px on mobile | Storybook a11y addon + manual keyboard-only pass across all states (AC-X.2) |
| NFR-002 (responsive) | Table (desktop/tablet) → card list (mobile) with no horizontal scroll or content loss, matching `PrincipalTeachersScreen`'s convention | No layout break at 320px; verified at 375/768/1280 | Storybook viewport addon + manual check at all 4 breakpoints (AC-X.1) |
| NFR-003 (i18n) | All UI strings (headers, filter labels, status badges, loading/empty/error copy, "Chưa phân công" placeholder, CTA label) under a new `principalClasses` namespace, vi source + en mirror | 0 hardcoded UI strings in `.tsx`; typed `t()` keys compile-check via `messages.d.ts` | `bunx tsc --noEmit`; grep for hardcoded Vietnamese diacritics outside messages (AC-X.3) |
| NFR-004 (performance) | Exactly 1 network call per page load/page-turn from THIS screen's own query — no per-row calls introduced by the presentation layer beyond whatever the resolved data source (§6) already performs internally | 1 `listClasses`-equivalent call per page/turn, verified via network trace in Storybook/E2E | Manual network-tab trace during E2E smoke |
| NFR-005 (performance) | Skeleton appears promptly on initial fetch and on any re-query that isn't purely client-side | Skeleton visible within 320ms of query start | Storybook interaction timing assertion, consistent with other list screens |
| NFR-006 (security) | Route + data access gated server-side by the existing principal guard; no client-side-only role check | Verified via `(app)/principal/layout.tsx` guard + repository-boundary check per decision `0063`; no new mechanism introduced | Code review + forged-role repository test (if a new repository method is introduced per §6) |

## 5. UI States & Flows

| Surface | Loading | Empty | Error | Success |
| --- | --- | --- | --- | --- |
| Initial class list (`(app)/principal/classes`) | Skeleton table (desktop/tablet) or skeleton card list (mobile), ≤320ms (AC-1.1) | "No classes yet" (tenant has zero classes, no filter cause) — no "clear filters" (AC-1.4); OR "no classes match" + "clear filters" when a filter is active (AC-1.5) | Localized message + retry (network/5xx/timeout, AC-1.6); localized access-denied, no retry (403 CLASS_FORBIDDEN, AC-1.7) | Table/card rows: name, grade, homeroom (or placeholder), student count, status badge; default filter = active only (AC-1.2, AC-1.8) |
| Load more (pagination) | n/a (inline control, not full skeleton) | n/a | Existing rows preserved, inline retry at the load-more control (AC-1.20) | Next page appended (not replacing) via `nextCursor` (AC-1.19); hidden entirely once `hasMore=false` (AC-1.21) |
| Status/grade/name filter change | n/a (client-side, instantaneous) | "no classes match" + "clear filters" (AC-1.5) | n/a (client-side, no network failure mode) | List narrows/re-orders per active filter(s)/sort (AC-1.9, AC-1.11–1.17) |
| CTA to teachers screen (Could-have) | n/a | Hidden while list is loading/empty/error (AC-2.1) | n/a | Navigates to `(app)/principal/teachers`, no inline UI opens here (AC-2.2) |

**Key flow (UC-1 main success scenario):** principal navigates to
`(app)/principal/classes` → route guard confirms `principal` role → screen
resolves the active academic year → issues the class-list query with
`academicYear` = active year, `limit=100`, default status = active → loading
skeleton → success renders table/card list → principal may filter/search/sort
(client-side) and/or load more pages (server-side, cursor-based) → optional
CTA navigates away to `(app)/principal/teachers` (UC-2).

Full Given/When/Then detail for all 27 AC (AC-1.1–1.27, AC-2.1–2.2,
AC-X.1–X.3) plus the Edge Case Matrix is authoritative in `use-cases.md` §4–5
and is traced per-FR above and in §9's Traceability Matrix — this section
consolidates the flow-level summary, not a duplicate restatement of every AC.

## 6. Data & Integration — including the central open decision

**Endpoint (INT-001):** `GET /core/api/v1/classes` (Kong-prefixed, strips to
`/api/v1/classes` at `core`). **REAL**, confirmed
(`../edu-api/services/core/docs/openapi.yaml:357-420`,
`INTEGRATION.md:124`). No mock-first plumbing needed for the endpoint itself.

**Request (camelCase query params, exhaustive):** `academicYear` (optional
string), `cursor` (optional string), `limit` (optional int, 1–100). **No**
`status`, `gradeLevel`, `name`, or `sort` param exists — all four
corresponding FRs (003/004/005 partially, and status) are client-side only
(see §3 FR-003/004/005 and integration.md §6).

**Response → `Class` entity** (via `ClassManagementMapper.toClass()`):
`id`, `name`, `gradeLevel`, `academicYear`, `status` (`ACTIVE`/`ARCHIVED`).
**`studentCount` and `homeroomTeacherId`/`homeroomTeacherName` are NOT on the
wire `ClassResponse` schema at all** — both are always derived client-side by
whichever repository implementation is used (see the central decision below).

**Pagination:** cursor-based, real (`components/responses/ClassList` wraps
`SuccessEnvelope` + `meta: PaginatedMeta`). Read via `{ raw: true }` +
`parseEnvelope()` → `{ data, pagination: { nextCursor, hasMore } }`, per
`.claude/rules/api-integration.md`.

**Errors → UI mapping:** 401 → existing reactive/proactive refresh (decision
`0018`), not this screen's concern · 403 `CLASS_FORBIDDEN` → `forbidden`
failure → defensive access-denied message, no retry (FR-006/AC-1.7) ·
network/5xx/timeout → `network-error` failure → error state + retry
(FR-006/AC-1.6) · unrecognized → `unknown` failure, same treatment as
network-error · zero rows for current filter/page → NOT an error, empty
state (FR-006/AC-1.4/1.5).

**Auth/role:** Bearer token via httpOnly cookie (decision `0018`), no
client-side token handling. Screen-level gate: `principal` only via
`(app)/principal/layout.tsx` + `evaluateNamespaceAccess` (FR-008). **BE-side
role check for this specific endpoint is a documented open risk — see below.**

### THE CENTRAL OPEN DECISION — which repository this screen calls

Two existing repositories already wrap this SAME `GET /api/v1/classes`
endpoint for the SAME `Class` entity, and they are **NOT equivalent**. This
is the single most important thing for `fe-planner`/`fe-nextjs-engineer` to
resolve before or during implementation — it is surfaced here, not buried:

**(A) `IPrincipalTeachersRepository.listClasses()`**
(`src/features/principal/infrastructure/teachers/repositories/principal-teachers.repository.ts:64-91`)
— the "obvious" reuse target story.md originally named, already consumed by
US-E13.5's GVCN picker dropdown.
- Passes **no query params** (`academicYear`, `cursor`, `limit` all
  omitted).
- Discards `pagination` after reading `parseEnvelope()` — callers get exactly
  one page with no way to reach `hasMore`/`nextCursor`.
- Maps every row with **hardcoded** `studentCount: 0`,
  `homeroomTeacherId: null`, `homeroomTeacherName: null` — the method's own
  inline comment calls this a documented "KNOWN GAP" (acceptable for a
  name-only picker, not for this screen).
- **Wired to this screen as-is, this breaks Must-have FR-002 (real
  studentCount/homeroom) and FR-007 (real pagination) outright** — every
  class would show "0 học sinh" / "Chưa phân công" regardless of truth, and
  there would be no load-more at all.

**(B) `IClassManagementRepository.listClasses(params)`**
(`src/features/admin/class-management/infrastructure/repositories/class-management.repository.ts:129-163`)
— the admin class-management screen's repository, over the SAME entity and
endpoint.
- Accepts `{ academicYear?, gradeLevel?, cursor? }`, threads `academicYear` +
  `cursor` as real query params.
- Correctly returns `{ data, nextCursor, hasMore }` — the pattern FR-007
  actually needs.
- Applies `gradeLevel` filtering **client-side** after fetch (already-proven
  precedent for this US's FR-004, not a new pattern to invent).
- Runs `enrich(classId)` = `Promise.all([countRoster(classId),
  fetchHomeroom(classId)])` per row, producing REAL `studentCount` and
  `homeroomTeacherId`/`homeroomTeacherName` (404 on homeroom fetch correctly
  treated as "no homeroom," not an error). **This is the only place in the
  codebase producing trustworthy values for these two fields.**

**Verdict (a data-source finding, not a code decision made here):** (B)
satisfies this US's Must-have FR-002/FR-007 today; (A) does not, without
being extended to duplicate (B)'s params/pagination/enrichment logic — which
would just be a second copy of (B), not new capability (a
`component-organization.md`-style "one canonical home" problem at the
repository layer). This spec does **not** prescribe the exact code-level
approach — that is `fe-planner`/`fe-nextjs-engineer`'s call — but it states
plainly: **the requirement for real `studentCount`/`homeroomTeacherName`
(not hardcoded placeholders) is non-negotiable per Must-have FR-002/FR-007.**
Options on the table (from integration.md §5, all viable, none prescribed):
1. Point this screen's presentation at `GetClassesUseCase`/
   `IClassManagementRepository.listClasses()` directly (cross-feature reuse
   — admin→shared canonical domain, same direction of dependency US-E13.5
   already accepted for the `Class` entity type).
2. Extend `IPrincipalTeachersRepository.listClasses()` to accept the same
   params and reimplement/delegate to the same enrichment (duplicates logic
   already proven in B — not recommended, but not forbidden if there's a
   reason not captured here).
3. Accept (A)'s degraded fields as a documented v1 limitation — **not
   recommended**, directly contradicts FR-002/FR-007's Must priority and
   would require an explicit scope-down decision from `ba-lead` first (not
   a call `fe-lead` can make unilaterally, since it silently weakens two
   Must-have requirements this spec already committed to).

**Perf tradeoff to weigh alongside options 1/2 (ties to NFR-004):** (B)'s
`enrich()` costs 2 extra HTTP calls per class per loaded page. For ~38
classes this could be on the order of 40–80 extra `core` requests per page
load — an **already-accepted, already-shipped cost** (admin's own class list
pays it today), not a new risk this US introduces, but worth confirming
`fe-planner` weighs it consciously.

## 7. Use Case Summary

| UC ID | Title | FR coverage | AC count |
| --- | --- | --- | --- |
| UC-1 | Principal views, filters, sorts, and paginates the class list | FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009 | 27 (AC-1.1–1.27) |
| UC-2 | Principal navigates from the class list to the teachers/homeroom screen | FR-010, FR-009 (boundary) | 2 (AC-2.1–2.2) |
| Cross-cutting | Responsive / keyboard / i18n (applies across UC-1 and UC-2) | NFR-001, NFR-002, NFR-003 | 3 (AC-X.1–X.3) |
| **Total** | | **all 9 Must/Should FRs + both Won't exclusions verified by absence** | **32** |

No functional requirement is uncovered by AC — see §9 for the full trace,
including explicit callouts of what remains open (not blocking spec
delivery).

## 8. Constraints & Assumptions

**Technical constraints:**
- `GET /api/v1/classes` has no server-side `status`/`gradeLevel`/`name`/
  `sort` query parameter — all corresponding filtering/sorting is
  client-side against already-loaded rows only (§6, integration.md §6).
- No `docs/product/design-spec.jsonc` entry exists for this screen yet
  (story.md/use-cases.md both flag this). This screen reuses
  `PrincipalTeachersScreen`'s table pattern and `TeacherClasses`'s card
  pattern as visual references only, not a normative spec.
- The repository-choice gap (§6) must be resolved before FR-002/FR-007 can
  be honestly implemented.

**Confirmed [ASSUMPTION]s (carried from requirements.md):**
- Default status filter = active only; archived classes are opt-in,
  matching the admin class list convention.
- Academic year selector defaults to the tenant's current academic year
  (resolved via `GET /api/v1/academic-years/active`, confirmed to exist,
  `INTEGRATION.md:158` — a supplementary call this screen needs before
  calling `listClasses`, not otherwise mapped by this US since it's outside
  this screen's own data need).
- Table layout on desktop/tablet (reusing `PrincipalTeachersScreen`
  conventions) is preferred over a card grid, since this is a denser,
  filterable, management list rather than a personal dashboard — final
  visual call belongs to `/uiux` if a follow-up design pass happens.
- `limit=100` is always explicitly passed on every query so client-side
  filter/search/sort behaves as effectively-global for a realistic
  ~38-class tenant, removing dependency on an undocumented BE default
  `limit`.
- No i18n namespace conflict — `principalClasses` does not exist yet in
  `messages/{vi,en}.json`.

**[GAP]:**
- No `design-spec.jsonc` entry for this screen (flagged above) — a `/uiux`
  follow-up is warranted but not a blocker; `fe-nextjs-engineer` can proceed
  from the two named reference patterns + this spec's field/state
  requirements.

**[CONFLICT]:** none identified between requirements/integration/use-cases
inputs for this story — the repository-choice item in §6 is a **gap/finding**
(two valid implementations, neither perfectly reusable as named), not a
direct contradiction between two inputs.

**[OPEN QUESTION]s (carried forward, NOT resolved here):**
1. **[OPEN QUESTION — LAUNCH-BLOCKING RISK, verify first]** Is `MANAGER`
   (principal `appRole`) actually authorized by `core`'s
   `GET /api/v1/classes` RBAC middleware to see ALL classes? Neither
   `openapi.yaml`'s endpoint description, `INTEGRATION.md`'s endpoint table,
   nor `ERROR_CODES.md`'s `CLASS_FORBIDDEN` row names `MANAGER` for this
   specific endpoint (documented as ADMIN(all)/TEACHER(assigned) only) —
   unlike several sibling `core` endpoints that explicitly enumerate
   `ADMIN/MANAGER/SUPER_ADMIN`. This story proceeds on the working
   assumption MANAGER already works (precedent: the GVCN-picker dropdown in
   `TeacherAssignmentSheet` populates from this same call in production) —
   but if that dropdown has only ever run in `NEXT_PUBLIC_USE_MOCK` mode in
   every environment observed so far, real BE behavior for MANAGER is still
   unverified. **A 403 for every principal user would be a launch-blocking
   regression, not a cosmetic gap. Recommend a quick manual check against a
   real (non-mock) `core` environment before investing in the `enrich()`
   extension or any repository work for this US.**
2. **[OPEN QUESTION — the repository-choice decision, restated for
   visibility]** Should this screen consume
   `IClassManagementRepository.listClasses()` (cross-feature reuse) or
   should `IPrincipalTeachersRepository.listClasses()` be extended to match
   it? See §6 for full analysis — this is the single biggest scope-shaping
   decision left open by this spec; everything else is a confirmed contract
   fact. Not blocking spec delivery; must be resolved before/during FE
   implementation.
3. `[OPEN QUESTION]` What is `GET /api/v1/classes`'s behavior when
   `academicYear` is omitted (all years vs. server-side current-year
   default)? This spec's AC assume the screen always resolves and passes an
   explicit active-year value via the supplementary academic-years call
   (assumption #2 above), not reliance on any omitted-param default.
4. `[OPEN QUESTION]` What is the BE's default `limit` when omitted (not
   documented beyond the 1–100 bound)? Mitigated by always passing an
   explicit `limit=100` (assumption above) — not blocking, but worth a
   BE-team confirmation if convenient.
5. `[OPEN QUESTION]` Should a `docs/product/design-spec.jsonc` entry be
   authored for this screen before/alongside `/fe` implementation? Flagged
   given NFR-002's responsive requirement references an existing convention
   rather than a normative spec — authoring the entry itself is a `/uiux`
   follow-up, not decided here (see [GAP] above).
6. `[OPEN QUESTION]` FR-004/FR-005 (Should) and FR-010 (Could) are modeled
   in full AC so the FE team has them ready if `fe-planner` phases them into
   v1; if `fe-lead`/`fe-planner` defers any Should/Could item to a later
   story, that is an explicit phasing call for them to make, not an implicit
   drop from this AC set.

## 9. Traceability Matrix

| Requirement | Source | Use Case(s) | Integration(s) | Priority |
| --- | --- | --- | --- | --- |
| FR-001 List renders from existing data source | TR-138 FR-001 | UC-1 | INT-001 (+ §6 repo-choice resolution) | Must |
| FR-002 Per-row fields, real data | TR-138 FR-002 | UC-1 | INT-001 (§6 — non-negotiable, broken by repo (A)) | Must |
| FR-003 Status filter, default active | TR-138 FR-003 | UC-1 | INT-001 (client-side, no server param) | Must |
| FR-004 Grade/name filter-search | TR-138 FR-004 | UC-1 | INT-001 (client-side, no server param) | Should |
| FR-005 Sort by name/grade | TR-138 FR-005 | UC-1 | INT-001 (client-side, no server param) | Should |
| FR-006 Loading/empty/error states | TR-138 FR-006 | UC-1 | INT-001 error mapping | Must |
| FR-007 Cursor-based pagination | TR-138 FR-007 | UC-1 | INT-001 (§6 — non-negotiable, broken by repo (A)) | Must |
| FR-008 Principal-only RBAC | TR-138 FR-008 | UC-1 | n/a (route guard, no new mechanism) | Must |
| FR-009 No mutation controls | TR-138 FR-009 | UC-1, UC-2 | n/a (exclusion, verified by absence) | Must |
| FR-010 Optional CTA to teachers screen | TR-138 FR-010 | UC-2 | n/a (client-side navigation) | Could |
| FR-011 No per-class score/attendance | TR-138 FR-011 | n/a (negative scope) | n/a (exclusion) | Won't |
| FR-012 No new detail drill-down | TR-138 FR-012 | n/a (negative scope) | n/a (exclusion) | Won't |
| NFR-001 A11y keyboard/contrast/focus | TR-138 NFR-001 | UC-1, UC-2, cross-cutting | n/a | Must |
| NFR-002 Responsive table→card | TR-138 NFR-002 | cross-cutting | n/a | Must |
| NFR-003 i18n `principalClasses` namespace | TR-138 NFR-003 | cross-cutting | n/a | Must |
| NFR-004 No N+1 fan-out beyond resolved source | TR-138 NFR-004 | UC-1 | INT-001 (§6 perf tradeoff) | Must |
| NFR-005 Perceived loading performance | TR-138 NFR-005 | UC-1 | n/a | Must |
| NFR-006 Server-side security gating | TR-138 NFR-006 | UC-1 | n/a (existing guard, decision `0063`) | Must |
| §6 repo-choice (structural, not an FR) | integration.md §5 | UC-1 (assumed resolved) | INT-001 | OPEN — not blocking spec delivery |
| MANAGER-role BE auth (structural risk) | integration.md §7 | UC-1 (AC-1.23) | INT-001 | OPEN — launch-blocking-risk, verify before ship |

## 10. Handoff to FE

**`fe-lead` should build:**
- **Route + presentation:** `(app)/principal/classes/page.tsx` (RSC) +
  `features/principal/presentation/classes/` (client component(s) for the
  table/card list, filters, sort control, load-more, retry, optional CTA).
  No new Server Action beyond a thin wrapper over whichever use-case is
  resolved per §6.
- **Data layer decision (resolve first):** choose between reusing
  `IClassManagementRepository.listClasses()` (cross-feature) or extending
  `IPrincipalTeachersRepository.listClasses()` (§6) — this is the one
  decision to make before writing much presentation code, since it
  determines the shape of data the presentation layer receives
  (`studentCount`/`homeroomTeacherName` must be real either way).
- **Risk to verify early:** manually confirm MANAGER-role authorization on
  `GET /api/v1/classes` against a real (non-mock) `core` environment before
  investing in any `enrich()`-pattern extension — a 403 here is
  launch-blocking (§8, open question #1).
- **i18n:** new `principalClasses` namespace in
  `src/bootstrap/i18n/messages/{vi,en}.json` (vi source + en mirror) — no
  keys pre-written by this spec; `fe-nextjs-engineer` authors them during TDD
  per `.claude/rules/i18n.md`.
- **No ADR needed:** this is a data-completeness/repository-reuse finding at
  the implementation layer, not a new auth/token/data-contract/design-system
  decision — see confirmation below.

**Suggested lane:** normal (read-only screen, no new mutation/auth surface,
no new RBAC mechanism, no new PII, no data-loss risk — confirmed in
requirements.md's lane declaration; the repository-choice work, even if it
extends a repository method, does not add a new endpoint or contract, only
consumes the existing real one more completely).

**Proof owed (→ `docs/TEST_MATRIX.md` US-E13.8 row, update from `planned`
once built):**
- Unit: if a repository method is extended/added, contract-level tests for
  the resolved `listClasses` implementation (params passed, pagination
  threaded, enrichment or hardcoded-gap absent); client-side filter/sort/
  search pure-function tests if extracted; RBAC forged-role test per
  decision `0063` if a new repository call path is introduced.
- Integration: mock repository page/status/grade/name/sort scenarios; error
  mapping (`forbidden`, `network-error`, `unknown`).
- E2E: Storybook interaction stories for all 4 core states (loading/empty×2
  variants/error×2 variants/success), status/grade/name filter interactions,
  sort toggle + persistence across filter change, load-more success/failure/
  hasMore=false, RBAC redirect for non-principal roles, CTA visibility gating
  (AC-2.1) and navigation (AC-2.2), responsive breakpoints (320/375/768/
  1280), keyboard-only pass.
- Platform: `tsc --noEmit` clean; `bun run build` OK.
- Release: design-review gate (`docs/DESIGN_REVIEW.md`) — no
  `design-spec.jsonc` entry exists yet (§8 GAP), so the gate should confirm
  the screen reads as a faithful extension of `PrincipalTeachersScreen`'s
  table pattern + token usage, not a net-new visual language.
