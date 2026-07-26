import "server-only";
import type { IClassManagementRepository } from "@/features/admin/class-management/domain/repositories/i-class-management.repository";
import { MockClassManagementRepository } from "@/features/admin/class-management/infrastructure/repositories/mock-class-management.repository";

/**
 * Principal-scoped class-list repository factory (per-request) — US-E13.8,
 * `(app)/principal/classes`.
 *
 * Serves `IClassManagementRepository` (admin's canonical repository for the
 * `Class` entity: real query params, real cursor pagination, real
 * `studentCount`/homeroom `enrich()`), NOT
 * `IPrincipalTeachersRepository.listClasses()` — that one passes no params,
 * discards pagination and hardcodes `studentCount: 0` / `homeroomTeacher*:
 * null` (its own documented KNOWN GAP), which would break Must-have FR-002 and
 * FR-007 outright.
 *
 * ⚠️ INTENTIONALLY NOT GATED BY `USE_MOCK` — do NOT "fix" this to branch on
 * `NEXT_PUBLIC_USE_MOCK` like every other DI factory in this repo. It is
 * permanently forced onto `MockClassManagementRepository`, because a REAL call
 * cannot succeed for a principal:
 *
 * - Go ground truth:
 *   `../edu-api/services/core/internal/class/core/application/usecase/list_classes.go`
 *   → `(*ListClassesUseCase).Execute()` branches
 *   `isAdmin(in.ActorIsSuperAdmin, in.ActorRoles)` → real listing (`ListByYear`),
 *   `isTeacher(in.ActorRoles)` → real listing (`listForTeacher`), and otherwise
 *   returns `domainerror.ErrClassForbidden()`. `MANAGER` (the principal
 *   `appRole`) matches NEITHER branch, so `GET /api/v1/classes` is a hard
 *   `403 CLASS_FORBIDDEN` for every principal user — not a degraded response.
 * - Cross-repo ask #39 (`docs/stories/epics/E18-be-wiring/EPIC-OVERVIEW.md`,
 *   "US-E13.8, 2026-07-26") tracks adding `MANAGER` to that RBAC check;
 *   ground-truthed a 2nd time there after US-E18.11's first finding.
 *
 * So this is a launch-blocking correctness gate, not a dev-convenience mock:
 * wiring it to `USE_MOCK` would mean every principal sees an access-denied
 * screen in any non-mock environment. Flip this factory to the
 * `USE_MOCK ? Mock : Real` shape only once cross-repo ask #39 lands.
 * `bootstrap/di/class-management.di.ts` (admin's factory) is deliberately
 * untouched — admin's real path still works, because ADMIN passes `isAdmin`.
 */
export async function makePrincipalClassesRepository(): Promise<IClassManagementRepository> {
  return new MockClassManagementRepository();
}
