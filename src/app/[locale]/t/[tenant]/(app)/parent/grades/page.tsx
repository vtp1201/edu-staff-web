import { makeGetChildGradesUseCase } from "@/bootstrap/di/grades.di";
import { resolveCurrentAcademicYear } from "@/bootstrap/lib/resolve-current-term";
import type { GradeBook } from "@/features/grades/domain/entities/grade-book.entity";
import type { GradesFailure } from "@/features/grades/domain/failures/grades.failure";
import {
  isGradeBookFailure,
  isGradeBookPublished,
} from "@/features/grades/presentation/grade-book-screen/build-grade-book-vm";
import { GradeBookContainer } from "@/features/grades/presentation/grade-book-screen/grade-book-container";
import type { GradeBookScreenVM } from "@/features/grades/presentation/grade-book-screen/grade-book-screen.i-vm";

// Mock child id — child-switcher stays permanently mock (ADR 0054, no
// display-name source on `GET /members/{id}/linked-students`).
const MOCK_CHILD_ID = "child-1";

type SearchParams = Promise<{ term?: string; childId?: string }>;

/**
 * Year-scoped self-view for the parent-linked child (US-E18.12, ADR 0054
 * §3.3) — same shape/simplification as `student/grades/page.tsx` (one
 * `GradeBook` at a time; multi-subject listing is a follow-up).
 */
export default async function ParentGradesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const selectedTerm = sp.term ?? "HK1";
  const childId = sp.childId ?? MOCK_CHILD_ID;

  const academicYearLabel = await resolveCurrentAcademicYear().catch(
    () => "2025-2026",
  );

  let gradeBook: GradeBook | null = null;
  let error: GradesFailure["type"] | null = null;

  const result = await (await makeGetChildGradesUseCase()).execute(
    childId,
    academicYearLabel,
  );
  if (isGradeBookFailure(result)) {
    error = result.type;
  } else {
    gradeBook =
      result.find((b) => b.termId === selectedTerm) ?? result[0] ?? null;
  }

  const vm: GradeBookScreenVM = {
    role: "parent",
    classSubjects: [],
    selectedClassId: null,
    selectedSubjectId: null,
    selectedTerm,
    gradeBook,
    isPublished: isGradeBookPublished(gradeBook),
    error,
  };

  return <GradeBookContainer vm={vm} />;
}
