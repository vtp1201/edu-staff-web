import { makeGetMyGradesUseCase } from "@/bootstrap/di/grades.di";
import type { GradeBook } from "@/features/grades/domain/entities/grade-book.entity";
import type { GradesFailure } from "@/features/grades/domain/failures/grades.failure";
import {
  isGradeBookFailure,
  isGradeBookPublished,
} from "@/features/grades/presentation/grade-book-screen/build-grade-book-vm";
import { GradeBookContainer } from "@/features/grades/presentation/grade-book-screen/grade-book-container";
import type { GradeBookScreenVM } from "@/features/grades/presentation/grade-book-screen/grade-book-screen.i-vm";

type SearchParams = Promise<{ term?: string }>;

export default async function StudentGradesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const selectedTerm = sp.term ?? "HK1";

  let gradeBook: GradeBook | null = null;
  let error: GradesFailure["type"] | null = null;

  const result = await (await makeGetMyGradesUseCase()).execute(selectedTerm);
  if (isGradeBookFailure(result)) {
    error = result.type;
  } else {
    gradeBook = result;
  }

  const vm: GradeBookScreenVM = {
    role: "student",
    classSubjects: [],
    selectedCsId: gradeBook?.classSubjectId ?? null,
    selectedTerm,
    gradeBook,
    isPublished: isGradeBookPublished(gradeBook),
    error,
  };

  return <GradeBookContainer vm={vm} />;
}
