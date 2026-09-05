import "server-only";

import {
  makeListClassSubjectsUseCase,
  makeListCourseItemsUseCase,
  makeListCoursesUseCase,
} from "@/bootstrap/di/lms.di";
import type { CourseSummary } from "@/features/lms/domain/entities/course.entity";
import { resolveCourseTimelineMode } from "@/features/lms/domain/use-cases/resolve-course-timeline-mode";
import type {
  SubjectOptionVm,
  TeacherCourseTabVm,
} from "@/features/lms/presentation/teacher-course-tab/teacher-course-tab.i-vm";
import { toneForId } from "@/features/lms/presentation/tone";
import type { TeacherClassSubject } from "@/features/teacher/domain/entities/teacher-class.entity";

export interface BuildCourseTabVmInput {
  classId: string;
  /** The caller's OWN subject assignments in this class. Empty for a pure GVCN. */
  teacherSubjects: TeacherClassSubject[];
  /** True for a GVCN — the only role that gets the full class-subject picker. */
  isHomeroom: boolean;
  locale: string;
  tenant: string;
  /** Raw `?subjectId=`; anything not on offer falls back to the default. */
  subjectIdParam?: string;
}

function emptyVm(
  base: Pick<
    TeacherCourseTabVm,
    "classId" | "courseTabHrefBase" | "examBankHref"
  >,
  reason: NonNullable<TeacherCourseTabVm["emptyReason"]>,
  subjectOptions: SubjectOptionVm[],
  selectedSubjectId: string | null,
): TeacherCourseTabVm {
  return {
    ...base,
    courseId: null,
    courseName: "",
    tone: "primary",
    courseStatus: null,
    items: [],
    errorKey: null,
    mode: "readonly",
    subjectOptions,
    selectedSubjectId,
    emptyReason: reason,
  };
}

/**
 * Assemble the class-hub course tab (US-E24.10).
 *
 * The subject decides everything downstream, so it is resolved first:
 * 1. `?subjectId=` when it is actually on offer (a stale or forged one is
 *    ignored rather than 404-ing a tab that is otherwise fine);
 * 2. the teacher's OWN subject, so a GVBM lands on their course;
 * 3. the class's first subject — the pure-GVCN case, which has no own subject
 *    to default to.
 *
 * The picker only lists the whole class for a GVCN. A GVBM sees their own
 * assignments, which is also what makes the "teaching two subjects in one
 * class" edge case work without a special case: two options mount a picker.
 *
 * Mode is a RENDERING decision (`resolveCourseTimelineMode`); every mutation
 * re-derives ownership server-side in the action regardless (decision `0063`).
 */
export async function buildCourseTabVm({
  classId,
  teacherSubjects,
  isHomeroom,
  locale,
  tenant,
  subjectIdParam,
}: BuildCourseTabVmInput): Promise<TeacherCourseTabVm> {
  const base = {
    classId,
    courseTabHrefBase: `/${locale}/t/${tenant}/teacher/classes/${encodeURIComponent(classId)}?tab=course`,
    examBankHref: `/${locale}/t/${tenant}/teacher/exam-bank`,
  };

  const mySubjectIds = teacherSubjects.map((s) => s.id);

  // The wider read is the GVCN's alone, and it degrades to the caller's own
  // subjects: losing the picker is a smaller failure than blanking the tab.
  const classSubjects = isHomeroom
    ? await (await makeListClassSubjectsUseCase()).execute(classId)
    : null;

  const options: SubjectOptionVm[] =
    classSubjects?.ok === true
      ? classSubjects.data.map((s) => ({
          subjectId: s.subjectId,
          name: s.subjectName,
          isMine: mySubjectIds.includes(s.subjectId),
        }))
      : teacherSubjects.map((s) => ({
          subjectId: s.id,
          name: s.name,
          isMine: true,
        }));

  const selectedSubjectId =
    (subjectIdParam &&
      options.some((o) => o.subjectId === subjectIdParam) &&
      subjectIdParam) ||
    mySubjectIds.find((id) => options.some((o) => o.subjectId === id)) ||
    options[0]?.subjectId ||
    null;

  if (selectedSubjectId === null) {
    return emptyVm(base, "no-subjects", options, null);
  }

  const coursesResult = await (await makeListCoursesUseCase()).execute(
    classId,
    selectedSubjectId,
  );

  if (!coursesResult.ok) {
    // Ask #7: BE refuses the subject's course for a teacher with no claim on
    // it. "Not allowed" and "does not exist" are different statements, so the
    // failure keeps its own copy instead of collapsing into "no course yet".
    return emptyVm(base, "forbidden", options, selectedSubjectId);
  }

  const course = pickCourse(coursesResult.data);
  if (!course) return emptyVm(base, "no-course", options, selectedSubjectId);

  const itemsResult = await (await makeListCourseItemsUseCase()).execute(
    course.id,
  );

  return {
    ...base,
    courseId: course.id,
    courseName: course.title,
    tone: toneForId(course.id),
    courseStatus: course.status,
    items: itemsResult.ok ? itemsResult.data : [],
    // The timeline read degrades on its own: a readable course with an
    // unreadable timeline still renders its header plus a retry banner.
    errorKey: itemsResult.ok ? null : itemsResult.failure.type,
    mode: resolveCourseTimelineMode(mySubjectIds, course.subjectId),
    subjectOptions: options,
    selectedSubjectId,
    emptyReason: null,
  };
}

/** The auto-provisioned default course is the subject's canonical one; the
 *  first row is the fallback for older data that predates the flag. */
function pickCourse(rows: CourseSummary[]): CourseSummary | undefined {
  return rows.find((c) => c.isDefault) ?? rows[0];
}
