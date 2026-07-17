import { redirect } from "next/navigation";
import { requireRole } from "@/bootstrap/auth-guard";
import { getSubjectOptions } from "@/bootstrap/di/question-bank.di";
import { QuestionBankBuilderScreen } from "@/features/question-bank/presentation/question-bank-builder-screen/question-bank-builder-screen";
import type { QuestionBankBuilderScreenVM } from "@/features/question-bank/presentation/question-bank-builder-screen/question-bank-builder-screen.i-vm";
import { GRADE_OPTIONS } from "@/features/question-bank/presentation/shared.i-vm";
import { publishAction, refetchAction, saveQuestionAction } from "./actions";

export default async function CreateQuestionPage({
  params,
}: {
  params: Promise<{ locale: string; tenant: string }>;
}) {
  const { locale, tenant } = await params;
  const base = `/${locale}/t/${tenant}/teacher/question-bank`;

  // RBAC — before any DI call. Non-teacher → back to the guarded list.
  const guard = await requireRole(["teacher"]);
  if (!guard.ok) redirect(base);

  const subjects = await getSubjectOptions();

  const vm: QuestionBankBuilderScreenVM = {
    initial: undefined,
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
