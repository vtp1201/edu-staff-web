import {
  makeGetTeacherClassStudentsUseCase,
  makeListMyTeacherClassesUseCase,
} from "@/bootstrap/di/teacher-class.di";
import { TeacherClassStudentsScreen } from "@/features/teacher/presentation/teacher-class-students-screen/teacher-class-students-screen";
import type { TeacherClassStudentsScreenVM } from "@/features/teacher/presentation/teacher-class-students-screen/teacher-class-students-screen.i-vm";

export default async function TeacherClassStudentsPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;

  // Resolve students + the class name (for the breadcrumb/title) in parallel.
  const [studentsResult, classesResult] = await Promise.all([
    (await makeGetTeacherClassStudentsUseCase()).execute(classId),
    (await makeListMyTeacherClassesUseCase()).execute(),
  ]);

  const className = classesResult.ok
    ? (classesResult.data.find((c) => c.id === classId)?.name ?? classId)
    : classId;

  const vm: TeacherClassStudentsScreenVM = studentsResult.ok
    ? {
        status: "ready",
        className,
        classesHref: "../..",
        students: studentsResult.data.map((s) => ({
          enrollmentId: s.enrollmentId,
          displayName: s.displayName,
          studentCode: s.studentMemberId,
          status: s.status,
        })),
      }
    : {
        status: "error",
        className,
        classesHref: "../..",
        students: [],
      };

  return <TeacherClassStudentsScreen vm={vm} />;
}
