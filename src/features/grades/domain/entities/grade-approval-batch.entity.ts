/**
 * A grade "batch" = one class-subject's grade sheet submitted by a teacher,
 * tracked through the admin approval pipeline (US-E14.4).
 *
 *   PENDING_APPROVAL → (approve)         → PUBLISHED
 *   PENDING_APPROVAL → (request revision)→ DRAFT (returns to teacher)
 *   PUBLISHED        → (bulk lock)       → LOCKED
 */
export type BatchStatus = "PENDING_APPROVAL" | "PUBLISHED" | "LOCKED";

export interface GradeApprovalBatch {
  id: string;
  className: string;
  subjectName: string;
  teacherName: string;
  term: string;
  studentCount: number;
  status: BatchStatus;
  /** ISO-8601 string. */
  updatedAt: string;
}

/** Stable performance-band key — translated at presentation, never on the wire. */
export type GradeBandKey = "excellent" | "good" | "average" | "weak" | "poor";

export interface BatchScorePreviewRow {
  studentName: string;
  studentCode: string;
  average: number | null;
  /** Stable band key (excellent…poor) — derived from `average`, translated at render. */
  gradeBandKey: GradeBandKey;
}

export interface GradeApprovalBatchDetail extends GradeApprovalBatch {
  averageScore: number | null;
  /** 5 performance bands, count of students in each. */
  distribution: { key: GradeBandKey; count: number }[];
  previewRows: BatchScorePreviewRow[];
}
