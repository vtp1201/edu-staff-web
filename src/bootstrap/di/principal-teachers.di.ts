import "server-only";
import { ensureFreshSession } from "@/bootstrap/di/auth.di";
import { makeSearchMembersUseCase } from "@/bootstrap/di/iam-directory.di";
import { getAccessToken } from "@/bootstrap/lib/auth-token.server";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { decodeTenantId } from "@/bootstrap/lib/jwt";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { IPrincipalTeachersRepository } from "@/features/principal/domain/teachers/repositories/i-principal-teachers.repository";
import { AssignHomeroomTeacherUseCase } from "@/features/principal/domain/teachers/use-cases/assign-homeroom-teacher.use-case";
import { AssignSubjectTeacherUseCase } from "@/features/principal/domain/teachers/use-cases/assign-subject-teacher.use-case";
import { GetClassSubjectsUseCase } from "@/features/principal/domain/teachers/use-cases/get-class-subjects.use-case";
import { GetPrincipalClassesUseCase } from "@/features/principal/domain/teachers/use-cases/get-principal-classes.use-case";
import { GetPrincipalTeachersUseCase } from "@/features/principal/domain/teachers/use-cases/get-principal-teachers.use-case";
import { MockPrincipalTeachersRepository } from "@/features/principal/infrastructure/teachers/repositories/mock-principal-teachers.repository";
import { PrincipalTeachersRepository } from "@/features/principal/infrastructure/teachers/repositories/principal-teachers.repository";

/**
 * Principal-teachers repository factory (per-request).
 *
 * `USE_MOCK ? Mock : Real` (decision 0014). The real branch's teacher roster no
 * longer has a core endpoint: BE closed cross-repo ask #44 by declaring
 * `GET /core/api/v1/teachers` permanently out of scope (option b,
 * `docs/reports/2026-08-04-be-to-fe-response.md`), so the roster is served by
 * COMPOSING `iam-directory`'s `SearchMembersUseCase` over
 * `GET /iam/api/v1/tenants/{id}/members?role=TEACHER` (IAM US-144).
 *
 * `bootstrap/di` — not a feature's domain — is exactly where composing across
 * features is allowed (decision 0017); the exact same wiring already serves the
 * class-management teacher picker (`class-management.di.ts`). The `role`
 * (UPPERCASE, per IAM's wire enum) and the server-derived tenant id are pinned
 * here so the repository never owns them; the screen lists the whole directory,
 * so no `search` argument is threaded.
 */
export async function makePrincipalTeachersRepository(): Promise<IPrincipalTeachersRepository> {
  if (USE_MOCK) return new MockPrincipalTeachersRepository();

  await ensureFreshSession();
  const tenantId = decodeTenantId((await getAccessToken()) ?? "") ?? "";
  const searchMembers = await makeSearchMembersUseCase();

  return new PrincipalTeachersRepository(await createServerHttpClient(), () =>
    searchMembers.execute({ tenantId, role: "TEACHER" }),
  );
}

export async function makeGetPrincipalTeachersUseCase() {
  return new GetPrincipalTeachersUseCase(
    await makePrincipalTeachersRepository(),
  );
}

export async function makeGetPrincipalClassesUseCase() {
  return new GetPrincipalClassesUseCase(
    await makePrincipalTeachersRepository(),
  );
}

export async function makeGetClassSubjectsUseCase(classId: string) {
  return new GetClassSubjectsUseCase(
    await makePrincipalTeachersRepository(),
    classId,
  );
}

export async function makeAssignHomeroomTeacherUseCase() {
  return new AssignHomeroomTeacherUseCase(
    await makePrincipalTeachersRepository(),
  );
}

export async function makeAssignSubjectTeacherUseCase() {
  return new AssignSubjectTeacherUseCase(
    await makePrincipalTeachersRepository(),
  );
}
