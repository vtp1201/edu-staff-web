---
name: project-class-dto-homeroom
description: Admin ClassResponseDto has homeroomTeacherId inline; teacher-scoped TeacherClassResponseDto does not — open BE contract question
metadata:
  type: project
---

Admin feature `ClassResponseDto` at `src/features/admin/class-management/infrastructure/dtos/class-response.dto.ts` carries `homeroomTeacherId: string | null` directly on the list item.

Teacher feature `TeacherClassResponseDto` at `src/features/teacher/infrastructure/dtos/teacher-class-response.dto.ts` does NOT have `homeroomTeacherId` — it only has `classId, tenantId, name, gradeLevel, academicYearLabel, status, createdAt, updatedAt`.

This means the TEACHER-scoped `GET /core/api/v1/classes` response may or may not include homeroom info. Until confirmed:
- Update DTO to add `homeroomTeacherId: string | null` (nullable)
- Mapper derives `isHomeroom = dto.homeroomTeacherId === currentUserId` (currentUserId from JWT `sub`)
- Mock repo hardcodes `isHomeroom: true` for one class to keep GVCN badge testable

**Why:** Surfaced during US-E13.1 planning (2026-06-14). If BE contract doesn't include the field, alternatives are N+1 per-class homeroom calls or fallback to `false`.

**How to apply:** Any future teacher class feature should verify this field is present before assuming `isHomeroom` is derivable from the list response.
