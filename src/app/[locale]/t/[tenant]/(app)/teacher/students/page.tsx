import { makeListMyStudentsUseCase } from "@/bootstrap/di/teacher-class.di";
import { TeacherStudentsRosterScreen } from "@/features/teacher/presentation/teacher-students-roster-screen/teacher-students-roster-screen";
import type { TeacherStudentsRosterScreenVM } from "@/features/teacher/presentation/teacher-students-roster-screen/teacher-students-roster-screen.i-vm";

export default async function TeacherStudentsPage() {
  const useCase = await makeListMyStudentsUseCase();
  const result = await useCase.execute();

  const vm: TeacherStudentsRosterScreenVM = result.ok
    ? {
        status: "ready",
        rows: result.data.rows.map((row) => ({
          studentMemberId: row.studentMemberId,
          displayName: row.displayName,
          className: row.className,
          status: row.status,
          academicRecordHref: `students/${row.studentMemberId}/academic-record`,
        })),
        classNames: Array.from(
          new Set(result.data.rows.map((row) => row.className)),
        ),
        failedClassCount: result.data.failedClassCount,
      }
    : {
        status: "error",
        errorKey: result.error.type,
        rows: [],
        classNames: [],
        failedClassCount: 0,
      };

  return <TeacherStudentsRosterScreen vm={vm} />;
}
