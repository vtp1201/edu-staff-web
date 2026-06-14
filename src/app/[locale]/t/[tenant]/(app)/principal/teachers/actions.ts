"use server";

import {
  makeAssignHomeroomTeacherUseCase,
  makeAssignSubjectTeacherUseCase,
} from "@/bootstrap/di";
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
