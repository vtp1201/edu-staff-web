---
name: project-teacher-feature-conventions
description: Teacher feature module structure, dashboard repo patterns, DI factory shape, and Result type conventions
metadata:
  type: project
---

Teacher feature lives at `src/features/teacher/`. Key patterns:

- `Result<T>` type defined in `i-teacher-dashboard.repository.ts` — reuse across new teacher repo interfaces.
- Dashboard repo `TeacherDashboardRepository` has a reusable private `fetchAllPages<T>(url)` pattern for cursor-paginated lists; new `TeacherClassRepository` should replicate this pattern.
- `toTeacherDashboardFailure()` mapper lives in `infrastructure/mappers/teacher-dashboard-failure.mapper.ts` — reuse in new class repo error mapping.
- DI factory pattern: `makeXxxUseCase()` with `USE_MOCK` branch + `createServerHttpClient()`. New DI factories need `decodeSubClaim(token)` from JWT to pass `currentUserId` to class repo.
- `jwt.ts` currently lacks `decodeSub()` — must add pure util function there.

**Why:** Consistency ensures no drift between existing dashboard infra and new class-view infra. Saves the engineer from re-inventing patterns.

**How to apply:** When planning new teacher-scoped use-cases or repos, reference these patterns as the template rather than creating new conventions.
