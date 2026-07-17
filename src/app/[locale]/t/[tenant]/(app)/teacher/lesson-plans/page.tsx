import {
  getSubjectOptions,
  makeListMyLessonPlansUseCase,
} from "@/bootstrap/di/lesson-plan.di";
import { MOCK_CURRENT_TEACHER_ID } from "@/features/lesson-plan/infrastructure/repositories/mocks/fixtures";
import { LessonPlanListScreen } from "@/features/lesson-plan/presentation/lesson-plan-list-screen/lesson-plan-list-screen";
import type {
  LessonPlanListScreenVM,
  ListNotice,
} from "@/features/lesson-plan/presentation/lesson-plan-list-screen/lesson-plan-list-screen.i-vm";
import { GRADE_OPTIONS } from "@/features/lesson-plan/presentation/shared.i-vm";
import { listBySubjectAction, listMineAction } from "./actions";

function toNotice(value?: string): ListNotice {
  return value === "access-denied" || value === "not-found" ? value : null;
}

export default async function TeacherLessonPlansPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; tenant: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { locale, tenant } = await params;
  const { notice } = await searchParams;
  const base = `/${locale}/t/${tenant}/teacher/lesson-plans`;

  const [mineResult, subjects] = await Promise.all([
    (await makeListMyLessonPlansUseCase()).execute({}),
    getSubjectOptions(),
  ]);

  const vm: LessonPlanListScreenVM = {
    initialMinePage: mineResult.ok ? mineResult.value : null,
    subjects,
    gradeOptions: [...GRADE_OPTIONS],
    currentTeacherId: MOCK_CURRENT_TEACHER_ID,
    createPath: `${base}/create`,
    planPathPrefix: base,
    notice: toNotice(notice),
    listMineAction,
    listBySubjectAction,
  };

  return <LessonPlanListScreen vm={vm} />;
}
