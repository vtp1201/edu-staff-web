import { makeListExamBankUseCase } from "@/bootstrap/di/exam-bank.di";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { ExamBankSummary } from "@/features/exam-bank/domain/entities/exam-bank-summary.entity";
import { ExamBankScreen } from "@/features/exam-bank/presentation/exam-bank-screen/exam-bank-screen";
import type {
  SubjectOption,
  TeacherOption,
} from "@/features/exam-bank/presentation/exam-bank-screen/exam-bank-screen.i-vm";
import { deleteExamAction, publishExamAction } from "./actions";

// Mock-first: lms not shipped (decision 0014). Current teacher is mocked so
// ownership-gated edit/publish/delete is exercisable against seeded fixtures.
const MOCK_CURRENT_TEACHER_ID = "u-teacher-1";

function deriveSubjects(exams: ExamBankSummary[]): SubjectOption[] {
  const map = new Map<string, string>();
  for (const e of exams) map.set(e.subjectId, e.subjectName);
  return Array.from(map, ([id, name]) => ({ id, name }));
}

function deriveTeachers(exams: ExamBankSummary[]): TeacherOption[] {
  const map = new Map<string, string>();
  for (const e of exams) map.set(e.teacherId, e.teacherName);
  return Array.from(map, ([id, name]) => ({ id, name }));
}

export default async function TeacherExamBankPage() {
  let exams: ExamBankSummary[] = [];
  try {
    exams = await (await makeListExamBankUseCase()).execute({});
  } catch {
    exams = [];
  }

  return (
    <ExamBankScreen
      exams={exams}
      subjects={deriveSubjects(exams)}
      teachers={deriveTeachers(exams)}
      viewerRole="teacher"
      currentTeacherId={MOCK_CURRENT_TEACHER_ID}
      createPath="/teacher/exam-bank/create"
      editPathPrefix="/teacher/exam-bank"
      // Authoring (create/edit/delete) has no real wire endpoint (US-E18.15/ADR
      // 0056); enabled only against the mock store. Publish stays wired real.
      authoringEnabled={USE_MOCK}
      publishAction={publishExamAction}
      deleteAction={deleteExamAction}
    />
  );
}
