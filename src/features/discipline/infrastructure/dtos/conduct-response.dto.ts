import type { ConductGrade } from "../../domain/entities/conduct-summary.entity";

/** Mirrors core service `ConductSummaryResponse` (camelCase wire fields). */
export interface ConductResponseDto {
  studentId: string;
  studentName: string;
  initials?: string;
  avatarTone?: string;
  classId: string;
  className: string;
  violationCount: number;
  unexcusedAbsences: number;
  points: number;
  grade: ConductGrade;
  isOverridden?: boolean;
  overrideNote?: string | null;
  semester: string;
}
