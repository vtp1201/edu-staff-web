import {
  makeGetAcademicRecordUseCase,
  resolveCurrentMemberId,
} from "@/bootstrap/di/academic-records.di";
import { UNRESOLVED_YEAR_ID } from "../../domain/entities/academic-record.entity";
import type {
  AcademicRecordScreenVM,
  AcademicRecordViewerRole,
} from "./academic-record-screen.i-vm";

/** The student self-view route's placeholder id — never sent to the wire. */
export const SELF_MEMBER_ID = "me";

/**
 * Shared RSC loader for all four role routes.
 *
 * ONE member-scoped read returns every record; the year switch is a CLIENT-SIDE
 * filter over the derived `record.years` (there is no year param on the wire —
 * see `i-academic-records.repository.ts`), so `year` here only selects which
 * derived group the screen shows.
 *
 * The student route passes {@link SELF_MEMBER_ID}: the real memberId comes from
 * the access-token `sub` claim server-side and is never client-supplied. If it
 * cannot be resolved the screen shows `forbidden` rather than calling the wire
 * with a literal "me".
 */
export async function buildAcademicRecordVM(params: {
  role: AcademicRecordViewerRole;
  studentId: string;
  year?: string;
}): Promise<AcademicRecordScreenVM> {
  const { role, studentId, year } = params;

  let memberId = studentId;
  if (studentId === SELF_MEMBER_ID) {
    const self = await resolveCurrentMemberId();
    if (!self) {
      return {
        role,
        studentId,
        record: null,
        selectedYearId: year ?? null,
        error: "forbidden",
      };
    }
    memberId = self;
  }

  const result = await (await makeGetAcademicRecordUseCase()).execute(memberId);

  if (!result.ok) {
    return {
      role,
      studentId,
      record: null,
      selectedYearId: year ?? null,
      error: result.error.type,
    };
  }

  const record = result.data;
  const requestedYear = record.years.some((y) => y.yearId === year)
    ? year
    : undefined;
  const selectedYearId =
    requestedYear ??
    record.years.find((y) => y.isCurrent)?.yearId ??
    // Never open on the degraded bucket while a real year exists.
    record.years.find((y) => y.yearId !== UNRESOLVED_YEAR_ID)?.yearId ??
    record.years[0]?.yearId ??
    null;

  return { role, studentId, record, selectedYearId, error: null };
}
