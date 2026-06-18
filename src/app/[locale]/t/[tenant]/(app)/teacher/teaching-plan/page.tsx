import {
  MOCK_CLASSES,
  MOCK_SUBJECTS,
  MOCK_TERMS,
  makeGetTeachingPlanUseCase,
} from "@/bootstrap/di/teaching-plan.di";
import type { TeachingPlan } from "@/features/teaching-plan/domain/entities/teaching-plan.entity";
import { buildTeachingPlanVM } from "@/features/teaching-plan/presentation/teaching-plan-screen/build-vm";
import { TeachingPlanScreen } from "@/features/teaching-plan/presentation/teaching-plan-screen/teaching-plan-screen";
import type {
  SelectorVM,
  TeachingPlanScreenVM,
} from "@/features/teaching-plan/presentation/teaching-plan-screen/teaching-plan-screen.i-vm";
import { savePlanCellAction, submitTeachingPlanAction } from "./actions";

type SearchParams = Promise<{
  subject?: string;
  class?: string;
  term?: string;
}>;

const subjectNames = Object.fromEntries(
  MOCK_SUBJECTS.map((s) => [s.id, s.name]),
);
const classNames = Object.fromEntries(MOCK_CLASSES.map((c) => [c.id, c.name]));

export default async function TeacherTeachingPlanPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const selectedSubjectId = sp.subject ?? MOCK_SUBJECTS[0]?.id ?? "";
  const selectedClassId = sp.class ?? MOCK_CLASSES[0]?.id ?? "";
  const selectedTerm = sp.term ?? MOCK_TERMS[0] ?? "";

  let plan: TeachingPlan | null = null;
  try {
    plan = await (await makeGetTeachingPlanUseCase()).execute(
      selectedSubjectId,
      selectedClassId,
      selectedTerm,
    );
  } catch {
    plan = null;
  }

  const selector: SelectorVM = {
    subjects: MOCK_SUBJECTS,
    classes: MOCK_CLASSES,
    terms: MOCK_TERMS,
    selectedSubjectId,
    selectedClassId,
    selectedTerm,
  };

  const vm: TeachingPlanScreenVM = {
    plan: plan
      ? buildTeachingPlanVM(plan, {
          subjects: subjectNames,
          classes: classNames,
        })
      : null,
    selector,
    isPrincipal: false,
  };

  return (
    <TeachingPlanScreen
      vm={vm}
      savePlanCellAction={savePlanCellAction}
      submitTeachingPlanAction={submitTeachingPlanAction}
    />
  );
}
