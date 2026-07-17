import { getSubjectOptions } from "@/bootstrap/di/lesson-plan.di";
import { LessonPlanBuilderScreen } from "@/features/lesson-plan/presentation/lesson-plan-builder-screen/lesson-plan-builder-screen";
import type { LessonPlanBuilderScreenVM } from "@/features/lesson-plan/presentation/lesson-plan-builder-screen/lesson-plan-builder-screen.i-vm";
import { GRADE_OPTIONS } from "@/features/lesson-plan/presentation/shared.i-vm";
import { publishAction, refetchAction, saveDraftAction } from "./actions";

export default async function CreateLessonPlanPage({
  params,
}: {
  params: Promise<{ locale: string; tenant: string }>;
}) {
  const { locale, tenant } = await params;
  const base = `/${locale}/t/${tenant}/teacher/lesson-plans`;
  const subjects = await getSubjectOptions();

  const vm: LessonPlanBuilderScreenVM = {
    initial: undefined,
    subjects,
    gradeOptions: [...GRADE_OPTIONS],
    lessonPlansPath: base,
    editPathPrefix: base,
    saveDraftAction,
    publishAction,
    refetchAction,
  };

  return <LessonPlanBuilderScreen vm={vm} />;
}
