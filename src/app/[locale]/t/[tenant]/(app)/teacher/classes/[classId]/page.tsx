import { notFound } from "next/navigation";
import {
  makeGetMyClassUseCase,
  makeGetTeacherClassStudentsUseCase,
} from "@/bootstrap/di/teacher-class.di";
import { visibleTabs } from "@/features/teacher/domain/class-hub-tabs";
import { resolveClassHubTab } from "@/features/teacher/domain/tab-resolver";
import type {
  ClassHubHeaderVm,
  ClassHubTabsVm,
} from "@/features/teacher/presentation/class-hub/class-hub.i-vm";
import { ClassHubScreen } from "@/features/teacher/presentation/class-hub/class-hub-screen";
import { TabPlaceholder } from "@/features/teacher/presentation/class-hub/tab-placeholder";
import { TeacherClassStudentsScreen } from "@/features/teacher/presentation/teacher-class-students-screen/teacher-class-students-screen";
import type { TeacherClassStudentsScreenVM } from "@/features/teacher/presentation/teacher-class-students-screen/teacher-class-students-screen.i-vm";
import { classHubBase, classHubHref } from "@/shared/class-hub-href";

/**
 * Class-hub shell (US-E24.8). `?tab=` IS the state: resolved server-side against
 * the teacher's roles, then only the ACTIVE tab's body is fetched and rendered
 * (no client fetching, never three hidden panels).
 */
export default async function ClassHubPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; tenant: string; classId: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const [{ locale, tenant, classId }, query] = await Promise.all([
    params,
    searchParams,
  ]);

  const classResult = await (await makeGetMyClassUseCase()).execute(classId);
  // Existence oracle: "not mine", "doesn't exist" and a failed read all look
  // the same to the visitor — never leak which class ids exist.
  if (!classResult.ok) notFound();

  const cls = classResult.data;
  const activeTab = resolveClassHubTab(cls.roles, query?.tab);
  const base = classHubBase(locale, tenant);

  const header: ClassHubHeaderVm = {
    classId: cls.id,
    className: cls.name,
    roles: cls.roles,
    subjects: cls.subjects,
    studentCount: cls.studentCount,
    academicYearLabel: cls.academicYearLabel,
    classesHref: base,
  };

  const tabs: ClassHubTabsVm = {
    activeTab,
    tabs: visibleTabs(cls.roles).map((id) => ({
      id,
      href: classHubHref(base, cls.id, id),
    })),
  };

  const body =
    activeTab === "students" ? (
      <TeacherClassStudentsScreen
        vm={await studentsVm(cls.id, cls.name, base)}
        hideBreadcrumb
      />
    ) : (
      <TabPlaceholder tab={activeTab} />
    );

  return (
    <ClassHubScreen header={header} tabs={tabs}>
      {body}
    </ClassHubScreen>
  );
}

/** Roster tab body — reuses the US-E13.1 screen verbatim (shell owns the header). */
async function studentsVm(
  classId: string,
  className: string,
  classesHref: string,
): Promise<TeacherClassStudentsScreenVM> {
  const result = await (await makeGetTeacherClassStudentsUseCase()).execute(
    classId,
  );

  if (!result.ok) {
    return {
      status: "error",
      errorKey: result.error.type,
      className,
      classesHref,
      students: [],
    };
  }

  return {
    status: "ready",
    className,
    classesHref,
    students: result.data.map((s) => ({
      enrollmentId: s.enrollmentId,
      displayName: s.displayName,
      studentCode: s.studentMemberId,
      status: s.status,
    })),
  };
}
