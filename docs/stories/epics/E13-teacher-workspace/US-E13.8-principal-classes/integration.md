# Integration Map — US-E13.8 (Principal Classes — School-Wide Class List)

Service: **core**, tag `Classes`. Single read endpoint: `GET /api/v1/classes`.
Confirmed **REAL** against `../edu-api/services/core/docs/openapi.yaml:357-420`
and `INTEGRATION.md:124`. No new endpoint, no mutation endpoint is mapped (this
screen is read-only per FR-009).

**Central finding (read this first):** two DIFFERENT web repositories already
call this SAME BE endpoint for the SAME `Class` entity, and they are NOT
equivalent. Story.md's "Shared contract" line names
`IPrincipalTeachersRepository.listClasses()` as the thing to reuse — analysis
below finds that method has a genuine, documented gap that would silently
under-deliver two Must-have FRs (FR-002 real studentCount/homeroom, FR-007
real pagination) if wired to this screen as-is. See §5.

## 1. Integration Overview

- Endpoints consumed: **1** (`GET /api/v1/classes`).
- Services touched: `core` only.
- Status: **REAL**, already wired in two competing web repositories (see §5).
  No mock-first needed — this is not a case of "service not built yet."
- Risk: **not the BE contract** (that part is solid and documented) — the risk
  is a **web-side repository-choice gap**. Recommend resolving before
  `fe-planner` phases the work, since it changes which repository/use-case
  layer this screen's presentation should call.

## 2. Endpoint Catalogue

```
INT-001  List Classes (school-wide, principal-consumed)
Service: core    Method+Path: GET /core/api/v1/classes
  (Kong-prefixed per ADR 0030/US-E06.3: `CLASS_EP.classes` =
  `/core/api/v1/classes` → Kong strips `/core` → BE receives `/api/v1/classes`.)
Status: REAL (openapi.yaml:357-420, INTEGRATION.md:124). Two web call-sites
  exist today — see §5 for which one this screen should actually use.
Protected: yes   Role required: per openapi/INTEGRATION.md prose, "ADMIN
  (all classes) / TEACHER (assigned classes only)" — MANAGER is NOT
  explicitly named in the openapi description, INTEGRATION.md endpoint table,
  or ERROR_CODES.md's `CLASS_FORBIDDEN` row ("Caller is not ADMIN/SUPER_ADMIN
  (or a TEACHER without assignment on read)"). Per the task brief this is
  being treated as an already-confirmed precedent (principal/MANAGER can
  successfully call this endpoint today via the GVCN-picker dropdown in
  US-E13.5's `TeacherAssignmentSheet`) — see §6 open question for the residual
  doc-vs-precedent gap.
Request (outbound, camelCase query params — confirmed exhaustive from
  openapi.yaml:395-412, no others exist):
  - academicYear — string, optional. Filters to one academic year
    ("2025-2026"-style label). Omitting it is allowed but behavior on omission
    (all years vs. server-side "current year" default) is NOT documented —
    see §6.
  - cursor — string, optional. Opaque pagination cursor from a prior page's
    `meta.pagination.nextCursor`.
  - limit — integer, optional, min 1 / max 100. Page size.
  - **NOT supported, confirmed absent from the query parameter list**:
    status, gradeLevel, name/search, sort. Any FR-003/004/005 filter/search/
    sort MUST be client-side against loaded page(s) — see §5's filter/search
    verdict.
Response payload (inbound, after envelope unwrap) — `ClassResponseDto[]`
  (wire shape `ClassResponse`, openapi.yaml:7126) mapped via
  `ClassManagementMapper.toClass()` to the canonical `Class` entity:
  - id (wire: classId) — class UUID | Internal
  - name — class name (e.g. "10A1") | Internal
  - gradeLevel — integer | Internal
  - academicYear (wire: academicYearLabel) — string | Internal
  - status — ACTIVE | ARCHIVED | Internal
  - studentCount — integer. **NOT on the wire `ClassResponse` schema at all**
    (confirmed: schema's `required` list and `properties` block have no
    student-count field). Always derived client-side by a separate fan-out
    call — see §5.
  - homeroomTeacherId / homeroomTeacherName — **NOT on the wire either**.
    Also always derived client-side via `GET .../homeroom-teacher` per class
    — see §5.
Pagination: cursor-based, confirmed real —
  `components/responses/ClassList` (openapi.yaml:6227-6241) wraps
  `SuccessEnvelope` + `data: ClassResponse[]` + `meta: PaginatedMeta`. Read via
  `{ raw: true }` + `parseEnvelope()` → `{ data, pagination: { nextCursor,
  hasMore } }`, matching `.claude/rules/api-integration.md`'s standard pattern
  (already implemented this way in `class-management.repository.ts:138-159`).
Errors → UI behavior (per ERROR_CODES.md core, lines 50-51/100; only the
  read-relevant subset applies to a GET list):
  - 401 → handled by existing reactive/proactive refresh (decision 0018), not
    this screen's concern.
  - 403 `CLASS_FORBIDDEN` → map to failure `forbidden` → FR-008's RBAC guard
    should already prevent non-principal navigation, so this is a defensive
    "session role changed mid-session" case, not the primary gate — show a
    localized access-denied message, no retry (retryable: no).
  - network/5xx/timeout → failure `network-error` → FR-006 error state:
    localized message + retry action (retryable: yes).
  - anything unrecognized → failure `unknown` → same error state as
    network-error, generic retry.
  - Zero classes for the current filter/page → NOT an error; FR-006 empty
    state (localized message + "clear filters" affordance if a client-side
    filter is active).
Empty / loading expectation: skeleton rows/cards on initial fetch and on any
  filter/sort change that triggers a re-query (NFR-005: visible within 320ms);
  empty state distinguishes "no classes at all" vs "no classes match the
  active filter" (FR-003/004 errorConditions); load-more control shows its own
  inline pending/error state per FR-007, existing rows stay visible on a
  failed next-page fetch.
```

## 3. Auth & Security

- Protected endpoint, Bearer access token via httpOnly cookie (decision
  `0018`) — no client-side token handling, standard for this repo.
- Role: `principal` only reaches this screen (route guard
  `(app)/principal/layout.tsx` + `evaluateNamespaceAccess`, per FR-008 — no
  new RBAC mechanism). The BE-side role check for THIS endpoint is documented
  as ADMIN(all)/TEACHER(assigned); MANAGER's behavior is precedent-based, not
  openapi-documented — see §6.
- PII: none of the returned fields (`name`, `gradeLevel`, `status`,
  `academicYear`, `studentCount`, `homeroomTeacherId/Name`) is student PII —
  `homeroomTeacherName` is a staff name already surfaced on
  `PrincipalTeachersScreen`/admin class list per requirements.md's lane
  analysis (no new PII surface). Sensitivity: Internal (org data), consistent
  with sibling stories.
- No mutation endpoint is in scope; `assignHomeroomTeacher`/`archiveClass`/etc.
  exist on `core` but are explicitly NOT called by this screen (FR-009).

## 4. Mock-first plan

Not applicable — the endpoint is REAL and already exercised by two existing
repositories in this codebase (see §5). No `bootstrap/lib/mock.ts` addition is
needed for the endpoint itself. `NEXT_PUBLIC_USE_MOCK=true` dev/demo mode is
already handled by whichever repository this screen ends up calling (both
`ClassManagementRepository`/mock pair and `PrincipalTeachersRepository`/mock
pair already exist with `NEXT_PUBLIC_USE_MOCK` gating per decision `0014`) —
no new mock plumbing to design here.

## 5. Repository-choice gap (the genuine finding flagged for `fe-planner`)

**Two existing implementations of `GET /api/v1/classes`, not equivalent:**

**(A) `IPrincipalTeachersRepository.listClasses()`**
(`src/features/principal/infrastructure/teachers/repositories/principal-teachers.repository.ts:64-91`)
— the one story.md names as "already real, already wired." Reading it:
- Calls `this.http.get(CLASS_EP.classes, { raw: true })` with **no query
  params at all** — no `academicYear`, `cursor`, or `limit` is ever passed.
- Reads `parseEnvelope(envelope)` but only destructures `{ data }` —
  `pagination` is discarded. Callers get exactly one page (whatever the BE's
  unstated default `limit` is) with no way to reach `hasMore`/`nextCursor`.
  **This method cannot satisfy FR-007 (real cursor pagination) as written.**
- Maps every row through `ClassManagementMapper.toClass(dto, { studentCount:
  0, homeroomTeacherId: null, homeroomTeacherName: null })` — a **hardcoded**
  enrichment, not derived from any additional call. The method's own inline
  comment names this a "KNOWN GAP" left from US-E18.4/US-E13.5 scope. Wired
  to this screen as-is, **every class would show "0 học sinh" and "Chưa phân
  công" regardless of actual data** — directly breaks FR-002's Must-have
  fields and its own `errorConditions` line ("homeroomTeacherName is null ->
  render localized placeholder, not a blank cell" — the placeholder would
  render for every row, correct-looking but factually wrong for classes that
  DO have a homeroom teacher and students).

**(B) `IClassManagementRepository.listClasses(params)`**
(`src/features/admin/class-management/infrastructure/repositories/class-management.repository.ts:129-163`)
— the admin class-management screen's repository, over the SAME `Class`
entity, SAME `CLASS_EP.classes` endpoint:
- Accepts `{ academicYear?, gradeLevel?, cursor? }`, passes `academicYear` +
  `cursor` straight through as query params (matches the confirmed openapi
  parameter list exactly).
- Correctly threads `pagination.nextCursor`/`hasMore` back to the caller as
  `ClassListPage { data, nextCursor, hasMore }` — this is the pattern FR-007
  and `.claude/rules/api-integration.md` actually describe.
- Applies `gradeLevel` filtering **client-side** after fetch, with an inline
  comment explicitly stating "No `gradeLevel` query filter on the real wire
  (US-E18.4) — apply client-side after fetching the page" — this is the exact
  precedent this US's FR-004 needs, already proven in production code, not a
  new pattern to invent.
- For EACH row, runs `enrich(classId)` = `Promise.all([countRoster(classId),
  fetchHomeroom(classId)])`, giving REAL `studentCount` (paginated roster
  count-to-completion) and REAL `homeroomTeacherId`/`homeroomTeacherName`
  (`404 CLASS_ASSIGNMENT_NOT_FOUND` → correctly treated as "no homeroom," not
  an error). This is the only place in the codebase that produces
  trustworthy `studentCount`/`homeroomTeacherName` for this entity.

**Verdict:** as a pure data-source decision (no code authored here, per this
role's scope), (B) `IClassManagementRepository.listClasses()` is the
contract that actually satisfies FR-002 + FR-007 today; (A)
`IPrincipalTeachersRepository.listClasses()` does not, without being extended
to add the same params/pagination/enrichment logic that (B) already has
(which would just duplicate (B), not add anything new — a
`component-organization.md`-style "one canonical home" problem at the
repository layer, not just components). Recommend `fe-planner`/`fe-lead`
choose one of:
1. **Point this screen's presentation at `GetClassesUseCase`/
   `IClassManagementRepository.listClasses()` directly** (cross-feature reuse
   of the admin repository from principal presentation — deeper than the
   existing type-only `Class` entity import US-E13.5 already accepted, but
   the same direction of dependency, admin→shared canonical domain). This
   avoids duplicating `enrich()`'s fan-out logic anywhere.
2. **Extend `IPrincipalTeachersRepository.listClasses()`** to accept the same
   params and reimplement (or delegate to) the same enrichment — duplicates
   logic already proven in (B), not recommended.
3. **Accept (A)'s current degraded fields as a documented v1 limitation**
   (always show 0/"Chưa phân công", single page, no load-more) — this
   directly contradicts FR-002/FR-007's Must priority and requirements.md's
   own explicit scope, so not recommended without an explicit scope-down
   decision from `ba-lead`.

This is flagged as a finding, not decided here — no `src/` code is touched by
this analysis.

**Perf tradeoff to flag alongside option 1/2 (ties to NFR-004):** (B)'s
`enrich()` issues 2 extra HTTP calls per class (`countRoster` is itself a
paginated loop over `.../students`, `fetchHomeroom` is one call) via
`Promise.all` across the whole fetched page. For ~38 classes in one tenant,
a single page load could mean on the order of ~40-80 extra core requests
(depending on page size and whether any class has a large roster needing
multiple `countRoster` pages). Requirements.md's NFR-004 explicitly worries
about exactly this shape of fan-out for FR-011's excluded score/attendance
fields — the SAME concern applies here for studentCount/homeroom, except
these two fields are Must-have (already accepted elsewhere, e.g. admin's own
class list already pays this cost). Flagging so `fe-planner` weighs it
consciously rather than discovering it during implementation; not a blocker,
since the admin screen already ships this exact cost today.

## 6. Filter / search / sort verdict (FR-003/004/005)

Confirmed from openapi.yaml:395-412 — the ONLY query parameters `GET
/api/v1/classes` accepts are `academicYear`, `cursor`, `limit`. **No
`status`, `gradeLevel`, `name`, or `sort` parameter exists.** Therefore:

- **FR-003 (status filter)**: client-side only. The BE has no status query
  param; filter the already-fetched page(s) by `Class.status` in the
  presentation/query layer.
- **FR-004 (grade-level / name filter-search)**: client-side only —
  precedent already exists (`class-management.repository.ts`'s `gradeLevel`
  client-side filter, quoted above). Name search has no precedent yet but is
  the same pattern (client-side `.filter()` on `name`).
- **FR-005 (sort by name/grade)**: client-side only — no `sort` param exists
  on the wire at all.
- **Given cursor pagination, is client-side filter/search/sort reasonable at
  ~38 classes?** Yes, WITH a documented limitation: filter/search/sort can
  only operate on rows already loaded into the client (the current page +
  any previously-loaded pages via "load more"), not the full 38-class set,
  until the user has paged through everything. This must be stated as a
  known UX limitation, not silently implied as "search the whole school":
  - If BE's default page `limit` (unspecified — not documented, only the
    1-100 bound is) is ≥38, one page load already contains everything and
    filter/search/sort behave as if global — but this cannot be guaranteed
    without a BE-side default-limit confirmation (see open question below).
  - If the default is smaller, a name search for a class on page 3 will not
    surface until the user (or the screen, if it auto-loads-more on search)
    has paged there. Recommend `fe-planner`/`ba-use-case-modeler` pick one of:
    (a) explicitly pass a generous `limit` (e.g. 100, the documented max) on
    initial load so client-side filter/search/sort behaves as global for a
    ~38-class tenant in practice, revisiting only if a tenant ever exceeds
    100 classes; or (b) keep the default page size and accept
    "search only searches loaded rows," surfaced via UI copy. Option (a) is
    the more honest and lower-friction choice given the known school-size
    scale in this story's context — but it's a phasing/AC decision, not a
    contract fact, so left to `ba-use-case-modeler`/`fe-planner`.

## 7. Open Questions

- `[OPEN QUESTION]` Is `MANAGER` (principal appRole) actually authorized by
  `core`'s `GET /api/v1/classes` RBAC middleware to see ALL classes (like
  ADMIN), or does the endpoint's documented ADMIN/TEACHER-only behavior mean
  MANAGER gets `403 CLASS_FORBIDDEN`? Neither `openapi.yaml`'s endpoint
  description nor `INTEGRATION.md`'s endpoint table nor `ERROR_CODES.md`'s
  `CLASS_FORBIDDEN` row names MANAGER for this specific endpoint (unlike
  several sibling `core` endpoints — e.g. homeroom-entries approve/reject,
  grade approve/lock — which explicitly enumerate `ADMIN/MANAGER/SUPER_ADMIN`
  in both summary and description). This story is proceeding on the working
  assumption that MANAGER already works here today (per the GVCN-picker
  dropdown in `TeacherAssignmentSheet` populating from this same call in
  production) — but if that dropdown has actually been running in
  `NEXT_PUBLIC_USE_MOCK` mode in every environment observed so far, the real
  BE behavior for MANAGER on this endpoint would still be unverified.
  **Action**: confirm against a real (non-mock) core environment, or ask the
  edu-api `core` team directly, before `/fe` ships this screen — a 403 for
  every principal user would be a launch-blocking regression, not a
  cosmetic gap.
- `[OPEN QUESTION]` What is `GET /api/v1/classes`'s behavior when
  `academicYear` is omitted — does it return classes across ALL academic
  years, or default to a server-side "current year"? Requirements.md's
  assumption ("Academic year selector defaults to the tenant's current
  academic year... Class.academicYear is already on the entity") implies the
  FE will pass an explicit `academicYear`, sourced from
  `GET /api/v1/academic-years/active` (confirmed to exist,
  `INTEGRATION.md:158`, not otherwise mapped by this story since it's outside
  this screen's own data need — flag to `fe-planner` as a likely
  supplementary call needed to resolve "current academic year" before
  calling `listClasses`).
- `[OPEN QUESTION]` What is the BE's default `limit` when the `limit` query
  param is omitted? Not documented in openapi.yaml (only the 1-100 bound is
  given). This affects whether client-side filter/search/sort (§6) behaves
  as effectively-global for a ~38-class tenant or not. Recommend `fe-planner`
  either request this default from the `core` team or simply always pass an
  explicit `limit` (e.g. 100) to remove the ambiguity.
- `[OPEN QUESTION]` (repository-choice, restated from §5 for visibility) —
  should this screen consume `IClassManagementRepository.listClasses()`
  (admin feature, cross-feature reuse) or should
  `IPrincipalTeachersRepository.listClasses()` be extended to match it? This
  is the single biggest scope-shaping decision left open by this analysis;
  everything else in this document is a confirmed contract fact.
