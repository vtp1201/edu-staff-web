import "server-only";
import { getAccessToken } from "@/bootstrap/lib/auth-token.server";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { decodeSubClaim } from "@/bootstrap/lib/jwt";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { ITeacherClassRepository } from "@/features/teacher/domain/repositories/i-teacher-class.repository";
import { GetClassStudentsUseCase } from "@/features/teacher/domain/use-cases/get-class-students.use-case";
import { ListMyClassesUseCase } from "@/features/teacher/domain/use-cases/list-my-classes.use-case";
import { MockTeacherClassRepository } from "@/features/teacher/infrastructure/repositories/mock-teacher-class.repository";
import { TeacherClassRepository } from "@/features/teacher/infrastructure/repositories/teacher-class.repository";

async function makeRepo(): Promise<ITeacherClassRepository> {
  if (USE_MOCK) return new MockTeacherClassRepository();
  const http = await createServerHttpClient();
  const token = await getAccessToken();
  const currentUserId = token ? decodeSubClaim(token) : null;
  return new TeacherClassRepository(http, currentUserId);
}

/** Named `…TeacherClasses…` to avoid colliding with attendance's
 *  `makeListMyClassesUseCase` in the `bootstrap/di` barrel. */
export async function makeListMyTeacherClassesUseCase() {
  return new ListMyClassesUseCase(await makeRepo());
}

export async function makeGetTeacherClassStudentsUseCase() {
  return new GetClassStudentsUseCase(await makeRepo());
}
