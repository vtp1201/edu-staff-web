import { notFound } from "next/navigation";
import {
  makeGetExamDetailUseCase,
  makeListExamBankUseCase,
} from "@/bootstrap/di/exam-bank.di";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { ExamBankDetail } from "@/features/exam-bank/domain/entities/exam-bank-detail.entity";
import type { CreateExamInput } from "@/features/exam-bank/domain/entities/exam-bank-input.entity";
import type { ExamBankSummary } from "@/features/exam-bank/domain/entities/exam-bank-summary.entity";
import type { SubjectOption } from "@/features/exam-bank/presentation/exam-bank-screen/exam-bank-screen.i-vm";
import { ExamBuilderScreen } from "@/features/exam-bank/presentation/exam-builder-screen/exam-builder-screen";
import { ExamBuilderUnavailable } from "@/features/exam-bank/presentation/exam-builder-screen/exam-builder-unavailable";
import { publishExamAction, saveDraftAction } from "./actions";

function deriveSubjects(exams: ExamBankSummary[]): SubjectOption[] {
  const map = new Map<string, string>();
  for (const e of exams) map.set(e.subjectId, e.subjectName);
  return Array.from(map, ([id, name]) => ({ id, name }));
}

// Edit mode never calls createExamAction (id exists); typed no-op to satisfy VM.
async function createExamAction(
  _input: CreateExamInput,
): Promise<{ ok: true; id: string }> {
  "use server";
  return { ok: true, id: "" };
}

export default async function EditExamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Editing has no real wire endpoint (US-E18.15/ADR 0056) — block in real mode.
  if (!USE_MOCK) return <ExamBuilderUnavailable />;

  const { id } = await params;

  let detail: ExamBankDetail;
  try {
    detail = await (await makeGetExamDetailUseCase()).execute(id);
  } catch {
    notFound();
  }

  let exams: ExamBankSummary[] = [];
  try {
    exams = await (await makeListExamBankUseCase()).execute({});
  } catch {
    exams = [];
  }

  return (
    <ExamBuilderScreen
      initial={detail}
      subjects={deriveSubjects(exams)}
      createExamAction={createExamAction}
      saveDraftAction={saveDraftAction}
      publishExamAction={publishExamAction}
    />
  );
}
