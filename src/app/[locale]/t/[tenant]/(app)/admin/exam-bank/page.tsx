import { makeListExamBankUseCase } from "@/bootstrap/di/exam-bank.di";
import type { ExamBankSummary } from "@/features/exam-bank/domain/entities/exam-bank-summary.entity";
import { ExamBankScreen } from "@/features/exam-bank/presentation/exam-bank-screen/exam-bank-screen";
import type {
  SubjectOption,
  TeacherOption,
} from "@/features/exam-bank/presentation/exam-bank-screen/exam-bank-screen.i-vm";
import { forbiddenAction } from "./actions";

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

export default async function AdminExamBankPage() {
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
      viewerRole="admin"
      currentTeacherId=""
      createPath=""
      editPathPrefix="/admin/exam-bank"
      // Admin exam-bank is read-only (AC-9) — no authoring affordances at all.
      authoringEnabled={false}
      publishAction={forbiddenAction}
      deleteAction={forbiddenAction}
    />
  );
}
