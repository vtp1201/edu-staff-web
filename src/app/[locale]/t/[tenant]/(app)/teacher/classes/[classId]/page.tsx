import { notFound } from "next/navigation";
import {
  makeGetMyClassUseCase,
  makeGetTeacherClassStudentsUseCase,
} from "@/bootstrap/di/teacher-class.di";
import { TeacherCourseTab } from "@/features/lms/presentation/teacher-course-tab/teacher-course-tab";
import type { TeacherCourseTabActions } from "@/features/lms/presentation/teacher-course-tab/teacher-course-tab.i-vm";
import { visibleTabs } from "@/features/teacher/domain/class-hub-tabs";
import { resolveClassHubTab } from "@/features/teacher/domain/tab-resolver";
import type {
  ClassHubHeaderVm,
  ClassHubTabsVm,
} from "@/features/teacher/presentation/class-hub/class-hub.i-vm";
import { ClassHubScreen } from "@/features/teacher/presentation/class-hub/class-hub-screen";
import { HomeroomTab } from "@/features/teacher/presentation/class-hub/homeroom-tab/homeroom-tab";
import type { HomeroomLeaveActions } from "@/features/teacher/presentation/class-hub/homeroom-tab/homeroom-tab.i-vm";
import { TimetableTab } from "@/features/teacher/presentation/class-hub/timetable-tab/timetable-tab";
import type { TimetableTabActions } from "@/features/teacher/presentation/class-hub/timetable-tab/timetable-tab.i-vm";
import { TeacherClassStudentsScreen } from "@/features/teacher/presentation/teacher-class-students-screen/teacher-class-students-screen";
import type { TeacherClassStudentsScreenVM } from "@/features/teacher/presentation/teacher-class-students-screen/teacher-class-students-screen.i-vm";
import { TeacherClassesScreen } from "@/features/teacher/presentation/teacher-classes-screen/teacher-classes-screen";
import type { TeacherClassesScreenVM } from "@/features/teacher/presentation/teacher-classes-screen/teacher-classes-screen.i-vm";
import { classHubBase, classHubHref } from "@/shared/class-hub-href";
import {
  addDocumentItemAction,
  approveLeaveAction,
  createAssignmentAction,
  createLessonAction,
  deleteItemAction,
  deletePeriodLogAction,
  deletePeriodPrepAction,
  listCourseItemsAction,
  patchItemAction,
  publishCourseAction,
  rejectLeaveAction,
  reorderItemsAction,
  reviseDailyEntryAction,
  saveDailyEntryAction,
  savePeriodLogAction,
  savePeriodPrepAction,
  submitDailyEntryAction,
} from "./actions";
import { buildCourseTabVm } from "./course-vm";
import { buildHomeroomTabVm } from "./homeroom-vm";
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

/** The two leave decisions, bound once (server-action refs, not closures). */
const HOMEROOM_ACTIONS: HomeroomLeaveActions = {
  approveLeave: approveLeaveAction,
  rejectLeave: rejectLeaveAction,
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
  searchParams: Promise<{
    tab?: string | string[];
    week?: string | string[];
    subjectId?: string | string[];
  }>;
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
  const subjectId =
    typeof query?.subjectId === "string" ? query.subjectId : undefined;

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
  } else if (activeTab === "homeroom") {
    // Reachable only for a GVCN — `resolveClassHubTab` collapses `?tab=homeroom`
    // to the role default for anyone else, so this branch IS the gate's other
    // side, not a second check.
    body = (
      <HomeroomTab
        vm={await buildHomeroomTabVm({ classId: cls.id, locale, tenant })}
        actions={HOMEROOM_ACTIONS}
      />
    );
  } else {
    const courseVm = await buildCourseTabVm({
      classId: cls.id,
      teacherSubjects: cls.subjects,
      isHomeroom: cls.roles.includes("homeroom"),
      locale,
      tenant,
      subjectIdParam: subjectId,
    });
    // `.bind` (not an inline closure) — a local async function handed to a
    // client component from an RSC is not a Server Action and 500s when called.
    const courseId = courseVm.courseId ?? "";
    const courseActions: TeacherCourseTabActions = {
      listItems: listCourseItemsAction.bind(null, cls.id, courseId),
      reorderItems: reorderItemsAction.bind(null, cls.id, courseId),
      patchItem: patchItemAction.bind(null, cls.id, courseId),
      createLesson: createLessonAction.bind(null, cls.id, courseId),
      createAssignment: createAssignmentAction.bind(null, cls.id, courseId),
      addDocumentItem: addDocumentItemAction.bind(null, cls.id, courseId),
      publishCourse: publishCourseAction.bind(null, cls.id, courseId),
      deleteItem: deleteItemAction.bind(null, cls.id, courseId),
    };
    body = (
      // Keyed by the course: the client body seeds its cache and its DRAFT
      // status from these props once, so switching subjects must REMOUNT it
      // rather than keep the previous course's rows.
      <TeacherCourseTab
        key={courseVm.courseId ?? "none"}
        vm={courseVm}
        actions={courseActions}
      />
    );
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
