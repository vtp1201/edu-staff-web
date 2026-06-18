import type { GradePublishMode } from "@/features/admin-school-setup/domain/entities/school-config.entity";
import type { AssessmentScheme } from "@/features/assessment-scheme/domain/entities/assessment-scheme.entity";

export type {
  AssessmentColumn,
  AssessmentScheme,
} from "@/features/assessment-scheme/domain/entities/assessment-scheme.entity";

export type GradePublishStatus = "DRAFT" | "PENDING_APPROVAL" | "PUBLISHED";

export interface StudentScoreRow {
  studentId: string;
  studentName: string;
  studentCode: string;
  /** key = AssessmentColumn.id; null = not yet entered */
  scores: Record<string, number | null>;
  /** computed weighted average; null if any column score is missing */
  average: number | null;
  publishStatus: GradePublishStatus;
}

export interface GradeSheet {
  classSubjectId: string;
  term: string;
  scheme: AssessmentScheme;
  rows: StudentScoreRow[];
  publishMode: GradePublishMode;
}
