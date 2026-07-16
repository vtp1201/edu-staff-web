import { makeGetGradeSheetUseCase } from "@/bootstrap/di/grades.di";
import { resolveCurrentAcademicYear } from "@/bootstrap/lib/resolve-current-term";
import { resolveMyGradeSubjects } from "@/bootstrap/lib/resolve-my-grade-subjects";
import type { ClassSubjectTermKey } from "@/features/grades/domain/entities/class-subject-term-key.entity";
import type { GradeSheet } from "@/features/grades/domain/entities/grade-sheet.entity";
import type { GradesFailure } from "@/features/grades/domain/failures/grades.failure";
import { GradeEntryContainer } from "@/features/grades/presentation/grade-entry-screen/grade-entry-container";
import type {
  ClassSubjectOption,
  GradeEntryScreenVM,
} from "@/features/grades/presentation/grade-entry-screen/grade-entry-screen.i-vm";
import { saveScoreAction, submitScoresAction } from "./actions";

type SearchParams = Promise<{
  classId?: string;
  subjectId?: string;
  term?: string;
}>;

function isFailure(x: unknown): x is GradesFailure {
  return typeof x === "object" && x !== null && "type" in x;
}

export default async function TeacherGradesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const selectedClassId = sp.classId ?? null;
  const selectedSubjectId = sp.subjectId ?? null;
  const selectedTerm = sp.term ?? null;

  const classSubjects: ClassSubjectOption[] = await resolveMyGradeSubjects();
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

  const vm: GradeEntryScreenVM = {
    classSubjects,
    selectedClassId,
    selectedSubjectId,
    selectedTerm,
    sheet,
    error,
    saveScoreAction: key
      ? saveScoreAction.bind(null, key)
      : async () => ({ ok: false, errorKey: "unknown" }),
    submitScoresAction: key
      ? submitScoresAction.bind(null, key)
      : async () => ({ ok: false, errorKey: "unknown" }),
  };

  return <GradeEntryContainer vm={vm} />;
}
