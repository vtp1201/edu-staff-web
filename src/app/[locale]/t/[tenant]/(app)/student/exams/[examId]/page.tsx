import { getTranslations } from "next-intl/server";
import {
  makeGetExamQuestionsUseCase,
  makeGetExamResultUseCase,
  makeListExamsUseCase,
} from "@/bootstrap/di/exam.di";
import type { ExamQuestion } from "@/features/exam/domain/entities/exam-question.entity";
import type { ExamResult } from "@/features/exam/domain/entities/exam-result.entity";
import { ExamDetailScreen } from "@/features/exam/presentation/exam-taking/exam-detail-screen";
import { submitExamAction } from "./actions";

const MOCK_STUDENT_ID = "current-student";

interface Props {
  params: Promise<{ examId: string }>;
}

export default async function StudentExamDetailPage({ params }: Props) {
  const { examId } = await params;
  const t = await getTranslations("exam");

  const allExams = await (await makeListExamsUseCase()).execute(
    MOCK_STUDENT_ID,
  );
  const exam = allExams.find((e) => e.id === examId);

  if (!exam) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        {t("errors.not-found")}
      </div>
    );
  }

  // Completed exams jump straight to the result; otherwise load questions.
  let questions: ExamQuestion[] = [];
  let initialResult: ExamResult | null = null;

  if (exam.status === "completed") {
    try {
      initialResult = await (await makeGetExamResultUseCase()).execute(examId);
    } catch {
      initialResult = null;
    }
  } else {
    try {
      questions = await (await makeGetExamQuestionsUseCase()).execute(examId);
    } catch {
      questions = [];
    }
  }

  return (
    <ExamDetailScreen
      exam={exam}
      questions={questions}
      initialResult={initialResult}
      submitExamAction={submitExamAction}
    />
  );
}
