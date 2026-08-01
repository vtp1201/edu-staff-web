import { notFound } from "next/navigation";
import {
  makeGetExamDetailUseCase,
  makeListExamBankUseCase,
} from "@/bootstrap/di/exam-bank.di";
import { getAccessToken } from "@/bootstrap/lib/auth-token.server";
import { decodeSubClaim } from "@/bootstrap/lib/jwt";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { ExamBankDetail } from "@/features/exam-bank/domain/entities/exam-bank-detail.entity";
import type { CreateExamInput } from "@/features/exam-bank/domain/entities/exam-bank-input.entity";
import type { ExamBankSummary } from "@/features/exam-bank/domain/entities/exam-bank-summary.entity";
import { resolveBuilderAccess } from "@/features/exam-bank/domain/use-cases/resolve-builder-access";
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

/**
 * Editing an owned DRAFT is wired real since core US-152 (US-E18.28/ADR 0056
 * Amendment 2), so the route no longer blocks wholesale in real mode — it loads
 * the paper first and blocks only when the server would refuse the write
 * anyway (non-DRAFT, or not the author). The server remains the security
 * boundary; this is the message-quality gate.
 */
export default async function EditExamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let detail: ExamBankDetail;
  try {
    detail = await (await makeGetExamDetailUseCase()).execute(id);
  } catch {
    notFound();
  }

  const token = USE_MOCK ? undefined : await getAccessToken();
  const access = resolveBuilderAccess({
    useMock: USE_MOCK,
    status: detail.status,
    authorId: detail.teacherId,
    callerId: token ? decodeSubClaim(token) : null,
  });
  if (!access.allowed) return <ExamBuilderUnavailable reason={access.reason} />;

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
      // No reorder route exists on the real contract, and neither `subjectId`
      // (immutable server-side) nor `maxAttempts` (no wire field) round-trips —
      // so those affordances are gated off in real mode rather than silently
      // dropping the teacher's edit (US-E18.28).
      reorderEnabled={USE_MOCK}
      metaEditable={USE_MOCK}
      createExamAction={createExamAction}
      saveDraftAction={saveDraftAction}
      publishExamAction={publishExamAction}
    />
  );
}
