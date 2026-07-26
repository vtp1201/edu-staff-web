# Use Cases — US-E13.8 Principal Classes (School-Wide Class List)

Input: `story.md`, `requirements.md` (TR-138), `integration.md` (this folder). This doc does
not write code, does not design pixel layout, and does not decide the repository-choice
question raised in `integration.md` §5 — it writes AC **assuming that gap gets resolved
correctly** (per Known Implementation Note below), because requirements.md's FR-002/FR-007
are Must-have and the degraded path would contradict them.

## 1. Use Case Scope Summary

- **2 use cases**: UC-1 (primary — view/filter/sort/paginate the class list), UC-2 (secondary,
  Could-have — CTA link-out to `(app)/principal/teachers`).
- **Actors**: `principal` (primary, only role with a happy path), `teacher`/`admin`/`student`/
  `parent` (secondary — negative/access-denied variants only, no distinct behavior per role
  beyond "blocked").
- **Boundary**: read-only screen. No create/rename/archive/homeroom-assignment action is
  modeled (FR-009, explicit negative requirement — verified by absence, not by a flow). No
  per-class score/attendance rollup (FR-011) and no new drill-down detail screen (FR-012) are
  modeled — both are Won't-have; any "view detail" affordance is UC-2's link-out only.
- **Total AC count**: 27 (UC-1: 22 across 8 groups, UC-2: 2, Role-variant/RBAC: 3 folded into
  UC-1's exception flows — see AC table for the authoritative count. Also see §5 matrix.)

## 2. Actor Catalogue

| Actor/Role | Type | Capabilities on this screen |
| --- | --- | --- |
| `principal` (MANAGER claim) | Primary, human | View, filter (status/grade/name), sort, paginate (load more), navigate away via CTA. Read-only — no mutation. |
| `teacher` | Secondary, human | No access — redirected per existing `(app)/principal/layout.tsx` guard; retains own `(app)/teacher/classes` (US-E13.1). |
| `admin` | Secondary, human | No access via this route — redirected; retains full CRUD at `(app)/admin/classes` (US-E12.10). |
| `student` | Secondary, human | No access — redirected. |
| `parent` | Secondary, human | No access — redirected. |
| `core` service (`GET /api/v1/classes`) | System/external | Supplies `Class` rows + cursor pagination metadata. Read-only dependency, no write side effect from this screen. |

## Known Implementation Note (callout, not new AC — for `fe-planner`/`fe-nextjs-engineer`)

1. `IPrincipalTeachersRepository.listClasses()` (the repository story.md names as the "obvious"
   reuse target, already consumed by US-E13.5's GVCN picker) **cannot be reused as-is** for this
   screen: it passes no query params, discards `pagination`, and hardcodes
   `studentCount: 0` / `homeroomTeacherId: null` / `homeroomTeacherName: null` on every row (its
   own inline comment calls this a "KNOWN GAP"). That is acceptable for a picker showing only
   `id`/`name`, but it would make every AC below referencing real student count or a real
   homeroom-teacher name false on this screen.
2. A working precedent for the CORRECT behavior already exists in the same codebase:
   `IClassManagementRepository.listClasses()` (admin's `(app)/admin/classes`, US-E12.10) already
   threads `academicYear`/`cursor` params, returns real `nextCursor`/`hasMore`, applies
   `gradeLevel` filtering client-side (documented precedent for this screen's FR-004), and runs
   a per-class `enrich()` fan-out (roster count + homeroom fetch) to produce real `studentCount`
   and `homeroomTeacherName`.
3. **Perf tradeoff**: `enrich()` costs 2 extra HTTP calls per class per loaded page (roster count
   + homeroom fetch). For ~38 classes this is on the order of dozens of extra core requests per
   page load. This is an **already-accepted, already-shipped cost** — the admin class list pays
   it today — so it is a note, not a new NFR risk to flag as a blocker.
4. The AC below are written as if the screen's data source produces real `studentCount` /
   `homeroomTeacherName` / real pagination (i.e. assuming the gap is resolved one way or
   another before this screen ships) — they are NOT written against `IPrincipalTeachersRepository`'s
   current degraded output. This is a data-source constraint for implementation to satisfy, not
   a BA decision on which repository/file gets touched.

## 3. Use Case Catalogue

### UC-1: Principal views, filters, sorts, and paginates the school-wide class list

- **Primary actor**: `principal` (MANAGER claim).
- **Secondary actors**: `core` service (`GET /api/v1/classes`); `(app)/principal/layout.tsx`
  route guard / `evaluateNamespaceAccess`.
- **Preconditions**: user authenticated, session role resolves to `principal`; tenant has a
  resolvable "current academic year" (via existing `GET /api/v1/academic-years/active` per
  integration.md, out of this screen's own data-fetch scope but a precondition for the default
  `academicYear` query param).
- **Main success scenario**:
  1. Principal navigates to `(app)/principal/classes`.
  2. Route guard confirms `principal` role; screen renders.
  3. Screen resolves the active academic year and issues the class-list query with
     `academicYear` = active year, `limit = 100`, default status filter = active only (FR-003
     `[ASSUMPTION]`).
  4. Loading skeleton shown while the query is pending.
  5. Query resolves with one or more classes; skeleton replaced by a table (desktop/tablet) or
     card list (mobile) showing, per row: class name, grade level, homeroom teacher name (or
     "Chưa phân công" placeholder), student count, status badge (Đang học/Đã lưu trữ).
  6. Principal may narrow the list via status filter, grade-level filter, and/or name search
     (client-side, operating on loaded rows — see A2), and/or re-order via sort control (A3).
  7. If `hasMore` is true and the principal reaches the end of the loaded rows, a "load more"
     control is available (A4).
- **Alternative flows**:
  - **A1 — Status filter change**: principal toggles status (active/archived/all); list
    re-filters client-side against already-loaded rows (no new query needed for status since it
    operates on already-fetched data); if the filtered result is empty, empty state with "clear
    filters" shown (not an error).
  - **A2 — Grade-level / name filter-search (Should-have, FR-004)**: principal types a name
    fragment and/or picks a grade level; list narrows client-side against loaded rows only (no
    server-side `gradeLevel`/`name` param exists on the wire per integration.md §6); if zero
    matches, empty state with "clear filters" affordance.
  - **A3 — Sort (Should-have, FR-005)**: principal activates a sortable column/control (name or
    grade level, asc/desc); list re-orders client-side (no server-side `sort` param exists).
  - **A4 — Load more (pagination, FR-007)**: principal reaches the end of the current page while
    `hasMore` is true; activates "load more"; next page fetched with the prior page's
    `nextCursor`; new rows appended to the existing list (not replacing it); any active
    client-side filter/sort re-applies to the newly-expanded row set.
  - **A5 — CTA to teachers screen (Could-have, folded reference to UC-2)**: principal clicks a
    "Xem giáo viên" / manage-homeroom CTA on a row or globally; navigates to
    `(app)/principal/teachers` (see UC-2).
- **Exception flows**:
  - **E1 — Initial query fails (network/5xx/timeout)**: error state renders instead of skeleton
    or list — localized message + retry action; retry re-issues the same initial query.
  - **E2 — Initial query fails with 403 `CLASS_FORBIDDEN`**: defensive case (role guard should
    already have blocked navigation) — localized access-denied message, no retry offered
    (`retryable: false` per integration.md).
  - **E3 — Load-more (next page) query fails**: existing rows remain visible; inline
    retry affordance shown at the load-more control only (not a full-screen error); retry
    re-issues the next-page fetch with the same cursor.
  - **E4 — Zero classes in the tenant for the active academic year, no filter applied**: empty
    state (not an error) — distinct "no classes yet" message, no "clear filters" affordance
    (since no filter is active). Documented as an unlikely-but-must-handle edge case (a tenant
    with zero classes at all).
  - **E5 — Non-principal role navigates to the route**: route guard
    (`(app)/principal/layout.tsx` + `evaluateNamespaceAccess`) redirects before this screen's
    data layer is ever invoked — reuses the existing shell pattern, not re-derived here.
- **Business rules**:
  - Default status filter = active only (FR-003 `[ASSUMPTION]`); archived classes are opt-in.
  - `homeroomTeacherId === null` → render the localized "Chưa phân công" placeholder, never a
    blank cell (FR-002 errorConditions), and never render a false "0 học sinh"/placeholder pair
    for a class that actually has data (Known Implementation Note).
  - No mutation control (create/rename/archive/assign) is rendered anywhere on this screen
    (FR-009).
  - No per-class score/attendance field is fetched or shown (FR-011); no new detail
    drill-down screen is introduced (FR-012).
  - `limit = 100` is always explicitly passed on every query (initial and any client-triggered
    re-query), per integration.md §6's recommendation, so client-side filter/search/sort behaves
    as effectively-global for a realistic ~38-class tenant without depending on an undocumented
    BE default `limit`.
- **Non-functional constraints**: NFR-001 (a11y — keyboard operable filters/sort/pagination/
  retry, status via icon+label not color alone, focus visible, WCAG AA contrast, ≥44×44px touch
  targets), NFR-002 (responsive — table→card at mobile breakpoints, no break at 320px), NFR-003
  (i18n — `principalClasses` namespace, vi source + en mirror), NFR-004 (exactly 1 network call
  per page load/turn — no per-row calls beyond what the resolved data source already performs
  internally), NFR-005 (skeleton visible within 320ms of query start).

### UC-2: Principal navigates from the class list to the teachers/homeroom screen (Could-have, FR-010)

- **Primary actor**: `principal`.
- **Secondary actor**: none (pure client-side navigation).
- **Preconditions**: UC-1's class list has successfully loaded (at least the initial page);
  the CTA is not shown while the list is loading, empty, or errored.
- **Main success scenario**:
  1. Principal clicks a "Xem giáo viên" / "Quản lý GVCN" CTA (per-row or global placement — a
     layout decision, not modeled here).
  2. Screen navigates to `(app)/principal/teachers` (existing US-E13.5 screen).
- **Alternative flows**:
  - **A1**: CTA is scoped to a specific class (per-row) — navigation MAY carry a pre-filter
    (e.g. by grade level or class name) to `(app)/principal/teachers`, if that screen already
    supports being deep-linked with a filter; this is a nice-to-have, not required, since no
    new assignment UI is built here (FR-010's own postcondition is just "navigation").
- **Exception flows**:
  - **E1**: none distinct from standard client-side navigation failure (out of scope — Next.js
    routing, not a domain exception).
- **Business rules**: this CTA never opens an inline assignment UI on THIS screen — it only
  navigates away (FR-009/FR-012 boundary).
- **Non-functional constraints**: CTA is keyboard-focusable and reachable via Tab order
  consistent with NFR-001.

## 4. Acceptance Criteria

### UC-1 — Loading / Empty / Error / Success (core async states)

```
AC-1.1  Loading (initial fetch)
  Given the principal navigates to (app)/principal/classes for the first time in the session
  When the initial class-list query is pending
  Then a skeleton table (desktop/tablet) or skeleton card list (mobile) is shown in place of
       content, visible within 320ms of query start (NFR-005), and no partial/stale data flashes

AC-1.2  Success — populated, multiple grade levels
  Given the initial query resolves with classes spanning multiple grade levels
  When the list renders
  Then each row/card shows class name, grade level, homeroom teacher name (or "Chưa phân công"),
       student count, and a status badge (Đang học / Đã lưu trữ) conveyed by icon+label (not
       color alone, NFR-001), and the default view shows only active-status classes (FR-003
       [ASSUMPTION])

AC-1.3  Success — homeroom teacher unassigned
  Given a class in the loaded page has homeroomTeacherId = null
  When that row renders
  Then the cell shows the localized "Chưa phân công" placeholder, not a blank cell, and this
       placeholder is shown ONLY for classes genuinely lacking a homeroom teacher (not as a
       hardcoded default for every row — see Known Implementation Note)

AC-1.4  Empty — tenant has zero classes at all
  Given the tenant has zero classes for the active academic year and no client-side filter is
       active
  When the initial query resolves with zero rows
  Then an empty state renders with a "no classes yet" localized message and no "clear filters"
       affordance is shown (since no filter caused the emptiness); this is an unlikely-but-
       must-handle case per requirements.md's edge-case note

AC-1.5  Empty — filter/search yields zero matches
  Given classes exist but a status/grade-level/name filter is active
  When the filtered result set is empty
  Then an empty state renders with a localized "no classes match" message AND a "clear filters"
       affordance that resets all active filters to default (status=active, no grade/name filter)

AC-1.6  Error — initial query network/5xx/timeout failure
  Given the initial class-list query fails with a network error, 5xx, or timeout
  When the failure is received
  Then an error state renders (not a blank list) with a localized message and a retry action;
       activating retry re-issues the same initial query and shows the loading state again

AC-1.7  Error — initial query 403 CLASS_FORBIDDEN (defensive)
  Given the initial query fails with 403 CLASS_FORBIDDEN
  When the failure is received
  Then a localized access-denied message renders with NO retry action offered (retryable: false
       per integration.md's error mapping); this is a defensive case since FR-008's route guard
       should already prevent a non-principal session from reaching this query
```

### UC-1 — Status filter (FR-003, default active)

```
AC-1.8  Default filter on load
  Given the principal has never changed the status filter this session
  When the screen first renders
  Then only classes with status = active (Đang học) are shown, per the default-active
       [ASSUMPTION]

AC-1.9  Toggle to archived
  Given the class list is loaded
  When the principal switches the status filter to "archived" (or "all")
  Then the visible rows update to match the new filter, applied client-side against already-
       loaded rows, with no additional network call required for this filter change alone

AC-1.10 Toggle keyboard-operable
  Given the status filter control is a keyboard-focusable element
  When the principal reaches it via Tab and operates it via keyboard (Enter/Space/Arrow as
       appropriate to the control type)
  Then the filter applies identically to a mouse interaction, and focus remains visible
       (NFR-001)
```

### UC-1 — Grade-level / name filter-search (FR-004, Should-have)

```
AC-1.11 Grade-level filter
  Given the class list is loaded
  When the principal selects a specific grade level
  Then only classes matching that gradeLevel (client-side filter on loaded rows, no server
       query param exists per integration.md §6) are shown

AC-1.12 Name search
  Given the class list is loaded
  When the principal types a name fragment into the search input
  Then the list narrows client-side to classes whose name contains the fragment
       (case-insensitive), operating only against rows already loaded into the client — NOT a
       global search across unfetched pages (documented limitation, integration.md §6)

AC-1.13 Combined filter + search
  Given both a grade-level filter and a name-search term are active
  When both conditions are applied
  Then only classes satisfying BOTH conditions are shown (AND semantics)

AC-1.14 Filter/search + pagination interaction
  Given a name search or grade filter is active AND hasMore is true
  When the principal loads the next page (A4)
  Then the newly-appended rows are also subject to the currently active filter/search before
       being counted toward the visible result set
```

### UC-1 — Sort (FR-005, Should-have)

```
AC-1.15 Sort by class name
  Given the class list is loaded (any filter state)
  When the principal activates "sort by name" ascending, then descending
  Then the visible rows re-order alphabetically by name in the selected direction, client-side,
       with no server-side sort param involved

AC-1.16 Sort by grade level
  Given the class list is loaded
  When the principal activates "sort by grade level" ascending, then descending
  Then the visible rows re-order numerically by gradeLevel in the selected direction

AC-1.17 Sort persists across filter changes within the session
  Given a sort order is active
  When the principal changes the status or grade/name filter afterward
  Then the previously selected sort order is still applied to the newly filtered result set
       (sort is not silently reset by a filter change)
```

### UC-1 — Pagination / load more (FR-007, cursor-based)

```
AC-1.18 Initial page request shape
  Given the screen issues its initial query
  When the request is built
  Then it always passes an explicit limit=100 (per integration.md §6's recommendation) and the
       resolved active academicYear, using { raw: true } + parseEnvelope() to read
       meta.pagination

AC-1.19 Load more — success
  Given the initial page resolved with hasMore = true
  When the principal activates the "load more" control at the end of the loaded rows
  Then the next page is fetched using the prior page's nextCursor, and the returned rows are
       APPENDED to (not replacing) the currently visible list

AC-1.20 Load more — failure
  Given a load-more request fails (network/5xx/timeout)
  When the failure is received
  Then the previously loaded rows remain visible unchanged, and an inline retry affordance
       appears at the load-more control (not a full-screen error replacing the whole list)

AC-1.21 hasMore = false — no load-more control
  Given the most recently loaded page has hasMore = false
  When the list finishes rendering
  Then no "load more" control is shown (there is nothing further to fetch)

AC-1.22 Realistic-scale edge (>100 classes)
  Given a tenant has more classes than a single limit=100 page (an edge case beyond the
       realistic ~38-class school size named in this story's context)
  When the principal has loaded only the first page
  Then client-side filter/search/sort operates only on the rows loaded so far, and the "load
       more" control remains available until hasMore = false — no attempt is made to silently
       fetch all pages eagerly in one request (FR-007's explicit constraint); this is a
       documented soft-cap-by-explicit-limit approach (see Edge Case Matrix), not a hard
       ceiling on the number of classes supported
```

### UC-1 — RBAC / role variants (FR-008)

```
AC-1.23 principal — happy path access
  Given a session with role = principal (MANAGER claim)
  When the user navigates to (app)/principal/classes
  Then the route guard allows the request through and the screen's data query executes

AC-1.24 teacher — blocked
  Given a session with role = teacher
  When the user navigates (directly via URL or a stale link) to (app)/principal/classes
  Then the existing (app)/principal/layout.tsx guard + evaluateNamespaceAccess redirects the
       user before this screen's query is invoked, per the existing shell pattern (not
       re-derived here); teacher's own (app)/teacher/classes remains their scoped view

AC-1.25 admin — blocked
  Given a session with role = admin
  When the user navigates to (app)/principal/classes
  Then the same guard redirects the user; admin's own (app)/admin/classes CRUD screen remains
       unaffected and unreachable-from-here

AC-1.26 student / parent — blocked
  Given a session with role = student or parent
  When the user navigates to (app)/principal/classes
  Then the same guard redirects the user (no distinct behavior between student and parent for
       this negative case)

AC-1.27 Session role changes mid-session (defensive)
  Given a principal session's role changes (e.g. re-provisioned) between initial page load and
       a subsequent load-more/filter re-query
  When the data layer receives 403 CLASS_FORBIDDEN on a subsequent call
  Then the same E2/AC-1.7-style access-denied treatment applies to that specific failed call
       (not a hard app crash), without retry
```

### UC-2 — Navigate to teachers screen (FR-010, Could-have)

```
AC-2.1  CTA visible only in success state
  Given the class list is in loading, empty, or error state
  When the screen renders
  Then the "Xem giáo viên"/"Quản lý GVCN" CTA is NOT shown; it appears only once the list has
       successfully loaded at least its first page

AC-2.2  CTA navigation
  Given the class list has successfully loaded
  When the principal activates the CTA (mouse click or keyboard Enter/Space, focus visible)
  Then the app navigates to (app)/principal/teachers; no inline assignment UI opens on THIS
       screen (FR-009/FR-012 boundary preserved)
```

### Cross-cutting — Responsive / Keyboard / i18n (apply across UC-1 and UC-2)

```
AC-X.1  Responsive breakpoints
  Given the screen is viewed at 320px, 375px, 768px, and 1280px widths
  When the layout renders at each width
  Then no horizontal scroll or content loss occurs at any width, and the layout switches from
       table (desktop/tablet ≥768px) to card list (mobile <768px) per NFR-002, consistent with
       PrincipalTeachersScreen's existing responsive convention

AC-X.2  Full keyboard operability
  Given a keyboard-only user (no mouse)
  When they Tab through the screen in reading order
  Then every interactive control (status filter, grade filter, name search, sort control,
       load-more, retry, CTA) is reachable and operable via keyboard, with a visible focus ring
       at every step (NFR-001)

AC-X.3  i18n namespace
  Given the screen renders any UI string (column headers, filter labels, status badges,
       loading/empty/error copy, "Chưa phân công" placeholder, CTA label)
  When the string is sourced
  Then it is a typed t() key under a new `principalClasses` namespace in
       messages/{vi,en}.json, vi authored as source and en mirrored at the same key paths, with
       zero hardcoded UI strings in the .tsx
```

## 5. Edge Case Matrix

| Scenario | Empty | Max-length / scale | Concurrent | Auth-expired | Network-error | Wrong-role |
| --- | --- | --- | --- | --- | --- | --- |
| Initial list load | AC-1.4 (0 classes tenant-wide) | AC-1.22 (>100 classes, limit=100 soft page) | N/A (single-user read) | Handled by existing reactive/proactive refresh (decision 0018), out of this screen's own AC | AC-1.6 (retry) | AC-1.24–1.26 (redirect before query) |
| Status filter | AC-1.5 (filter → 0 matches) | N/A (bounded enum: active/archived/all) | Sort persists across filter change (AC-1.17) | same as above | N/A (client-side, no new call) | N/A (post-guard) |
| Grade/name filter-search | AC-1.5 | AC-1.12 (search limited to loaded rows only, documented) | Combined filter+search AND semantics (AC-1.13) | same as above | N/A (client-side) | N/A (post-guard) |
| Sort | N/A (sort never empties the list) | N/A | Persists across filter change (AC-1.17) | same as above | N/A (client-side) | N/A (post-guard) |
| Pagination / load more | N/A (load-more hidden when hasMore=false, AC-1.21) | AC-1.22 (>100 classes edge) | Filter/search re-applies to appended rows (AC-1.14) | same as above | AC-1.20 (inline retry, rows preserved) | N/A (post-guard) |
| Homeroom teacher field | AC-1.3 ("Chưa phân công" placeholder) | N/A | N/A | N/A | Upstream enrich() failure surfaces via the resolved data source's own error mapping (implementation-level, not a distinct UC-1 AC) | N/A |
| RBAC / route access | N/A | N/A | AC-1.27 (mid-session role change → defensive 403 handling) | Standard session-expiry flow (decision 0018), unrelated to role-gating | AC-1.7 (403 CLASS_FORBIDDEN, no retry) | AC-1.24–1.26 |
| UC-2 CTA | AC-2.1 (hidden until success) | N/A | N/A | N/A | N/A (pure client nav) | Inherits UC-1's guard (CTA only reachable if UC-1's screen was reachable) |

## 6. Open Questions (flag to `ba-lead`)

- `[OPEN QUESTION]` (carried from integration.md §5, restated for `ba-lead` visibility) — which
  repository/use-case this screen's presentation should actually call
  (`IClassManagementRepository.listClasses()` cross-feature reuse vs. extending
  `IPrincipalTeachersRepository.listClasses()`) is the single biggest scope-shaping decision
  left open. This use-cases doc writes AC assuming whichever path is chosen delivers REAL
  `studentCount`/`homeroomTeacherName`/pagination (FR-002/FR-007 are Must-have) — it does not
  choose the path itself, per this role's scope boundary.
- `[OPEN QUESTION]` (carried from integration.md §7) — is `MANAGER` (principal appRole)
  actually authorized by `core`'s `GET /api/v1/classes` RBAC middleware? Working assumption is
  yes (precedent via the GVCN picker), but unverified against a non-mock core environment. A
  403 for every principal user would be launch-blocking, not cosmetic — recommend confirming
  before AC-1.23 is treated as provable in an E2E/integration test against real core.
- `[OPEN QUESTION]` (carried from integration.md §7) — `GET /api/v1/classes`'s behavior when
  `academicYear` is omitted is undocumented. AC-1.2/AC-1.18 assume the screen always resolves
  and passes an explicit active-year value (via a supplementary `GET
  /api/v1/academic-years/active` call) rather than relying on any omitted-param default — this
  is stated as the intended behavior, not an invented BE default.
- `[OPEN QUESTION]` Should a `docs/product/design-spec.jsonc` entry be authored for this screen
  before/alongside `/fe` implementation? story.md notes none exists yet and this screen reuses
  patterns from `PrincipalTeachersScreen` (table) and `TeacherClasses` (card reference only).
  Flagging as warranted given NFR-002's responsive requirement references an existing
  convention rather than a normative spec — but authoring the entry itself is a `/uiux`
  follow-up, not decided here.
- `[OPEN QUESTION]` requirements.md's FR-004/FR-005 (Should-have client-side search/sort) and
  FR-010 (Could-have CTA) are modeled here in full (AC-1.11–1.17, AC-2.1–2.2) so the FE team
  has AC ready if `fe-planner` phases them into v1; if `fe-lead`/`fe-planner` decides to defer
  any Should/Could item to a later story, that is a phasing call for them to make explicitly,
  not an implicit drop from this AC set.
