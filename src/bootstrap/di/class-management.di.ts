import "server-only";
import { ensureFreshSession } from "@/bootstrap/di/auth.di";
import { makeSearchMembersUseCase } from "@/bootstrap/di/iam-directory.di";
import { getAccessToken } from "@/bootstrap/lib/auth-token.server";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { decodeTenantId } from "@/bootstrap/lib/jwt";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type {
  ClassListPage,
  IClassManagementRepository,
} from "@/features/admin/class-management/domain/repositories/i-class-management.repository";
import { ClassManagementRepository } from "@/features/admin/class-management/infrastructure/repositories/class-management.repository";
import { MockClassManagementRepository } from "@/features/admin/class-management/infrastructure/repositories/mock-class-management.repository";

/**
 * Class management repository factory (per-request).
 *
 * FULLY REAL since US-E18.23. The previous hybrid — `listTeachers` delegating
 * to `MockClassManagementRepository` even in real mode — is GONE, and so is
 * its rationale ("IAM's `Members` tag has no `GET` listing endpoint and no
 * single-member lookup at all, only POST/PATCH/DELETE"), which IAM US-144
 * made FALSE: `GET /iam/api/v1/tenants/{id}/members?role=&search=` now exists
 * (cross-repo asks #6/#7 resolved, EPIC-OVERVIEW.md). Every method now follows
 * the same plain `USE_MOCK ? Mock : Real` gate (decision 0014).
 *
 * The teacher picker is served by COMPOSING `iam-directory`'s
 * `SearchMembersUseCase`: `bootstrap/di` — not a feature's domain — is exactly
 * where composing across features is allowed (decision 0017, same precedent as
 * `bootstrap/lib/resolve-current-term.ts`). The `role: "TEACHER"` filter
 * (UPPERCASE, ground-truthed against `MemberListItem.roles` in
 * `services/iam/docs/openapi.yaml`) and the server-derived tenant id are
 * pinned here so the repository never has to own them.
 */
export async function makeClassManagementRepository(): Promise<IClassManagementRepository> {
  if (USE_MOCK) return new MockClassManagementRepository();

  await ensureFreshSession();
  const tenantId = decodeTenantId((await getAccessToken()) ?? "") ?? "";
  const searchMembers = await makeSearchMembersUseCase();

  return new ClassManagementRepository(
    await createServerHttpClient(),
    ({ search }) =>
      searchMembers.execute({ tenantId, role: "TEACHER", search }),
  );
}

export type { ClassListPage };
