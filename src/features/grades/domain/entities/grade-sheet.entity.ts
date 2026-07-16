import type { GradePublishMode } from "@/features/admin-school-setup/domain/entities/school-config.entity";
import type { AssessmentScheme } from "@/features/assessment-scheme/domain/entities/assessment-scheme.entity";
import type { GradeEntryStatus } from "./grade-entry-status.entity";

export type {
  AssessmentColumn,
  AssessmentScheme,
} from "@/features/assessment-scheme/domain/entities/assessment-scheme.entity";
export type { GradeEntryStatus } from "./grade-entry-status.entity";

/**
 * A single student × column grade entry (US-E18.12, ADR 0054). Status is
 * PER-CELL — the real `GradeEntry` aggregate has no row-level or
 * class-subject-level status concept. `GradePublishStatus` (the old
 * row-level status) is retired entirely, not aliased.
 */
export interface GradeCell {
  value: number | null; // null = not yet entered
  status: GradeEntryStatus;
}

export interface StudentScoreRow {
  studentId: string;
  studentName: string;
  studentCode: string;
  /** key = AssessmentColumn.id */
  scores: Record<string, GradeCell>;
  /** computed weighted average; null if any column value is missing */
  average: number | null;
}

export interface GradeSheet {
  classId: string;
  subjectId: string;
  termId: string;
  academicYearLabel: string;
  scheme: AssessmentScheme;
  rows: StudentScoreRow[];
  publishMode: GradePublishMode;
}
