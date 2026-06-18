import {
  MOCK_CLASS_SUBJECTS,
  makeGetGradeSheetUseCase,
} from "@/bootstrap/di/grades.di";
import type { GradeSheet } from "@/features/grades/domain/entities/grade-sheet.entity";
import type { GradesFailure } from "@/features/grades/domain/failures/grades.failure";
import { GradeEntryContainer } from "@/features/grades/presentation/grade-entry-screen/grade-entry-container";
import type {
  ClassSubjectOption,
  GradeEntryScreenVM,
} from "@/features/grades/presentation/grade-entry-screen/grade-entry-screen.i-vm";
import { publishGradesAction, saveScoreAction } from "./actions";

type SearchParams = Promise<{ csId?: string; term?: string }>;

function isFailure(x: unknown): x is GradesFailure {
  return typeof x === "object" && x !== null && "type" in x;
}

export default async function TeacherGradesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const selectedCsId = sp.csId ?? null;
  const selectedTerm = sp.term ?? null;

  let sheet: GradeSheet | null = null;
  let error: GradesFailure["type"] | null = null;

  if (selectedCsId && selectedTerm) {
    const result = await (await makeGetGradeSheetUseCase()).execute(
      selectedCsId,
      selectedTerm,
    );
    if (isFailure(result)) {
      error = result.type;
    } else {
      sheet = result;
    }
  }

  const classSubjects: ClassSubjectOption[] = MOCK_CLASS_SUBJECTS;

  const vm: GradeEntryScreenVM = {
    classSubjects,
    selectedCsId,
    selectedTerm,
    sheet,
    error,
    saveScoreAction,
    publishAction: publishGradesAction,
  };

  return <GradeEntryContainer vm={vm} />;
}
