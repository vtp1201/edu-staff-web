import {
  makeGetPrincipalClassesUseCase,
  makeGetPrincipalTeachersUseCase,
} from "@/bootstrap/di";
import { PrincipalTeachersScreen } from "@/features/principal/presentation/teachers/principal-teachers-screen";
import {
  assignHomeroomTeacherAction,
  assignSubjectTeacherAction,
  getClassSubjectsAction,
} from "./actions";

export default async function PrincipalTeachersPage() {
  const [teachersResult, classesResult] = await Promise.all([
    (await makeGetPrincipalTeachersUseCase()).execute(),
    (await makeGetPrincipalClassesUseCase()).execute(),
  ]);

  const teachers = teachersResult.ok ? teachersResult.value : [];
  const classes = classesResult.ok ? classesResult.value : [];
  const fetchError = teachersResult.ok ? null : teachersResult.failure.type;

  return (
    <PrincipalTeachersScreen
      teachers={teachers}
      classes={classes}
      fetchError={fetchError}
      onAssignHomeroom={assignHomeroomTeacherAction}
      onAssignSubjectTeacher={assignSubjectTeacherAction}
      onGetClassSubjects={getClassSubjectsAction}
    />
  );
}
