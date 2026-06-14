import "server-only";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { IPrincipalTeachersRepository } from "@/features/principal/domain/teachers/repositories/i-principal-teachers.repository";
import { AssignHomeroomTeacherUseCase } from "@/features/principal/domain/teachers/use-cases/assign-homeroom-teacher.use-case";
import { AssignSubjectTeacherUseCase } from "@/features/principal/domain/teachers/use-cases/assign-subject-teacher.use-case";
import { GetClassSubjectsUseCase } from "@/features/principal/domain/teachers/use-cases/get-class-subjects.use-case";
import { GetPrincipalClassesUseCase } from "@/features/principal/domain/teachers/use-cases/get-principal-classes.use-case";
import { GetPrincipalTeachersUseCase } from "@/features/principal/domain/teachers/use-cases/get-principal-teachers.use-case";
import { MockPrincipalTeachersRepository } from "@/features/principal/infrastructure/teachers/repositories/mock-principal-teachers.repository";
import { PrincipalTeachersRepository } from "@/features/principal/infrastructure/teachers/repositories/principal-teachers.repository";

async function makeRepo(): Promise<IPrincipalTeachersRepository> {
  if (USE_MOCK) return new MockPrincipalTeachersRepository();
  return new PrincipalTeachersRepository(await createServerHttpClient());
}

export async function makeGetPrincipalTeachersUseCase() {
  return new GetPrincipalTeachersUseCase(await makeRepo());
}

export async function makeGetPrincipalClassesUseCase() {
  return new GetPrincipalClassesUseCase(await makeRepo());
}

export async function makeGetClassSubjectsUseCase(classId: string) {
  return new GetClassSubjectsUseCase(await makeRepo(), classId);
}

export async function makeAssignHomeroomTeacherUseCase() {
  return new AssignHomeroomTeacherUseCase(await makeRepo());
}

export async function makeAssignSubjectTeacherUseCase() {
  return new AssignSubjectTeacherUseCase(await makeRepo());
}
