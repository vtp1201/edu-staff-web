import "server-only";
import { ensureFreshSession } from "@/bootstrap/di/auth.di";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { IClassManagementRepository } from "@/features/admin/class-management/domain/repositories/i-class-management.repository";
import { ClassManagementRepository } from "@/features/admin/class-management/infrastructure/repositories/class-management.repository";
import { MockClassManagementRepository } from "@/features/admin/class-management/infrastructure/repositories/mock-class-management.repository";

/**
 * Principal-scoped class-list repository factory (per-request) — US-E13.8,
 * `(app)/principal/classes`; un-mocked in US-E18.30.
 *
 * Serves `IClassManagementRepository` (admin's canonical repository for the
 * `Class` entity: real query params, real cursor pagination, real
 * `studentCount`/homeroom from the enriched wire response), NOT
 * `IPrincipalTeachersRepository.listClasses()` — a different screen's
 * repository with a different purpose.
 *
 * REAL since US-E18.30. This factory used to be UNCONDITIONALLY forced onto
 * the mock, on the (then-correct) ground that `core`'s `ListClassesUseCase`
 * returned `ErrClassForbidden()` for `MANAGER` — the principal `appRole` —
 * matching neither its `isAdmin` nor its `isTeacher` branch, so any real call
 * was a hard `403 CLASS_FORBIDDEN`. That is NO LONGER TRUE: BE US-164 added a
 * `roleManager = "MANAGER"` branch granting tenant-wide read on that exact use
 * case (ground-truthed in
 * `../edu-api/services/core/internal/class/core/application/usecase/list_classes.go`
 * → `Execute()`'s `isAdmin(...) || hasRole(in.ActorRoles, roleManager)`).
 * Cross-repo ask #39 (EPIC-OVERVIEW.md) is RESOLVED, so this is now the plain
 * `USE_MOCK ? Mock : Real` gate every other DI factory uses (decision 0014).
 *
 * No `iam-directory` teacher-search collaborator is injected: this screen is
 * READ-ONLY (`listClasses` only) and never opens the homeroom picker. The
 * repository fails closed (`unknown`) if `listTeachers` were ever called from
 * here — see `class-management.di.ts` for the admin factory that does wire it.
 */
export async function makePrincipalClassesRepository(): Promise<IClassManagementRepository> {
  if (USE_MOCK) return new MockClassManagementRepository();

  await ensureFreshSession();
  return new ClassManagementRepository(await createServerHttpClient());
}
