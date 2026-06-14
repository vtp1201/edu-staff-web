import { makeListMyTeacherClassesUseCase } from "@/bootstrap/di/teacher-class.di";
import { TeacherClassesScreen } from "@/features/teacher/presentation/teacher-classes-screen/teacher-classes-screen";
import type { TeacherClassesScreenVM } from "@/features/teacher/presentation/teacher-classes-screen/teacher-classes-screen.i-vm";

export default async function TeacherClassesPage() {
  const useCase = await makeListMyTeacherClassesUseCase();
  const result = await useCase.execute();

  const vm: TeacherClassesScreenVM = result.ok
    ? {
        status: "ready",
        classes: result.data.map((cls) => ({
          id: cls.id,
          name: cls.name,
          gradeLevel: cls.gradeLevel,
          studentCount: cls.studentCount,
          isHomeroom: cls.isHomeroom,
          studentsHref: `classes/${cls.id}/students`,
        })),
      }
    : { status: "error", classes: [] };

  return <TeacherClassesScreen vm={vm} />;
}
