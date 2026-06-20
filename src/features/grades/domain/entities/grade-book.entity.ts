import type { GradePublishMode } from "@/features/admin-school-setup/domain/entities/school-config.entity";
import type { AssessmentScheme } from "@/features/assessment-scheme/domain/entities/assessment-scheme.entity";
import type { GradePublishStatus } from "./grade-sheet.entity";

export type ConductGrade = "Tot" | "Kha" | "TB" | "Yeu";

/**
 * Read-only multi-role grade-book row. Mirrors {@link StudentScoreRow} but adds
 * the conduct grade column the grade book surfaces alongside the academic
 * average.
 */
export interface GradeBookRow {
  studentId: string;
  studentName: string;
  studentCode: string;
  /** key = AssessmentColumn.id; null = not yet entered */
  scores: Record<string, number | null>;
  /** weighted average (reuses calculateWeightedAverage); null if incomplete */
  average: number | null;
  conductGrade: ConductGrade;
  publishStatus: GradePublishStatus;
}

export interface GradeBook {
  classSubjectId: string;
  term: string;
  className: string;
  subjectName: string;
  scheme: AssessmentScheme;
  rows: GradeBookRow[];
  publishMode: GradePublishMode;
}

export type GradeBookRole =
  | "teacher"
  | "principal"
  | "admin"
  | "student"
  | "parent";

export type ChildColor = "primary" | "success" | "warning" | "error" | "purple";

export interface ChildSummary {
  childId: string;
  name: string;
  className: string;
  /** 2-char initials for avatar fallback */
  avatar: string;
  /** design-token role string → maps to --edu-<color> CSS var in presentation */
  color: ChildColor;
}
