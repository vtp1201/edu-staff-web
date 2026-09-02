import { requireRole } from "@/bootstrap/auth-guard";
import {
  makeListCoursesWithSummaryUseCase,
  resolveMyLmsClassId,
} from "@/bootstrap/di/lms.di";
import { toCourseCardVms } from "@/features/lms/presentation/student-courses/student-courses.derive";
import { StudentCoursesScreen } from "@/features/lms/presentation/student-courses/student-courses-screen";
import type { StudentCoursesScreenVm } from "@/features/lms/presentation/student-courses/student-courses-screen.i-vm";

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
 *
 * Each card's "N mục đang mở / sắp đến hạn" summary is composed from one
 * timeline read PER course (`ListCoursesWithSummaryUseCase`) — `lms` has no
 * rollup endpoint (ask #4). This is the ONE place the clock is read: `now` is
 * captured here and threaded down, so the whole grid is judged by a single
 * instant and no component ever calls `Date.now()`.
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

  const now = new Date();
  const result = await (await makeListCoursesWithSummaryUseCase()).execute(
    classId,
    now,
  );
  if (!result.ok) {
    const vm: StudentCoursesScreenVm = {
      courses: [],
      errorKey: result.failure.type,
    };
    return <StudentCoursesScreen {...vm} />;
  }

  const courses = toCourseCardVms(
    result.data,
    now,
    (courseId) => `/${locale}/t/${tenant}/student/courses/${courseId}`,
  );

  return <StudentCoursesScreen courses={courses} errorKey={null} />;
}
