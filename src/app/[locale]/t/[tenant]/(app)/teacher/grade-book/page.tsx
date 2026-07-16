import { makeGetGradeBookUseCase } from "@/bootstrap/di/grades.di";
import { resolveCurrentAcademicYear } from "@/bootstrap/lib/resolve-current-term";
import { resolveMyGradeSubjects } from "@/bootstrap/lib/resolve-my-grade-subjects";
import type { ClassSubjectTermKey } from "@/features/grades/domain/entities/class-subject-term-key.entity";
import type { GradeBook } from "@/features/grades/domain/entities/grade-book.entity";
import type { GradesFailure } from "@/features/grades/domain/failures/grades.failure";
import {
  isGradeBookFailure,
  isGradeBookPublished,
} from "@/features/grades/presentation/grade-book-screen/build-grade-book-vm";
import { GradeBookContainer } from "@/features/grades/presentation/grade-book-screen/grade-book-container";
import type { GradeBookScreenVM } from "@/features/grades/presentation/grade-book-screen/grade-book-screen.i-vm";

type Params = Promise<{ locale: string; tenant: string }>;
type SearchParams = Promise<{
  classId?: string;
  subjectId?: string;
  term?: string;
}>;

export default async function TeacherGradeBookPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { locale, tenant } = await params;
  const sp = await searchParams;
  const selectedClassId = sp.classId ?? null;
  const selectedSubjectId = sp.subjectId ?? null;
  const selectedTerm = sp.term ?? null;

  const classSubjects = await resolveMyGradeSubjects();
  const academicYearLabel = await resolveCurrentAcademicYear().catch(
    () => "2025-2026",
  );

  let gradeBook: GradeBook | null = null;
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
    const result = await (await makeGetGradeBookUseCase(key)).execute(key);
    if (isGradeBookFailure(result)) {
      error = result.type;
    } else {
      gradeBook = result;
    }
  }

  const vm: GradeBookScreenVM = {
    role: "teacher",
    classSubjects,
    selectedClassId,
    selectedSubjectId,
    selectedTerm,
    gradeBook,
    isPublished: isGradeBookPublished(gradeBook),
    error,
    gradeEntryPath: `/${locale}/t/${tenant}/teacher/grades`,
  };

  return <GradeBookContainer vm={vm} />;
}
