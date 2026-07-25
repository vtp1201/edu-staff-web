import {
  absenceToday,
  makeListStudentAbsencesUseCase,
  makeStudentAbsenceAuthContext,
} from "@/bootstrap/di/student-absence.di";
import type { StudentAbsenceEntity } from "@/features/student-absences/domain/entities/student-absence.entity";
import { toStudentAbsenceFailureType } from "@/features/student-absences/domain/failures/student-absence.failure";
import {
  SA_CLASSES,
  SA_STUDENT_ROSTER,
} from "@/features/student-absences/infrastructure/repositories/mocks/fixtures";
import { StudentAbsencesScreen } from "@/features/student-absences/presentation/student-absences-screen/student-absences-screen";
import type { StudentAbsencesErrorKey } from "@/features/student-absences/presentation/student-absences-screen/student-absences-screen.i-vm";
import { flagAbsenceAction, listAbsencesAction } from "./actions";

/**
 * `/principal/absences` (ADR 0062) — the schoolwide, class-filterable review view:
 * read + flag only. Reuses the existing `(app)/principal/**` route-group
 * auth/tenant gate — no new guard here.
 *
 * No `classId` is passed on the initial fetch (schoolwide, FR-009). No
 * record/edit action is imported or passed, and the principal arm of
 * `StudentAbsencesScreenVM` has no field for either — so AC-006.5 ("zero
 * record/edit affordance anywhere, not merely disabled") holds at compile time.
 *
 * The roster is schoolwide here and used ONLY to resolve row display names
 * (there is no record form on this route to pick from).
 */
export default async function PrincipalAbsencesPage() {
  const authCtx = await makeStudentAbsenceAuthContext("principal");

  let initialAbsences: StudentAbsenceEntity[] = [];
  let initialErrorKey: StudentAbsencesErrorKey | undefined;
  try {
    initialAbsences = await (
      await makeListStudentAbsencesUseCase(authCtx)
    ).execute({});
  } catch (err) {
    initialErrorKey = toStudentAbsenceFailureType(err);
  }

  return (
    <StudentAbsencesScreen
      viewerRole="principal"
      today={absenceToday()}
      initialAbsences={initialAbsences}
      initialErrorKey={initialErrorKey}
      roster={[...SA_STUDENT_ROSTER]}
      classOptions={SA_CLASSES.map((classId) => ({
        classId,
        className: classId,
      }))}
      listAbsencesAction={listAbsencesAction}
      flagAbsenceAction={flagAbsenceAction}
    />
  );
}
