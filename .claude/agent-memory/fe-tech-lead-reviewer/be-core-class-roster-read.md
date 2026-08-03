---
name: be-core-class-roster-read
description: core GET /classes/{id}/students authorization (MANAGER is NOT allowed), hard-delete enrollment, and the fields the wire does NOT carry
metadata:
  type: reference
---

`core` `GET /api/v1/classes/{classId}/students` — verified 2026-08-03 (US-E18.35 review)
against `class/core/application/usecase/list_students_in_class.go` +
`adapter/http/roster_handler.go:79`.

- **Authorization = `isAdmin(...)` OR a TEACHER assigned to the class.**
  `shared.go:26` `isAdmin = SUPER_ADMIN || ADMIN`. **MANAGER is NOT allowed → 403
  `ROSTER_ACCESS_FORBIDDEN`.** The MANAGER grant lives in `list_classes.go:18-22`
  and its own comment says "admin-tier read access on THIS use case only". So
  "the class LIST works for a principal" NEVER implies the roster read does.
  Web's `principal` appRole collapses ADMIN **and** MANAGER (`role-meta.ts`), so a
  MANAGER-principal gets the error card on `/principal/students`.
- `EnrollmentResponse` = `enrollmentId, classId, studentMemberId,
  academicYearLabel, enrolledAt` — all required, **no status, no name, no dob,
  no student code**. Cursor-paginated, `limit` default 20 / max 100.
- **No soft delete**: `RemoveStudentFromClassUseCase` → `enroll.Remove(...)`
  (hard-delete, ADR 0049), handler doc "Removes the enrollment link
  (hard-delete)". So "returned by this endpoint" ≡ "currently enrolled" and a
  constant `status: "active"` in real mode is sound, not invented.
- **No student code anywhere**: no `studentCode`/`studentNumber`/`memberCode` in
  any service's `docs/*.yaml`. Rendering the member uuid under "Mã học sinh"
  would be a lie — absent + placeholder is the right call.
- IAM `gender` enum is exactly `MALE|FEMALE|OTHER`
  (`user/core/domain/valueobject/gender.go:17-19`, validated at the boundary);
  `dob` is Go `*time.Time` → RFC3339 date-time. Both staff-tier-only + optional
  per user. IAM's staff tier (`helpers.go:80 staffTierRoles`) DOES include
  MANAGER — unlike core's roster read. Two different gates, don't conflate.

Companion: [[be-iam-batch-member-lookup]], [[be-class-list-enrichment]].
