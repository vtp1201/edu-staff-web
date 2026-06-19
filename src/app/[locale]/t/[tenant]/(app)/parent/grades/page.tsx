import { makeGetChildGradesUseCase } from "@/bootstrap/di/grades.di";
import type { GradeBook } from "@/features/grades/domain/entities/grade-book.entity";
import type { GradesFailure } from "@/features/grades/domain/failures/grades.failure";
import {
  isGradeBookFailure,
  isGradeBookPublished,
} from "@/features/grades/presentation/grade-book-screen/build-grade-book-vm";
import { GradeBookContainer } from "@/features/grades/presentation/grade-book-screen/grade-book-container";
import type { GradeBookScreenVM } from "@/features/grades/presentation/grade-book-screen/grade-book-screen.i-vm";

// Mock child id — in production this comes from the parent↔child link (mock-first).
const MOCK_CHILD_ID = "child-1";

type SearchParams = Promise<{ term?: string; childId?: string }>;

export default async function ParentGradesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const selectedTerm = sp.term ?? "HK1";
  const childId = sp.childId ?? MOCK_CHILD_ID;

  let gradeBook: GradeBook | null = null;
  let error: GradesFailure["type"] | null = null;

  const result = await (await makeGetChildGradesUseCase()).execute(
    childId,
    selectedTerm,
  );
  if (isGradeBookFailure(result)) {
    error = result.type;
  } else {
    gradeBook = result;
  }

  const vm: GradeBookScreenVM = {
    role: "parent",
    classSubjects: [],
    selectedCsId: gradeBook?.classSubjectId ?? null,
    selectedTerm,
    gradeBook,
    isPublished: isGradeBookPublished(gradeBook),
    error,
  };

  return <GradeBookContainer vm={vm} />;
}
