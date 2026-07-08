import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/bootstrap/auth-guard";
import { makeGetCourseLessonsUseCase } from "@/bootstrap/di/lms.di";
import { LessonPlayer } from "@/features/lms/presentation/lesson-player/lesson-player";
import { pickInitialLessonId } from "@/features/lms/presentation/lesson-player/lesson-player.derive";
import type {
  LessonPlayerActions,
  LessonPlayerVm,
} from "@/features/lms/presentation/lesson-player/lesson-player.i-vm";
import {
  askQuestionAction,
  getNoteAction,
  listQuestionsAction,
  markLessonCompleteAction,
  saveNoteAction,
} from "./actions";

interface Props {
  params: Promise<{ locale: string; tenant: string; courseId: string }>;
}

export default async function StudentLessonPlayerPage({ params }: Props) {
  const { locale, tenant, courseId } = await params;
  const t = await getTranslations("courses");

  // RBAC (incl. reads) — story requirement, applied before the DI call.
  const guard = await requireRole(["student"]);
  if (!guard.ok) {
    return (
      <div role="alert" className="p-8 text-center text-edu-error-text text-sm">
        {t("errors.forbidden")}
      </div>
    );
  }

  const result = await (await makeGetCourseLessonsUseCase()).execute(courseId);
  if (!result.ok) {
    if (result.failure.type === "not-found") notFound();
    return (
      <div role="alert" className="p-8 text-center text-edu-error-text text-sm">
        {t("errors.unknown")}
      </div>
    );
  }

  const { course, chapters } = result.data;

  const vm: LessonPlayerVm = {
    courseId: course.id,
    courseName: course.name,
    tone: course.tone,
    coursesListHref: `/${locale}/t/${tenant}/student/courses`,
    chapters,
    initialActiveLessonId: pickInitialLessonId(chapters),
    errorKey: null,
  };

  const actions: LessonPlayerActions = {
    markLessonComplete: markLessonCompleteAction,
    getNote: getNoteAction,
    saveNote: saveNoteAction,
    listQuestions: listQuestionsAction,
    askQuestion: askQuestionAction,
  };

  return <LessonPlayer vm={vm} actions={actions} />;
}
