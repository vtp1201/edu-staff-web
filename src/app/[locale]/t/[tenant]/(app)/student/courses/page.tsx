import { requireRole } from "@/bootstrap/auth-guard";
import {
  makeListCoursesUseCase,
  resolveMyLmsClassId,
} from "@/bootstrap/di/lms.di";
import { StudentCoursesScreen } from "@/features/lms/presentation/student-courses/student-courses-screen";
import type {
  CourseCardVm,
  StudentCoursesScreenVm,
} from "@/features/lms/presentation/student-courses/student-courses-screen.i-vm";
import { toneForId } from "@/features/lms/presentation/tone";

interface Props {
  params: Promise<{ locale: string; tenant: string }>;
}

/**
 * `/student/courses` — the PUBLISHED courses of the student's own class.
 *
 * The `lms` list is class-scoped (`GET /courses?classId=` — `classId` is
 * mandatory) and the service publishes no self-scope discovery route, so the
 * class is resolved first from core's enrollment read. An unresolvable class is
 * its own honest state, never a silent empty list.
 */
export default async function StudentCoursesPage({ params }: Props) {
  const { locale, tenant } = await params;

  // RBAC (incl. reads) — applied before any DI call.
  const guard = await requireRole(["student"]);
  if (!guard.ok) {
    const vm: StudentCoursesScreenVm = { courses: [], errorKey: "forbidden" };
    return <StudentCoursesScreen {...vm} />;
  }

  const classId = await resolveMyLmsClassId();
  if (classId === null) {
    const vm: StudentCoursesScreenVm = { courses: [], errorKey: "no-class" };
    return <StudentCoursesScreen {...vm} />;
  }

  const result = await (await makeListCoursesUseCase()).execute(classId);
  if (!result.ok) {
    const vm: StudentCoursesScreenVm = {
      courses: [],
      errorKey: result.failure.type,
    };
    return <StudentCoursesScreen {...vm} />;
  }

  const courses: CourseCardVm[] = result.data.map((c) => ({
    id: c.id,
    title: c.title,
    status: c.status,
    isDefault: c.isDefault,
    tone: toneForId(c.id),
    href: `/${locale}/t/${tenant}/student/courses/${c.id}`,
  }));

  return <StudentCoursesScreen courses={courses} errorKey={null} />;
}
