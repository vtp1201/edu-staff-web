---
name: be-class-list-enrichment
description: core GET /classes is MANAGER-readable + enriched (studentCount/homeroom) — which endpoints, which are NOT, and the un-fanout consumer audit
metadata:
  type: project
---

Ground-truthed 2026-08-02 (US-E18.30), in `../edu-api/services/core/internal/class/`.

**BE US-164** — `list_classes.go:22,61` `const roleManager = "MANAGER"`, branch
`isAdmin(...) || hasRole(in.ActorRoles, roleManager)`. So **`GET /api/v1/classes` is now
readable by principal**. This SUPERSEDES cross-repo ask #39 and the old
`principal-classes.di.ts` force-mock (now a plain `USE_MOCK ? Mock : Real` gate).

**BE US-173** — `ClassResponse.required` (openapi.yaml:7627) now includes `studentCount`,
`homeroomTeacherId`, `homeroomTeacherName`. **Asymmetry that matters:**
`enrichClassRows()` (`class_enrichment.go:45`) is called ONLY from `list_classes.go:74`
(admin/manager branch) + `:113` (teacher branch) + `get_class.go:81`. `create_class.go` /
`update_class.go` do NOT call it → **POST/PATCH return `0`/`null` by construction**. Any repo
that maps a POST/PATCH `ClassResponse` directly will blank the count; a PATCH needs an
enriched `GET /classes/{id}` read-back (that is what `renameClass` legitimately keeps).

`homeroomTeacherId` is the AUTHORITATIVE presence signal; `homeroomTeacherName` is
best-effort cross-service (ADR 0124) and null-on-degrade is **indistinguishable** from
"no teacher" on the wire. Correct mapper shape:
`id === null ? null : (name ?? id)` — never collapse a null name to "unassigned".

**`GET /classes/{classId}` is NOT MANAGER-readable** (`get_class.go:55-70`: `isAdmin` or
an *assigned* teacher only). So the principal factory handing out the full
`IClassManagementRepository` is safe only while the route calls `listClasses` exclusively.

**Consumers of `/core/api/v1/classes` (all the same path + schema)** — check every one on
any enrichment story; `TEACHER_EP.classes === CLASS_EP.classes === ROSTER_EP.classes`:
- `admin/class-management` `class-management.repository.ts` — un-fanned-out US-E18.30 ✅
- `teacher` `teacher-class.repository.ts` `listMyClasses` — un-fanned-out US-E18.30 ✅
- `principal` `principal-teachers.repository.ts` `listClasses` — fixed US-E18.30 ✅
- `teacher` **`teacher-dashboard.repository.ts` `getTotalStudents`** — STILL 1+N roster
  drain, stale "ClassResponse carries no student-count field" comment (flagged US-E18.30)
- `admin-roster` **`roster.repository.ts` `getClasses`** — STILL N `/homeroom-teacher`
  fan-out + shows the raw uuid instead of the now-available resolved name (flagged US-E18.30)

`timetable`'s `get_member_timetable.go` `authorize()` still has NO MANAGER branch
(re-verified US-E18.30) → `timetable-view.di.ts`'s principal force-mock stays.
