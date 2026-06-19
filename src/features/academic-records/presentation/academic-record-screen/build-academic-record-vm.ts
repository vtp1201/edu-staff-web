import { makeGetAcademicRecordUseCase } from "@/bootstrap/di/academic-records.di";
import type {
  AcademicRecordScreenVM,
  AcademicRecordViewerRole,
} from "./academic-record-screen.i-vm";

/** Shared RSC loader: fetches a student's record (optionally year-narrowed) and
 * builds the screen VM. Used by all four role routes. */
export async function buildAcademicRecordVM(params: {
  role: AcademicRecordViewerRole;
  studentId: string;
  year?: string;
}): Promise<AcademicRecordScreenVM> {
  const { role, studentId, year } = params;
  const result = await (await makeGetAcademicRecordUseCase()).execute(
    studentId,
    year,
  );

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
  const selectedYearId =
    year ??
    record.years.find((y) => y.isCurrent)?.yearId ??
    record.years[0]?.yearId ??
    null;

  return { role, studentId, record, selectedYearId, error: null };
}
