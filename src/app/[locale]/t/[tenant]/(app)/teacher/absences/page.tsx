import {
  absenceToday,
  makeListStudentAbsencesUseCase,
  makeStudentAbsenceAuthContext,
} from "@/bootstrap/di/student-absence.di";
import type { StudentAbsenceEntity } from "@/features/student-absences/domain/entities/student-absence.entity";
import { toStudentAbsenceFailureType } from "@/features/student-absences/domain/failures/student-absence.failure";
import {
  SA_TEACHER_CLASS_ID,
  saRosterForClass,
} from "@/features/student-absences/infrastructure/repositories/mocks/fixtures";
import { StudentAbsencesScreen } from "@/features/student-absences/presentation/student-absences-screen/student-absences-screen";
import type { StudentAbsencesErrorKey } from "@/features/student-absences/presentation/student-absences-screen/student-absences-screen.i-vm";
import {
  editAbsenceAction,
  listAbsencesAction,
  recordAbsenceAction,
} from "./actions";

/**
 * `/teacher/absences` (ADR 0062) — the GVCN's own-homeroom view: record + edit,
 * no flag. Served by the SAME `StudentAbsencesScreen` component as the principal
 * route (the `discipline-screen` one-component-multi-role pattern). Reuses the
 * existing `(app)/teacher/**` route-group auth/tenant gate — no new guard here.
 *
 * The list is scoped SERVER-side to the caller's own class (FR-008): the
 * repository forces the scope from `authCtx` and ignores any client-supplied
 * `classId`. The roster is the FIXED own-class fixture (FR-010 — no live search).
 *
 * `flagAbsenceAction` is not passed and cannot be: the teacher arm of
 * `StudentAbsencesScreenVM` has no such field (FR-005).
 */
export default async function TeacherAbsencesPage() {
  const authCtx = await makeStudentAbsenceAuthContext("teacher");
  // In mock mode the auth context carries the mock GVCN's homeroom; in real mode
  // it fails closed to "" (no homeroom claim exists yet) — the fixture class is
  // only the display/roster fallback, never an authorization input.
  const classId = authCtx.classId || SA_TEACHER_CLASS_ID;

  let initialAbsences: StudentAbsenceEntity[] = [];
  let initialErrorKey: StudentAbsencesErrorKey | undefined;
  try {
    initialAbsences = await (
      await makeListStudentAbsencesUseCase(authCtx)
    ).execute({ classId });
  } catch (err) {
    initialErrorKey = toStudentAbsenceFailureType(err);
  }

  return (
    <StudentAbsencesScreen
      viewerRole="teacher"
      classId={classId}
      today={absenceToday()}
      initialAbsences={initialAbsences}
      initialErrorKey={initialErrorKey}
      roster={[...saRosterForClass(classId)]}
      listAbsencesAction={listAbsencesAction}
      recordAbsenceAction={recordAbsenceAction}
      editAbsenceAction={editAbsenceAction}
    />
  );
}
