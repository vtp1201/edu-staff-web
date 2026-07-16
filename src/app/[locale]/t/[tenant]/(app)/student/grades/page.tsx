import {
  makeGetMyGradesUseCase,
  resolveCurrentStudentMemberId,
} from "@/bootstrap/di/grades.di";
import { resolveCurrentAcademicYear } from "@/bootstrap/lib/resolve-current-term";
import type { GradeBook } from "@/features/grades/domain/entities/grade-book.entity";
import type { GradesFailure } from "@/features/grades/domain/failures/grades.failure";
import {
  isGradeBookFailure,
  isGradeBookPublished,
} from "@/features/grades/presentation/grade-book-screen/build-grade-book-vm";
import { GradeBookContainer } from "@/features/grades/presentation/grade-book-screen/grade-book-container";
import type { GradeBookScreenVM } from "@/features/grades/presentation/grade-book-screen/grade-book-screen.i-vm";

type SearchParams = Promise<{ term?: string }>;

/**
 * Year-scoped self-view (US-E18.12, ADR 0054 §3.3) — `GET /members/{id}/
 * grades?year=` returns every subject at once; `academicYearLabel` is
 * resolved server-side, never a URL param. `term` narrows client-side across
 * the returned per-subject array.
 *
 * KNOWN SIMPLIFICATION: the shared `GradeBookScreen` renders ONE `GradeBook`
 * (one subject) at a time — a genuine multi-subject self-view listing is a
 * follow-up UI redesign out of this US's scope; this page picks the first
 * subject matching the selected term (falls back to the first returned
 * group) so the existing screen keeps working against the real contract.
 */
export default async function StudentGradesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const selectedTerm = sp.term ?? "HK1";

  const studentMemberId = await resolveCurrentStudentMemberId();
  const academicYearLabel = await resolveCurrentAcademicYear().catch(
    () => "2025-2026",
  );

  let gradeBook: GradeBook | null = null;
  let error: GradesFailure["type"] | null = null;

  if (studentMemberId) {
    const result = await (await makeGetMyGradesUseCase()).execute(
      studentMemberId,
      academicYearLabel,
    );
    if (isGradeBookFailure(result)) {
      error = result.type;
    } else {
      gradeBook =
        result.find((b) => b.termId === selectedTerm) ?? result[0] ?? null;
    }
  } else {
    error = "forbidden";
  }

  const vm: GradeBookScreenVM = {
    role: "student",
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
