import { requireRole } from "@/bootstrap/auth-guard";
import {
  makeListCoursesWithItemsUseCase,
  makeListCoursesWithSummaryUseCase,
  resolveMyLmsClassId,
} from "@/bootstrap/di/lms.di";
import { sortCrossSubjectItems } from "@/features/lms/domain/use-cases/sort-cross-subject-items";
import {
  parseCoursesView,
  parseSubTab,
  toCrossSubjectGroupsVm,
} from "@/features/lms/presentation/student-courses/cross-subject.derive";
import type {
  CoursesView,
  CrossSubjectSubTab,
} from "@/features/lms/presentation/student-courses/cross-subject.i-vm";
import { toCourseCardVms } from "@/features/lms/presentation/student-courses/student-courses.derive";
import { StudentCoursesScreen } from "@/features/lms/presentation/student-courses/student-courses-screen";
import type { StudentCoursesScreenVm } from "@/features/lms/presentation/student-courses/student-courses-screen.i-vm";

interface Props {
  params: Promise<{ locale: string; tenant: string }>;
  searchParams: Promise<{ view?: string | string[]; sub?: string | string[] }>;
}

/**
 * `/student/courses` — the PUBLISHED courses of the student's own class, in
 * three views selected by `?view=` (US-E24.4):
 *  - `all` (default) — the course card grid (US-E24.2);
 *  - `assignment` / `exam` — every course's items of that type in ONE list,
 *    grouped by state via `?sub=`. `/student/assignments` and `/student/exams`
 *    permanently redirect into these two.
 *
 * The URL is the whole state: both params are read here and every switch is a
 * `<Link>`, so back/forward work and not one component in the tree is a Client
 * Component.
 *
 * The `lms` list is class-scoped (`GET /courses?classId=` — `classId` is
 * mandatory) and the service publishes no self-scope discovery route, so the
 * class is resolved first from core's enrollment read. An unresolvable class is
 * its own honest state, never a silent empty list.
 *
 * Both reads compose one timeline read PER course (`fetchCourseTimelines`) —
 * `lms` has no rollup endpoint (ask #4). This is the ONE place the clock is
 * read: `now` is captured here and threaded down, so the whole page is judged
 * by a single instant and no component ever calls `Date.now()`.
 */
export default async function StudentCoursesPage({
  params,
  searchParams,
}: Props) {
  const { locale, tenant } = await params;
  const { view: rawView, sub: rawSub } = await searchParams;

  const view = parseCoursesView(rawView);
  const sub = parseSubTab(rawSub, view);

  const base = `/${locale}/t/${tenant}/student/courses`;
  const viewHrefFor = (next: CoursesView) =>
    next === "all" ? base : `${base}?view=${next}`;
  const subHrefFor = (next: CrossSubjectSubTab) =>
    `${base}?view=${view}&sub=${next}`;

  const shell = { view, viewHrefFor };
  const failed = (
    errorKey: StudentCoursesScreenVm["errorKey"],
  ): StudentCoursesScreenVm => ({
    ...shell,
    courses: [],
    cross: null,
    errorKey,
  });

  // RBAC (incl. reads) — applied before any DI call.
  const guard = await requireRole(["student"]);
  if (!guard.ok) return <StudentCoursesScreen {...failed("forbidden")} />;

  const classId = await resolveMyLmsClassId();
  if (classId === null) return <StudentCoursesScreen {...failed("no-class")} />;

  const now = new Date();

  if (view === "all") {
    const result = await (await makeListCoursesWithSummaryUseCase()).execute(
      classId,
      now,
    );
    if (!result.ok) {
      return <StudentCoursesScreen {...failed(result.failure.type)} />;
    }

    return (
      <StudentCoursesScreen
        {...shell}
        courses={toCourseCardVms(
          result.data,
          now,
          (courseId) => `${base}/${courseId}`,
        )}
        cross={null}
        errorKey={null}
      />
    );
  }

  const result = await (await makeListCoursesWithItemsUseCase()).execute(
    classId,
  );
  if (!result.ok) {
    return <StudentCoursesScreen {...failed(result.failure.type)} />;
  }

  const groups = sortCrossSubjectItems(
    result.data,
    view === "assignment" ? "ASSIGNMENT" : "EXAM",
  );

  return (
    <StudentCoursesScreen
      {...shell}
      courses={[]}
      cross={{
        view,
        sub,
        hrefFor: subHrefFor,
        groups: toCrossSubjectGroupsVm(groups, now, {
          courseHrefFor: (courseId) => `${base}/${courseId}`,
          examHrefFor: (examId) =>
            `/${locale}/t/${tenant}/student/exams/${examId}`,
        }),
      }}
      errorKey={null}
    />
  );
}
