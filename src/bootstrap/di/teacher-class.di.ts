import "server-only";
import { makeBatchResolveMembersUseCase } from "@/bootstrap/di/iam-directory.di";
import { getAccessToken } from "@/bootstrap/lib/auth-token.server";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { decodeMemberId } from "@/bootstrap/lib/jwt";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { ITeacherClassRepository } from "@/features/teacher/domain/repositories/i-teacher-class.repository";
import { GetClassStudentsUseCase } from "@/features/teacher/domain/use-cases/get-class-students.use-case";
import { ListMyClassesUseCase } from "@/features/teacher/domain/use-cases/list-my-classes.use-case";
import { ListMyStudentsUseCase } from "@/features/teacher/domain/use-cases/list-my-students.use-case";
import { MockTeacherClassRepository } from "@/features/teacher/infrastructure/repositories/mock-teacher-class.repository";
import { TeacherClassRepository } from "@/features/teacher/infrastructure/repositories/teacher-class.repository";

async function makeRepo(): Promise<ITeacherClassRepository> {
  if (USE_MOCK) return new MockTeacherClassRepository();
  const http = await createServerHttpClient();
  const token = await getAccessToken();
  // core keys classes/enrollments by MEMBER id, not user id (they only
  // coincide on seed data) — read the tenant-scoped `memberId` claim.
  const currentUserId = token ? decodeMemberId(token) : null;
  // core's enrollment rows carry no student names; decorate them with one
  // batched IAM directory lookup (same composition as `admin-roster.di.ts`).
  const batchResolve = await makeBatchResolveMembersUseCase();
  const resolveNames = async (memberIds: string[]) => {
    const names = new Map<string, string>();
    const result = await batchResolve.execute(memberIds);
    if (result.ok)
      for (const m of result.value) names.set(m.memberId, m.displayName);
    return names;
  };
  return new TeacherClassRepository(http, currentUserId, resolveNames);
}

/** Named `…TeacherClasses…` to avoid colliding with attendance's
 *  `makeListMyClassesUseCase` in the `bootstrap/di` barrel. */
export async function makeListMyTeacherClassesUseCase() {
  return new ListMyClassesUseCase(await makeRepo());
}

export async function makeGetTeacherClassStudentsUseCase() {
  return new GetClassStudentsUseCase(await makeRepo());
}

/** Cross-class student roster (US-E13.9) — composes the two use-cases above
 *  over ONE repository instance (no new repository wiring). */
export async function makeListMyStudentsUseCase() {
  const repo = await makeRepo();
  return new ListMyStudentsUseCase(
    new ListMyClassesUseCase(repo),
    new GetClassStudentsUseCase(repo),
  );
}
