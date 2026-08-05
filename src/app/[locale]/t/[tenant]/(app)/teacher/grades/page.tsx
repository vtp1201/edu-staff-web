import { makeGetGradeSheetUseCase } from "@/bootstrap/di/grades.di";
import { resolveCurrentAcademicYear } from "@/bootstrap/lib/resolve-current-term";
import { resolveMyGradeSubjects } from "@/bootstrap/lib/resolve-my-grade-subjects";
import { getSessionRole } from "@/bootstrap/lib/session-role.server";
import type { ClassSubjectTermKey } from "@/features/grades/domain/entities/class-subject-term-key.entity";
import type { GradeSheet } from "@/features/grades/domain/entities/grade-sheet.entity";
import type { GradesFailure } from "@/features/grades/domain/failures/grades.failure";
import { GradeEntryContainer } from "@/features/grades/presentation/grade-entry-screen/grade-entry-container";
import type {
  ClassSubjectOption,
  GradeEntryScreenVM,
} from "@/features/grades/presentation/grade-entry-screen/grade-entry-screen.i-vm";
import {
  rejectEntryAction,
  saveScoreAction,
  submitScoresAction,
} from "./actions";

/**
 * Roles allowed to reject a pending-approval cell (US-E18.44 / BE US-184:
 * ADMIN/MANAGER). Both BE enums collapse onto the `principal` appRole
 * (`ROLE_ENUM_TO_APP`); `admin` covers the platform-admin token and mock mode.
 * The Server Action re-checks this server-side — this gate only decides whether
 * the capability is handed to the UI at all.
 */
const REJECT_ROLES = ["principal", "admin"] as const;

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
  const selectedClassId = sp.classId ?? null;
  const selectedSubjectId = sp.subjectId ?? null;
  const selectedTerm = sp.term ?? null;

  const classSubjects: ClassSubjectOption[] = await resolveMyGradeSubjects();
  const sessionRole = await getSessionRole();
  const canReject =
    sessionRole !== null &&
    (REJECT_ROLES as readonly string[]).includes(sessionRole);
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

  const vm: GradeEntryScreenVM = {
    classSubjects,
    selectedClassId,
    selectedSubjectId,
    selectedTerm,
    sheet,
    error,
    saveScoreAction: key
      ? saveScoreAction.bind(null, key)
      : async () => ({ ok: false, errorKey: "unknown" }),
    submitScoresAction: key
      ? submitScoresAction.bind(null, key)
      : async () => ({ ok: false, errorKey: "unknown" }),
    // Capability-as-presence: a teacher's VM has NO reject action at all, so no
    // reject control (and no dialog) is rendered for them (US-E18.44).
    rejectEntryAction:
      canReject && key ? rejectEntryAction.bind(null, key) : undefined,
  };

  return <GradeEntryContainer vm={vm} />;
}
