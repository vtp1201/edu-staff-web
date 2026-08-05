import { makeGetGradeSheetUseCase } from "@/bootstrap/di/grades.di";
import { resolveCurrentAcademicYear } from "@/bootstrap/lib/resolve-current-term";
import { resolveMyGradeSubjects } from "@/bootstrap/lib/resolve-my-grade-subjects";
import type { ClassSubjectTermKey } from "@/features/grades/domain/entities/class-subject-term-key.entity";
import type { GradeSheet } from "@/features/grades/domain/entities/grade-sheet.entity";
import type { GradesFailure } from "@/features/grades/domain/failures/grades.failure";
import { buildApproverGradeVm } from "@/features/grades/presentation/grade-entry-screen/build-approver-grade-vm";
import { GradeEntryContainer } from "@/features/grades/presentation/grade-entry-screen/grade-entry-container";
import type { GradeEntryScreenVM } from "@/features/grades/presentation/grade-entry-screen/grade-entry-screen.i-vm";
import { lockTermAction, rejectEntryAction } from "./actions";

type SearchParams = Promise<{
  classId?: string;
  subjectId?: string;
  term?: string;
}>;

function isFailure(x: unknown): x is GradesFailure {
  return typeof x === "object" && x !== null && "type" in x;
}

/**
 * ADMIN grade view (US-E18.44).
 *
 * Reads the STAFF grade sheet (`GradeSheet`/`StaffGradeCell`) instead of the
 * read-only multi-role `GradeBook`. That swap is the whole point: `GradeBookRow`
 * is built from the narrower `GradeCell` precisely so the student-self /
 * parent-linked read path CANNOT express a rejection — which also means it cannot
 * carry one for an approver. An ADMIN/MANAGER is a staff reader, so this route
 * now consumes the same use-case/repository `/teacher/grades` does and renders
 * the same screen in `viewerRole: "approver"` mode: VIEW + REJECT + term-LOCK,
 * with no score-editing capability anywhere in its VM.
 *
 * `/admin/*` and `/principal/*` have separate strict-equality layout guards, so
 * this page and its `principal` twin are two genuinely distinct reachable routes
 * — together they are what makes the reject affordance reachable at all for the
 * roles BE US-184 authorizes.
 */
export default async function AdminGradeBookPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const selectedClassId = sp.classId ?? null;
  const selectedSubjectId = sp.subjectId ?? null;
  const selectedTerm = sp.term ?? null;

  const classSubjects = await resolveMyGradeSubjects();
  const academicYearLabel = await resolveCurrentAcademicYear().catch(
    () => "2025-2026",
  );

  let sheet: GradeSheet | null = null;
  let error: GradesFailure["type"] | null = null;

  const key: ClassSubjectTermKey | null =
    selectedClassId && selectedSubjectId && selectedTerm
      ? {
          classId: selectedClassId,
          subjectId: selectedSubjectId,
          termId: selectedTerm,
          academicYearLabel,
        }
      : null;

  if (key) {
    const result = await (await makeGetGradeSheetUseCase(key)).execute(key);
    if (isFailure(result)) {
      error = result.type;
    } else {
      sheet = result;
    }
  }

  const vm: GradeEntryScreenVM = buildApproverGradeVm({
    classSubjects,
    selectedClassId,
    selectedSubjectId,
    selectedTerm,
    academicYearLabel,
    sheet,
    error,
    key,
    rejectEntryAction,
    lockTermAction,
  });

  return <GradeEntryContainer vm={vm} />;
}
