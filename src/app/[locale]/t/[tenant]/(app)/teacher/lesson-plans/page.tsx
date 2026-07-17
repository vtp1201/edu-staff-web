import {
  getSubjectOptions,
  makeListMyLessonPlansUseCase,
} from "@/bootstrap/di/lesson-plan.di";
import { LessonPlanListScreen } from "@/features/lesson-plan/presentation/lesson-plan-list-screen/lesson-plan-list-screen";
import type {
  LessonPlanListScreenVM,
  ListNotice,
} from "@/features/lesson-plan/presentation/lesson-plan-list-screen/lesson-plan-list-screen.i-vm";
import { GRADE_OPTIONS } from "@/features/lesson-plan/presentation/shared.i-vm";
import { listBySubjectAction, listMineAction } from "./actions";

// TODO(US-E11.8): resolve the real current teacher member id from the decoded
// session/JWT once caller-identity resolution ships for this route. Placeholder
// mirrors the exam-bank/lesson-bank precedent; in mock mode it matches the seeded
// fixtures so ownership-gated edit/publish is exercisable.
const CURRENT_TEACHER_ID = "t-me";

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
    currentTeacherId: CURRENT_TEACHER_ID,
    createPath: `${base}/create`,
    planPathPrefix: base,
    notice: toNotice(notice),
    listMineAction,
    listBySubjectAction,
  };

  return <LessonPlanListScreen vm={vm} />;
}
