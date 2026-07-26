---
name: principal-classes-e13-8-repo-gap
description: US-E13.8 finding — two competing web repositories wrap core GET /api/v1/classes with different completeness; core's real query-param/limit contract for this endpoint
metadata:
  type: project
---

`core` `GET /api/v1/classes` (openapi.yaml:357-420, INTEGRATION.md:124) is REAL
and its query params are confirmed EXHAUSTIVE: `academicYear`, `cursor`,
`limit` (1-100) only. No `status`/`gradeLevel`/`name`/`sort` param exists —
any such filter/search/sort in web UI must be client-side. Response wire
schema `ClassResponse` (openapi.yaml:7126) has NO `studentCount` or homeroom
fields — those are always web-side derived.

Two web repositories call this same endpoint for the same `Class` entity, not
equivalent:
- `IClassManagementRepository.listClasses()` (admin,
  `class-management.repository.ts`) — the COMPLETE one: passes
  academicYear+cursor, threads real `nextCursor`/`hasMore`, applies
  `gradeLevel` client-side (precedent for any future client-side filter), and
  runs a per-class `enrich()` fan-out (`countRoster` + `fetchHomeroom`,
  `Promise.all`) for REAL studentCount/homeroomTeacherName. Cost: ~2 extra
  HTTP calls per class per page (documented perf tradeoff, already paid by
  the existing admin class list).
- `IPrincipalTeachersRepository.listClasses()` (principal,
  `principal-teachers.repository.ts:64-91`) — INCOMPLETE, has its own inline
  "KNOWN GAP" comment: passes NO query params (no pagination reachable,
  `parseEnvelope`'s pagination field is discarded), and HARDCODES
  studentCount:0/homeroomTeacherId:null/homeroomTeacherName:null for every
  row. Only fit for populating a small `<select>` (US-E13.5's GVCN picker),
  NOT a browsable/paginated/data-complete list screen.

**Why this matters for future stories:** any new principal-facing screen
that needs a real, complete, paginated class list should reuse/extend the
ADMIN repository's contract shape (or genuinely duplicate its enrich()
logic), NOT assume `IPrincipalTeachersRepository.listClasses()` is
sufficient just because it's "already wired" — it silently degrades data
completeness and pagination. Full analysis:
`docs/stories/epics/E13-teacher-workspace/US-E13.8-principal-classes/integration.md`.

Also open: whether BE's RBAC for THIS specific endpoint (GET /classes)
actually authorizes MANAGER (principal appRole) — openapi/INTEGRATION.md/
ERROR_CODES.md text for this endpoint only names ADMIN/TEACHER, unlike
several sibling core endpoints that explicitly enumerate
ADMIN/MANAGER/SUPER_ADMIN. Precedent (GVCN-picker dropdown) suggests it
already works, but not independently confirmed against a real (non-mock)
core environment.
