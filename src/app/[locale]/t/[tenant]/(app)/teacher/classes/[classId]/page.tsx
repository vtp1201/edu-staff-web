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
import { TimetableTab } from "@/features/teacher/presentation/class-hub/timetable-tab/timetable-tab";
import type { TimetableTabActions } from "@/features/teacher/presentation/class-hub/timetable-tab/timetable-tab.i-vm";
import { TeacherClassStudentsScreen } from "@/features/teacher/presentation/teacher-class-students-screen/teacher-class-students-screen";
import type { TeacherClassStudentsScreenVM } from "@/features/teacher/presentation/teacher-class-students-screen/teacher-class-students-screen.i-vm";
import { TeacherClassesScreen } from "@/features/teacher/presentation/teacher-classes-screen/teacher-classes-screen";
import type { TeacherClassesScreenVM } from "@/features/teacher/presentation/teacher-classes-screen/teacher-classes-screen.i-vm";
import { classHubBase, classHubHref } from "@/shared/class-hub-href";
import {
  deletePeriodLogAction,
  deletePeriodPrepAction,
  reviseDailyEntryAction,
  saveDailyEntryAction,
  savePeriodLogAction,
  savePeriodPrepAction,
  submitDailyEntryAction,
} from "./actions";
import { buildTimetableTabVm } from "./timetable-vm";

/** The seven Server Action refs, bound once and threaded to the client body as
 *  ONE prop (each value is a server-action reference, not a closure). */
const TIMETABLE_ACTIONS: TimetableTabActions = {
  savePeriodLog: savePeriodLogAction,
  deletePeriodLog: deletePeriodLogAction,
  savePeriodPrep: savePeriodPrepAction,
  deletePeriodPrep: deletePeriodPrepAction,
  saveDailyEntry: saveDailyEntryAction,
  submitDailyEntry: submitDailyEntryAction,
  reviseDailyEntry: reviseDailyEntryAction,
};

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
  searchParams: Promise<{ tab?: string | string[]; week?: string | string[] }>;
}) {
  const [{ locale, tenant, classId }, query] = await Promise.all([
    params,
    searchParams,
  ]);

  const classResult = await (await makeGetMyClassUseCase()).execute(classId);
  if (!classResult.ok) {
    // "not mine" and "doesn't exist" deliberately give the SAME answer — the
    // page must never be an existence oracle for class ids. A transport/server
    // failure is a different story: 404-ing it would tell the teacher their
    // class is gone, so it gets the retryable error surface instead.
    if (classResult.error.type === "not-found") notFound();
    const errorVm: TeacherClassesScreenVM = {
      status: "error",
      errorKey: classResult.error.type,
      classes: [],
    };
    return <TeacherClassesScreen vm={errorVm} />;
  }

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

  const week = typeof query?.week === "string" ? query.week : undefined;

  let body: React.ReactNode;
  if (activeTab === "students") {
    body = (
      <TeacherClassStudentsScreen
        vm={await studentsVm(cls.id, cls.name, base)}
        embedded
      />
    );
  } else if (activeTab === "timetable") {
    body = (
      <TimetableTab
        vm={
          await buildTimetableTabVm({
            classId: cls.id,
            isHomeroom: cls.roles.includes("homeroom"),
            locale,
            tenant,
            weekParam: week,
          })
        }
        actions={TIMETABLE_ACTIONS}
      />
    );
  } else {
    body = <TabPlaceholder tab={activeTab} />;
  }

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
