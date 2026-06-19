import {
  MOCK_CLASS_SUBJECTS,
  makeGetGradeBookUseCase,
} from "@/bootstrap/di/grades.di";
import type { GradeBook } from "@/features/grades/domain/entities/grade-book.entity";
import type { GradesFailure } from "@/features/grades/domain/failures/grades.failure";
import {
  isGradeBookFailure,
  isGradeBookPublished,
} from "@/features/grades/presentation/grade-book-screen/build-grade-book-vm";
import { GradeBookContainer } from "@/features/grades/presentation/grade-book-screen/grade-book-container";
import type { GradeBookScreenVM } from "@/features/grades/presentation/grade-book-screen/grade-book-screen.i-vm";

type SearchParams = Promise<{ csId?: string; term?: string }>;

export default async function AdminGradeBookPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const selectedCsId = sp.csId ?? null;
  const selectedTerm = sp.term ?? null;

  let gradeBook: GradeBook | null = null;
  let error: GradesFailure["type"] | null = null;

  if (selectedCsId && selectedTerm) {
    const result = await (await makeGetGradeBookUseCase()).execute(
      selectedCsId,
      selectedTerm,
    );
    if (isGradeBookFailure(result)) {
      error = result.type;
    } else {
      gradeBook = result;
    }
  }

  const vm: GradeBookScreenVM = {
    role: "admin",
    classSubjects: MOCK_CLASS_SUBJECTS,
    selectedCsId,
    selectedTerm,
    gradeBook,
    isPublished: isGradeBookPublished(gradeBook),
    error,
  };

  return <GradeBookContainer vm={vm} />;
}
