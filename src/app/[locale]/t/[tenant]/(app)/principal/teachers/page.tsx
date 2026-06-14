import { makeGetPrincipalTeachersUseCase } from "@/bootstrap/di";
import { PrincipalTeachersScreen } from "@/features/principal/presentation/teachers/principal-teachers-screen";
import {
  assignHomeroomTeacherAction,
  assignSubjectTeacherAction,
} from "./actions";

export default async function PrincipalTeachersPage() {
  const useCase = await makeGetPrincipalTeachersUseCase();
  const result = await useCase.execute();

  const teachers = result.ok ? result.value : [];
  const fetchError = result.ok ? null : result.failure.type;

  return (
    <PrincipalTeachersScreen
      teachers={teachers}
      fetchError={fetchError}
      onAssignHomeroom={assignHomeroomTeacherAction}
      onAssignSubjectTeacher={assignSubjectTeacherAction}
    />
  );
}
