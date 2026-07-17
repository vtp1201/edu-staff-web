import { requireRole } from "@/bootstrap/auth-guard";
import {
  getSubjectOptions,
  makeListMyQuestionsUseCase,
} from "@/bootstrap/di/question-bank.di";
import { QuestionBankListScreen } from "@/features/question-bank/presentation/question-bank-list-screen/question-bank-list-screen";
import type {
  QuestionBankListNotice,
  QuestionBankListScreenVM,
} from "@/features/question-bank/presentation/question-bank-list-screen/question-bank-list-screen.i-vm";
import { GRADE_OPTIONS } from "@/features/question-bank/presentation/shared.i-vm";
import { listMineAction, searchAction } from "./actions";

// TODO(US-E11.9): resolve the real current teacher member id from the decoded
// session/JWT once caller-identity resolution ships. Placeholder mirrors the
// lesson-plan precedent; in mock mode it matches the seeded fixtures.
const CURRENT_TEACHER_ID = "t-me";

function toNotice(value?: string): QuestionBankListNotice {
  return value === "not-found" ||
    value === "not-visible" ||
    value === "forbidden-edit"
    ? value
    : null;
}

export default async function TeacherQuestionBankPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; tenant: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { locale, tenant } = await params;
  const { notice } = await searchParams;
  const base = `/${locale}/t/${tenant}/teacher/question-bank`;

  const baseVm: QuestionBankListScreenVM = {
    initialMinePage: null,
    subjects: [],
    gradeOptions: [...GRADE_OPTIONS],
    currentTeacherId: CURRENT_TEACHER_ID,
    createPath: `${base}/create`,
    editPathPrefix: base,
    notice: toNotice(notice),
    listMineAction,
    searchAction,
  };

  // RBAC (incl. reads) — applied BEFORE any DI/network call (NFR-008/UC-907).
  const guard = await requireRole(["teacher"]);
  if (!guard.ok) {
    return <QuestionBankListScreen vm={{ ...baseVm, forbidden: true }} />;
  }

  const [mineResult, subjects] = await Promise.all([
    (await makeListMyQuestionsUseCase()).execute({}),
    getSubjectOptions(),
  ]);

  const vm: QuestionBankListScreenVM = {
    ...baseVm,
    initialMinePage: mineResult.ok ? mineResult.value : null,
    subjects,
  };

  return <QuestionBankListScreen vm={vm} />;
}
