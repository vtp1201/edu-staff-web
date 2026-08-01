import { makeListExamBankUseCase } from "@/bootstrap/di/exam-bank.di";
import { getAccessToken } from "@/bootstrap/lib/auth-token.server";
import { decodeSubClaim } from "@/bootstrap/lib/jwt";
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

/**
 * The owner-gated affordances (edit/delete/publish) compare `teacherId` — which
 * maps from the wire's `authorId` — against the caller. In real mode that must
 * be the token's `sub`, or no real paper would ever look owned and the
 * now-wired edit/delete would stay unreachable (US-E18.28). Mock mode keeps the
 * seeded teacher id so the fixtures stay exercisable.
 */
async function resolveCurrentTeacherId(): Promise<string> {
  if (USE_MOCK) return MOCK_CURRENT_TEACHER_ID;
  const token = await getAccessToken();
  return (token ? decodeSubClaim(token) : null) ?? "";
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
      currentTeacherId={await resolveCurrentTeacherId()}
      createPath="/teacher/exam-bank/create"
      editPathPrefix="/teacher/exam-bank"
      // Creating a paper from scratch still has no wire equivalent (metadata-
      // only POST — ADR 0056 Amendment 2) → mock-only. Editing/deleting an
      // owned DRAFT and publishing ARE wired real (core US-152, US-E18.28).
      authoringEnabled={USE_MOCK}
      editingEnabled={true}
      publishAction={publishExamAction}
      deleteAction={deleteExamAction}
    />
  );
}
