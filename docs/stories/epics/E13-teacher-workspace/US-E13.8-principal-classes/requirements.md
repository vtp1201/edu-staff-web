# US-E13.8 Principal Classes — Requirements (TR-138)

Status: Draft (input to `ba-use-case-modeler` / `ba-spec-writer`)

## Lane confirmation

**Lane = normal.** No hard-gate flag trips: read-only screen (no create/rename/archive/assign
mutation is introduced), no new auth/RBAC mechanism (reuses the existing `principal`-only route
guard + `MANAGER` claim precedent already shipped in US-E13.5), no new PII (class name, grade
level, homeroom teacher name, student count are already displayed elsewhere — `TeacherClasses`,
`PrincipalTeachersScreen`, admin class list), no data-loss risk (nothing is written). Confirmed
per the story packet's own lane declaration.

## 1. Requirements Summary

The Principal Classes screen (`(app)/principal/classes`) gives the `principal` role a read-only,
school-wide, paginated list of all classes in the tenant for a selected academic year — class
name, grade level, homeroom teacher, student count, and status (active/archived) — built entirely
as a new presentation layer over the already-real `GetPrincipalClassesUseCase` /
`IPrincipalTeachersRepository.listClasses()` → core `GET /api/v1/classes`. No new domain logic,
entity, or mutation is introduced. `teacher` and `admin` keep their own separate class views (own
classes vs. full CRUD); this screen strictly does not overlap those.

## 2. Technical Requirements (JSON)

```json
{
  "requirementId": "TR-138",
  "title": "Principal Classes — School-Wide Read-Only Class List",
  "status": "Draft",
  "actors": [
    {
      "role": "principal",
      "capabilities": [
        "View a paginated list/table of all classes in the tenant",
        "Filter by academic year (default: current)",
        "Filter by status (active / archived)",
        "Filter or search by grade level and/or class name",
        "Sort by class name or grade level",
        "Navigate to an existing screen to see class roster or reassign homeroom teacher (no new detail view)"
      ]
    },
    {
      "role": "teacher",
      "capabilities": ["No access — teacher retains its own scoped class view at (app)/teacher/classes (US-E13.1), not this screen"]
    },
    {
      "role": "admin",
      "capabilities": ["No access via this screen — admin retains create/rename/archive at (app)/admin/classes (US-E12.10)"]
    },
    {
      "role": "student",
      "capabilities": ["No access"]
    },
    {
      "role": "parent",
      "capabilities": ["No access"]
    }
  ],
  "functionalRequirements": [
    {
      "id": "FR-001",
      "priority": "Must",
      "description": "The system SHALL display a list of all classes in the tenant for the principal's active academic year, sourced from the existing `listClasses()` query, with no new use-case or repository method required.",
      "trigger": "Principal navigates to (app)/principal/classes",
      "preconditions": ["User is authenticated with principal role (MANAGER claim)"],
      "postconditions": ["List of classes rendered with name, grade level, homeroom teacher, student count, status"],
      "errorConditions": ["Query fails -> error state shown (see FR-006)"]
    },
    {
      "id": "FR-002",
      "priority": "Must",
      "description": "The system SHALL show, per class row/card: class name, grade level, homeroom teacher name (or a 'not yet assigned' placeholder when homeroomTeacherId is null), student count, and status badge (active/archived).",
      "trigger": "List render",
      "preconditions": ["Class data loaded"],
      "postconditions": ["All five fields visible per row"],
      "errorConditions": ["homeroomTeacherName is null -> render localized placeholder, not a blank cell"]
    },
    {
      "id": "FR-003",
      "priority": "Must",
      "description": "The system SHALL let the principal filter the list by class status (active / archived / all), defaulting to active only.",
      "trigger": "Principal changes the status filter control",
      "preconditions": ["List loaded"],
      "postconditions": ["List re-queried or re-filtered to match selected status"],
      "errorConditions": ["No classes match filter -> empty state (FR-006), not an error"]
    },
    {
      "id": "FR-004",
      "priority": "Should",
      "description": "The system SHALL let the principal filter or search the list by grade level and/or class name.",
      "trigger": "Principal enters a search term or picks a grade-level filter",
      "preconditions": ["List loaded"],
      "postconditions": ["List narrows to matching classes"],
      "errorConditions": ["No match -> empty state with a 'clear filters' affordance"]
    },
    {
      "id": "FR-005",
      "priority": "Should",
      "description": "The system SHALL let the principal sort the list by class name or grade level (ascending/descending).",
      "trigger": "Principal activates a sortable column header / sort control",
      "preconditions": ["List loaded"],
      "postconditions": ["List re-orders accordingly"],
      "errorConditions": []
    },
    {
      "id": "FR-006",
      "priority": "Must",
      "description": "The system SHALL render distinct loading, empty, and error states for the class list, each independently.",
      "trigger": "Query pending / query resolves with zero classes / query fails",
      "preconditions": [],
      "postconditions": ["Loading: skeleton rows/cards. Empty: localized message + optional 'clear filters' if a filter is active. Error: localized message + retry action."],
      "errorConditions": ["Network/API failure -> error state must not silently show a blank list"]
    },
    {
      "id": "FR-007",
      "priority": "Must",
      "description": "The system SHALL paginate the class list using the core API's cursor-based pagination (`meta.pagination.nextCursor` / `hasMore`), loading further pages via a 'load more' control or infinite scroll, without fetching all classes eagerly in one request.",
      "trigger": "Principal reaches the end of the currently loaded page and hasMore is true",
      "preconditions": ["Repository call made with `{ raw: true }` so `parseEnvelope()` can read `meta.pagination` per `.claude/rules/api-integration.md`"],
      "postconditions": ["Next page of classes appended to the list"],
      "errorConditions": ["Next-page fetch fails -> inline retry affordance on the load-more control, existing rows remain visible"]
    },
    {
      "id": "FR-008",
      "priority": "Must",
      "description": "The system SHALL restrict this screen and its route to the `principal` role only (existing `(app)/principal/layout.tsx` route guard + `evaluateNamespaceAccess`, no new RBAC mechanism).",
      "trigger": "Any navigation attempt to (app)/principal/classes",
      "preconditions": [],
      "postconditions": ["Non-principal roles are redirected/blocked per the existing principal layout guard"],
      "errorConditions": []
    },
    {
      "id": "FR-009",
      "priority": "Must",
      "description": "The system SHALL NOT expose any create, rename, archive, or homeroom-teacher-assignment action on this screen; those remain on (app)/admin/classes (US-E12.10) and (app)/principal/teachers (US-E13.5) respectively.",
      "trigger": "N/A — negative requirement, verified by absence",
      "preconditions": [],
      "postconditions": ["No mutation controls rendered anywhere on this screen"],
      "errorConditions": []
    },
    {
      "id": "FR-010",
      "priority": "Could",
      "description": "The system MAY provide a 'View teachers' or 'Manage homeroom' link/CTA per class or globally that navigates to the existing (app)/principal/teachers screen (optionally pre-filtered), rather than building any new assignment UI here.",
      "trigger": "Principal clicks the CTA",
      "preconditions": ["Class list loaded"],
      "postconditions": ["Navigation to (app)/principal/teachers"],
      "errorConditions": []
    },
    {
      "id": "FR-011",
      "priority": "Won't",
      "description": "The system SHALL NOT fetch or display per-class average score or attendance percentage (as TeacherClasses does) in v1, to avoid an N+1 fan-out of grade-report/attendance calls across 38+ classes on a single list screen.",
      "trigger": "N/A — explicit scope exclusion",
      "preconditions": [],
      "postconditions": ["Only fields already present on the Class entity (studentCount, status, gradeLevel, homeroomTeacherName) are shown; no additional per-class network calls are made"],
      "errorConditions": []
    },
    {
      "id": "FR-012",
      "priority": "Won't",
      "description": "The system SHALL NOT introduce a new class-detail drill-down screen (e.g. per-class roster/subjects view) as part of this US.",
      "trigger": "N/A — explicit scope exclusion",
      "preconditions": [],
      "postconditions": ["Any 'view detail' affordance links out to an existing screen (e.g. principal/teachers) or is deferred to a future US, not built here"],
      "errorConditions": []
    }
  ],
  "nonFunctionalRequirements": [
    {
      "id": "NFR-001",
      "category": "Accessibility",
      "requirement": "List/table is fully keyboard operable (filters, sort, pagination control, retry); status conveyed by icon+label, not color alone; focus ring visible on all interactive elements.",
      "measurableTarget": "WCAG 2.1 AA — text contrast ≥4.5:1, UI/icon contrast ≥3:1, touch targets ≥44x44px on mobile"
    },
    {
      "id": "NFR-002",
      "category": "Responsive",
      "requirement": "Layout adapts from a table (desktop/tablet) to a card list (mobile) without horizontal scroll or content loss, following the same responsive convention as PrincipalTeachersScreen.",
      "measurableTarget": "No layout break at 320px; verified breakpoints 375 / 768 / 1280"
    },
    {
      "id": "NFR-003",
      "category": "i18n",
      "requirement": "All UI strings (column headers, filter labels, status badges, empty/error/loading copy, 'not yet assigned' placeholder) live under a new `principalClasses` namespace in messages/{vi,en}.json, vi as source, en mirrored.",
      "measurableTarget": "0 hardcoded UI strings in .tsx; typed t() keys compile-check via messages.d.ts"
    },
    {
      "id": "NFR-004",
      "category": "Performance",
      "requirement": "Avoid N+1 fan-out: the list must render from the single `listClasses()` cursor page response, not per-class supplementary calls (see FR-011).",
      "measurableTarget": "Exactly 1 network call per page load/page-turn (no per-row calls)"
    },
    {
      "id": "NFR-005",
      "category": "Performance",
      "requirement": "Perceived loading state (skeleton) must appear promptly on initial fetch and on filter change.",
      "measurableTarget": "Skeleton visible within 320ms of query start (team convention), consistent with other list screens"
    },
    {
      "id": "NFR-006",
      "category": "Security",
      "requirement": "Route and data access are gated server-side by the existing principal route guard and role claim; no client-side-only role check.",
      "measurableTarget": "Verified via existing (app)/principal/layout.tsx guard + repository-boundary check, no new mechanism introduced"
    }
  ],
  "uiStates": ["loading", "empty", "error", "success"],
  "dataDependencies": [
    {
      "source": "core",
      "entity": "Class (id, name, gradeLevel, status, academicYear, studentCount, homeroomTeacherId, homeroomTeacherName) via GET /api/v1/classes",
      "sensitivity": "Internal"
    }
  ],
  "scope": {
    "inScope": [
      "New route (app)/principal/classes + presentation layer in features/principal/presentation/classes/",
      "Reuse of existing GetPrincipalClassesUseCase / IPrincipalTeachersRepository.listClasses()",
      "Filter by status (active/archived/all, default active)",
      "Filter/search by grade level and/or class name",
      "Sort by class name or grade level",
      "Cursor-based pagination via meta.pagination (raw + parseEnvelope)",
      "Loading/empty/error states",
      "Optional CTA linking out to (app)/principal/teachers"
    ],
    "outOfScope": [
      "Create, rename, or archive a class (stays admin-only, US-E12.10)",
      "Homeroom teacher assignment/reassignment UI (stays (app)/principal/teachers, US-E13.5)",
      "Per-class average score / attendance % rollup (fan-out cost, deferred)",
      "New class-detail drill-down screen (roster/subjects per class)",
      "Any new entity, DTO, use-case, or repository method (unless implementation finds a genuine contract gap)"
    ],
    "externalDependencies": [
      "core service GET /api/v1/classes (already real, confirmed in US-E13.5's BE-readiness table)"
    ]
  },
  "assumptions": [
    "[ASSUMPTION] Default status filter is 'active' (Đang học) since that's the principal's most common need; archived classes are opt-in via filter, matching the admin class list convention.",
    "[ASSUMPTION] Academic year selector defaults to the tenant's current academic year; a year-switcher is Should-have, not Must-have, since Class.academicYear is already on the entity.",
    "[ASSUMPTION] Table layout on desktop/tablet (reusing PrincipalTeachersScreen conventions) is preferred over a card grid (TeacherClasses pattern) because this is a denser, filterable, principal-facing management list, not a personal dashboard — final visual call belongs to /uiux if a follow-up design pass happens.",
    "[ASSUMPTION] No new i18n namespace conflicts — 'principalClasses' does not exist yet in messages/{vi,en}.json."
  ],
  "openQuestions": []
}
```

## 3. Prioritized Requirements Summary (MoSCoW)

| ID | Requirement | Priority | Rationale |
| --- | --- | --- | --- |
| FR-001 | List render from existing query | Must | Core screen purpose; data layer already real, zero new backend risk |
| FR-002 | Per-row fields (name, grade, homeroom, count, status) | Must | Matches story.md AC placeholder + entity fields already available at no extra cost |
| FR-003 | Status filter (active/archived) | Must | Principal's primary "which classes are live" need; cheap (client or query param filter on existing field) |
| FR-004 | Grade level / name filter-search | Should | High value for 38+ classes but not blocking for v1 read-only launch |
| FR-005 | Sort by name/grade | Should | Usability improvement, not core function |
| FR-006 | Loading/empty/error states | Must | Hard baseline for any async screen (TDD + design-review gate requirement) |
| FR-007 | Cursor pagination | Must | Contract requirement — core API is cursor-paginated; skipping this risks unbounded single fetch |
| FR-008 | Principal-only RBAC | Must | Security baseline, reuses proven pattern |
| FR-009 | No mutation controls | Must | Explicit scope boundary preventing overlap with US-E12.10 / US-E13.5 |
| FR-010 | Optional CTA to principal/teachers | Could | Nice navigational bridge, not required for MVP |
| FR-011 | No per-class score/attendance | Won't | Explicit perf-driven exclusion (N+1 fan-out across 38+ classes) |
| FR-012 | No new detail drill-down | Won't | Keeps US scope tight; link out to existing screens instead |

## 4. Handoff Notes

**For `ba-integration-analyst`:**
- Confirm `IPrincipalTeachersRepository.listClasses()` signature supports the filter/sort params
  needed for FR-003/004/005 (status, gradeLevel, name search, sort) or whether these are
  client-side only against a fetched page (given cursor pagination, filters likely need to be
  server-side query params — verify against core `openapi.yaml` `GET /api/v1/classes` query
  parameters before ba-use-case-modeler writes AC assuming server-side filtering).
- Confirm the exact envelope/pagination fields (`nextCursor`, `hasMore`) returned by this endpoint
  match the `{ raw: true }` + `parseEnvelope()` pattern already used elsewhere (US-E13.5 reference).
- No new DTO/mapper expected — reuse `Class` entity/DTO from `class-management` domain.

**For `ba-use-case-modeler`:**
- Write Given/When/Then AC for: initial load (loading -> success), empty result (no classes /
  filtered to zero), error + retry, status filter toggle, grade/name filter, sort toggle,
  pagination load-more (success + failure), and the RBAC negative case (non-principal role blocked).
- Role variants: only `principal` has a happy path; all other roles = access-denied variant (link
  to existing route-guard behavior, don't re-derive).
- Flag: FR-011/FR-012 are explicit Won't-haves — AC should not include per-class score/attendance
  or drill-down flows; if use-case modeling surfaces a strong reason to reconsider, escalate to
  `ba-lead` rather than silently expanding scope.
