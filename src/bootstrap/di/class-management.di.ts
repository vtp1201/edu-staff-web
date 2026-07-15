import "server-only";
import { ensureFreshSession } from "@/bootstrap/di/auth.di";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { TeacherMember } from "@/features/admin/class-management/domain/entities/teacher-member.entity";
import type { ClassManagementFailure } from "@/features/admin/class-management/domain/failures/class-management.failure";
import type {
  ClassListPage,
  IClassManagementRepository,
} from "@/features/admin/class-management/domain/repositories/i-class-management.repository";
import type { Result } from "@/features/admin/class-management/domain/use-cases/result";
import { ClassManagementRepository } from "@/features/admin/class-management/infrastructure/repositories/class-management.repository";
import { MockClassManagementRepository } from "@/features/admin/class-management/infrastructure/repositories/mock-class-management.repository";

/**
 * Class management repository factory (per-request).
 *
 * `listTeachers` is PERMANENTLY mock-first regardless of `USE_MOCK` (US-E18.4
 * confirmed, not just "not finalised" as previously noted): IAM's public API
 * (`edu-api/services/iam/docs/openapi.yaml`, `Members` tag) has no `GET`
 * listing endpoint and no `GET` single-member lookup at all — only
 * `POST`/`PATCH`/`DELETE` on `/api/v1/tenants/{id}/members`. The only
 * member-lookup endpoint is internal service-to-service only (bypasses
 * Kong). We delegate this one method to the mock repo even when the real
 * repo serves everything else, so the homeroom picker has data until BE
 * ships a listing endpoint (cross-repo ask #7, EPIC-OVERVIEW.md).
 */
export async function makeClassManagementRepository(): Promise<IClassManagementRepository> {
  if (USE_MOCK) return new MockClassManagementRepository();

  await ensureFreshSession();
  const real = new ClassManagementRepository(await createServerHttpClient());
  const mockTeachers = new MockClassManagementRepository();

  return new (class implements IClassManagementRepository {
    listClasses = real.listClasses.bind(real);
    createClass = real.createClass.bind(real);
    renameClass = real.renameClass.bind(real);
    archiveClass = real.archiveClass.bind(real);
    assignHomeroomTeacher = real.assignHomeroomTeacher.bind(real);
    getHomeroomTeacher = real.getHomeroomTeacher.bind(real);
    // mock-first fallback (see doc above)
    listTeachers(params: {
      search?: string;
    }): Promise<Result<TeacherMember[], ClassManagementFailure>> {
      return mockTeachers.listTeachers(params);
    }
  })();
}

export type { ClassListPage };
