import { makeListExamsUseCase } from "@/bootstrap/di/exam.di";
import type { ExamSummary } from "@/features/exam/domain/entities/exam.entity";
import { ExamListScreen } from "@/features/exam/presentation/exam-list/exam-list";

// Mock student id — in production this comes from the session / JWT (mock-first).
const MOCK_STUDENT_ID = "current-student";

export default async function StudentExamsPage() {
  let exams: ExamSummary[] = [];
  try {
    exams = await (await makeListExamsUseCase()).execute(MOCK_STUDENT_ID);
  } catch {
    exams = [];
  }
  return <ExamListScreen exams={exams} />;
}
