import {
  MOCK_CLASSES,
  MOCK_SUBJECTS,
  MOCK_TEACHER_NAMES,
  makeListPendingTeachingPlansUseCase,
} from "@/bootstrap/di/teaching-plan.di";
import { buildTeachingPlanVM } from "@/features/teaching-plan/presentation/teaching-plan-screen/build-vm";
import { PrincipalReviewScreen } from "@/features/teaching-plan/presentation/teaching-plan-screen/principal-review-screen";
import type { TeachingPlanVM } from "@/features/teaching-plan/presentation/teaching-plan-screen/teaching-plan-screen.i-vm";
import { approveTeachingPlanAction, rejectTeachingPlanAction } from "./actions";

const subjectNames = Object.fromEntries(
  MOCK_SUBJECTS.map((s) => [s.id, s.name]),
);
const classNames = Object.fromEntries(MOCK_CLASSES.map((c) => [c.id, c.name]));

export default async function PrincipalTeachingPlanPage() {
  let pendingPlans: TeachingPlanVM[] = [];
  try {
    const plans = await (await makeListPendingTeachingPlansUseCase()).execute(
      {},
    );
    pendingPlans = plans.map((p) =>
      buildTeachingPlanVM(p, {
        subjects: subjectNames,
        classes: classNames,
        teachers: MOCK_TEACHER_NAMES,
      }),
    );
  } catch {
    pendingPlans = [];
  }

  return (
    <PrincipalReviewScreen
      pendingPlans={pendingPlans}
      approveTeachingPlanAction={approveTeachingPlanAction}
      rejectTeachingPlanAction={rejectTeachingPlanAction}
    />
  );
}
