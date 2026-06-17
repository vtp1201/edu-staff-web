export type ConductGrade = "excellent" | "good" | "average" | "poor";

export interface ConductSummaryEntity {
  studentId: string;
  studentName: string;
  initials: string;
  avatarTone: string;
  classId: string;
  className: string;
  violationCount: number;
  unexcusedAbsences: number;
  /** 0–100, computed server-side from violations. */
  points: number;
  grade: ConductGrade;
  isOverridden: boolean;
  overrideNote: string | null;
  semester: string;
}
