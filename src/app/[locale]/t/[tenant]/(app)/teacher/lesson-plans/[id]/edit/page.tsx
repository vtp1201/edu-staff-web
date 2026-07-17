import { redirect } from "next/navigation";
import {
  getSubjectOptions,
  makeGetLessonPlanUseCase,
} from "@/bootstrap/di/lesson-plan.di";
import type { LessonPlanEntity } from "@/features/lesson-plan/domain/entities/lesson-plan.entity";
import { LessonPlanBuilderScreen } from "@/features/lesson-plan/presentation/lesson-plan-builder-screen/lesson-plan-builder-screen";
import type { LessonPlanBuilderScreenVM } from "@/features/lesson-plan/presentation/lesson-plan-builder-screen/lesson-plan-builder-screen.i-vm";
import { GRADE_OPTIONS } from "@/features/lesson-plan/presentation/shared.i-vm";
import { publishAction, refetchAction, saveDraftAction } from "./actions";

export default async function EditLessonPlanPage({
  params,
}: {
  params: Promise<{ locale: string; tenant: string; id: string }>;
}) {
  const { locale, tenant, id } = await params;
  const base = `/${locale}/t/${tenant}/teacher/lesson-plans`;

  const result = await (await makeGetLessonPlanUseCase()).execute(id);

  // Visibility gate (FR-008): redirect BEFORE the client mounts. Distinct
  // access-denied vs not-found notices (AC-008.3/.4); a transient failure stays
  // on the route as a client error state (AC-008.6).
  let initial: LessonPlanEntity | undefined;
  let loadFailed = false;
  if (result.ok) {
    initial = result.value;
  } else {
    const key = result.failure.type;
    if (key === "not-found" || key === "invalid-id") {
      redirect(`${base}?notice=not-found`);
    }
    if (key === "not-visible" || key === "forbidden") {
      redirect(`${base}?notice=access-denied`);
    }
    // network-error / unknown → stay on route, client shows retry.
    loadFailed = true;
  }

  const subjects = await getSubjectOptions();

  const vm: LessonPlanBuilderScreenVM = {
    initial,
    planId: id,
    loadFailed,
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
