import { makeListExamBankUseCase } from "@/bootstrap/di/exam-bank.di";
import type { UpdateExamInput } from "@/features/exam-bank/domain/entities/exam-bank-input.entity";
import type { ExamBankSummary } from "@/features/exam-bank/domain/entities/exam-bank-summary.entity";
import type { SubjectOption } from "@/features/exam-bank/presentation/exam-bank-screen/exam-bank-screen.i-vm";
import { ExamBuilderScreen } from "@/features/exam-bank/presentation/exam-builder-screen/exam-builder-screen";
import { createExamAction, publishExamAction } from "./actions";

function deriveSubjects(exams: ExamBankSummary[]): SubjectOption[] {
  const map = new Map<string, string>();
  for (const e of exams) map.set(e.subjectId, e.subjectName);
  return Array.from(map, ([id, name]) => ({ id, name }));
}

// Create mode never calls saveDraftAction (no id yet); provide a typed no-op
// so the VM contract is satisfied.
async function saveDraftAction(_input: UpdateExamInput): Promise<{ ok: true }> {
  "use server";
  return { ok: true };
}

export default async function CreateExamPage() {
  let exams: ExamBankSummary[] = [];
  try {
    exams = await (await makeListExamBankUseCase()).execute({});
  } catch {
    exams = [];
  }

  return (
    <ExamBuilderScreen
      subjects={deriveSubjects(exams)}
      createExamAction={createExamAction}
      saveDraftAction={saveDraftAction}
      publishExamAction={publishExamAction}
    />
  );
}
