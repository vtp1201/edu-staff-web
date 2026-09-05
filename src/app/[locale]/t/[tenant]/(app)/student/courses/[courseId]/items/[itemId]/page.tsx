import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/bootstrap/auth-guard";
import {
  makeGetAssignmentDetailUseCase,
  makeGetCourseUseCase,
  makeGetLessonUseCase,
  makeListCourseItemsUseCase,
} from "@/bootstrap/di/lms.di";
import type { CourseItem } from "@/features/lms/domain/entities/course-item.entity";
import type { LmsFailure } from "@/features/lms/domain/failures/lms.failure";
import { CoursePlayer } from "@/features/lms/presentation/course-player/course-player";
import type {
  ActiveItemVm,
  CoursePlayerVm,
  SubmitAssignmentFn,
} from "@/features/lms/presentation/course-player/course-player.i-vm";
import { toWeekVms } from "@/features/lms/presentation/course-timeline/course-timeline.derive";
import { toneForId } from "@/features/lms/presentation/tone";
import { submitAssignmentAction } from "./actions";

interface Props {
  params: Promise<{
    locale: string;
    tenant: string;
    courseId: string;
    itemId: string;
  }>;
}

/**
 * `/student/courses/[courseId]/items/[itemId]` — the course player (US-E24.5).
 *
 * ALL composition happens here: the course header, the week-grouped sidebar
 * (the same `toWeekVms` the timeline uses) and — only for the active item — the
 * one extra read its type needs. Presentation receives a finished ViewModel and
 * a pre-bound Server Action; it never sees a use-case or an entity.
 *
 * The itemId is validated against THIS course's own item list, so an id from
 * another course (or one the student may not see) 404s rather than rendering.
 */
export default async function StudentCourseItemPage({ params }: Props) {
  const { locale, tenant, courseId, itemId } = await params;
  const t = await getTranslations("courses");

  const guard = await requireRole(["student"]);
  if (!guard.ok) {
    return (
      <div role="alert" className="p-8 text-center text-edu-error-text text-sm">
        {t("errors.forbidden")}
      </div>
    );
  }

  const [courseResult, itemsResult] = await Promise.all([
    (await makeGetCourseUseCase()).execute(courseId),
    (await makeListCourseItemsUseCase()).execute(courseId),
  ]);

  if (!courseResult.ok) {
    if (courseResult.failure.type === "not-found") notFound();
    return (
      <div role="alert" className="p-8 text-center text-edu-error-text text-sm">
        {t(`errors.${courseResult.failure.type}`)}
      </div>
    );
  }

  if (!itemsResult.ok) {
    // Unlike the timeline page there is nothing to degrade TO: without the item
    // list we cannot know which item this route addresses, nor render the
    // sidebar it navigates with.
    return (
      <div role="alert" className="p-8 text-center text-edu-error-text text-sm">
        {t(`errors.${itemsResult.failure.type}`)}
      </div>
    );
  }

  const weeks = toWeekVms(itemsResult.data);
  // Flattened in SIDEBAR order (weeks, then position) so Prev/Next agree with
  // what the panel shows.
  const flat = weeks.flatMap((week) => week.items);
  const index = flat.findIndex((row) => row.id === itemId);
  const item = itemsResult.data.find((row) => row.id === itemId);
  if (index < 0 || !item) notFound();

  const href = (id: string) =>
    `/${locale}/t/${tenant}/student/courses/${courseId}/items/${id}`;

  const { activeItem, errorKey, assignmentId } = await readActiveItem(
    courseId,
    item,
    (examId) => `/${locale}/t/${tenant}/student/exams/${examId}`,
  );

  const vm: CoursePlayerVm = {
    courseId,
    courseName: courseResult.data.title,
    courseHref: `/${locale}/t/${tenant}/student/courses/${courseId}`,
    tone: toneForId(courseId),
    weeks,
    activeItemId: itemId,
    activeItem,
    prevHref: index > 0 ? href(flat[index - 1]?.id ?? itemId) : null,
    nextHref:
      index < flat.length - 1 ? href(flat[index + 1]?.id ?? itemId) : null,
    activeItemErrorKey: errorKey,
  };

  // Bound to the assignment id server-side (`.bind`, never an inline closure —
  // a local async function passed from an RSC is not a Server Action and 500s
  // at call time). `null` for every other type: no submit affordance exists.
  const submitAssignment: SubmitAssignmentFn | null =
    assignmentId === null
      ? null
      : submitAssignmentAction.bind(null, assignmentId);

  return (
    // Keyed by item: the client subtree seeds local state (submit box, week
    // collapse) from props, so moving between items must REMOUNT it.
    <CoursePlayer key={itemId} vm={vm} submitAssignment={submitAssignment} />
  );
}

interface ActiveItemRead {
  activeItem: ActiveItemVm;
  errorKey: LmsFailure["type"] | null;
  /** Non-null ONLY for an assignment the student may still submit to. */
  assignmentId: string | null;
}

/**
 * The ONE extra read the active item's type needs (a lesson body, or an
 * assignment plus the caller's own submission). DOCUMENT and EXAM are fully
 * carried by the timeline row already — reading again would be a round trip
 * for data we hold.
 */
async function readActiveItem(
  courseId: string,
  item: CourseItem,
  examHrefFor: (examId: string) => string,
): Promise<ActiveItemRead> {
  const base = {
    id: item.id,
    title: item.title,
    state: item.state,
    startAt: item.startAt,
    dueAt: item.dueAt,
  };

  // D7: an unreleased item is only ever an EXAM on a student read. Nothing
  // about it is readable yet, so no body read is attempted at all.
  if (item.state === "UPCOMING_HIDDEN") {
    return {
      activeItem: {
        kind: "locked",
        id: item.id,
        title: item.title,
        itemType: item.itemType,
        opensAt: item.startAt,
      },
      errorKey: null,
      assignmentId: null,
    };
  }

  if (item.itemType === "LESSON") {
    const result = await (await makeGetLessonUseCase()).execute(
      courseId,
      item.refId ?? item.id,
    );
    return {
      activeItem: {
        ...base,
        kind: "lesson",
        content: result.ok ? result.data.content : "",
      },
      errorKey: result.ok ? null : result.failure.type,
      assignmentId: null,
    };
  }

  if (item.itemType === "ASSIGNMENT") {
    const assignmentId = item.refId ?? item.id;
    const result = await (await makeGetAssignmentDetailUseCase()).execute(
      assignmentId,
    );
    const mine = result.ok ? result.data.mySubmission : null;
    return {
      activeItem: {
        ...base,
        kind: "assignment",
        instructions: result.ok ? result.data.assignment.instructions : null,
        mySubmission: mine
          ? { content: mine.content, submittedAt: mine.submittedAt }
          : null,
      },
      errorKey: result.ok ? null : result.failure.type,
      // A failed read means we do not know whether a submission exists — do
      // not offer a one-way submit on top of unknown state.
      assignmentId: result.ok ? assignmentId : null,
    };
  }

  if (item.itemType === "EXAM") {
    const examId = item.exam?.examId ?? item.refId;
    return {
      activeItem: {
        ...base,
        kind: "exam",
        examUrl: item.exam?.examUrl ?? null,
        examHref: examId === null ? null : examHrefFor(examId),
        examDurationMinutes: item.exam?.durationMinutes ?? null,
      },
      errorKey: null,
      assignmentId: null,
    };
  }

  return {
    activeItem: {
      ...base,
      kind: "document",
      description: item.description,
      url: item.url,
    },
    errorKey: null,
    assignmentId: null,
  };
}
