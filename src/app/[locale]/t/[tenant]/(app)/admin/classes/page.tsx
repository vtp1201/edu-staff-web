import { makeSchoolConfigRepository } from "@/bootstrap/di/admin-school-setup.di";
import { makeClassManagementRepository } from "@/bootstrap/di/class-management.di";
import { ClassManagementScreen } from "@/features/admin/class-management/presentation/class-management-screen/class-management-screen";
import {
  archiveClassAction,
  assignHomeroomAction,
  createClassAction,
  listTeachersAction,
  renameClassAction,
} from "./actions";

export default async function ClassesPage() {
  const [classRepo, schoolRepo] = await Promise.all([
    makeClassManagementRepository(),
    makeSchoolConfigRepository(),
  ]);

  const [classesResult, configResult, teachersResult] = await Promise.all([
    classRepo.listClasses({}),
    schoolRepo.getConfig(),
    classRepo.listTeachers({}),
  ]);

  const classes = classesResult.ok ? classesResult.value.data : [];
  const nextCursor = classesResult.ok ? classesResult.value.nextCursor : null;
  const hasMore = classesResult.ok ? classesResult.value.hasMore : false;

  const gradeRange =
    configResult.ok && configResult.data.gradeLevelRange
      ? {
          minGrade: configResult.data.gradeLevelRange.minGrade,
          maxGrade: configResult.data.gradeLevelRange.maxGrade,
        }
      : null;

  const teachers = teachersResult.ok ? teachersResult.value : [];

  return (
    <ClassManagementScreen
      vm={{ classes, nextCursor, hasMore, gradeRange, teachers }}
      onCreateClass={createClassAction}
      onRenameClass={renameClassAction}
      onArchiveClass={archiveClassAction}
      onAssignHomeroom={assignHomeroomAction}
      onListTeachers={listTeachersAction}
    />
  );
}
