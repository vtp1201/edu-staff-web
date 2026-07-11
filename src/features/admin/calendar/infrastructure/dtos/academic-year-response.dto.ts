/**
 * Wire DTOs for the `core` service AcademicCalendar API.
 *
 * These match the real `AcademicYearResponse`/`TermResponse` schemas
 * (`edu-api/services/core/docs/openapi.yaml`), remapped from the earlier
 * mock-first guess during US-E18.1:
 *   - years/terms are separate resources — the year response is FLAT (no nested
 *     `terms[]`); the repository fans out to `GET .../terms` per year to
 *     reassemble the nested `AcademicYear` the domain entity expects.
 *   - the year lifecycle is a `status` enum (DRAFT|ACTIVE|ARCHIVED), not a
 *     boolean `isActive` (`isActive = status === "ACTIVE"`).
 *   - `TermResponse` has NO `hasGrades` field — the only server signal is the
 *     `409 CALENDAR_TERM_IN_USE` on archive (mapper always maps `hasGrades: false`).
 */

export type AcademicYearStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type TermStatus = "ACTIVE" | "ARCHIVED";

export interface AcademicYearResponseDto {
  academicYearId: string;
  tenantId: string;
  label: string;
  status: AcademicYearStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TermResponseDto {
  termId: string;
  academicYearId: string;
  tenantId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: TermStatus;
  createdAt: string;
  updatedAt: string;
}

export type AcademicYearListResponseDto = AcademicYearResponseDto[];
