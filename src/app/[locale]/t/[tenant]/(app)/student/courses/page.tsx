import { requireRole } from "@/bootstrap/auth-guard";
import { makeListCoursesUseCase } from "@/bootstrap/di/lms.di";
import { StudentCoursesScreen } from "@/features/lms/presentation/student-courses/student-courses-screen";
import type {
  CourseCardVm,
  StudentCoursesScreenVm,
} from "@/features/lms/presentation/student-courses/student-courses-screen.i-vm";

const MOCK_STUDENT_ID = "current-student";

interface Props {
  params: Promise<{ locale: string; tenant: string }>;
}

export default async function StudentCoursesPage({ params }: Props) {
  const { locale, tenant } = await params;

  // RBAC (incl. reads) — story requirement, applied before the DI call.
  const guard = await requireRole(["student"]);
  if (!guard.ok) {
    const vm: StudentCoursesScreenVm = { courses: [], errorKey: "forbidden" };
    return <StudentCoursesScreen {...vm} />;
  }

  let courses: CourseCardVm[] = [];
  let errorKey: StudentCoursesScreenVm["errorKey"] = null;
  try {
    const summaries = await (await makeListCoursesUseCase()).execute(
      MOCK_STUDENT_ID,
    );
    courses = summaries.map((c) => ({
      id: c.id,
      name: c.name,
      teacherName: c.teacherName,
      tone: c.tone,
      lessonsDone: c.progress.done,
      lessonsTotal: c.progress.total,
      progressPct: c.progress.pct,
      gradeAvg: c.gradeAvg,
      status: c.progress.status,
      href: `/${locale}/t/${tenant}/student/courses/${c.id}`,
    }));
  } catch {
    errorKey = "unknown";
  }

  const vm: StudentCoursesScreenVm = { courses, errorKey };
  return <StudentCoursesScreen {...vm} />;
}
