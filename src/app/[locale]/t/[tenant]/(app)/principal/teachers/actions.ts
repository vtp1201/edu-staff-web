"use server";

import {
  makeAssignHomeroomTeacherUseCase,
  makeAssignSubjectTeacherUseCase,
  makeGetClassSubjectsUseCase,
} from "@/bootstrap/di";
import type { PrincipalClassSubject } from "@/features/principal/domain/teachers/entities/class-subject.entity";
import type { PrincipalTeachersFailure } from "@/features/principal/domain/teachers/failures/principal-teachers.failure";

export async function assignHomeroomTeacherAction(
  classId: string,
  teacherId: string,
): Promise<{ errorKey: PrincipalTeachersFailure["type"] | null }> {
  const useCase = await makeAssignHomeroomTeacherUseCase();
  const result = await useCase.execute(classId, teacherId);
  if (!result.ok) return { errorKey: result.failure.type };
  return { errorKey: null };
}

export async function assignSubjectTeacherAction(
  classId: string,
  subjectId: string,
  teacherId: string,
): Promise<{ errorKey: PrincipalTeachersFailure["type"] | null }> {
  const useCase = await makeAssignSubjectTeacherUseCase();
  const result = await useCase.execute(classId, subjectId, teacherId);
  if (!result.ok) return { errorKey: result.failure.type };
  return { errorKey: null };
}

export async function getClassSubjectsAction(
  classId: string,
): Promise<PrincipalClassSubject[]> {
  const useCase = await makeGetClassSubjectsUseCase(classId);
  const result = await useCase.execute();
  return result.ok ? result.value : [];
}
