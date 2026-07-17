import { redirect } from "next/navigation";
import { requireRole } from "@/bootstrap/auth-guard";
import {
  getSubjectOptions,
  makeGetQuestionUseCase,
} from "@/bootstrap/di/question-bank.di";
import type { QuestionEntity } from "@/features/question-bank/domain/entities/question.entity";
import { QuestionBankBuilderScreen } from "@/features/question-bank/presentation/question-bank-builder-screen/question-bank-builder-screen";
import type { QuestionBankBuilderScreenVM } from "@/features/question-bank/presentation/question-bank-builder-screen/question-bank-builder-screen.i-vm";
import { GRADE_OPTIONS } from "@/features/question-bank/presentation/shared.i-vm";
import { publishAction, refetchAction, saveQuestionAction } from "./actions";

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ locale: string; tenant: string; id: string }>;
}) {
  const { locale, tenant, id } = await params;
  const base = `/${locale}/t/${tenant}/teacher/question-bank`;

  // RBAC — before any DI call (NFR-008/UC-907).
  const guard = await requireRole(["teacher"]);
  if (!guard.ok) redirect(base);

  const result = await (await makeGetQuestionUseCase()).execute(id);

  // Visibility gate: redirect BEFORE the client mounts, with a SPECIFIC notice
  // (state-architecture.md §3). A transient failure stays on the route.
  let initial: QuestionEntity | undefined;
  let loadFailed = false;
  if (result.ok) {
    initial = result.value;
  } else {
    const key = result.failure.type;
    if (key === "not-found") {
      redirect(`${base}?notice=not-found`);
    }
    if (key === "not-visible") {
      redirect(`${base}?notice=not-visible`);
    }
    if (key === "forbidden-edit" || key === "forbidden-browse") {
      redirect(`${base}?notice=forbidden-edit`);
    }
    // network-error / unknown → stay on route, client shows retry.
    loadFailed = true;
  }

  const subjects = await getSubjectOptions();

  const vm: QuestionBankBuilderScreenVM = {
    initial,
    questionId: id,
    loadFailed,
    subjects,
    gradeOptions: [...GRADE_OPTIONS],
    questionBankPath: base,
    editPathPrefix: base,
    saveQuestionAction,
    publishAction,
    refetchAction,
  };

  return <QuestionBankBuilderScreen vm={vm} />;
}
