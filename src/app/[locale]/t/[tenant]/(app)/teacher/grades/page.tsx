import { makeGetGradeSheetUseCase } from "@/bootstrap/di/grades.di";
import {
  resolveCurrentTermContext,
  resolveTermNames,
} from "@/bootstrap/lib/resolve-current-term";
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
  const classSubjects: ClassSubjectOption[] = await resolveMyGradeSubjects();
  const term = await resolveCurrentTermContext().catch(() => null);
  const academicYearLabel = term?.academicYearLabel ?? "2025-2026";

  // Auto-select the first class-subject and the CURRENT term: every parameter
  // here is a uuid, so an unselected sheet was a screen the teacher could only
  // fill by walking three dropdowns. The URL still wins.
  const selectedClassId = sp.classId ?? classSubjects[0]?.classId ?? null;
  const selectedSubjectId = sp.subjectId ?? classSubjects[0]?.subjectId ?? null;
  const selectedTerm = sp.term ?? term?.termId ?? null;
  // Real terms for the picker — its options were the hardcoded HK1/HK2 keys,
  // which match nothing on a wire whose termIds are uuids.
  const terms = [...(await resolveTermNames().catch(() => new Map()))].map(
    ([id, name]) => ({ id, name }),
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

  // A locally-defined function CANNOT be handed from an RSC to a Client
  // Component — Next.js throws "Functions cannot be passed directly to Client
  // Components…" and the route 500s. So the no-selection state binds the REAL
  // Server Actions to a placeholder key instead of a stub closure; nothing can
  // invoke them in that state anyway (no sheet renders ⇒ no input, no submit
  // control), and the server-side key validation is the backstop. Same idiom as
  // `buildApproverGradeVm`'s `boundKey`.
  const boundKey: ClassSubjectTermKey = key ?? {
    classId: selectedClassId ?? "",
    subjectId: selectedSubjectId ?? "",
    termId: selectedTerm ?? "",
    academicYearLabel,
  };

  const vm: GradeEntryScreenVM = {
    // Teacher mode: enter + submit, never reject. The reject capability is not
    // "omitted" here — `TeacherGradeEntryVM` has no such field, so handing one
    // over would be a compile error (US-E18.44).
    viewerRole: "teacher",
    classSubjects,
    terms,
    selectedClassId,
    selectedSubjectId,
    selectedTerm,
    sheet,
    error,
    saveScoreAction: saveScoreAction.bind(null, boundKey),
    submitScoresAction: submitScoresAction.bind(null, boundKey),
  };

  return <GradeEntryContainer vm={vm} />;
}
