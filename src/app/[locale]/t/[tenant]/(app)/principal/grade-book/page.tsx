import {
  lockTermAction,
  rejectEntryAction,
} from "@/app/[locale]/t/[tenant]/(app)/admin/grade-book/actions";
import { makeGetGradeSheetUseCase } from "@/bootstrap/di/grades.di";
import { resolveCurrentAcademicYear } from "@/bootstrap/lib/resolve-current-term";
import { resolveMyGradeSubjects } from "@/bootstrap/lib/resolve-my-grade-subjects";
import type { ClassSubjectTermKey } from "@/features/grades/domain/entities/class-subject-term-key.entity";
import type { GradeSheet } from "@/features/grades/domain/entities/grade-sheet.entity";
import type { GradesFailure } from "@/features/grades/domain/failures/grades.failure";
import { buildApproverGradeVm } from "@/features/grades/presentation/grade-entry-screen/build-approver-grade-vm";
import { GradeEntryContainer } from "@/features/grades/presentation/grade-entry-screen/grade-entry-container";
import type { GradeEntryScreenVM } from "@/features/grades/presentation/grade-entry-screen/grade-entry-screen.i-vm";

type SearchParams = Promise<{
  classId?: string;
  subjectId?: string;
  term?: string;
}>;

function isFailure(x: unknown): x is GradesFailure {
  return typeof x === "object" && x !== null && "type" in x;
}

/**
 * PRINCIPAL grade view (US-E18.44) — the `principal`-namespace twin of
 * `/admin/grade-book`. Both BE MANAGER and ADMIN collapse onto the `principal`
 * appRole (`ROLE_ENUM_TO_APP`), and `principal/layout.tsx` gates on strict
 * equality, so this route is the ONLY place a manager-mapped session can reach
 * the reject affordance. Same staff read path (`GradeSheet`), same screen in
 * `viewerRole: "approver"` mode, same Server Actions (owned by the `admin`
 * route so both namespaces share one implementation + one revalidation set).
 */
export default async function PrincipalGradeBookPage({
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
